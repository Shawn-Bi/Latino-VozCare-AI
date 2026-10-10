import { lazy, Suspense, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Patient } from "./workflow";
import { canApproveEducation, editEducation, educationResources, modelViews, type EducationDraft } from "./education";

const ColonModel = lazy(() => import("./ColonModel"));
type Props = { draft: EducationDraft; setDraft: Dispatch<SetStateAction<EducationDraft>>; patientName: string; firstName: string; caseKind: Patient["caseKind"]; onApprove: () => void; deliveryProblem: string | null };

function PatientPreview({ draft, patientName, caseKind, close }: { draft: EducationDraft; patientName: string; caseKind: Patient["caseKind"]; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const es = draft.deliveryLanguage === "es";
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="education-preview" lang={es ? "es" : "en"} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby="packet-preview-title">
    <div className="preview-heading"><div><p className="eyebrow">{draft.approvedAt ? (es ? "PAQUETE APROBADO EN DEMO" : "APPROVED DEMO PACKET") : (es ? "BORRADOR · NO COMPARTIDO" : "DRAFT PREVIEW · NOT SHARED")}</p><h2 id="packet-preview-title">{es ? `Paquete de ${patientName} en español` : `${patientName}’s English packet`}</h2></div><button type="button" className="preview-close" onClick={close} aria-label={es ? "Cerrar vista previa" : "Close preview"}>×</button></div>
    <div className="preview-content" lang={es ? "es" : "en"}><p className="review-case-label">{caseKind === "colon" ? (es ? "CASO FICTICIO · CÁNCER DE COLON" : "FICTIONAL CASE · COLON CANCER") : (es ? "VISITA FICTICIA DE SEGUIMIENTO" : "FICTIONAL FOLLOW-UP VISIT")}</p><h3>{es ? "Lo que hablamos en su visita" : "What we discussed at your visit"}</h3><p>{es ? draft.spanish : draft.english}</p><h3>{es ? "Próximos pasos" : "Next steps"}</h3><p>{es ? draft.planSpanish : draft.planEnglish}</p>
      {draft.drawing && <figure><img src={draft.drawing.image} alt={es ? "Dibujo guardado sobre una vista de anatomía educativa" : "Saved drawing over an educational anatomy view"} /><figcaption>{es ? draft.captionSpanish : draft.captionEnglish}</figcaption></figure>}
      {!draft.drawing && <div className="preview-visual-summary"><strong>{es ? "Explicación visual" : "Visual explanation"}</strong><p>{es ? draft.captionSpanish : draft.captionEnglish}</p></div>}
      {draft.includeProcedure && <p className="review-caution">{es ? "La cirugía es una opción que se habló. No se ha elegido un tratamiento en este caso ficticio." : "Surgery is an option discussed. No treatment has been selected in this fictional case."}</p>}
      <h3>{es ? "Lecturas revisadas" : "Reviewed reading"}</h3>{draft.resources.some((value) => value === "accepted") ? <ul>{educationResources.filter((_, index) => draft.resources[index] === "accepted").map((resource) => <li key={resource.url}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a> <small>({resource.language})</small></li>)}</ul> : <p>{es ? "No se han incluido enlaces." : "No links are included."}</p>}
      <p className="preview-disclaimer">{caseKind === "colon" ? (es ? "Ilustración educativa. No es su estudio de imagen ni muestra el tamaño o la profundidad exactos del cáncer." : "Educational illustration. This is not your scan and does not show the exact size or depth of the cancer.") : (es ? "Paquete ficticio de seguimiento. No se incluye un diagnóstico ni una imagen clínica." : "Fictional follow-up packet. No diagnosis or clinical image is included.")}</p>
    </div>
    <div className="preview-actions"><span>{es ? "Solo vista previa · No se envía ningún mensaje" : "Preview only · No message is sent"}</span><button type="button" className="button secondary" onClick={close}>{es ? "Volver a la revisión" : "Back to review"}</button></div>
  </dialog>;
}

export default function EducationReview({ draft, setDraft, patientName, firstName, caseKind, onApprove, deliveryProblem }: Props) {
  const [textLanguage, setTextLanguage] = useState<"en" | "es">("en");
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const edit = (patch: Partial<EducationDraft>) => { setDraft((current) => editEducation(current, patch)); setNotice(""); };
  const accepted = draft.resources.filter((value) => value === "accepted").length;
  const pending = draft.resources.filter((value) => value === "pending").length;
  const checked = Object.values(draft.checks).filter(Boolean).length;
  const complete = canApproveEducation(draft);
  const emptyField = [draft.note, draft.english, draft.spanish, draft.planEnglish, draft.planSpanish, draft.captionEnglish, draft.captionSpanish].some((value) => !value.trim());
  const es = textLanguage === "es";
  const checkLabels = { note: "I checked the visit note, saved part notes, and pending findings.", language: "I reviewed the English and Spanish text for accuracy.", visual: caseKind === "colon" ? "I reviewed the model, caption, and any saved drawing." : "I checked that the packet does not include an unsupported illustration." };
  return <div className="education-workspace" lang="en">
    <section className="panel review-case">
      <div><p className="eyebrow">{patientName.toUpperCase()} · FICTIONAL CASE</p><h2>Make the visit easier to understand.</h2><p>{caseKind === "colon" ? "Colon cancer · Sigmoid region · Spanish preferred" : "Follow-up visit · No diagnosis recorded · Spanish preferred"}</p></div>
      <div className="review-case-status"><span className={`badge ${draft.approvedAt ? "success" : "warning"}`}><i />{draft.approvedAt ? "Approved in demo" : "Needs review"}</span><small>Packet v{draft.revision} · {caseKind === "colon" ? "Depth and stage pending" : "Fictional follow-up"}</small></div>
    </section>

    <details className="panel source-note"><summary><span><strong>1. Check the visit note</strong><small>Fictional source · Editable · No EHR import connected</small></span><span className="source-note-action">View / edit note ↗</span></summary><div className="source-note-body"><label htmlFor="source-note">Doctor’s source note</label><textarea id="source-note" rows={8} value={draft.note} onChange={(event) => edit({ note: event.target.value })} /><p>Editing the source does not rewrite the patient text. Review both versions below against the updated note.</p></div></details>

    <div className="education-grid">
      {caseKind === "colon" ? <section className="panel visual-review"><div className="panel-heading"><div><h2>2. Explain with the model</h2><p>Start with the human body. Reveal the organs, isolate the colon, then explore inside.</p></div><span className="review-step-label">3D</span></div>
        <div className="visual-review-body"><Suspense fallback={<div className="model-loading" role="status">Loading the 3D viewer…</div>}><ColonModel includeProcedure={draft.includeProcedure} notes={draft.anatomyNotes} onSaveNote={(note) => { setDraft((current) => editEducation(current, { anatomyNotes: [...current.anatomyNotes, note] })); setNotice("Doctor note saved with its body part and camera angle. Notes stay in the doctor workspace; review patient wording separately."); }} onRemoveNote={(id) => { setDraft((current) => editEducation(current, { anatomyNotes: current.anatomyNotes.filter((note) => note.id !== id) })); setNotice(""); }} onSaveDrawing={(drawing) => { edit({ drawing }); setNotice("Drawing saved with its camera view. Review the packet before approval."); }} /></Suspense>
          <p className="review-caution"><strong>Depth and stage are pending.</strong> The model is an illustration, not {firstName}’s scan. Do not interpret the example growth as her measured tumor.</p>
          <label className="procedure-option"><input type="checkbox" checked={draft.includeProcedure} onChange={(event) => edit({ includeProcedure: event.target.checked })} /><span><strong>Include the surgery explanation</strong><small>The source note discusses segment removal as a possible option. Enabling it adds a final model view; it does not select a treatment.</small></span></label>
        </div>
      </section> : <section className="panel visual-review"><div className="panel-heading"><h2>2. Check the packet scope</h2></div><p className="review-caution">This sample visit has no recorded diagnosis or educational model. Review the wording against this patient’s source note.</p></section>}

      <section className="panel wording-review"><div className="panel-heading"><div><h2>3. Review patient wording</h2><p>Edit both versions before approving this packet.</p></div></div>
        <div className="wording-review-body"><div className="review-language-tabs" role="group" aria-label="Patient wording language"><button type="button" aria-pressed={!es} className={!es ? "active" : ""} onClick={() => setTextLanguage("en")}>English</button><button type="button" aria-pressed={es} className={es ? "active" : ""} onClick={() => setTextLanguage("es")}>Español</button></div>
          <div className="review-fields"><label htmlFor="patient-explanation">Visit explanation <span>{es ? "Spanish" : "English"}</span></label><textarea lang={textLanguage} id="patient-explanation" rows={5} value={es ? draft.spanish : draft.english} onChange={(event) => edit(es ? { spanish: event.target.value } : { english: event.target.value })} />
            <label htmlFor="patient-next-steps">Discussion and next steps <span>{es ? "Spanish" : "English"}</span></label><textarea lang={textLanguage} id="patient-next-steps" rows={5} value={es ? draft.planSpanish : draft.planEnglish} onChange={(event) => edit(es ? { planSpanish: event.target.value } : { planEnglish: event.target.value })} />
            <label htmlFor="visual-caption">Visual caption <span>{es ? "Spanish" : "English"}</span></label><textarea lang={textLanguage} id="visual-caption" rows={3} value={es ? draft.captionSpanish : draft.captionEnglish} onChange={(event) => edit(es ? { captionSpanish: event.target.value } : { captionEnglish: event.target.value })} />
          </div><p className="review-field-help">These are editable sample drafts. No automatic translation or note generation is connected.</p>
        </div>
      </section>
    </div>

    {draft.drawing && <section className="panel saved-drawing"><img src={draft.drawing.image} alt={`Saved doctor drawing: ${modelViews[draft.drawing.view].label}`} /><div><p className="eyebrow">SAVED VISUAL</p><h3>{modelViews[draft.drawing.view].label}</h3><p>The drawing and camera angle are saved together. The current bilingual visual caption accompanies this image.</p><button type="button" className="button secondary" onClick={() => edit({ drawing: null })}>Remove drawing</button></div></section>}

    <section className="panel resource-review"><div className="panel-heading"><div><h2>4. Choose the reading links</h2><p>Accept or reject each source. Rejected links are excluded from the packet.</p></div><span className="badge neutral"><i />{accepted} included</span></div><div className="resource-list">{caseKind === "general" && <p>No reading links are included for this sample visit.</p>}{(caseKind === "colon" ? educationResources : []).map((resource, index) => <article key={resource.url} className="review-resource"><div><small>{resource.publisher} · {resource.language}</small><a href={resource.url} target="_blank" rel="noreferrer">{resource.title} ↗</a><span className={`badge ${draft.resources[index] === "accepted" ? "success" : draft.resources[index] === "pending" ? "warning" : "neutral"}`}><i />{draft.resources[index] === "accepted" ? "Included" : draft.resources[index] === "rejected" ? "Excluded" : "Needs review"}</span></div><div className="resource-actions"><button type="button" className={draft.resources[index] === "accepted" ? "selected" : ""} aria-pressed={draft.resources[index] === "accepted"} onClick={() => edit({ resources: draft.resources.map((value, i) => i === index ? "accepted" : value) })}>Accept</button><button type="button" className={draft.resources[index] === "rejected" ? "selected" : ""} aria-pressed={draft.resources[index] === "rejected"} onClick={() => edit({ resources: draft.resources.map((value, i) => i === index ? "rejected" : value) })}>Reject</button></div></article>)}</div></section>

    <section className="panel approval-review"><div className="approval-main"><p className="eyebrow">FINAL REVIEW</p><h2>{draft.approvedAt ? "This demo version is approved." : "Approve the exact patient packet."}</h2><p>{draft.approvedAt ? `Version ${draft.revision} · ${new Date(draft.approvedAt).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })} EDT. Any content edit creates a new draft.` : "Review the note, both languages, and the visual. Content edits clear the review checks."}</p><div className="approval-checks">{(Object.keys(checkLabels) as (keyof typeof checkLabels)[]).map((key) => <label key={key}><input type="checkbox" checked={draft.checks[key]} disabled={!!draft.approvedAt} onChange={(event) => setDraft((current) => ({ ...current, checks: { ...current.checks, [key]: event.target.checked } }))} /><span>{checkLabels[key]}</span></label>)}</div></div>
      <div className="approval-side"><label htmlFor="delivery-language">Patient packet language</label><select id="delivery-language" value={draft.deliveryLanguage} onChange={(event) => edit({ deliveryLanguage: event.target.value as "es" | "en" })}><option value="es">Spanish · Patient preference</option><option value="en">English</option></select><button type="button" className="button secondary" onClick={() => setPreview(true)}>Preview patient packet</button><button type="button" className="button" disabled={!complete || !!draft.approvedAt || !!deliveryProblem} onClick={onApprove}>{draft.approvedAt ? "Approved in demo" : "Approve and send demo link"}</button><p role="status">{draft.approvedAt ? "Approved packet saved. A personal demo link is available below." : emptyField ? "Fill every note and patient-text field before approval." : `${checked}/3 review checks · ${pending ? `${pending} links need a decision` : "All links reviewed"}`}</p></div>
      <div className="review-session-note">Synthetic demo only · Saved in this browser · No real SMS or call · Only approved patient-facing content is shared.</div>
    </section>
    {notice && <p className="review-notice" role="status">{notice}</p>}
    {preview && <PatientPreview draft={draft} patientName={patientName} caseKind={caseKind} close={() => setPreview(false)} />}
  </div>;
}
