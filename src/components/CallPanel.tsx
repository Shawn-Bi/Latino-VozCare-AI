import { useState } from "react";
import { startCall, type PatientLinkView } from "../lib/vozcare-api";
import type { Language } from "../workflow";

export default function CallPanel({ token, link, language }: { token: string; link: PatientLinkView; language: Language }) {
  const es = language === "es";
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [used, setUsed] = useState(link.callAttempts);
  const left = 3 - used;

  const call = async (mode: "self" | "tester") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await startCall(token, mode, phone, consent);
      setUsed(r.attemptsUsed);
      setMessage(es ? "Llamando… contesta tu teléfono." : "Calling… please answer your phone.");
    } catch (e: any) {
      setError(e.message || (es ? "No se pudo iniciar la llamada." : "Could not start the call."));
    } finally { setBusy(false); }
  };

  return <section className="response-card">
    <div className="response-card-heading"><div><small>{es ? "LLAMADA DE SEGUIMIENTO" : "FOLLOW-UP CALL"}</small><h2>{es ? "Habla con VozCare" : "Talk with VozCare"}</h2></div></div>
    <div className="profile-details" style={{ padding: 0, marginTop: "var(--space-4)" }}>
      <label>{es ? "Tu número de teléfono (EE. UU.)" : "Your phone number (US)"}<input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
    </div>
    <label className="procedure-option"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{es ? "Este número es mío y acepto recibir esta llamada." : "This number is mine and I agree to receive this call."}</span></label>
    <div className="selected-actions" style={{ padding: 0, marginTop: "var(--space-4)" }}>
      <button type="button" className="button" disabled={busy || !consent || !phone || left <= 0} onClick={() => call("self")}>{busy ? (es ? "Iniciando…" : "Starting…") : (es ? "Llamar a mi número" : "Call my number")}</button>
      <button type="button" className="button secondary" disabled={busy || left <= 0} onClick={() => call("tester")}>{es ? "Llamada de prueba del equipo" : "Team test call"}</button>
    </div>
    <p className="help-note">{left > 0 ? (es ? `Intentos restantes: ${left} de 3` : `Attempts left: ${left} of 3`) : (es ? "Se alcanzó el límite de llamadas." : "Call limit reached.")}</p>
    {message && <p className="support-notice" role="status">{message}</p>}
    {error && <p className="error-state" role="alert">{error}</p>}
  </section>;
}