import { useEffect, useState } from "react";
import ApprovedCare from "../ApprovedCare";
import CallPanel from "./CallPanel";
import { validatePatientLink, type PatientPacketView, type PatientLinkView } from "../lib/vozcare-api";
import type { Language } from "../workflow";

export default function LivePatientView({ token }: { token: string }) {
  const [data, setData] = useState<{ packet: PatientPacketView; link: PatientLinkView } | null>(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>("es");

  useEffect(() => {
    validatePatientLink(token)
      .then((d) => { setData(d); setLanguage(d.packet.deliveryLanguage); })
      .catch((e) => setError(e.message || "This link is not valid."));
  }, [token]);

  const es = language === "es";
  if (error) return <main className="patient-view"><div className="patient-shell"><section className="panel demo-login"><h1>{es ? "Enlace no disponible" : "Link unavailable"}</h1><p>{error}</p></section></div></main>;
  if (!data) return <main className="patient-view"><div className="loading-state">{es ? "Cargando…" : "Loading…"}</div></main>;

  const p = data.packet;
  const packet: any = { ...p, revision: 1, drawing: p.drawingUrl ? { image: p.drawingUrl } : null };
  const when = p.appointment.startsAt ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { dateStyle: "full", timeStyle: "short", timeZone: p.appointment.timeZone }).format(new Date(p.appointment.startsAt)) : "";

  return <main className="patient-view" lang={language}><div className="patient-shell">
    <header className="patient-header">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div className="brand-copy"><div className="brand-name"><strong>VozCare</strong><small>AI</small></div></div></div>
      <div className="language-toggle" role="group"><button className={es ? "active" : ""} onClick={() => setLanguage("es")}>ES</button><button className={!es ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div>
    </header>
    <div className="patient-intro"><div><h1>{es ? `Hola, ${p.firstName}.` : `Hello, ${p.firstName}.`}</h1><p>{es ? "Tu equipo de atención preparó esta información para ti." : "Your care team prepared this information for you."}</p></div><span className="patient-avatar">{p.initials}</span></div>
    <div className="patient-context-layout">
      <div className="active-context">
        <ApprovedCare packet={packet} language={language} />
        {when && <section className="response-card" style={{ marginTop: "var(--space-4)" }}><div className="response-card-heading"><div><small>{es ? "PRÓXIMA CITA" : "NEXT APPOINTMENT"}</small><h2>{when}</h2></div></div><p>{p.appointment.hospital} · {p.appointment.address}</p></section>}
      </div>
      <CallPanel token={token} link={data.link} language={language} />
    </div>
  </div></main>;
}