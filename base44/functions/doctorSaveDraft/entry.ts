import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, loadAssignedPatient, errorResponse, AuthError } from "../../shared/access.ts";

// Saves a reviewed education draft. Verifies approved membership, that the
// draft exists, and that its patient is assigned to this doctor. The update is
// conditional on the stored revision matching the one this editor loaded, so a
// stale save reports a conflict instead of overwriting another editor. The
// revision advances by one on every successful save. Saving never approves.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const body = await req.json();
    const draftId = body?.draftId;
    const serverRevision = body?.serverRevision;
    const fields = body?.fields;
    if (!draftId || typeof serverRevision !== "number" || !fields) {
      throw new AuthError(400, "Missing draft save details.");
    }

    let draft;
    try {
      draft = await base44.asServiceRole.entities.EducationDraft.get(draftId);
    } catch {
      throw new AuthError(404, "Draft not found.");
    }
    if (!draft) throw new AuthError(404, "Draft not found.");
    const patientId = draft.patient_id;
    await loadAssignedPatient(base44, user.id, patientId);

    const revision = serverRevision + 1;
    const result = await base44.asServiceRole.entities.EducationDraft.updateMany(
      { id: draftId, revision: serverRevision },
      { $set: { ...fields, revision } }
    );
    const updated = result?.updated ?? result?.modifiedCount ?? 0;
    return Response.json(updated > 0 ? { status: "saved", revision } : { status: "conflict" });
  } catch (error) {
    return errorResponse(error);
  }
}