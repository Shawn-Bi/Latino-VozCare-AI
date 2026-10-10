import { educationResources } from "./education";
import type { Language, PatientPacket } from "./workflow";

export default function ApprovedCare({ packet, language }: { packet: PatientPacket; language: Language }) {
  const es = language === "es";
  return <section className="response-card approved-care" lang={language}>
    <div className="response-card-heading"><div><small>{es ? "PAQUETE APROBADO POR TU EQUIPO" : "PACKET APPROVED BY YOUR TEAM"}</small><h2>{es ? "Lo que hablamos en tu visita" : "What we discussed at your visit"}</h2></div><span className="badge success">v{packet.revision}</span></div>
    <p>{es ? packet.spanish : packet.english}</p><h3>{es ? "Próximos pasos" : "Next steps"}</h3><p>{es ? packet.planSpanish : packet.planEnglish}</p>
    {packet.drawing && <figure><img src={packet.drawing.image} alt={es ? "Ilustración educativa revisada por tu equipo" : "Educational illustration reviewed by your team"} /><figcaption>{es ? packet.captionSpanish : packet.captionEnglish}</figcaption></figure>}
    {!packet.drawing && packet.caseKind === "colon" && <div className="preview-visual-summary"><strong>{es ? "Explicación visual" : "Visual explanation"}</strong><p>{es ? packet.captionSpanish : packet.captionEnglish}</p></div>}
    {packet.includeProcedure && <p>{es ? "La cirugía es una opción que se habló; no es una decisión de tratamiento." : "Surgery is an option discussed; this does not select a treatment."}</p>}
    {packet.resources.some((value) => value === "accepted") && <><h3>{es ? "Lecturas revisadas" : "Reviewed reading"}</h3><ul>{educationResources.filter((_, index) => packet.resources[index] === "accepted").map((resource) => <li key={resource.url}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a> <small>{resource.language === "Spanish" ? "Español" : "English"}</small></li>)}</ul></>}
    <p className="saved-note">{es ? "Esta es la versión que revisó tu equipo. Los borradores posteriores no cambian este paquete." : "This is the version your team reviewed. Later drafts do not change this packet."}</p>
  </section>;
}
