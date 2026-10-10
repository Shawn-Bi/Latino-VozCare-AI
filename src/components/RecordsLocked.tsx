import UnavailableNotice from "./UnavailableNotice";
import { DOCTOR_RECORD_ACCESS } from "@/lib/record-access";
import type { Language } from "@/workflow";

export default function RecordsLocked({ language, isApproved }: { language: Language; isApproved: boolean }) {
  const es = language === "es";
  return <section className="panel">
    <div className="panel-heading"><div><h2>{es ? "Registros de pacientes" : "Patient records"}</h2></div></div>
    {!DOCTOR_RECORD_ACCESS.available && <UnavailableNotice
      title={es ? "Registros de pacientes bloqueados" : "Patient records are locked"}
      message={es ? DOCTOR_RECORD_ACCESS.reasonEs : DOCTOR_RECORD_ACCESS.reason}
    />}
    {!isApproved && <p className="support-notice" role="status">{es
      ? "Tu membresía médica no está aprobada. Como administrador puedes aprobarla en el panel de arriba; nunca se aprueba automáticamente."
      : "Your own doctor membership is not approved. As an admin you can approve it in the panel above; it is never approved automatically."}</p>}
  </section>;
}