// DEMO MODE: every approved doctor can read and edit every patient record.
//
// Patient, Visit and EducationDraft are readable and editable by any authenticated app user
// (role "user" or "admin"); creating and deleting records stays admin-only. The doctor view
// still gates the list behind an approved CareTeamMembership, so only approved doctors see
// records in the UI — but the data layer itself is open to all signed-in users. That is fine
// for a synthetic-data demo and is NOT safe for real patient data: any logged-in user can read
// or change any patient's record, not only the patients assigned to them. Before real data,
// replace this with a Base44-hosted backend operation that checks approved membership and
// patient assignment on every request (see docs/BASE44_HANDOFF.md) and tighten the RLS back
// to admin-only or per-assignment.
export const DOCTOR_RECORD_ACCESS: { available: boolean; reason: string; reasonEs: string } = {
  available: true,
  reason: "",
  reasonEs: "",
};