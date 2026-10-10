// Shared server-side authorization for VozCare backend functions.
//
// Every doctor-facing data operation must call requireApprovedDoctor, and any
// operation touching a specific patient must also call loadAssignedPatient.
// These checks run on the server against stored records — the frontend never
// supplies its own role or patient assignment, and the raw Patient/Visit/
// EducationDraft entities are admin-only (RLS), so a doctor cannot reach them
// directly. The functions below use the service role with these explicit
// per-request checks as the only path in.

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Returns the authenticated, approved doctor. Throws 401 if not signed in,
// 403 if their CareTeamMembership is not approved.
export async function requireApprovedDoctor(base44: any) {
  const user = await base44.auth.me();
  if (!user) throw new AuthError(401, "Sign in required.");
  const page = await base44.asServiceRole.entities.CareTeamMembership.filter(
    { user_id: user.id, status: "approved" },
    { limit: 1 }
  );
  const items = page.items ?? page;
  if (!items || items.length === 0) {
    throw new AuthError(403, "Your care-team membership is not approved.");
  }
  return user;
}

// Returns the patient record only if it is assigned to this doctor.
// Throws 403 otherwise. Used for every per-patient operation.
export async function loadAssignedPatient(base44: any, userId: string, patientId: string) {
  if (!patientId) throw new AuthError(400, "A patient is required.");
  const page = await base44.asServiceRole.entities.Patient.filter(
    { id: patientId, assigned_doctor_id: userId },
    { limit: 1 }
  );
  const items = page.items ?? page;
  if (!items || items.length === 0) {
    throw new AuthError(403, "This patient is not assigned to you.");
  }
  return items[0];
}

// Standard error response for a handler's catch block.
export function errorResponse(error: any) {
  const status = error?.status || 500;
  return Response.json({ error: error?.message || "Server error" }, { status });
}