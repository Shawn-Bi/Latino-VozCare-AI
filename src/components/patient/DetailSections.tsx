import { lazy, Suspense } from "react";
import type { PatientPacketView } from "../../lib/vozcare-api";

const ColonModel = lazy(() => import("../../ColonModel"));
import type { Language } from "../../workflow";
import AppointmentCalendar from "./AppointmentCalendar";
import DirectionsCard from "./DirectionsCard";

type P = { p: PatientPacketView; language: Language };
const missingText = (es: boolean) => es ? "Tu equipo aún no guardó esta información." : "Your care team has not saved this yet.";

export function CareSection({ p, language }: P) {
  const es = language === "es";
  return <section className="pv-card pv-care-summary" aria-labelledby="d-care">
    <div><h2 id="d-care">{es ? "Lo que hablamos en tu visita" : "What we discussed at your visit"}</h2>
    <p>{(es ? p.spanish : p.english) || missingText(es)}</p>
    </div><div><h3>{es ? "Próximos pasos" : "Next steps"}</h3>
    <p>{(es ? p.planSpanish : p.planEnglish) || missingText(es)}</p>
    {p.includeProcedure && <p>{es ? "La cirugía es una opción que se habló; no es una decisión de tratamiento." : "Surgery is an option discussed; this does not select a treatment."}</p>}
    </div>
  </section>;
}

export function AppointmentSection({ p, language }: P) {
  const es = language === "es";
  const a = p.appointment;
  const start = a.startsAt ? new Date(a.startsAt) : null;
  const fmt = (o: Intl.DateTimeFormatOptions) => start ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { ...o, timeZone: a.timeZone }).format(start) : "";
  return <section className="pv-card" aria-labelledby="d-appt">
    <h2 id="d-appt">{es ? "Tu próxima cita" : "Your next appointment"}</h2>
    {start ? <div className="pv-appt pv-appt-calendar">
      <AppointmentCalendar start={start} timeZone={a.timeZone || "America/New_York"} es={es} />
      <div><p className="pv-strong">{fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><p>{fmt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p><p>{[a.hospital, a.address].filter(Boolean).join(", ")}</p></div>
    </div> : <p>{missingText(es)}</p>}
  </section>;
}

export function RouteSection({ p, language }: P) {
  return <DirectionsCard p={p} language={language} missing={missingText(language === "es")} />;
}

export const hasVisual = (p: PatientPacketView) => !!(p.drawingUrl || p.caseKind === "colon");

export function VisualSection({ p, language }: P) {
  const es = language === "es";
  return <section className="pv-card" aria-labelledby="d-visual">
    <h2 id="d-visual">{es ? "Explicación visual" : "Visual explanation"}</h2>
    {p.caseKind === "colon" && <Suspense fallback={<p role="status">{es ? "Cargando el modelo 3D…" : "Loading the 3D model…"}</p>}><ColonModel language={language} viewOnly includeProcedure={p.includeProcedure} caption={es ? p.captionSpanish : p.captionEnglish} /></Suspense>}
    {p.drawingUrl && <img className="pv-img" src={p.drawingUrl} alt={es ? "Ilustración educativa revisada por tu equipo" : "Educational illustration reviewed by your team"} />}
    {p.caseKind !== "colon" && <p>{hasVisual(p) ? (es ? p.captionSpanish : p.captionEnglish) : (es ? "Tu equipo no aprobó una explicación visual para esta visita." : "Your care team did not approve a visual for this visit.")}</p>}
  </section>;
}

export function HelpSection({ language }: { language: Language }) {
  const es = language === "es";
  return <section className="pv-card" aria-labelledby="d-help">
    <h2 id="d-help">{es ? "Contacto del equipo de atención" : "Care-team contact"}</h2>
    <p>{es ? "Aún no se agregaron los datos de contacto del equipo de atención." : "Care-team contact details have not been added."}</p>
  </section>;
}