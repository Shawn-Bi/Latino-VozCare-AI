import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, loadAssignedPatient, errorResponse, AuthError } from "../../shared/access.ts";

// Updates a patient's contact details and saved appointment. Verifies approved
// membership and that the patient (and visit) are assigned to this doctor.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json();
    const patientId = body?.patientId;
    const visitId = body?.visitId;
    const phone = body?.phone;
    const address = body?.address;
    const appointment = body?.appointment;
    if (!patientId || !visitId || !appointment) throw new AuthError(400, "Missing contact details.");

    const patient = await loadAssignedPatient(base44, user.id, patientId);

    let visit;
    try {
      visit = await base44.asServiceRole.entities.Visit.get(visitId);
    } catch {
      throw new AuthError(403, "This visit is not assigned to you.");
    }
    if (!visit || visit.patient_id !== patientId) throw new AuthError(403, "This visit is not assigned to you.");

    // Invalidate BEFORE changing facts. Stale editors cannot save old checks
    // because every affected draft advances its revision.
    const factsChanged = (phone !== undefined && phone !== patient.phone)
      || address !== patient.address
      || appointment.startsAt !== visit.appointment_starts_at
      || appointment.endsAt !== visit.appointment_ends_at
      || appointment.hospital !== visit.appointment_hospital
      || appointment.address !== visit.appointment_address;
    if (factsChanged) await base44.asServiceRole.entities.EducationDraft.updateMany(
      { patient_id: patientId, visit_id: visitId },
      { $set: { checks: { note: false, language: false, visual: false } }, $inc: { revision: 1 } }
    );
    await base44.asServiceRole.entities.Patient.update(patientId, { phone, address });
    await base44.asServiceRole.entities.Visit.update(visitId, {
      appointment_starts_at: appointment.startsAt,
      appointment_ends_at: appointment.endsAt,
      appointment_hospital: appointment.hospital,
      appointment_address: appointment.address,
    });
    const page = await base44.asServiceRole.entities.EducationDraft.filter({ patient_id: patientId, visit_id: visitId }, "-revision", 1);
    const latest = (page.items ?? page)[0];
    return Response.json({ ok: true, revision: latest?.revision, reviewRequired: factsChanged });
  } catch (error) {
    return errorResponse(error);
  }
}