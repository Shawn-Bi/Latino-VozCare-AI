import { educationResources } from "../../education";
import type { PatientPacketView } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";
import { CareSection, AppointmentSection, RouteSection, VisualSection, HelpSection, hasVisual } from "./DetailSections";

export default function FullDetails({ p, language }: { p: PatientPacketView; language: Language }) {
  const es = language === "es";
  const reading = educationResources.filter((_, i) => p.resources[i] === "accepted");

  return <div className="pv-stack">
    <CareSection p={p} language={language} />
    <AppointmentSection p={p} language={language} />
    <RouteSection p={p} language={language} />
    {hasVisual(p) && <VisualSection p={p} language={language} />}
    {reading.length > 0 && <section className="pv-card" aria-labelledby="d-read">
      <h2 id="d-read">{es ? "Lecturas revisadas" : "Reviewed reading"}</h2>
      <ul className="pv-list">{reading.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> <span className="pv-meta">({r.language === "Spanish" ? (es ? "español" : "Spanish") : (es ? "inglés" : "English")})</span></li>)}</ul>
    </section>}
    <HelpSection language={language} />
    <p className="pv-meta pv-footnote">{es ? "Esta es la versión que revisó tu equipo." : "This is the version your care team reviewed."}</p>
  </div>;
}