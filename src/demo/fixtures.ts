import { demoAppointment, demoStartingAddress } from "../../base44/shared/demoScenario.ts";
// Public, hardcoded fictional demo fixtures. Never loaded from or saved to the server.
import { initialEducation, type EducationDraft } from "@/education";
import type { Patient, Visit } from "@/workflow";
import type { PatientPacketView } from "@/lib/vozcare-api";

export type DemoRecord = { patient: Patient; visit: Visit; draft: EducationDraft };

const seeds = [
  { id: "demo-maria", name: "María Rivera", firstName: "María", initials: "MR", address: demoStartingAddress, caseKind: "colon" as const, day: 12, hour: 14 },
  { id: "demo-jose", name: "José García", firstName: "José", initials: "JG", address: "240 Sample Lane", caseKind: "general" as const, day: 13, hour: 15 },
  { id: "demo-ana", name: "Ana López", firstName: "Ana", initials: "AL", address: "360 Fictional Road", caseKind: "general" as const, day: 14, hour: 13 },
];

function generalDraft(name: string, first: string): EducationDraft {
  return {
    ...initialEducation,
    note: `FICTIONAL DEMO NOTE · ${name}\nCompleted visit. Follow-up appointment saved in this patient's record.`,
    english: `At your visit, ${first}, we discussed your follow-up appointment and the questions you want to bring to your care team. This sample record does not include a diagnosis or a medication change.`,
    spanish: `En su visita, ${first}, hablamos de su cita de seguimiento y las preguntas para su equipo de atención. Este registro de ejemplo no incluye un diagnóstico ni un cambio de medicamento.`,
    planEnglish: "Review your saved appointment. Bring your questions to the care team.",
    planSpanish: "Revise su cita guardada. Lleve sus preguntas al equipo de atención.",
    captionEnglish: "No educational illustration is included in this sample packet.",
    captionSpanish: "No se incluye una ilustración educativa en este paquete de ejemplo.",
    resources: [],
  };
}

export function createDemoRecords(): DemoRecord[] {
  return seeds.map((s) => ({
    patient: { id: s.id, doctorId: "demo", name: s.name, firstName: s.firstName, initials: s.initials, phone: "Demo · no phone", address: s.address, preferredLanguage: "es", caseKind: s.caseKind },
    visit: { id: `${s.id}-visit`, patientId: s.id, completedAt: "2026-10-10T16:00:00Z", appointment: s.id === "demo-maria" ? { id: `${s.id}-appt`, ...demoAppointment } : { id: `${s.id}-appt`, startsAt: `2026-10-${s.day}T${s.hour}:30:00Z`, endsAt: `2026-10-${s.day}T${s.hour + 1}:30:00Z`, timeZone: "America/New_York", hospital: "Central Community Hospital", address: "500 Demo Avenue" } },
    draft: s.caseKind === "colon" ? { ...initialEducation } : generalDraft(s.name, s.firstName),
  } as DemoRecord));
}

export function toDemoPacket(r: DemoRecord): PatientPacketView {
  const d = r.draft, a = r.visit.appointment;
  return {
    patientName: r.patient.name, firstName: r.patient.firstName, initials: r.patient.initials, deliveryLanguage: d.deliveryLanguage,
    english: d.english, spanish: d.spanish, planEnglish: d.planEnglish, planSpanish: d.planSpanish,
    captionEnglish: d.captionEnglish, captionSpanish: d.captionSpanish, includeProcedure: d.includeProcedure,
    resources: d.resources, drawingUrl: d.drawing?.image ?? "", drawingView: d.drawing?.view ?? "", caseKind: r.patient.caseKind,
    appointment: { startsAt: a.startsAt, endsAt: a.endsAt, timeZone: a.timeZone, hospital: a.hospital, address: a.address },
    startingAddress: r.patient.address, approvedAt: "",
  };
}
// The public demo call uses a fixed server-side scenario, not edited preview text.
export function matchesDemoCall(packet: PatientPacketView): boolean {
  const reference = toDemoPacket(createDemoRecords()[0]);
  return ["patientName", "firstName", "english", "spanish", "planEnglish", "planSpanish", "captionEnglish", "captionSpanish", "includeProcedure", "startingAddress", "caseKind"].every((field) => packet[field as keyof PatientPacketView] === reference[field as keyof PatientPacketView])
    && JSON.stringify(packet.appointment) === JSON.stringify(reference.appointment);
}
