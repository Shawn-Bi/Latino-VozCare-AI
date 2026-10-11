import { useEffect, useState } from "react";
import CallPanel from "./CallPanel";
import PatientHeader from "./patient/PatientHeader";
import CallStatusCard, { type CallState } from "./patient/CallStatusCard";
import FullDetails from "./patient/FullDetails";
import ConversationCard from "./patient/ConversationCard";
import useCallCard from "./patient/useCallCard";
import { linkErrorText } from "./patient/patientText";
import { validatePatientLink, type PatientPacketView, type PatientLinkView } from "../lib/vozcare-api";
import type { Language } from "../workflow";

type Tab = "conversation" | "details";

export default function LivePatientView({ token }: { token: string }) {
  const [data, setData] = useState<{ packet: PatientPacketView; link: PatientLinkView } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("es");
  const [tab, setTab] = useState<Tab>("conversation");
  const [used, setUsed] = useState(0);
  const [callState, setCallState] = useState<CallState>("none");

  useEffect(() => {
    validatePatientLink(token)
      .then((d) => { setData(d); setLanguage(d.packet.deliveryLanguage); setUsed(d.link.callAttempts); setCallState(d.link.callEndedAt ? "ended" : d.link.lastCallId ? "requested" : "none"); })
      .catch((e) => setError(e.message || ""));
  }, [token]);

  const [callEnded, setCallEnded] = useState(false);
  const { card, ended } = useCallCard(data && callState !== "requesting" ? { token } : null, callState === "requested" && !callEnded);
  useEffect(() => { if (ended) { setCallEnded(true); setCallState("ended"); } }, [ended]);
  useEffect(() => { if (callState === "requesting") setCallEnded(false); }, [callState]);

  const es = language === "es";
  const shell = (body: React.ReactNode) => <main className="pv" lang={language}><div className="pv-shell"><PatientHeader language={language} setLanguage={setLanguage} />{body}</div></main>;

  if (error !== null) return shell(<section className="pv-card pv-message" role="alert"><h1>{es ? "No pudimos abrir tu información" : "We could not open your information"}</h1><p>{linkErrorText(error, language)}</p></section>);
  if (!data) return shell(<p className="pv-message pv-loading" role="status">{es ? "Cargando tu información…" : "Loading your information…"}</p>);

  const p = data.packet;
  const tabs: [Tab, string][] = [["conversation", es ? "Conversación" : "Conversation"], ["details", es ? "Detalles completos" : "Full details"]];

  return shell(<>
    <div className="pv-intro">
      <p className="pv-greeting">{es ? `Hola, ${p.firstName}.` : `Hello, ${p.firstName}.`}</p>
      <h1>{es ? "Tu información de seguimiento" : "Your follow-up information"}</h1>
    </div>
    <div className="pv-tabs" role="tablist" aria-label={es ? "Secciones" : "Sections"} onKeyDown={(event) => {
      const next = event.key === "ArrowRight" || event.key === "ArrowLeft" ? (tab === "conversation" ? "details" : "conversation") : event.key === "Home" ? "conversation" : event.key === "End" ? "details" : null;
      if (!next) return;
      event.preventDefault(); setTab(next);
      event.currentTarget.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus();
    }}>
      {tabs.map(([id, text]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{text}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pv-stack">
      {tab === "conversation" ? <>
        <CallStatusCard state={callState} language={language} />
        <ConversationCard card={card} p={p} language={language} />
        <CallPanel token={token} language={language} used={used} setUsed={setUsed} state={callState} setState={setCallState} />
        <p className="pv-meta">{es ? "Tu información guardada está siempre en Detalles completos, aunque no hagas la llamada." : "Your saved information is always in Full details, even if you don't make the call."}</p>
      </> : <FullDetails p={p} language={language} />}
    </div>
  </>);
}