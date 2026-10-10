import type { Language } from "../../workflow";

// Server messages arrive in English; map known ones to short bilingual, actionable text.
export function linkErrorText(message: string, language: Language) {
  const es = language === "es";
  const m = message.toLowerCase();
  if (m.includes("expired")) return es ? "Este enlace ya venció. Pide a tu equipo de atención un enlace nuevo." : "This link has expired. Ask your care team for a new link.";
  if (m.includes("revoked")) return es ? "Este enlace ya no está activo. Pide a tu equipo de atención un enlace nuevo." : "This link is no longer active. Ask your care team for a new link.";
  if (m.includes("not valid") || m.includes("required") || m.includes("not available")) return es ? "No pudimos abrir este enlace. Revisa que esté completo o pide uno nuevo a tu equipo." : "We could not open this link. Check that it is complete, or ask your care team for a new one.";
  return es ? "No pudimos cargar tu información. Revisa tu conexión e inténtalo de nuevo." : "We could not load your information. Check your connection and try again.";
}

export function callErrorText(message: string, language: Language) {
  const es = language === "es";
  const m = message.toLowerCase();
  if (m.includes("limit") || m.includes("attempt")) return es ? "Ya se usaron los 3 intentos de llamada de este enlace." : "All 3 call attempts for this link have been used.";
  if (m.includes("us ") || m.includes("phone") || m.includes("number")) return es ? "Revisa el número. Debe ser un número de EE. UU. de 10 dígitos." : "Check the number. It must be a 10-digit US number.";
  if (m.includes("consent")) return es ? "Marca la casilla para confirmar que el número es tuyo." : "Check the box to confirm the number is yours.";
  return es ? "No se pudo iniciar la llamada. Inténtalo de nuevo en unos minutos." : "The call could not be started. Try again in a few minutes.";
}