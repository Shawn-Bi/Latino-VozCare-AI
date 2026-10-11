import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, loadAssignedPatient, errorResponse, AuthError } from "../../shared/access.ts";

// Approves a reviewed education draft: verifies approved membership and
// patient assignment, re-reads the SAVED draft from the database (the snapshot
// is of the stored reviewed state, not caller-supplied content), confirms all
// review checks and delivery details, then creates an immutable ApprovedPacket
// and a fresh expiring PatientLink. Returns the token so the doctor can copy or
// open the link. SMS is not configured, so nothing is sent.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json();
    const patientId = body?.patientId;
    const visitId = body?.visitId;
    const draftId = body?.draftId;
    const serverRevision = body?.serverRevision;
    if (!patientId || !visitId || !draftId || typeof serverRevision !== "number") {
      throw new AuthError(400, "Missing approval details.");
    }

    const patient = await loadAssignedPatient(base44, user.id, patientId);

    // Re-read the stored draft — the immutable snapshot reflects what was saved, not what the caller sends.
    let draft;
    try {
      draft = await base44.asServiceRole.entities.EducationDraft.get(draftId);
    } catch {
      throw new AuthError(404, "Draft not found for this patient.");
    }
    if (!draft || draft.patient_id !== patientId || draft.visit_id !== visitId) throw new AuthError(404, "Draft not found for this patient.");
    if (draft.revision !== serverRevision) throw new AuthError(409, "The draft changed since you loaded it. Reload and review again.");

    // All review checks must pass.
    const checks = draft.checks || {};
    if (!(checks.note && checks.language && checks.visual)) {
      throw new AuthError(400, "Complete all three review checks before approving.");
    }

    const resources = draft.resources || [];
    if (!Array.isArray(resources) || (patient.case_kind === "colon" && resources.length !== 2) || resources.some((decision: string) => !["accepted", "rejected"].includes(decision))) {
      throw new AuthError(400, "Review every reading link before approving.");
    }
    const wording = [draft.note, draft.english, draft.spanish, draft.plan_english, draft.plan_spanish, draft.caption_english, draft.caption_spanish];
    if (wording.some((value) => typeof value !== "string" || !value.trim())) {
      throw new AuthError(400, "Complete the visit note and both language versions before approving.");
    }

    // Delivery details must be complete.
    if (!/^\+[1-9]\d{7,14}$/.test(patient.phone || "")) {
      throw new AuthError(400, "Add a valid patient phone number, including its country code, before approving.");
    }
    if (!(patient.address || "").trim()) throw new AuthError(400, "Add the patient's saved starting address before approving.");

    let visit;
    try {
      visit = await base44.asServiceRole.entities.Visit.get(visitId);
    } catch {
      throw new AuthError(404, "Visit not found for this patient.");
    }
    if (!visit || visit.patient_id !== patientId) throw new AuthError(404, "Visit not found for this patient.");
    if (!(visit.appointment_hospital || "").trim() || !(visit.appointment_address || "").trim() || !Number.isFinite(Date.parse(visit.appointment_starts_at))) {
      throw new AuthError(400, "Complete the saved appointment before approving.");
    }

    // Create the immutable snapshot.
    const now = new Date().toISOString();
    const packet = await base44.asServiceRole.entities.ApprovedPacket.create({
      patient_id: patientId,
      visit_id: visitId,
      approved_by_id: user.id,
      revision: draft.revision,
      approved_at: now,
      delivery_language: draft.delivery_language || "es",
      english: draft.english || "",
      spanish: draft.spanish || "",
      plan_english: draft.plan_english || "",
      plan_spanish: draft.plan_spanish || "",
      caption_english: draft.caption_english || "",
      caption_spanish: draft.caption_spanish || "",
      include_procedure: !!draft.include_procedure,
      resources: draft.resources || [],
      drawing_file_uri: draft.drawing_file_uri || "",
      drawing_view: draft.drawing_view || "",
      case_kind: patient.case_kind || "general",
      appointment_starts_at: visit.appointment_starts_at,
      appointment_ends_at: visit.appointment_ends_at,
      appointment_time_zone: visit.appointment_time_zone || "America/New_York",
      appointment_hospital: visit.appointment_hospital,
      appointment_address: visit.appointment_address,
      starting_address: patient.address || "",
      patient_name: patient.name,
      patient_first_name: patient.first_name,
      patient_initials: patient.initials || "",
    });

    // Generate the expiring patient link (48 hex chars, 7-day expiry).
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (v) => v.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    await base44.asServiceRole.entities.PatientLink.create({
      token,
      patient_id: patientId,
      packet_id: packet.id,
      approved_by_id: user.id,
      expires_at: expiresAt,
      revoked_at: "",
      opened_at: "",
      call_attempts: 0,
      last_call_id: "",
      call_ended_at: "",
    });

    return Response.json({ packetId: packet.id, token, expiresAt, approvedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}