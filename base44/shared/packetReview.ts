// A live link can describe an older approved packet. It is not evidence that
// the current draft, appointment or patient details have been approved.
export function packetMatchesReview(packet: any, draft: any, visit: any, patient: any): boolean {
  if (!packet || !draft || !visit || !patient) return false;
  if (packet.patient_id !== patient.id || packet.visit_id !== visit.id || draft.visit_id !== visit.id || packet.revision !== draft.revision) return false;
  const fields = ["english", "spanish", "plan_english", "plan_spanish", "caption_english", "caption_spanish", "delivery_language", "include_procedure", "drawing_file_uri", "drawing_view"];
  const normalized = (record: any, field: string) => field === "include_procedure" ? !!record[field] : field === "delivery_language" ? record[field] || "es" : record[field] || "";
  if (fields.some((field) => normalized(packet, field) !== normalized(draft, field))) return false;
  if (JSON.stringify(packet.resources || []) !== JSON.stringify(draft.resources || [])) return false;
  const appointment = ["appointment_starts_at", "appointment_ends_at", "appointment_time_zone", "appointment_hospital", "appointment_address"];
  return appointment.every((field) => (packet[field] || (field === "appointment_time_zone" ? "America/New_York" : "")) === (visit[field] || (field === "appointment_time_zone" ? "America/New_York" : "")))
    && packet.starting_address === patient.address
    && packet.patient_name === patient.name;
}
