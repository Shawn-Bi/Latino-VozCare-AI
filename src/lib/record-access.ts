// Doctor record access is now enforced by Base44-hosted backend functions.
//
// Each doctor-facing data operation (list patients, load a patient, save a
// draft, save contact details) calls a backend function that verifies an
// approved CareTeamMembership and patient assignment on every request, using
// the service role with explicit per-request authorization. The raw Patient,
// Visit and EducationDraft entities are admin-only (RLS), so a signed-in doctor
// cannot read or write them directly — the backend functions are the only path
// in. This replaces the previous demo-wide access rules.
//
// Admins still manage patients, visits, drafts and memberships directly through
// the admin-only RLS and the admin panel.
export const DOCTOR_RECORD_ACCESS: { available: boolean; reason: string; reasonEs: string } = {
  available: true,
  reason: "",
  reasonEs: "",
};