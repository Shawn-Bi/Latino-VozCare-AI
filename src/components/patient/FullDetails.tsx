import { educationResources } from "../../education";
import type { PatientPacketView } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";

export default function FullDetails({ p, language }: { p: PatientPacketView; language: Language }) {
  const es = language === "es";
  const a = p.appointment;
  const start = a.startsAt ? new Date(a.startsAt) : null;
  const fmt = (o: Intl.DateTimeFormatOptions) => start ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { ...o, timeZone: a.timeZone }).format(start) : "";
  const reading = educationResources.filter((_, i) => p.resources[i] === "accepted");
  const destination = [a.hospital, a.address].filter(Boolean).join(", ");
  const mapUrl = destination ? `https://www.google.com/maps/dir/?api=1${p.startingAddress ? `&origin=${encodeURIComponent(p.startingAddress)}` : ""}&destination=${encodeURIComponent(destination)}` : "";
  const missing = es ? "Tu equipo aún no guardó esta información." : "Your care team has not saved this yet.";

  return <div className="pv-stack">
    <section className="pv-card" aria-labelledby="d-care">
      <h2 id="d-care">{es ? "Lo que hablamos en tu visita" : "What we discussed at your visit"}</h2>
      <p>{(es ? p.spanish : p.english) || missing}</p>
      <h3>{es ? "Próximos pasos" : "Next steps"}</h3>
      <p>{(es ? p.planSpanish : p.planEnglish) || missing}</p>
      {p.includeProcedure && <p>{es ? "La cirugía es una opción que se habló; no es una decisión de tratamiento." : "Surgery is an option discussed; this does not select a treatment."}</p>}
    </section>

    <section className="pv-card" aria-labelledby="d-appt">
      <h2 id="d-appt">{es ? "Tu próxima cita" : "Your next appointment"}</h2>
      {start ? <div className="pv-appt">
        <div className="pv-date" aria-hidden="true"><small>{fmt({ month: "short" })}</small><strong>{fmt({ day: "numeric" })}</strong></div>
        <div><p className="pv-strong">{fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p><p>{fmt({ hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p></div>
      </div> : <p>{missing}</p>}
    </section>

    <section className="pv-card" aria-labelledby="d-route">
      <h2 id="d-route">{es ? "Cómo llegar" : "Getting there"}</h2>
      <dl className="pv-dl">
        <dt>{es ? "Sales desde" : "Starting from"}</dt><dd>{p.startingAddress || missing}</dd>
        <dt>{es ? "Lugar de la cita" : "Appointment location"}</dt><dd>{destination || missing}</dd>
      </dl>
      {mapUrl && <a className="button secondary pv-link-button" href={mapUrl} target="_blank" rel="noopener noreferrer">{es ? "Abrir direcciones en Google Maps" : "Open directions in Google Maps"}</a>}
    </section>

    {(p.drawingUrl || (p.caseKind === "colon" && (p.captionEnglish || p.captionSpanish))) && <section className="pv-card" aria-labelledby="d-visual">
      <h2 id="d-visual">{es ? "Explicación visual" : "Visual explanation"}</h2>
      {p.drawingUrl && <img className="pv-img" src={p.drawingUrl} alt={es ? "Ilustración educativa revisada por tu equipo" : "Educational illustration reviewed by your team"} />}
      <p>{es ? p.captionSpanish : p.captionEnglish}</p>
    </section>}

    {reading.length > 0 && <section className="pv-card" aria-labelledby="d-read">
      <h2 id="d-read">{es ? "Lecturas revisadas" : "Reviewed reading"}</h2>
      <ul className="pv-list">{reading.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> <span className="pv-meta">({r.language === "Spanish" ? (es ? "español" : "Spanish") : (es ? "inglés" : "English")})</span></li>)}</ul>
    </section>}

    <section className="pv-card" aria-labelledby="d-help">
      <h2 id="d-help">{es ? "¿Necesitas ayuda?" : "Need help?"}</h2>
      <p>{es ? "Llama al consultorio de tu médico con cualquier pregunta. Si es una emergencia, llama al 911." : "Call your doctor's office with any questions. In an emergency, call 911."}</p>
    </section>
    <p className="pv-meta pv-footnote">{es ? "Esta es la versión que revisó tu equipo." : "This is the version your care team reviewed."}</p>
  </div>;
}