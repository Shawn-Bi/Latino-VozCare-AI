import { lazy, Suspense, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import FullDetails from "./components/patient/FullDetails";
import type { PatientPacketView } from "./lib/vozcare-api";
import type { Appointment, Patient } from "./workflow";
import { canApproveEducation, editEducation, educationResources, type EducationDraft } from "./education";

const ColonModel = lazy(() => import("./ColonModel"));
type ApprovalState = { status: "idle" } | { status: "approving" } | { status: "approved"; token: string; expiresAt: string; linkUrl: string } | { status: "error"; message: string };
type Props = { draft: EducationDraft; setDraft: Dispatch<SetStateAction<EducationDraft>>; patientName: string; firstName: string; caseKind: Patient["caseKind"]; onSave: () => void; saveState: "idle" | "saving" | "saved" | "error" | "conflict"; onReload: () => void; onApprove: () => void; approvalState: ApprovalState; deliveryIssue?: string; demo?: boolean; onPreviewPatient?: () => void; language?: "en" | "es"; appointment?: Appointment; startingAddress?: string };

function PatientPreview({ draft, patientName, caseKind, appointment, startingAddress, close }: { draft: EducationDraft; patientName: string; caseKind: Patient["caseKind"]; appointment?: Appointment; startingAddress?: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const es = draft.deliveryLanguage === "es";
  useEffect(() => { dialog.current?.showModal(); }, []);
  const packet: PatientPacketView = {
    patientName, firstName: patientName.split(" ")[0], initials: "", caseKind,
    deliveryLanguage: draft.deliveryLanguage, english: draft.english, spanish: draft.spanish,
    planEnglish: draft.planEnglish, planSpanish: draft.planSpanish,
    captionEnglish: draft.captionEnglish, captionSpanish: draft.captionSpanish,
    includeProcedure: draft.includeProcedure, resources: draft.resources,
    drawingUrl: draft.drawing?.image ?? "", drawingView: draft.drawing?.view ?? "",
    appointment: appointment ?? { startsAt: "", endsAt: "", hospital: "", address: "", timeZone: "America/New_York" },
    startingAddress: startingAddress ?? "", approvedAt: "",
  };
  return <dialog ref={dialog} className="education-preview" lang={es ? "es" : "en"} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby="packet-preview-title">
    <div className="preview-heading"><div><p className="eyebrow">{es ? "BORRADOR · NO COMPARTIDO" : "DRAFT PREVIEW · NOT SHARED"}</p><h2 id="packet-preview-title">{es ? `Paquete de ${patientName} en español` : `${patientName}’s English packet`}</h2></div><button type="button" className="preview-close" onClick={close} aria-label={es ? "Cerrar vista previa" : "Close preview"}>×</button></div>
    <div className="preview-content"><FullDetails p={packet} language={draft.deliveryLanguage} demo /></div>
    <div className="preview-actions"><span>{es ? "Solo vista previa · No se envía ningún mensaje" : "Preview only · No message is sent"}</span><button type="button" className="button secondary" onClick={close}>{es ? "Volver a la revisión" : "Back to review"}</button></div>
  </dialog>;
}

export default function EducationReview({ draft, setDraft, patientName, firstName, caseKind, onSave, saveState, onReload, onApprove, approvalState, deliveryIssue, demo = false, onPreviewPatient, language = "en", appointment, startingAddress }: Props) {
  const [textLanguage, setTextLanguage] = useState<"en" | "es">(language);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const [approvalInvalidated, setApprovalInvalidated] = useState(false);
  const previousApproval = useRef(approvalState.status === "approved" ? approvalState.token : null);
  const t = (en: string, es: string) => language === "es" ? es : en;
  useEffect(() => {
    if (approvalState.status === "approved" && previousApproval.current !== approvalState.token) {
      previousApproval.current = approvalState.token;
      setApprovalInvalidated(false);
    }
  }, [approvalState]);
  const edit = (patch: Partial<EducationDraft>) => {
    setApprovalInvalidated(true);
    setDraft((current) => {
      const next = editEducation(current, patch);
      // Reading choices and delivery language do not alter reviewed wording.
      if (Object.keys(patch).every((key) => key === "resources" || key === "deliveryLanguage")) return { ...next, checks: current.checks };
      return next;
    });
    setNotice(t("Packet updated. Check the sections marked as needing review before approval.", "El paquete cambió. Revise las secciones marcadas como pendientes antes de aprobar."));
  };
  const accepted = draft.resources.filter((value) => value === "accepted").length;
  const resources = caseKind === "colon" ? educationResources : [];
  const pending = resources.filter((_, index) => !["accepted", "rejected"].includes(draft.resources[index])).length;
  const reviewReady = canApproveEducation(draft) && pending === 0;
  const canApprove = reviewReady && !deliveryIssue && saveState !== "conflict" && saveState !== "saving";
  const approved = !demo && approvalState.status === "approved" && !approvalInvalidated && reviewReady;
  const busy = approvalState.status === "approving";
  const completed = [draft.checks.note, draft.checks.visual, draft.checks.language, pending === 0, approved];
  const titles = [t("Visit note", "Nota de la visita"), t("Visual explanation", "Explicación visual"), t("Patient wording", "Texto para el paciente"), t("Reading links", "Enlaces de lectura"), t("Final preview", "Vista previa final")];
  const checkLabels = {
    note: t("I checked the source note and pending findings.", "Revisé la nota original y los hallazgos pendientes."),
    visual: t("I checked the visual, caption and saved notes against the visit.", "Revisé la imagen, su descripción y las notas guardadas según la visita."),
    language: t("I checked both English and Spanish wording against the visit note.", "Revisé el texto en inglés y español según la nota de la visita."),
  };
  const reviewCheck = (key: keyof EducationDraft["checks"]) => <div className="approval-checks"><label><input type="checkbox" checked={draft.checks[key]} disabled={busy} onChange={(event) => {
    const value = event.target.checked;
    if (!value) setApprovalInvalidated(true);
    setDraft((current) => ({ ...current, approvedAt: value ? current.approvedAt : null, checks: { ...current.checks, [key]: value } }));
  }} /><span>{checkLabels[key]}</span></label></div>;
  const wordingSpanish = textLanguage === "es";
  return <div className="education-workspace" lang={language}>
    <section className="panel review-case">
      <div><p className="eyebrow">{patientName.toUpperCase()} · {t("FICTIONAL CASE", "CASO FICTICIO")}</p><h2>{t("Review the visit education.", "Revise la educación de la visita.")}</h2><p>{caseKind === "colon" ? t("The sigmoid colon is a part of the large intestine. This is an anatomy label. Check the visit note for the diagnosis and any findings still pending.", "El colon sigmoide es una parte del intestino grueso. Este nombre indica una ubicación anatómica. Revise la nota de la visita para conocer el diagnóstico y los hallazgos pendientes.") : t("Follow-up visit. No diagnosis is recorded in this fictional case.", "Visita de seguimiento. Este caso ficticio no registra un diagnóstico.")}</p></div>
      <div className="review-case-status"><span className={`badge ${approved ? "success" : "warning"}`}>{approved ? t("✓ Approved", "✓ Aprobado") : t("Draft · needs review", "Borrador · necesita revisión")}</span><small>{t("Revision", "Revisión")} {draft.revision}</small></div>
    </section>

    <nav className="review-language-tabs review-step-nav" aria-label={t("Education review steps", "Pasos de revisión educativa")}>
      {titles.map((title, index) => <button type="button" key={title} className={step === index ? "active" : ""} aria-current={step === index ? "step" : undefined} aria-controls={`education-step-${index}`} onClick={() => setStep(index)}><span aria-hidden="true">{completed[index] ? "✓" : index + 1}</span> {title}<span className="visually-hidden">{completed[index] ? t(" — reviewed", " — revisado") : t(" — needs review", " — necesita revisión")}</span></button>)}
    </nav>

    <section id="education-step-0" hidden={step !== 0} className="panel source-note" aria-labelledby="education-note-heading">
      <div className="panel-heading"><h2 id="education-note-heading">1. {titles[0]}</h2></div>
      <div className="source-note-body"><label htmlFor="source-note">{t("Doctor’s source note", "Nota original del médico")}</label><textarea id="source-note" rows={8} value={draft.note} disabled={busy} onChange={(event) => edit({ note: event.target.value })} /><p>{t("Use this note to check the patient explanation. Editing the source does not automatically update either translation.", "Use esta nota para revisar la explicación para el paciente. Editar la nota no actualiza automáticamente las traducciones.")}</p>{reviewCheck("note")}</div>
    </section>

    <section id="education-step-1" hidden={step !== 1} className="panel visual-review" aria-labelledby="education-visual-heading">
      <div className="panel-heading"><h2 id="education-visual-heading">2. {titles[1]}</h2></div>
      <div className="visual-review-body" inert={busy}>{caseKind === "colon" ? <>
        <Suspense fallback={<div className="model-loading" role="status">{t("Loading the 3D viewer…", "Cargando el modelo 3D…")}</div>}><ColonModel language={language} includeProcedure={draft.includeProcedure} notes={draft.anatomyNotes} onSaveNote={(note) => edit({ anatomyNotes: [...draft.anatomyNotes, note] })} onRemoveNote={(id) => edit({ anatomyNotes: draft.anatomyNotes.filter((note) => note.id !== id) })} onSaveDrawing={(drawing) => edit({ drawing })} /></Suspense>
        <p className="review-caution">{t(`This illustrates reference anatomy, not ${firstName}’s scan. The example growth does not establish tumor size, depth or stage.`, `Esta imagen muestra anatomía de referencia, no un estudio de ${firstName}. El crecimiento de ejemplo no determina el tamaño, la profundidad ni el estadio del tumor.`)}</p>
        <label className="procedure-option"><input type="checkbox" disabled={busy} checked={draft.includeProcedure} onChange={(event) => edit({ includeProcedure: event.target.checked })} /><span><strong>{t("Include the surgery explanation", "Incluir la explicación de cirugía")}</strong><small>{t("Include only if discussed in the visit. This adds an illustration of a possible option, not a treatment decision.", "Inclúyala solo si se habló durante la visita. Añade una ilustración de una posible opción, no una decisión de tratamiento.")}</small></span></label>
        {draft.drawing && <div className="saved-drawing"><img src={draft.drawing.image} alt={t("Saved doctor drawing over the educational model", "Dibujo guardado del médico sobre el modelo educativo")} /><div><p>{t("This drawing and its caption are included in the draft.", "Este dibujo y su descripción están incluidos en el borrador.")}</p><button type="button" disabled={busy} className="button secondary" onClick={() => edit({ drawing: null })}>{t("Remove drawing", "Quitar dibujo")}</button></div></div>}
      </> : <p>{t("This visit has no recorded diagnosis or educational model. Check that the packet contains only supported visit information.", "Esta visita no registra un diagnóstico ni un modelo educativo. Verifique que el paquete contenga solo información respaldada por la visita.")}</p>}{reviewCheck("visual")}</div>
    </section>

    <section id="education-step-2" hidden={step !== 2} className="panel wording-review" aria-labelledby="education-wording-heading">
      <div className="panel-heading"><div><h2 id="education-wording-heading">3. {titles[2]}</h2><p>{t("Check both versions against the visit note.", "Revise ambas versiones según la nota de la visita.")}</p></div></div>
      <div className="wording-review-body"><div className="review-language-tabs" role="group" aria-label={t("Patient wording language", "Idioma del texto para el paciente")}><button type="button" aria-pressed={!wordingSpanish} className={!wordingSpanish ? "active" : ""} onClick={() => setTextLanguage("en")}>English</button><button type="button" aria-pressed={wordingSpanish} className={wordingSpanish ? "active" : ""} onClick={() => setTextLanguage("es")}>Español</button></div>
        <div className="review-fields"><label htmlFor="patient-explanation">{t("Visit explanation", "Explicación de la visita")} <span>{wordingSpanish ? "Español" : "English"}</span></label><textarea lang={textLanguage} id="patient-explanation" rows={5} disabled={busy} value={wordingSpanish ? draft.spanish : draft.english} onChange={(event) => edit(wordingSpanish ? { spanish: event.target.value } : { english: event.target.value })} />
          <label htmlFor="patient-next-steps">{t("Discussion and next steps", "Lo que hablamos y próximos pasos")}</label><textarea lang={textLanguage} id="patient-next-steps" rows={5} disabled={busy} value={wordingSpanish ? draft.planSpanish : draft.planEnglish} onChange={(event) => edit(wordingSpanish ? { planSpanish: event.target.value } : { planEnglish: event.target.value })} />
          <label htmlFor="visual-caption">{t("Visual caption", "Descripción de la imagen")}</label><textarea lang={textLanguage} id="visual-caption" rows={3} disabled={busy} value={wordingSpanish ? draft.captionSpanish : draft.captionEnglish} onChange={(event) => edit(wordingSpanish ? { captionSpanish: event.target.value } : { captionEnglish: event.target.value })} />
        </div>{reviewCheck("language")}
      </div>
    </section>

    <section id="education-step-3" hidden={step !== 3} className="panel resource-review" aria-labelledby="education-reading-heading">
      <div className="panel-heading"><div><h2 id="education-reading-heading">4. {titles[3]}</h2><p>{t("Choose what the patient will receive.", "Elija lo que recibirá el paciente.")}</p></div><span className="badge neutral">{accepted} {t("included", "incluidos")}</span></div>
      <div className="resource-list">{resources.length === 0 && <p>{t("No reading links apply to this visit.", "No hay enlaces de lectura para esta visita.")}</p>}{resources.map((resource, index) => {
        const decision = draft.resources[index];
        const decide = (value: "accepted" | "rejected") => { if (decision !== value) edit({ resources: resources.map((_, i) => i === index ? value : draft.resources[i] ?? "pending") }); };
        return <article key={resource.url} className={`review-resource resource-${decision ?? "pending"}`}><div><small>{resource.publisher} · {resource.language === "Spanish" ? "Español" : "English"}</small><a href={resource.url} target="_blank" rel="noreferrer">{resource.title} ↗</a><span role="status" className={`badge ${decision === "accepted" ? "success" : "warning"}`}>{decision === "accepted" ? t("✓ Included in patient packet", "✓ Incluido en el paquete") : decision === "rejected" ? t("✕ Left out of patient packet", "✕ Excluido del paquete") : t("Decision needed", "Decisión pendiente")}</span></div><div className="resource-actions"><button type="button" disabled={busy} className={decision === "accepted" ? "selected" : ""} aria-pressed={decision === "accepted"} onClick={() => decide("accepted")}>{t("Include", "Incluir")}</button><button type="button" disabled={busy} className={decision === "rejected" ? "selected" : ""} aria-pressed={decision === "rejected"} onClick={() => decide("rejected")}>{t("Leave out", "Excluir")}</button></div></article>;
      })}</div>
    </section>

    <section id="education-step-4" hidden={step !== 4} className="panel approval-review" aria-labelledby="education-final-heading">
      <div className="approval-main"><h2 id="education-final-heading">5. {approved ? t("Approved patient packet", "Paquete aprobado") : t("Patient packet draft", "Borrador del paquete")}</h2><p>{t("Content edits clear the review checks. Saving a draft does not approve it.", "Los cambios de contenido borran las revisiones. Guardar un borrador no lo aprueba.")}</p><ul>{titles.slice(0, 4).map((title, index) => <li key={title}>{completed[index] ? "✓" : "○"} {title} — {completed[index] ? t("Reviewed", "Revisado") : t("Needs review", "Necesita revisión")}</li>)}</ul></div>
      <div className="approval-side"><label htmlFor="delivery-language">{t("Patient packet language", "Idioma del paquete")}</label><select id="delivery-language" disabled={busy} value={draft.deliveryLanguage} onChange={(event) => edit({ deliveryLanguage: event.target.value as "es" | "en" })}><option value="es">Español</option><option value="en">English</option></select><button type="button" className="button secondary" onClick={() => setPreview(true)}>{t("Preview patient packet", "Vista previa del paquete")}</button>
        {demo ? <><button type="button" className="button" disabled={!onPreviewPatient} onClick={onPreviewPatient}>{t("Preview patient experience", "Vista previa del paciente")}</button><p role="status">{t("Demo preview. No packet is approved and nothing is sent.", "Vista previa de demostración. No se aprueba un paquete ni se envía nada.")}</p></> : approved && approvalState.status === "approved" ? <div className="approved-link"><p>{t("Patient link ready. No SMS was sent.", "Enlace del paciente listo. No se envió ningún SMS.")}</p><div className="approved-link-actions"><button type="button" className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(approvalState.linkUrl); setNotice(t("Link copied.", "Enlace copiado.")); } catch { setNotice(t("Could not copy. Use Open patient view to access the link.", "No se pudo copiar. Use Abrir vista del paciente para acceder al enlace.")); } }}>{t("Copy link", "Copiar enlace")}</button><a href={approvalState.linkUrl} className="button">{t("Open patient view", "Abrir vista del paciente")}</a></div><small>{t("Expires", "Vence")} {new Date(approvalState.expiresAt).toLocaleString(language === "es" ? "es-US" : "en-US")}</small></div> : <><button type="button" className="button" disabled={!canApprove || busy} onClick={onApprove}>{busy ? t("Approving…", "Aprobando…") : t("Approve packet and create link", "Aprobar paquete y crear enlace")}</button>{approvalState.status === "error" && <p role="alert" className="review-caution">{approvalState.message}</p>}<p role="status">{deliveryIssue || (saveState === "conflict" ? t("Reload the latest draft before approving.", "Vuelva a cargar el borrador antes de aprobar.") : pending ? t(`${pending} reading decisions remain.`, `Quedan ${pending} decisiones de lectura.`) : !canApprove ? t("Complete the three review checks and all patient wording before approval.", "Complete las tres revisiones y todo el texto antes de aprobar.") : t("Approval creates a patient link for this reviewed packet. No SMS is sent.", "La aprobación crea un enlace para este paquete revisado. No se envía ningún SMS."))}</p></>}
      </div>
    </section>
    <div className="model-depth-navigation review-step-actions"><button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>{t("← Previous section", "← Sección anterior")}</button><span>{step + 1} / 5</span><button type="button" disabled={step === 4} onClick={() => setStep((current) => current + 1)}>{t("Next section →", "Siguiente sección →")}</button></div>
    {!demo && <div className="save-bar"><span role="status">{saveState === "saving" ? t("Saving draft…", "Guardando borrador…") : saveState === "saved" ? t("Draft saved ✓", "Borrador guardado ✓") : saveState === "error" ? t("Could not save. Try again.", "No se pudo guardar. Inténtelo de nuevo.") : saveState === "conflict" ? t("Another editor changed this draft. Reload before continuing.", "Otra persona cambió el borrador. Vuelva a cargarlo antes de continuar.") : t("Changes are local until you save.", "Los cambios son locales hasta que los guarde.")}</span><button type="button" onClick={onSave} disabled={saveState === "saving" || busy}>{t("Save changes", "Guardar cambios")}</button>{saveState === "conflict" && <button type="button" className="secondary" onClick={onReload}>{t("Reload draft", "Volver a cargar")}</button>}</div>}
    {notice && <p className="review-notice" role="status">{notice}</p>}
    {preview && <PatientPreview draft={draft} patientName={patientName} caseKind={caseKind} appointment={appointment} startingAddress={startingAddress} close={() => setPreview(false)} />}
  </div>;
}
