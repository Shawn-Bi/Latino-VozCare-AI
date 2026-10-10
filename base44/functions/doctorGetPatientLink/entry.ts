import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireApprovedDoctor, loadAssignedPatient, errorResponse } from "../../shared/access.ts";

// Returns the newest active (not revoked, not expired) link for ONE patient
// assigned to the signed-in approved doctor. Read-only: creates nothing.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireApprovedDoctor(base44);
    const { patientId } = await req.json();
    const patient = await loadAssignedPatient(base44, user.id, patientId);

    const page = await base44.asServiceRole.entities.PatientLink.filter(
      { patient_id: patient.id, revoked_at: "", expires_at: { $gt: new Date().toISOString() } },
      { sort: "-created_date", limit: 1, fields: ["token", "expires_at"] },
    );
    const link = (page.items ?? page)[0];
    return Response.json({ link: link ? { token: link.token, expiresAt: link.expires_at } : null });
  } catch (error) {
    return errorResponse(error);
  }
}