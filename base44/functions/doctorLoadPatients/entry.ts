import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, errorResponse } from "../../shared/access.ts";

// Lists the signed-in doctor's assigned patients with their latest visit and
// draft revision. Access is verified server-side: an approved membership is
// required, and only patients with assigned_doctor_id === this doctor are
// returned.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);

    const patientsPage = await base44.asServiceRole.entities.Patient.filter(
      { assigned_doctor_id: user.id },
      { sort: "-created_date", limit: 50 }
    );
    const patients = patientsPage.items ?? patientsPage;
    if (!patients || patients.length === 0) return Response.json({ patients: [] });

    const patientIds = patients.map((p: any) => p.id);
    const [visitsPage, draftsPage] = await Promise.all([
      base44.asServiceRole.entities.Visit.filter(
        { patient_id: { $in: patientIds } },
        { sort: "-created_date", limit: 200 }
      ),
      base44.asServiceRole.entities.EducationDraft.filter(
        { patient_id: { $in: patientIds } },
        { sort: "-revision", limit: 200 }
      ),
    ]);
    const visits = visitsPage.items ?? visitsPage;
    const drafts = draftsPage.items ?? draftsPage;

    const result = patients.map((p: any) => {
      const v = visits.find((x: any) => x.patient_id === p.id);
      const d = drafts.find((x: any) => x.patient_id === p.id);
      return {
        id: p.id,
        name: p.name,
        firstName: p.first_name,
        initials: p.initials,
        phone: p.phone,
        caseKind: p.case_kind,
        preferredLanguage: p.preferred_language,
        draftRevision: d?.revision ?? 1,
        appointmentStartsAt: v?.appointment_starts_at ?? "",
        appointmentTimeZone: v?.appointment_time_zone ?? "America/New_York",
      };
    });
    return Response.json({ patients: result });
  } catch (error) {
    return errorResponse(error);
  }
}