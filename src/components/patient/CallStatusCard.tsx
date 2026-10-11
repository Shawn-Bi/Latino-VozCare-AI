import type { Language } from "../../workflow";

export type CallState = "none" | "requesting" | "requested" | "ended" | "error";

// Only states the app actually knows: no live webhook exists, so after the call
// service accepts a request we say "requested", never "connected".
export default function CallStatusCard({ state, language }: { state: CallState; language: Language }) {
  const es = language === "es";
  const text = {
    none: [es ? "Aún no hay llamada" : "No call yet", es ? "Cuando estés listo, pide la llamada abajo. Tú decides cuándo empieza." : "When you are ready, request the call below. You decide when it starts."],
    requesting: [es ? "Pidiendo la llamada…" : "Requesting the call…", es ? "Espera un momento." : "Please wait a moment."],
    requested: [es ? "Llamada solicitada" : "Call requested", es ? "Tu teléfono debería sonar pronto. Contesta para hablar con VozCare. Lo que preguntes aparecerá en esta tarjeta." : "Your phone should ring soon. Answer to talk with VozCare. What you ask about will appear on this card."],
    ended: [es ? "Llamada terminada" : "Call ended", es ? "Revisa lo que hablamos en Detalles completos. Puedes pedir otra llamada si quedan intentos." : "Review what we discussed in Full details. You can request another call if attempts remain."],
    error: [es ? "La llamada no empezó" : "Call did not start", es ? "Puedes intentarlo de nuevo si te quedan intentos. Tu información sigue en Detalles completos." : "You can try again if you have attempts left. Your information is still in Full details."],
  }[state];
  return <section className={`pv-card pv-status ${state}`} aria-live="polite">
    <span className="pv-dot" aria-hidden="true" />
    <div><h2>{text[0]}</h2><p>{text[1]}</p></div>
  </section>;
}