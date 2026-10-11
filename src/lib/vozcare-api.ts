import { base44 } from "@/api/base44Client";
import { initialEducation, modelViews, type EducationDraft, type ModelView, type SavedDrawing } from "@/education";
import type { Patient, Visit, Appointment, Language } from "@/workflow";

// Doctor record functions now run as Base44-hosted backend functions. Each one
// verifies approved CareTeamMembership and patient assignment server-side, so
// the frontend never trusts its own role or assignment. The raw Patient/Visit/
// EducationDraft entities are admin-only (RLS); doctors reach them only through
// these functions, which use the service role with explicit checks.

// Defense in depth only. Admin operations are still gated by admin-only RLS.
async function requireAdmin() {
  const me = await base44.auth.me();
  if (me.role !== "admin") throw new Error("Only an admin can do this.");
}

// ─── Server entity shapes (snake_case as stored) ───────────────────────────

type ServerPatient = {
  id: string;
  name: string;
  first_name: string;
  initials: string;
  phone: string;
  address: string;
  preferred_language: Language;
  case_kind: "colon" | "general";
  assigned_doctor_id: string;
  assigned_doctor_email: string;
  is_synthetic_demo: boolean;
};

type ServerVisit = {
  id: string;
  patient_id: string;
  assigned_doctor_id: string;
  completed_at: string;
  appointment_starts_at: string;
  appointment_ends_at: string;
  appointment_time_zone: string;
  appointment_hospital: string;
  appointment_address: string;
  doctor_source_note: string;
};

type ServerDraft = {
  id: string;
  patient_id: string;
  visit_id: string;
  assigned_doctor_id: string;
  revision: number;
  note: string;
  english: string;
  spanish: string;
  plan_english: string;
  plan_spanish: string;
  caption_english: string;
  caption_spanish: string;
  include_procedure: boolean;
  delivery_language: Language;
  resources: ("pending" | "accepted" | "rejected")[];
  anatomy_notes: any[];
  checks: { note: boolean; language: boolean; visual: boolean };
  drawing_file_uri: string;
  drawing_view: string;
};

// ─── Mappers (server snake_case → workflow camelCase) ──────────────────────

function mapPatient(p: ServerPatient): Patient {
  return {
    id: p.id,
    doctorId: p.assigned_doctor_id,
    name: p.name,
    firstName: p.first_name,
    initials: p.initials,
    phone: p.phone,
    address: p.address,
    preferredLanguage: p.preferred_language,
    caseKind: p.case_kind,
  };
}

function mapVisit(v: ServerVisit): Visit {
  return {
    id: v.id,
    patientId: v.patient_id,
    completedAt: v.completed_at,
    appointment: {
      id: v.id,
      startsAt: v.appointment_starts_at,
      endsAt: v.appointment_ends_at,
      timeZone: v.appointment_time_zone,
      hospital: v.appointment_hospital,
      address: v.appointment_address,
    } as Appointment,
  };
}

// The drawing image lives in private file storage; the draft stores only its file URI and camera view.
// If a stored drawing cannot be opened, fail the load. Returning null would let the next save erase it.
async function loadDrawing(d: ServerDraft): Promise<SavedDrawing | null> {
  if (!d.drawing_file_uri) return null;
  if (!(d.drawing_view in modelViews)) throw new Error("The saved drawing has no valid camera view, so this draft was not opened.");
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: d.drawing_file_uri, expires_in: 3600 }) as { signed_url: string };
  return { image: signed_url, view: d.drawing_view as ModelView, fileUri: d.drawing_file_uri };
}

async function persistDrawing(drawing: SavedDrawing | null): Promise<{ fileUri: string; view: string }> {
  if (!drawing) return { fileUri: "", view: "" };
  if (drawing.fileUri) return { fileUri: drawing.fileUri, view: drawing.view };
  const blob = await (await fetch(drawing.image)).blob();
  const file = new File([blob], `drawing-${crypto.randomUUID()}.png`, { type: blob.type || "image/png" });
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }) as { file_uri: string };
  return { fileUri: file_uri, view: drawing.view };
}

async function mapDraft(d: ServerDraft): Promise<EducationDraft> {
  return {
    revision: d.revision,
    note: d.note ?? "",
    english: d.english ?? "",
    spanish: d.spanish ?? "",
    planEnglish: d.plan_english ?? "",
    planSpanish: d.plan_spanish ?? "",
    captionEnglish: d.caption_english ?? "",
    captionSpanish: d.caption_spanish ?? "",
    includeProcedure: d.include_procedure ?? false,
    deliveryLanguage: d.delivery_language ?? "es",
    resources: d.resources ?? [],
    drawing: await loadDrawing(d),
    anatomyNotes: d.anatomy_notes ?? [],
    checks: d.checks ?? { note: false, language: false, visual: false },
    approvedAt: null, // Populated only when the active packet matches this saved draft.
  };
}

// ─── Backend function invocation helper ───────────────────────────────────

async function invokeFunction(name: string, payload: any): Promise<any> {
  let res: any;
  try { res = await base44.functions.invoke(name, payload); }
  catch (e: any) { throw new Error(e?.response?.data?.error || e?.data?.error || e?.message || `${name} failed.`); }
  if (res?.status >= 400) throw new Error(res.data?.error || `${name} failed.`);
  return res?.data;
}

// ─── Doctor record API (server-side authorized) ────────────────────────────

export type PatientListEntry = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  phone: string;
  caseKind: "colon" | "general";
  preferredLanguage: Language;
  draftRevision: number;
  isSyntheticDemo: boolean;
  educationStatus: EducationStatus;
  followUpStatus: "not_started" | "link_ready" | "called";
  appointmentStartsAt: string;
  appointmentTimeZone: string;
};

export type EducationStatus = "none" | "draft" | "approved";
export type PatientOnlyData = { empty: true; patient: Patient };

export type LoadedPatientData = {
  patient: Patient;
  visit: Visit;
  draft: EducationDraft;
  draftId: string;
  visitId: string;
  serverRevision: number;
};

export type SaveResult =
  | { status: "saved"; revision: number; drawingFileUri: string }
  | { status: "conflict" };

export async function loadAssignedPatients(search = "", status: EducationStatus | "" = ""): Promise<PatientListEntry[]> {
  const data = await invokeFunction("doctorLoadPatients", { search, status });
  return (data.patients ?? []) as PatientListEntry[];
}

export async function createPatient(fields: { name: string; preferredLanguage: Language; phone: string; address: string }): Promise<string> {
  const data = await invokeFunction("doctorCreatePatient", fields);
  return data.id;
}

export async function loadPatientData(patientId: string): Promise<LoadedPatientData | PatientOnlyData> {
  const data = await invokeFunction("doctorLoadPatient", { patientId });
  if (!data.visit || !data.draft) return { empty: true, patient: mapPatient(data.patient) };
  return {
    patient: mapPatient(data.patient),
    visit: mapVisit(data.visit),
    draft: await mapDraft(data.draft),
    draftId: data.draftId,
    visitId: data.visitId,
    serverRevision: data.serverRevision,
  };
}

// Every successful save advances the persisted revision by one, whatever changed (including checkboxes).
// The update only applies if the stored revision still equals the one this editor loaded, so a stale
// save reports a conflict instead of overwriting another editor. Saving never marks a draft approved.
export async function saveDraft(draftId: string, serverRevision: number, draft: EducationDraft): Promise<SaveResult> {
  const drawing = await persistDrawing(draft.drawing);
  const fields = {
    note: draft.note,
    english: draft.english,
    spanish: draft.spanish,
    plan_english: draft.planEnglish,
    plan_spanish: draft.planSpanish,
    caption_english: draft.captionEnglish,
    caption_spanish: draft.captionSpanish,
    include_procedure: draft.includeProcedure,
    delivery_language: draft.deliveryLanguage,
    resources: draft.resources,
    anatomy_notes: draft.anatomyNotes,
    checks: draft.checks,
    drawing_file_uri: drawing.fileUri,
    drawing_view: drawing.view,
  };
  const data = await invokeFunction("doctorSaveDraft", { draftId, serverRevision, fields });
  if (data.status === "saved") return { status: "saved", revision: data.revision, drawingFileUri: drawing.fileUri };
  return { status: "conflict" };
}

export async function saveContactAndAppointment(
  patientId: string,
  visitId: string,
  phone: string,
  address: string,
  appointment: { startsAt: string; endsAt: string; hospital: string; address: string },
): Promise<void> {
  await invokeFunction("doctorSaveContact", { patientId, visitId, phone, address, appointment });
}

// ─── Packet approval and patient link (server-side authorized) ────────────

export type ApprovalResult = { packetId: string; token: string; expiresAt: string; approvedAt: string };

export async function approvePacket(patientId: string, visitId: string, draftId: string, serverRevision: number): Promise<ApprovalResult> {
  const data = await invokeFunction("approvePacket", { patientId, visitId, draftId, serverRevision });
  return { packetId: data.packetId, token: data.token, expiresAt: data.expiresAt, approvedAt: data.approvedAt };
}

export async function getExistingPatientLink(patientId: string, visitId: string, draftId: string, serverRevision: number): Promise<{ token: string; expiresAt: string; matchesCurrentDraft: boolean; approvedAt: string } | null> {
  const data = await invokeFunction("doctorGetPatientLink", { patientId, visitId, draftId, serverRevision });
  return data.link ?? null;
}

export type PatientPacketView = {
  patientName: string;
  firstName: string;
  initials: string;
  deliveryLanguage: Language;
  english: string;
  spanish: string;
  planEnglish: string;
  planSpanish: string;
  captionEnglish: string;
  captionSpanish: string;
  includeProcedure: boolean;
  resources: ("pending" | "accepted" | "rejected")[];
  drawingUrl: string;
  drawingView: string;
  caseKind: "colon" | "general";
  appointment: { startsAt: string; endsAt: string; timeZone: string; hospital: string; address: string };
  startingAddress: string;
  approvedAt: string;
};

export type PatientLinkView = { callAttempts: number; callEndedAt: string; lastCallId: string };

export async function validatePatientLink(token: string): Promise<{ packet: PatientPacketView; link: PatientLinkView }> {
  const data = await invokeFunction("validatePatientLink", { token });
  return { packet: data.packet, link: data.link };
}

export async function startCall(token: string, mode: "self" | "tester", phone: string, consent: boolean): Promise<{ attemptsUsed: number }> {
  return invokeFunction("startCall", { token, mode, phone, consent });
}

// ─── Admin operations (explicit admins only; enforced by admin-only RLS) ───

export type MembershipStatus = "approved" | "pending" | "revoked" | "none";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  membership: MembershipStatus;
};

async function findMembership(userId: string): Promise<any | null> {
  const page = await base44.entities.CareTeamMembership.filter({ user_id: userId }, { limit: 1 }) as any;
  return (page.items ?? page)[0] ?? null;
}

export async function listUsers(): Promise<AdminUser[]> {
  await requireAdmin();
  const [users, memberships] = await Promise.all([
    base44.entities.User.list("-created_date", 100) as Promise<any[]>,
    base44.entities.CareTeamMembership.filter({}, { limit: 200 }) as Promise<any>,
  ]);
  const statusByUser = new Map<string, MembershipStatus>((memberships.items ?? memberships).map((m: any) => [m.user_id, m.status]));
  return users.map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    membership: statusByUser.get(u.id) ?? "none",
  }));
}

// Approval is always an explicit admin action on a chosen user. Email and name come from the stored
// User record, not from the caller, and nothing here ever approves the calling admin automatically.
export async function approveDoctor(userId: string): Promise<void> {
  await requireAdmin();
  const target = await base44.entities.User.get(userId) as any;
  const displayName = target.full_name || target.email;
  const existing = await findMembership(target.id);
  if (existing) {
    await base44.entities.CareTeamMembership.update(existing.id, { status: "approved", display_name: displayName } as any);
  } else {
    await base44.entities.CareTeamMembership.create({ user_id: target.id, email: target.email, display_name: displayName, status: "approved" } as any);
  }
}

export async function provisionDemoData(doctorUserId: string): Promise<number> {
  await requireAdmin();
  const membership = await findMembership(doctorUserId);
  if (!membership || membership.status !== "approved") throw new Error("Approve this person's care-team membership before assigning patients.");

  const seeds = [
    { name: "María Rivera", firstName: "María", initials: "MR", phone: "+12025550101", address: "120 Example Street", caseKind: "colon" as const, day: 12, hour: 14 },
    { name: "José García", firstName: "José", initials: "JG", phone: "+12025550102", address: "240 Sample Lane", caseKind: "general" as const, day: 13, hour: 15 },
    { name: "Ana López", firstName: "Ana", initials: "AL", phone: "+12025550103", address: "360 Fictional Road", caseKind: "general" as const, day: 14, hour: 13 },
  ];

  let count = 0;
  for (const seed of seeds) {
    const patient = await base44.entities.Patient.create({
      name: seed.name,
      first_name: seed.firstName,
      initials: seed.initials,
      phone: seed.phone,
      address: seed.address,
      preferred_language: "es",
      case_kind: seed.caseKind,
      assigned_doctor_id: doctorUserId,
      assigned_doctor_email: membership.email,
      is_synthetic_demo: true,
    } as any);

    const visit = await base44.entities.Visit.create({
      patient_id: patient.id,
      assigned_doctor_id: doctorUserId,
      completed_at: "2026-10-10T16:00:00Z",
      appointment_starts_at: `2026-10-${seed.day}T${seed.hour}:30:00Z`,
      appointment_ends_at: `2026-10-${seed.day}T${seed.hour + 1}:30:00Z`,
      appointment_time_zone: "America/New_York",
      appointment_hospital: "Central Community Hospital",
      appointment_address: "500 Demo Avenue",
      doctor_source_note: `FICTIONAL DEMO NOTE · ${seed.name}\nCompleted visit. Follow-up appointment saved in this patient's record. No diagnosis or medication change is recorded in this sample.`,
    } as any);

    const draftContent = seed.caseKind === "colon"
      ? initialEducation
      : {
          ...initialEducation,
          note: `FICTIONAL DEMO NOTE · ${seed.name}\nCompleted visit. Follow-up appointment saved in this patient's record.`,
          english: `At your visit, ${seed.firstName}, we discussed your follow-up appointment and the questions you want to bring to your care team. This sample record does not include a diagnosis or a medication change.`,
          spanish: `En su visita, ${seed.firstName}, hablamos de su cita de seguimiento y las preguntas para su equipo de atención. Este registro de ejemplo no incluye un diagnóstico ni un cambio de medicamento.`,
          planEnglish: "Review your saved appointment. Bring your questions to the care team. Use Help if you need assistance with transportation.",
          planSpanish: "Revise su cita guardada. Lleve sus preguntas al equipo de atención. Use Ayuda si necesita apoyo con transporte.",
          captionEnglish: "No educational illustration is included in this sample packet.",
          captionSpanish: "No se incluye una ilustración educativa en este paquete de ejemplo.",
          resources: [] as ("pending" | "accepted" | "rejected")[],
        };

    await base44.entities.EducationDraft.create({
      patient_id: patient.id,
      visit_id: visit.id,
      assigned_doctor_id: doctorUserId,
      revision: draftContent.revision,
      note: draftContent.note,
      english: draftContent.english,
      spanish: draftContent.spanish,
      plan_english: draftContent.planEnglish,
      plan_spanish: draftContent.planSpanish,
      caption_english: draftContent.captionEnglish,
      caption_spanish: draftContent.captionSpanish,
      include_procedure: draftContent.includeProcedure,
      delivery_language: draftContent.deliveryLanguage,
      resources: draftContent.resources,
      anatomy_notes: draftContent.anatomyNotes,
      checks: draftContent.checks,
      drawing_file_uri: "",
      drawing_view: "",
    } as any);
    count++;
  }
  return count;
}