import { useEffect, useRef, useState } from "react";
import { createPatient } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";

export default function AddPatientDialog({ open, language, onClose, onCreated }: { open: boolean; language: Language; onClose: () => void; onCreated: (id: string) => void }) {
  const es = language === "es";
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [lang, setLang] = useState<Language>("es");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { setName(""); setLang("es"); setPhone(""); setAddress(""); setError(""); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { onCreated(await createPatient({ name, preferredLanguage: lang, phone: phone.trim(), address })); }
    catch (err: any) { setError(err.message || (es ? "No se pudo agregar el paciente." : "Could not add the patient.")); }
    finally { setBusy(false); }
  };

  return <dialog ref={ref} className="education-preview add-patient-dialog" aria-labelledby="add-patient-title" onClose={onClose}>
    <form onSubmit={submit} className="profile-details">
      <div className="preview-heading" style={{ padding: 0, border: 0 }}><h2 id="add-patient-title">{es ? "Agregar paciente" : "Add patient"}</h2><button type="button" className="preview-close" aria-label={es ? "Cerrar" : "Close"} onClick={onClose}>×</button></div>
      <label>{es ? "Nombre completo" : "Full name"}<input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" /></label>
      <label>{es ? "Idioma preferido" : "Preferred language"}<select className="auth-input" value={lang} onChange={(e) => setLang(e.target.value as Language)}><option value="es">{es ? "Español" : "Spanish"}</option><option value="en">{es ? "Inglés" : "English"}</option></select></label>
      <label>{es ? "Teléfono (formato internacional)" : "Phone (international format)"}<input type="tel" placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} required pattern="\+[1-9][0-9]{7,14}" /></label>
      <label>{es ? "Dirección de inicio" : "Starting address"}<input value={address} onChange={(e) => setAddress(e.target.value)} required /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="approved-link-actions"><button type="submit" className="button" disabled={busy}>{busy ? (es ? "Agregando…" : "Adding…") : (es ? "Agregar paciente" : "Add patient")}</button><button type="button" className="button secondary" onClick={onClose}>{es ? "Cancelar" : "Cancel"}</button></div>
    </form>
  </dialog>;
}