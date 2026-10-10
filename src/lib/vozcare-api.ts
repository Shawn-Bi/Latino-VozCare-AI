import { base44 } from "@/api/base44Client";
import { initialEducation, type EducationDraft } from "@/education";
import type { Patient, Visit, Appointment, Language } from "@/workflow";

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
  approved_at: string | null;
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

function mapDraft(d: ServerDraft): EducationDraft {
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
    drawing: null, // drawing stays local-only; not persisted to server
    anatomyNotes: d.anatomy_notes ?? [],
    checks: d.checks ?? { note: false, language: false, visual: false },
    approvedAt: d.approved_at ?? null,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export type PatientListEntry = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  phone: string;
  caseKind: "colon" | "general";
  preferredLanguage: Language;
  draftApproved: boolean;
  draftRevision: number;
  appointmentStartsAt: string;
  appointmentTimeZone: string;
};

export type LoadedPatientData = {
  patient: Patient;
  visit: Visit;
  draft: EducationDraft;
  draftId: string;
  visitId: string;
  serverRevision: number;
};

export type SaveResult = { success: boolean; conflict: boolean };

// Load the patients assigned to the current doctor (RLS filters server-side).
export async function loadAssignedPatients(): Promise<PatientListEntry[]> {
  const patients = await base44.entities.Patient.filter({}, { sort: "-created_date", limit: 50 }) as any;
  const patientItems = patients.items ?? patients;
  if (patientItems.length === 0) return [];

  // Load the latest draft and visit for each patient in one batch each.
  const patientIds = patientItems.map((p: any) => p.id);
  const [visitsPage, draftsPage] = await Promise.all([
    base44.entities.Visit.filter({ patient_id: { $in: patientIds } }, { sort: "-created_date", limit: 200 }) as any,
    base44.entities.EducationDraft.filter({ patient_id: { $in: patientIds } }, { sort: "-revision", limit: 200 }) as any,
  ]);
  const visits = visitsPage.items ?? visitsPage;
  const drafts = draftsPage.items ?? draftsPage;

  return patientItems.map((p: ServerPatient) => {
    const v = visits.find((v: ServerVisit) => v.patient_id === p.id);
    const d = drafts.find((d: ServerDraft) => d.patient_id === p.id);
    return {
      id: p.id,
      name: p.name,
      firstName: p.first_name,
      initials: p.initials,
      phone: p.phone,
      caseKind: p.case_kind,
      preferredLanguage: p.preferred_language,
      draftApproved: !!d?.approved_at,
      draftRevision: d?.revision ?? 1,
      appointmentStartsAt: v?.appointment_starts_at ?? "",
      appointmentTimeZone: v?.appointment_time_zone ?? "America/New_York",
    };
  });
}

// Load a single patient's full data (patient + visit + draft).
export async function loadPatientData(patientId: string): Promise<LoadedPatientData> {
  const patient = await base44.entities.Patient.get(patientId) as ServerPatient;
  const visits = await base44.entities.Visit.filter({ patient_id: patientId }, { sort: "-created_date", limit: 1 }) as any;
  const visitItems = visits.items ?? visits;
  if (visitItems.length === 0) throw new Error("No visit found for this patient.");
  const visit = visitItems[0] as ServerVisit;

  const drafts = await base44.entities.EducationDraft.filter({ patient_id: patientId }, { sort: "-revision", limit: 1 }) as any;
  const draftItems = drafts.items ?? drafts;
  if (draftItems.length === 0) throw new Error("No education draft found for this patient.");
  const draft = draftItems[0] as ServerDraft;

  return {
    patient: mapPatient(patient),
    visit: mapVisit(visit),
    draft: mapDraft(draft),
    draftId: draft.id,
    visitId: visit.id,
    serverRevision: draft.revision,
  };
}

// Save draft with optimistic-concurrency revision check.
export async function saveDraft(draftId: string, serverRevision: number, draft: EducationDraft): Promise<SaveResult> {
  const $set: Record<string, any> = {
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
    approved_at: draft.approvedAt,
    revision: draft.revision,
  };
  try {
    const result = await base44.entities.EducationDraft.updateMany(
      { id: draftId, revision: serverRevision } as any,
      { $set },
    );
    return { success: result.updated > 0, conflict: result.updated === 0 };
  } catch (err: any) {
    return { success: false, conflict: false };
  }
}

// Approve a draft: save content AND set approved_at in one revision-checked operation.
export async function approveDraft(draftId: string, serverRevision: number, draft: EducationDraft, now: string): Promise<SaveResult> {
  const $set: Record<string, any> = {
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
    approved_at: now,
    revision: draft.revision,
  };
  try {
    const result = await base44.entities.EducationDraft.updateMany(
      { id: draftId, revision: serverRevision } as any,
      { $set },
    );
    return { success: result.updated > 0, conflict: result.updated === 0 };
  } catch {
    return { success: false, conflict: false };
  }
}

// Save contact details (patient) and appointment fields (visit).
export async function saveContactAndAppointment(
  patientId: string,
  visitId: string,
  phone: string,
  address: string,
  appointment: { startsAt: string; endsAt: string; hospital: string; address: string },
): Promise<boolean> {
  await base44.entities.Patient.update(patientId, { phone, address } as any);
  await base44.entities.Visit.update(visitId, {
    appointment_starts_at: appointment.startsAt,
    appointment_ends_at: appointment.endsAt,
    appointment_hospital: appointment.hospital,
    appointment_address: appointment.address,
  } as any);
  return true;
}

// ─── Admin operations ──────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  care_team_approved: boolean;
  care_team_display_name: string;
};

export async function listUsers(): Promise<AdminUser[]> {
  const users = await base44.entities.User.list("-created_date", 100) as any[];
  return users.map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    care_team_approved: !!u.care_team_approved,
    care_team_display_name: u.care_team_display_name ?? "",
  }));
}

export async function approveDoctor(userId: string, email: string, displayName: string): Promise<void> {
  await base44.entities.User.update(userId, {
    care_team_approved: true,
    care_team_display_name: displayName || email,
  } as any);

  // Create or update CareTeamMembership
  const existing = await base44.entities.CareTeamMembership.filter({ user_id: userId }) as any;
  const existingItems = existing.items ?? existing;
  if (existingItems.length === 0) {
    await base44.entities.CareTeamMembership.create({
      user_id: userId,
      email,
      display_name: displayName || email,
      status: "approved",
    } as any);
  } else {
    await base44.entities.CareTeamMembership.update(existingItems[0].id, {
      status: "approved",
      display_name: displayName || email,
    } as any);
  }
}

export async function provisionDemoData(doctorUserId: string, doctorEmail: string): Promise<number> {
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
      assigned_doctor_email: doctorEmail,
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
      approved_at: draftContent.approvedAt,
    } as any);
    count++;
  }
  return count;
}