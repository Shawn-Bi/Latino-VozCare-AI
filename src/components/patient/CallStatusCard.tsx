import type { Language } from "../../workflow";

export type CallState = "none" | "requesting" | "requested" | "ended" | "error";

// Only states the app actually knows: no live webhook exists, so after the call
// service accepts a request we say "requested", never "connected".
export default function CallStatusCard({ state, language }: { state: CallState; language: Language }) {
  const es = language === "es";
  const text = {
    none: [es ? "Aún no hay llamada" : "No call yet", es ? "Cuando estés listo, pide la llamada abajo. Tú decides cuándo empieza." : "When you are ready, request the call below. You decide when it starts."],
    requesting: [es ? "Pidiendo la llamada…" : "Requesting the call…", es ? "Espera un momento." : "Please wait a moment."],
    requested: [es ? "Llamada solicitada" : "Call requested", es ? "Tu teléfono debería sonar pronto. Contesta para hablar con VozCare. Esta página no muestra la llamada en vivo." : "Your phone should ring soon. Answer to talk with VozCare. This page does not show the call live."],
    ended: [es ? "La última llamada terminó" : "Your last call ended", es ? "Puedes pedir otra llamada si te quedan intentos." : "You can request another call if you have attempts left."],
    error: [es ? "La llamada no empezó" : "The call did not start", es ? "Revisa el mensaje abajo. Tu información sigue en Detalles completos." : "See the message below. Your information is still in Full details."],
  }[state];
  return <section className={`pv-card pv-status ${state}`} aria-live="polite">
    <span className="pv-dot" aria-hidden="true" />
    <div><h2>{text[0]}</h2><p>{text[1]}</p></div>
  </section>;
}