import { useState } from "react";
import PatientHeader from "../patient/PatientHeader";
import FullDetails from "../patient/FullDetails";
import type { PatientPacketView } from "@/lib/vozcare-api";
import type { Language } from "@/workflow";

// Demo-only patient preview: no token, no server call, no calling.
export default function DemoPatientPreview({ packet, onBack }: { packet: PatientPacketView; onBack: () => void }) {
  const [language, setLanguage] = useState<Language>(packet.deliveryLanguage);
  const es = language === "es";
  return <main className="pv" lang={language}><div className="pv-shell">
    <PatientHeader language={language} setLanguage={setLanguage} />
    <section className="pv-card pv-status" role="note" style={{ marginTop: 16 }}>
      <span className="pv-dot" aria-hidden="true" />
      <div><h2>{es ? "Espacio de demostración · Paciente ficticio" : "Demo workspace · Fictional patient"}</h2>
        <p>{es ? "Las llamadas no están disponibles en este recorrido. No se envía nada." : "Calling is unavailable in this walkthrough. Nothing is sent."}</p>
        <button type="button" className="button secondary" onClick={onBack}>{es ? "← Volver al espacio de demostración" : "← Back to demo workspace"}</button></div>
    </section>
    <div className="pv-intro"><p className="pv-greeting">{es ? `Hola, ${packet.firstName}.` : `Hello, ${packet.firstName}.`}</p><h1>{es ? "Tu información de seguimiento" : "Your follow-up information"}</h1></div>
    <FullDetails p={packet} language={language} />
  </div></main>;
}