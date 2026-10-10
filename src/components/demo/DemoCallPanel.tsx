import type { Language } from "@/workflow";

// Visual-only copy of the call panel for the demo. Every control is disabled; nothing is called.
export default function DemoCallPanel({ language }: { language: Language }) {
  const es = language === "es";
  return <section className="pv-card" aria-labelledby="demo-call-title">
    <p className="prototype-label">DEMO</p>
    <h2 id="demo-call-title">{es ? "Pide tu llamada" : "Request your call"}</h2>
    <label className="pv-field" htmlFor="demo-phone">{es ? "Tu número de teléfono de EE. UU." : "Your US phone number"}</label>
    <input id="demo-phone" className="pv-input" type="tel" placeholder="(555) 123-4567" disabled />
    <label className="pv-check"><input type="checkbox" disabled /><span>{es ? "Este número es mío y acepto recibir esta llamada." : "This number is mine and I agree to receive this call."}</span></label>
    <button type="button" className="button pv-primary" disabled>{es ? "Llamar a mi número" : "Call my number"}</button>
    <p className="pv-meta">{es ? "Desactivado en la demostración: no se realiza ninguna llamada." : "Disabled in the demo: no call is placed."}</p>
    <div className="pv-team">
      <p className="pv-meta">{es ? "Solo para el equipo de VozCare:" : "For the VozCare team only:"}</p>
      <button type="button" className="button quiet pv-quiet" disabled>{es ? "Llamada de prueba del equipo" : "Team test call"}</button>
    </div>
  </section>;
}