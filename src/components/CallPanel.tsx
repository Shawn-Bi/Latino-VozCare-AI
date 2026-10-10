import { useState } from "react";
import { startCall } from "../lib/vozcare-api";
import type { Language } from "../workflow";
import type { CallState } from "./patient/CallStatusCard";
import { callErrorText } from "./patient/patientText";

type Props = { token: string; language: Language; used: number; setUsed: (n: number) => void; state: CallState; setState: (s: CallState) => void };

export default function CallPanel({ token, language, used, setUsed, state, setState }: Props) {
  const es = language === "es";
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const left = Math.max(0, 3 - used);
  const busy = state === "requesting";

  const call = async (mode: "self" | "tester") => {
    setState("requesting"); setError("");
    try {
      const r = await startCall(token, mode, phone, consent);
      setUsed(r.attemptsUsed);
      setState("requested");
    } catch (e: any) {
      setError(callErrorText(e.message || "", language));
      setState("error");
    }
  };

  return <section className="pv-card" aria-labelledby="call-setup-title">
    <h2 id="call-setup-title">{es ? "Pide tu llamada" : "Request your call"}</h2>
    <label className="pv-field" htmlFor="pv-phone">{es ? "Tu número de teléfono de EE. UU." : "Your US phone number"}</label>
    <input id="pv-phone" className="pv-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" aria-describedby="pv-phone-help" value={phone} onChange={(e) => setPhone(e.target.value)} />
    <p id="pv-phone-help" className="pv-meta">{es ? "10 dígitos. Te llamaremos a este número." : "10 digits. We will call this number."}</p>
    <label className="pv-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{es ? "Este número es mío y acepto recibir esta llamada." : "This number is mine and I agree to receive this call."}</span></label>
    <button type="button" className="button pv-primary" disabled={busy || !consent || !phone.trim() || left === 0} onClick={() => call("self")}>{busy ? (es ? "Pidiendo…" : "Requesting…") : (es ? "Llamar a mi número" : "Call my number")}</button>
    {error && <p className="pv-error" role="alert">{error}</p>}
    <p className="pv-meta">{left > 0 ? (es ? `${left} de 3 intentos disponibles` : `${left} of 3 attempts available`) : (es ? "Se usaron los 3 intentos." : "All 3 attempts used.")}</p>
    <div className="pv-team">
      <p className="pv-meta">{es ? "Solo para el equipo de VozCare:" : "For the VozCare team only:"}</p>
      <button type="button" className="button quiet pv-quiet" disabled={busy || left === 0} onClick={() => call("tester")}>{es ? "Llamada de prueba del equipo" : "Team test call"}</button>
    </div>
  </section>;
}