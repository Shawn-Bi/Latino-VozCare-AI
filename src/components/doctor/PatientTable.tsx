import { useEffect, useState } from "react";
import { loadAssignedPatients, type PatientListEntry, type EducationStatus } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";

const label = (es: boolean) => ({
  education: { none: es ? "Sin borrador" : "No draft yet", draft: es ? "Necesita revisión" : "Needs review", approved: es ? "Aprobado" : "Approved" },
  followUp: { not_started: es ? "No iniciado" : "Not started", link_ready: es ? "Enlace listo" : "Link ready", called: es ? "Llamada realizada" : "Call placed" },
  lang: { es: es ? "Español" : "Spanish", en: es ? "Inglés" : "English" },
});
const tone = { none: "neutral", draft: "warning", approved: "success" } as const;

export default function PatientTable({ language, refreshKey, onSelect }: { language: Language; refreshKey: number; onSelect: (id: string) => void }) {
  const es = language === "es";
  const L = label(es);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EducationStatus | "">("");
  const [rows, setRows] = useState<PatientListEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    const timer = window.setTimeout(() => {
      loadAssignedPatients(search, status)
        .then((list) => { if (!cancelled) setRows(list); })
        .catch((e) => { if (!cancelled) setError(e.message || "Could not load patients."); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, status, refreshKey]);

  const filters: { id: EducationStatus | ""; text: string }[] = [{ id: "", text: es ? "Todos" : "All" }, { id: "draft", text: L.education.draft }, { id: "approved", text: L.education.approved }, { id: "none", text: L.education.none }];
  const date = (p: PatientListEntry) => p.appointmentStartsAt ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: p.appointmentTimeZone }).format(new Date(p.appointmentStartsAt)) : (es ? "Sin cita" : "No appointment");

  return <section className="panel patient-list-panel" aria-labelledby="patients-heading">
    <h2 id="patients-heading" className="visually-hidden">{es ? "Pacientes asignados" : "Assigned patients"}</h2>
    <div className="patient-toolbar">
      <label className="patient-search"><span className="visually-hidden">{es ? "Buscar por nombre" : "Search by name"}</span><input type="search" placeholder={es ? "Buscar por nombre" : "Search by name"} value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <div className="patient-filters" role="group" aria-label={es ? "Filtrar por educación" : "Filter by education"}>{filters.map((f) => <button key={f.id || "all"} type="button" aria-pressed={status === f.id} className={status === f.id ? "active" : ""} onClick={() => setStatus(f.id)}>{f.text}</button>)}</div>
    </div>
    {error ? <p className="auth-error" role="alert" style={{ margin: "var(--space-4)" }}>{error}</p>
    : rows === null ? <div className="loading-state">{es ? "Cargando pacientes…" : "Loading patients…"}</div>
    : rows.length === 0 ? <div className="empty-state"><h3>{search || status ? (es ? "Ningún paciente coincide" : "No patients match") : (es ? "Aún no hay pacientes" : "No patients yet")}</h3><p>{search || status ? (es ? "Prueba otra búsqueda o filtro." : "Try another search or filter.") : (es ? "Usa Agregar paciente para empezar." : "Use Add patient to get started.")}</p></div>
    : <>
      <div className="patient-table-head" aria-hidden="true"><span>{es ? "Paciente" : "Patient"}</span><span>{es ? "Educación" : "Education"}</span><span>{es ? "Seguimiento" : "Follow-up"}</span><span>{es ? "Próxima cita" : "Next appointment"}</span></div>
      <ul className="patient-rows">{rows.map((p) => <li key={p.id}><button type="button" className="patient-row patient-select" onClick={() => onSelect(p.id)} aria-label={`${es ? "Abrir" : "Open"} ${p.name}`}>
        <span className="person"><i>{p.initials}</i><span><strong>{p.name}</strong><small>{L.lang[p.preferredLanguage]}{p.isSyntheticDemo ? ` · ${es ? "Demo" : "Demo"}` : ""}</small></span></span>
        <span><span className="cell-label">{es ? "Educación" : "Education"}</span><span className={`badge ${tone[p.educationStatus]}`}><i />{L.education[p.educationStatus]}</span></span>
        <span><span className="cell-label">{es ? "Seguimiento" : "Follow-up"}</span>{L.followUp[p.followUpStatus]}</span>
        <span><span className="cell-label">{es ? "Próxima cita" : "Next appointment"}</span>{date(p)}</span>
      </button></li>)}</ul>
    </>}
  </section>;
}