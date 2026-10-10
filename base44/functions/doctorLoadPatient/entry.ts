import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, loadAssignedPatient, errorResponse, AuthError } from "../../shared/access.ts";

// Loads one patient's full record (patient, latest visit, latest draft) for
// the doctor workspace. Verifies approved membership AND that the patient is
// assigned to this doctor before returning anything.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json();
    const patientId = body?.patientId;
    const patient = await loadAssignedPatient(base44, user.id, patientId);

    const visitsPage = await base44.asServiceRole.entities.Visit.filter(
      { patient_id: patientId },
      { sort: "-created_date", limit: 1 }
    );
    const visits = visitsPage.items ?? visitsPage;
    if (!visits || visits.length === 0) throw new AuthError(404, "No visit found for this patient.");
    const visit = visits[0];

    const draftsPage = await base44.asServiceRole.entities.EducationDraft.filter(
      { patient_id: patientId },
      { sort: "-revision", limit: 1 }
    );
    const drafts = draftsPage.items ?? draftsPage;
    if (!drafts || drafts.length === 0) throw new AuthError(404, "No education draft found for this patient.");
    const draft = drafts[0];

    return Response.json({
      patient,
      visit,
      draft,
      draftId: draft.id,
      visitId: visit.id,
      serverRevision: draft.revision,
    });
  } catch (error) {
    return errorResponse(error);
  }
}