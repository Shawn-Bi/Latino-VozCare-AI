import { useState, type SetStateAction } from "react";
import EducationReview from "@/EducationReview";
import DemoPatientPreview from "./DemoPatientPreview";
import { createDemoRecords, toDemoPacket } from "@/demo/fixtures";
import type { EducationDraft } from "@/education";
import type { Language } from "@/workflow";

// Local-only demo: fictional fixtures in component state. No backend or entity calls.
export default function DemoWorkspace({ language, onExit }: { language: Language; onExit: () => void }) {
  const es = language === "es";
  const [records, setRecords] = useState(createDemoRecords);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const selected = records.find((r) => r.patient.id === selectedId) ?? null;

  const setDraft = (value: SetStateAction<EducationDraft>) => setRecords((all) => all.map((r) => r.patient.id === selectedId ? { ...r, draft: typeof value === "function" ? value(r.draft) : value } : r));
  const when = (iso: string) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(iso));

  if (selected && previewing) return <DemoPatientPreview packet={toDemoPacket(selected)} onBack={() => { setPreviewing(false); window.scrollTo({ top: 0 }); }} />;

  return <main className="workspace doctor-view">
    <p className="workspace-language-note" role="note"><strong>{es ? "Espacio de demostración" : "Demo workspace"}</strong> · {es ? "Pacientes ficticios. Los cambios se quedan en esta pestaña; no se guarda, aprueba, envía ni llama nada." : "Fictional patients. Changes stay in this tab; nothing is saved, approved, sent, or called."}</p>
    {!selected ? <>
      <div className="workspace-heading compact-heading"><div><h1>{es ? "Mis pacientes (demo)" : "My patients (demo)"}</h1><p>{es ? "Elige un paciente ficticio para revisar su visita y educación." : "Pick a fictional patient to review their visit and education."}</p></div><button type="button" className="button secondary" onClick={onExit}>{es ? "Salir de la demo" : "Exit demo"}</button></div>
      <section className="panel"><ul className="patient-rows">{records.map((r) => <li key={r.patient.id}>
        <button type="button" className="patient-row" disabled={r.patient.id !== "demo-maria"} title={r.patient.id !== "demo-maria" ? (es ? "No disponible en la demo" : "Not available in the demo") : undefined} onClick={() => { if (r.patient.id !== "demo-maria") return; setSelectedId(r.patient.id); window.scrollTo({ top: 0 }); }}>
          <span className="person"><i>{r.patient.initials}</i><span><strong>{r.patient.name}</strong><small>Demo · {es ? "Español" : "Spanish"}</small></span></span>
          <span><span className="cell-label">{es ? "Caso" : "Case"}</span>{r.patient.caseKind === "colon" ? (es ? "Cáncer de colon" : "Colon cancer") : (es ? "Seguimiento" : "Follow-up")}</span>
          <span><span className="cell-label">{es ? "Cita" : "Appointment"}</span>{when(r.visit.appointment.startsAt)}</span>
          <span><span className="badge warning"><i />Demo</span></span>
        </button></li>)}</ul></section>
    </> : <>
      <button type="button" className="back-to-patients" onClick={() => setSelectedId(null)}>← {es ? "Todos los pacientes" : "All patients"}</button>
      <div className="patient-record-context"><span className="person"><i>{selected.patient.initials}</i><span><strong>{selected.patient.name}</strong><small>Demo · {es ? "Paciente ficticio" : "Fictional patient"}</small></span></span><span>{selected.patient.address}</span><span className="badge warning"><i />Demo</span></div>
      <EducationReview key={selected.patient.id} demo onPreviewPatient={() => { setPreviewing(true); window.scrollTo({ top: 0 }); }}
        draft={selected.draft} setDraft={setDraft} patientName={selected.patient.name} firstName={selected.patient.firstName} caseKind={selected.patient.caseKind}
        onSave={() => {}} saveState="idle" onReload={() => {}} onApprove={() => {}} approvalState={{ status: "idle" }} />
    </>}
  </main>;
}