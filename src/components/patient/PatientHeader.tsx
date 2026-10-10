import type { Language } from "../../workflow";

export default function PatientHeader({ language, setLanguage }: { language: Language; setLanguage: (l: Language) => void }) {
  const es = language === "es";
  return <header className="pv-header">
    <div className="brand"><div className="brand-mark" aria-hidden="true"><span /><span /><span /></div><div className="brand-name"><strong>VozCare</strong><small>AI</small></div></div>
    <div className="pv-lang" role="group" aria-label={es ? "Idioma" : "Language"}>
      <button type="button" lang="en" aria-pressed={!es} className={!es ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
      <button type="button" lang="es" aria-pressed={es} className={es ? "active" : ""} onClick={() => setLanguage("es")}>ES</button>
    </div>
  </header>;
}