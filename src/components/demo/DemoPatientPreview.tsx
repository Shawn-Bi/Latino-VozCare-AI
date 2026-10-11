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

// Fictional patient preview with an explicitly requested real demo call.
export default function DemoPatientPreview({ packet, onBack }: { packet: PatientPacketView; onBack: () => void }) {
  const [language, setLanguage] = useState<Language>(packet.deliveryLanguage);
  const [tab, setTab] = useState<Tab>("conversation");
  const [callState, setCallState] = useState<CallState>("none");
  const [demoCallId, setDemoCallId] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const { card, ended } = useCallCard(demoCallId && callState !== "requesting" ? { demoCallId } : null, callState === "requested" && !callEnded);
  useEffect(() => { if (ended) { setCallEnded(true); setCallState("ended"); } }, [ended]);
  const es = language === "es";
  const tabs: [Tab, string][] = [["conversation", es ? "Conversación" : "Conversation"], ["details", es ? "Detalles completos" : "Full details"]];
  return <main className="pv" lang={language}><div className="pv-shell">
    <PatientHeader language={language} setLanguage={setLanguage} />
    <div className="demo-preview-banner"><p className="pv-meta" role="note">{es ? "Demo · Datos ficticios · Las llamadas son reales" : "Demo · Fictional data · Calls are real"}</p><button type="button" className="button secondary" onClick={onBack}>{es ? "← Volver a la revisión" : "← Back to review"}</button></div>
    <div className="pv-intro"><p className="pv-greeting">{es ? `Hola, ${packet.firstName}.` : `Hello, ${packet.firstName}.`}</p><h1>{es ? "Tu información de seguimiento" : "Your follow-up information"}</h1></div>
    <div className="pv-tabs" role="tablist" aria-label={es ? "Secciones" : "Sections"} onKeyDown={(event) => {
      const next = event.key === "ArrowRight" || event.key === "ArrowLeft" ? (tab === "conversation" ? "details" : "conversation") : event.key === "Home" ? "conversation" : event.key === "End" ? "details" : null;
      if (!next) return;
      event.preventDefault(); setTab(next);
      event.currentTarget.querySelector<HTMLButtonElement>(`#tab-${next}`)?.focus();
    }}>
      {tabs.map(([id, text]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{text}</button>)}
    </div>
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className={tab === "conversation" ? "pv-stack pv-conversation-layout" : "pv-stack"}>
      {tab === "conversation" ? <>
        <CallStatusCard state={callState} language={language} />
        <ConversationCard card={card} p={packet} language={language} />
        <DemoCallPanel language={language} state={callState} setState={setCallState} onStarted={(id) => { setDemoCallId(id); setCallEnded(false); }} />
      </> : <FullDetails demo p={packet} language={language} />}
    </div>
  </div></main>;
}