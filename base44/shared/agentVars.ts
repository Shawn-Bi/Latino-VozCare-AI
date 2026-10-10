// Builds the dynamic variables the ElevenLabs agent prompt and first message expect.
export function agentVars(v: {
  firstName: string; language: string; startsAt: string; timeZone: string;
  hospital: string; address: string; startingAddress: string; careSummary: string; carePlan: string;
}): Record<string, string> {
  const es = v.language !== "en";
  const start = v.startsAt ? new Date(v.startsAt) : null;
  const tz = v.timeZone || "America/New_York";
  const fmt = (o: Intl.DateTimeFormatOptions) => start ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { ...o, timeZone: tz }).format(start) : "";
  const name = v.firstName || "";
  return {
    greeting: es
      ? `Hola, ${name}. ¿English o español? ¿Qué le gustaría saber sobre su visita anterior?`
      : `Hi, ${name}. English or Español? What would you like to know about your previous visit?`,
    patient_name: name,
    patient_language: es ? "Spanish" : "English",
    approved_care_summary: v.careSummary || "",
    approved_care_plan: v.carePlan || "",
    appointment_date: fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    appointment_time: fmt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
    hospital_name: v.hospital || "",
    hospital_address: v.address || "",
    starting_address: v.startingAddress || "",
  };
}