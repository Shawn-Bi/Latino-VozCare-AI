import { canApproveEducation, initialEducation, type EducationDraft, type ResourceDecision, type SavedDrawing } from "./education.ts";

export type Language = "en" | "es";
export type CardType = "appointment" | "address" | "route" | "transport" | "care" | "help";
export type TaskStatus = "Open" | "In progress" | "Resolved";
export type FollowUpStatus = "Scheduled" | "Ready for follow-up" | "Call in progress" | "Conversation ended";
export type Appointment = { id: string; startsAt: string; endsAt: string; timeZone: string; hospital: string; address: string };
export type Patient = { id: string; doctorId: string; name: string; firstName: string; initials: string; phone: string; address: string; preferredLanguage: Language; caseKind: "colon" | "general" };
export type Visit = { id: string; patientId: string; completedAt: string; appointment: Appointment };
// Contains only patient-facing fields. Source notes and anatomy annotations stay in the doctor record.
export type PatientPacket = {
  id: string; patientId: string; visitId: string; revision: number; approvedAt: string; approvedBy: string;
  deliveryLanguage: Language; english: string; spanish: string; planEnglish: string; planSpanish: string;
  captionEnglish: string; captionSpanish: string; includeProcedure: boolean; resources: ResourceDecision[];
  drawing: SavedDrawing | null; caseKind: Patient["caseKind"]; appointment: Appointment; startingAddress: string;
};
export type AccessLink = { id: string; token: string; patientId: string; packetId: string; expiresAt: string; revokedAt: string | null; openedAt: string | null };
export type Delivery = { status: "Not sent" | "Sent in demo" | "Failed in demo"; phone: string; sentAt: string | null };
export type AgentAction = "show_appointment" | "show_directions" | "show_education" | "show_help" | "request_transportation" | "end_call";
export type ConversationEvent = { id: string; patientId: string; sessionId: string; packetId: string; action: AgentAction; statement: string; language: Language; at: string; confirmed?: boolean };
export type DemoState = {
  nextDay: boolean; followUpStatus: FollowUpStatus; sentText: boolean; cards: CardType[]; activeCard: CardType | null;
  latestPatientStatement: string; latestPatientStatementLanguage: Language | null;
  appointmentStatement: string; appointmentStatementLanguage: Language | null; agentReply: string;
  transportationStatement: string; transportationStatementLanguage: Language | null; startingAddress: string;
  routeConfirmedAddress: string; taskCreated: boolean; taskStatus: TaskStatus;
};
export type FollowUpSession = DemoState & { id: string; patientId: string; packetId: string | null; openedAt: string | null; callAttempts: number; callState: "Not started" | "Calling" | "Connected" | "No answer" | "Ended"; events: ConversationEvent[] };
export type PatientRecord = { patient: Patient; visit: Visit; draft: EducationDraft; packet: PatientPacket | null; access: AccessLink | null; delivery: Delivery; session: FollowUpSession };
export type Workspace = { version: 1; records: PatientRecord[] };
export const demoDoctor = { id: "doctor-demo-1", name: "Dr. Elena Morales", team: "Demo care team" };
export const initialDemo: DemoState = {
  nextDay: false, followUpStatus: "Scheduled", sentText: false, cards: [], activeCard: null,
  latestPatientStatement: "", latestPatientStatementLanguage: null, appointmentStatement: "", appointmentStatementLanguage: null,
  agentReply: "Hola. Estoy aquí para ayudarte a entender tu cuidado.", transportationStatement: "", transportationStatementLanguage: null,
  startingAddress: "120 Example Street", routeConfirmedAddress: "", taskCreated: false, taskStatus: "Open",
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function initialWorkspace(): Workspace {
  return { version: 1, records: [
    { id: "maria", name: "María Rivera", firstName: "María", initials: "MR", phone: "+12025550101", address: "120 Example Street", caseKind: "colon", day: 12, hour: 14 },
    { id: "jose", name: "José García", firstName: "José", initials: "JG", phone: "+12025550102", address: "240 Sample Lane", caseKind: "general", day: 13, hour: 15 },
    { id: "ana", name: "Ana López", firstName: "Ana", initials: "AL", phone: "+12025550103", address: "360 Fictional Road", caseKind: "general", day: 14, hour: 13 },
  ].map((seed) => {
    const patient: Patient = { id: seed.id, name: seed.name, firstName: seed.firstName, initials: seed.initials, phone: seed.phone, address: seed.address, doctorId: demoDoctor.id, preferredLanguage: "es", caseKind: seed.caseKind as Patient["caseKind"] };
    const appointment: Appointment = { id: `appointment-${seed.id}`, startsAt: `2026-10-${seed.day}T${seed.hour}:30:00Z`, endsAt: `2026-10-${seed.day}T${seed.hour + 1}:30:00Z`, timeZone: "America/New_York", hospital: "Central Community Hospital", address: "500 Demo Avenue" };
    const draft = seed.id === "maria" ? clone(initialEducation) : {
      ...clone(initialEducation), note: `FICTIONAL DEMO NOTE · ${seed.name}\nCompleted visit. Follow-up appointment saved in this patient's record. No diagnosis or medication change is recorded in this sample.`,
      english: `At your visit, ${seed.firstName}, we discussed your follow-up appointment and the questions you want to bring to your care team. This sample record does not include a diagnosis or a medication change.`,
      spanish: `En su visita, ${seed.firstName}, hablamos de su cita de seguimiento y las preguntas para su equipo de atención. Este registro de ejemplo no incluye un diagnóstico ni un cambio de medicamento.`,
      planEnglish: "Review your saved appointment. Bring your questions to the care team. Use Help if you need assistance with transportation.",
      planSpanish: "Revise su cita guardada. Lleve sus preguntas al equipo de atención. Use Ayuda si necesita apoyo con transporte.",
      captionEnglish: "No educational illustration is included in this sample packet.", captionSpanish: "No se incluye una ilustración educativa en este paquete de ejemplo.", resources: [],
    };
    return { patient, visit: { id: `visit-${seed.id}-20261010`, patientId: seed.id, completedAt: "2026-10-10T16:00:00Z", appointment }, draft,
      packet: null, access: null, delivery: { status: "Not sent", phone: seed.phone, sentAt: null },
      session: { ...clone(initialDemo), id: `session-${seed.id}`, patientId: seed.id, packetId: null, openedAt: null, callAttempts: 0, callState: "Not started", events: [], startingAddress: seed.address },
    };
  }) };
}
export function deliveryProblem(record: PatientRecord): string | null {
  if (!/^\+[1-9]\d{7,14}$/.test(record.patient.phone)) return "Add a valid phone number, including its country code.";
  if (!record.patient.address.trim()) return "Add the patient's saved starting address before sending.";
  if (!record.visit.appointment.hospital.trim() || !record.visit.appointment.address.trim() || !Number.isFinite(Date.parse(record.visit.appointment.startsAt))) return "Complete the saved appointment before sending.";
  return null;
}
export function approveAndSend(record: PatientRecord, now = new Date().toISOString()): PatientRecord {
  if (!canApproveEducation(record.draft) || deliveryProblem(record)) throw new Error("Review the packet and delivery details before approval.");
  if (record.draft.approvedAt && record.packet?.revision === record.draft.revision) return record;
  const d = record.draft;
  const packet: PatientPacket = clone({ id: id("packet"), patientId: record.patient.id, visitId: record.visit.id, revision: d.revision, approvedAt: now, approvedBy: record.patient.doctorId,
    deliveryLanguage: d.deliveryLanguage, english: d.english, spanish: d.spanish, planEnglish: d.planEnglish, planSpanish: d.planSpanish,
    captionEnglish: d.captionEnglish, captionSpanish: d.captionSpanish, includeProcedure: d.includeProcedure, resources: d.resources, drawing: d.drawing, caseKind: record.patient.caseKind, appointment: record.visit.appointment, startingAddress: record.patient.address });
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, "0")).join("");
  return { ...record, draft: { ...d, approvedAt: now }, packet,
    access: { id: id("access"), token, patientId: record.patient.id, packetId: packet.id, expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(), revokedAt: null, openedAt: null },
    delivery: { status: "Sent in demo", phone: record.patient.phone, sentAt: now },
    session: { ...clone(initialDemo), id: id("session"), patientId: record.patient.id, packetId: packet.id, openedAt: null, callAttempts: 0, callState: "Not started", events: [], sentText: true, startingAddress: record.patient.address,
      // Staff requests belong to the patient. Replacing a packet must not erase an existing request.
      ...(record.session.taskCreated ? { taskCreated: true, taskStatus: record.session.taskStatus, transportationStatement: record.session.transportationStatement, transportationStatementLanguage: record.session.transportationStatementLanguage } : {}),
    },
  };
}
export type LinkResult = { record: PatientRecord | null; error: "invalid" | "expired" | "revoked" | null };
export function resolveLink(workspace: Workspace, token: string, now = Date.now()): LinkResult {
  const record = workspace.records.find((item) => item.access?.token === token);
  if (!record || !record.access || !record.packet || record.access.patientId !== record.patient.id || record.access.packetId !== record.packet.id) return { record: null, error: "invalid" };
  if (record.access.revokedAt) return { record: null, error: "revoked" };
  if (!Number.isFinite(Date.parse(record.access.expiresAt)) || Date.parse(record.access.expiresAt) <= now) return { record: null, error: "expired" };
  return { record, error: null };
}
// Called by a browser session, never by the link GET itself. The real backend must enforce this once-only rule.
export function openPatientLink(record: PatientRecord, now = new Date().toISOString()): PatientRecord {
  if (!record.access || !record.packet || record.access.packetId !== record.packet.id || record.access.patientId !== record.patient.id || record.access.revokedAt || Date.parse(record.access.expiresAt) <= Date.parse(now)) return record;
  if (record.session.openedAt) return record;
  return { ...record, access: { ...record.access, openedAt: now }, session: { ...record.session, openedAt: now, callAttempts: 1, callState: "Connected", followUpStatus: "Call in progress", cards: ["care"], activeCard: "care", agentReply: record.packet.deliveryLanguage === "es" ? `Hola, ${record.patient.firstName}. Revisemos la información que aprobó tu equipo.` : `Hello, ${record.patient.firstName}. Let's review the information your team approved.` } };
}
export function retryCall(record: PatientRecord): PatientRecord {
  if (record.session.callState !== "No answer" || !record.access || record.access.revokedAt || Date.parse(record.access.expiresAt) <= Date.now()) return record;
  return { ...record, session: { ...record.session, callAttempts: record.session.callAttempts + 1, callState: "Connected", followUpStatus: "Call in progress" } };
}
export function inferAction(statement: string): AgentAction {
  const text = statement.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(ride|transportation|transporte)\b/.test(text)) return "request_transportation";
  if (/get there|where to go|directions|como llegar|donde ir|address|direccion/.test(text)) return "show_directions";
  if (/appointment|next week|cita|proxima semana/.test(text)) return "show_appointment";
  if (/understand|explain|care|education|entend|explica|cuidado/.test(text)) return "show_education";
  return "show_help";
}
export function applyConversationEvent(record: PatientRecord, event: ConversationEvent): PatientRecord {
  const s = record.session;
  const websiteRequest = event.action === "request_transportation" && event.confirmed && !!s.openedAt;
  if (!record.access || record.access.revokedAt || Date.parse(record.access.expiresAt) <= Date.now() || !record.packet || event.patientId !== record.patient.id || event.sessionId !== s.id || event.packetId !== record.packet.id || s.events.some((old) => old.id === event.id) || (s.callState !== "Connected" && !websiteRequest)) return record;
  const es = event.language === "es";
  const card: CardType = event.action === "show_appointment" ? "appointment" : event.action === "show_directions" ? (s.startingAddress.trim() ? "route" : "address") : event.action === "show_education" ? "care" : event.action === "request_transportation" ? "transport" : "help";
  const reply = event.action === "show_appointment" ? (es ? "Aquí está tu cita guardada. Tu comentario no cambió la cita." : "Here is your saved appointment. Your statement did not change it.") : event.action === "show_directions" ? (es ? "Aquí está la ruta desde tu dirección guardada." : "Here is the route from your saved starting address.") : event.action === "show_education" ? (es ? "Aquí está la explicación que aprobó tu equipo." : "Here is the explanation your team approved.") : event.action === "request_transportation" ? (es ? "Puedes confirmar una solicitud para que el personal revise opciones de transporte." : "You can confirm a request for staff to review transportation options.") : (es ? "Puedes pedir ayuda a tu equipo." : "You can ask your care team for help.");
  const task = event.action === "request_transportation";
  return { ...record, session: { ...s, events: [...s.events, event],
    latestPatientStatement: event.statement || s.latestPatientStatement, latestPatientStatementLanguage: event.statement ? event.language : s.latestPatientStatementLanguage,
    agentReply: reply, cards: event.action === "end_call" ? s.cards : [...new Set([...s.cards, card])], activeCard: event.action === "end_call" ? s.activeCard : card,
    ...(event.action === "show_appointment" && event.statement ? { appointmentStatement: event.statement, appointmentStatementLanguage: event.language } : {}),
    ...(task ? { transportationStatement: event.statement || s.transportationStatement, transportationStatementLanguage: event.language, taskCreated: s.taskCreated || !!event.confirmed, taskStatus: s.taskCreated ? s.taskStatus : "Open" as TaskStatus } : {}),
    ...(event.action === "end_call" ? { callState: "Ended" as const, followUpStatus: "Conversation ended" as const } : {}),
  } };
}
export function makeEvent(record: PatientRecord, action: AgentAction, statement: string, language: Language, confirmed = false): ConversationEvent {
  return { id: id("event"), patientId: record.patient.id, sessionId: record.session.id, packetId: record.packet?.id ?? "", action, statement, language, confirmed, at: new Date().toISOString() };
}
export function appointmentLabel(appointment: Appointment, language: Language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", { dateStyle: "full", timeStyle: "short", timeZone: appointment.timeZone }).format(new Date(appointment.startsAt));
}

export function localAppointmentValue(appointment: Appointment): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: appointment.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(appointment.startsAt));
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function appointmentInstant(localValue: string, timeZone: string): string {
  const [y, m, d, h, min] = localValue.split(/[-T:]/).map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  if (!Number.isFinite(target)) throw new Error("Enter a valid appointment date and time.");
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date(instant));
    const part = (name: string) => Number(parts.find((item) => item.type === name)?.value);
    instant += target - Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  }
  const result = new Date(instant).toISOString();
  if (localAppointmentValue({ startsAt: result, timeZone } as Appointment) !== localValue) throw new Error("This time is unavailable in the appointment's time zone. Choose another time.");
  return result;
}
export function renewPatientLink(record: PatientRecord, now = new Date().toISOString()): PatientRecord {
  if (!record.packet) return record;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => value.toString(16).padStart(2, "0")).join("");
  return { ...record, access: { id: id("access"), token, patientId: record.patient.id, packetId: record.packet.id, expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(), revokedAt: null, openedAt: record.session.openedAt }, delivery: { status: "Sent in demo", phone: record.patient.phone, sentAt: now } };
}
