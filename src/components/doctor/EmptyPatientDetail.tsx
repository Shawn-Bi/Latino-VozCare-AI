import type { Patient, Language } from "../../workflow";

export default function EmptyPatientDetail({ patient, language }: { patient: Patient; language: Language }) {
  const es = language === "es";
  return <div className="record-overview">
    <section className="panel profile-details">
      <h2>{es ? "Contacto" : "Contact"}</h2>
      <p>{patient.phone}</p>
      <p>{patient.address}</p>
      <p>{patient.preferredLanguage === "es" ? (es ? "Prefiere español" : "Prefers Spanish") : (es ? "Prefiere inglés" : "Prefers English")}</p>
    </section>
    <section className="panel selected-patient">
      <h2>{es ? "Sin visita ni borrador educativo" : "No visit or education draft yet"}</h2>
      <p>{es ? "Este paciente aún no tiene una visita, nota, cita ni borrador educativo. La app todavía no permite crear una visita o un borrador desde esta pantalla, así que la revisión, la aprobación y las llamadas no están disponibles para este paciente." : "This patient has no visit, note, appointment, or education draft yet. The app does not yet support creating a visit or draft from this screen, so review, approval, and calls are not available for this patient."}</p>
    </section>
  </div>;
}