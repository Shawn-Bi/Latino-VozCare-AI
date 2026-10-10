import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { type CallState } from "../patient/CallStatusCard";
import { callErrorText } from "../patient/patientText";
import type { Language } from "@/workflow";

type Props = { language: Language; state: CallState; setState: (s: CallState) => void; onStarted: (demoCallId: string) => void };

// Demo call panel: real calls with fixed fictional content via startDemoCall.
// Fictional demo only: no consent checkbox. Calls start only when a button is pressed.
export default function DemoCallPanel({ language, state, setState, onStarted }: Props) {
  const es = language === "es";
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const busy = state === "requesting";

  const call = async (mode: "self" | "tester") => {
    setState("requesting"); setError("");
    try {
      const res = await base44.functions.invoke("startDemoCall", { mode, phone, language });
      onStarted(res.data?.demoCallId || "");
      setState("requested");
    } catch (e: any) {
      setError(callErrorText(e?.response?.data?.error || e?.message || "", language));
      setState("error");
    }
  };

  return <section className="pv-card" aria-labelledby="demo-call-title">
    <h2 id="demo-call-title">{es ? "Pide tu llamada" : "Request your call"}</h2>
    <label className="pv-field" htmlFor="demo-phone">{es ? "Tu número de teléfono de EE. UU." : "Your US phone number"}</label>
    <input id="demo-phone" className="pv-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
    <button type="button" className="button pv-primary" style={{ marginTop: 16 }} disabled={busy || !phone.trim()} onClick={() => call("self")}>{busy ? (es ? "Pidiendo…" : "Requesting…") : (es ? "Llamar a mi número" : "Call my number")}</button>
    {error && <p className="pv-error" role="alert">{error}</p>}
    <p className="pv-meta">{es ? "Llamada de demostración con información ficticia de María." : "Demo call using María's fictional information."}</p>
    <div className="pv-team">
      <p className="pv-meta">{es ? "Solo para el equipo de VozCare:" : "For the VozCare team only:"}</p>
      <button type="button" className="button quiet pv-quiet" disabled={busy} onClick={() => call("tester")}>{es ? "Llamada de prueba del equipo" : "Team test call"}</button>
    </div>
  </section>;
}