import { useEffect, useState } from "react";
import PatientHeader from "../patient/PatientHeader";
import CallStatusCard, { type CallState } from "../patient/CallStatusCard";
import ConversationCard from "../patient/ConversationCard";
import useCallCard from "../patient/useCallCard";
import FullDetails from "../patient/FullDetails";
import DemoCallPanel from "./DemoCallPanel";
import type { PatientPacketView } from "@/lib/vozcare-api";
import type { Language } from "@/workflow";

type Tab = "conversation" | "details";

// Demo-only patient preview: no token, no server call, no calling.
export default function DemoPatientPreview({ packet, onBack }: { packet: PatientPacketView; onBack: () => void }) {
  const [language, setLanguage] = useState<Language>(packet.deliveryLanguage);
  const [tab, setTab] = useState<Tab>("conversation");
  const [callState, setCallState] = useState<CallState>("none");
  const [demoCallId, setDemoCallId] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const { card, ended } = useCallCard(demoCallId ? { demoCallId } : null, callState === "requested" && !callEnded);
  useEffect(() => { if (ended) setCallEnded(true); }, [ended]);
  const es = language === "es";
  const tabs: [Tab, string][] = [["conversation", es ? "Conversación" : "Conversation"], ["details", es ? "Detalles completos" : "Full details"]];
  return <main className="pv" lang={language}><div className="pv-shell">
    <PatientHeader language={language} setLanguage={setLanguage} />
    <section className="pv-card pv-status" role="note" style={{ marginTop: 16 }}>
      <span className="pv-dot" aria-hidden="true" />
      <div><h2>{es ? "Vista previa de demostración · Paciente ficticio" : "Demo preview · Fictional patient"}</h2>
        <p>{es ? "Las llamadas son reales y usan la información ficticia de María." : "Calls are real and use María's fictional information."}</p>
        <button type="button" className="button secondary" onClick={onBack}>{es ? "← Volver al espacio de demostración" : "← Back to demo workspace"}</button></div>
    </section>
    <div className="pv-intro"><p className="pv-greeting">{es ? `Hola, ${packet.firstName}.` : `Hello, ${packet.firstName}.`}</p><h1>{es ? "Tu información de seguimiento" : "Your follow-up information"}</h1></div>
    <div className="pv-tabs" role="tablist" aria-label={es ? "Secciones" : "Sections"}>
      {tabs.map(([id, text]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{text}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pv-stack">
      {tab === "conversation" ? <>
        <CallStatusCard state={callState} language={language} />
        <ConversationCard card={card} p={packet} language={language} />
        <DemoCallPanel language={language} state={callState} setState={setCallState} onStarted={(id) => { setDemoCallId(id); setCallEnded(false); }} />
      </> : <FullDetails p={packet} language={language} />}
    </div>
  </div></main>;
}