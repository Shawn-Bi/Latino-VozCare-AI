import type { PatientPacketView } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";
import { CareSection, AppointmentSection, RouteSection, VisualSection, HelpSection } from "./DetailSections";

// One card that changes only when the voice agent's show_patient_card tool fires.
export default function ConversationCard({ card, p, language }: { card: string; p: PatientPacketView; language: Language }) {
  const es = language === "es";
  const body = {
    appointment: <AppointmentSection p={p} language={language} />,
    directions: <RouteSection p={p} language={language} />,
    care: <CareSection p={p} language={language} />,
    education: <VisualSection p={p} language={language} />,
    help: <HelpSection language={language} />,
  }[card];
  return <div aria-live="polite">
    {body ?? <section className="pv-card"><h2>{es ? "Tu conversación" : "Your conversation"}</h2><p>{es ? "Cuando preguntes algo durante la llamada, la información guardada aparecerá aquí." : "When you ask about something during the call, the saved information will appear here."}</p></section>}
  </div>;
}