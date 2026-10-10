import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { doctorTranslations } from "./doctor-translations";
import type { Dispatch, SetStateAction } from "react";
import EducationReview from "./EducationReview";
import { initialEducation, editEducation, type EducationDraft } from "./education";
import ApprovedCare from "./ApprovedCare";
import { initialWorkspace, initialDemo, demoDoctor, approveAndSend, deliveryProblem, resolveLink, openPatientLink, retryCall, inferAction, applyConversationEvent, makeEvent, appointmentLabel, localAppointmentValue, appointmentInstant, renewPatientLink, type PatientRecord, type Patient, type Appointment, type DemoState, type CardType, type TaskStatus, type Language, type AgentAction } from "./workflow";
import { loadWorkspace, mutateWorkspace, observeWorkspace, persistentDemoAvailable } from "./local-store";

type View = "home" | "doctor" | "patient";
type DoctorTab = "patients" | "care" | "session" | "queue";
const SiteLanguageContext = createContext<Language>("en");
type IconName = "home" | "doctor" | "patient" | "arrow" | "check" | "calendar" | "clock" | "phone" | "message" | "map" | "car" | "bus" | "walk" | "help" | "care" | "tasks" | "chevron" | "alert" | "language" | "reset" | "download" | "route" | "close" | "send" | "shield";

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  doctor: <><path d="M9 12h6M12 9v6" /><circle cx="12" cy="9" r="6" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  patient: <><circle cx="12" cy="7" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" /></>,
  message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
  car: <><path d="m5 17-1 2v2h2v-2h12v2h2v-2l-1-2-2-7H7Z" /><path d="M5 17h14M7 14h.01M17 14h.01" /></>,
  bus: <><rect x="4" y="3" width="16" height="17" rx="3" /><path d="M4 12h16M8 20v2M16 20v2M8 7h8" /></>,
  walk: <><circle cx="13" cy="4" r="2" /><path d="m10 22 2-7-3-3 2-5 4 3h3M5 22l4-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 1 1 4.2 2.25c-.95.62-1.7 1.1-1.7 2.25M12 17h.01" /></>,
  care: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></>,
  tasks: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 2 2 4-4M14 10h3M7 16h10" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  alert: <><path d="M10.3 3.6 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 21h14" /></>,
  route: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 17c0-6 12-4 12-10" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Logo({ tagline = false, language = "en" }: { tagline?: boolean; language?: Language }) {
  return <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div className="brand-copy"><div className="brand-name"><strong>VozCare</strong><small>AI</small></div>{tagline && <p>{language === "es" ? "Entiende tu cuidado. Siéntete acompañado." : "Understand your care. Feel supported."}</p>}</div></div>;
}

function Button({ children, onClick, variant = "primary", icon, disabled = false, className = "" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "quiet" | "danger"; icon?: IconName; disabled?: boolean; className?: string }) {
  return <button type="button" className={`button ${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}{icon && <Icon name={icon} size={18} />}</button>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "info" }) {
  return <span className={`badge ${tone}`}><i />{children}</span>;
}

function PrototypeLabel({ children }: { children?: ReactNode }) {
  const language = useContext(SiteLanguageContext);
  return <span className="prototype-label">{children ?? (language === "es" ? "Prototipo interactivo · datos ficticios" : "Interactive prototype · fictional data")}</span>;
}

function localizeDoctorText(text: string, language: Language) {
  if (language === "en") return text;
  const translated = doctorTranslations[text.trim()];
  return translated ? text.replace(text.trim(), translated) : text;
}

// Translate only interface text. Keep state identifiers, source columns,
// patient quotations, proper names, and callbacks unchanged.
function DoctorLocale({ children }: { children: ReactNode }) {
  const language = useContext(SiteLanguageContext);
  const translate = (nodes: ReactNode): ReactNode => Children.map(nodes, (node) => {
    if (typeof node === "string") return localizeDoctorText(node, language);
    if (!isValidElement<{ children?: ReactNode; "aria-label"?: string; "data-preserve-language"?: boolean }>(node) || node.props["data-preserve-language"]) return node;
    return cloneElement(node, {
      ...(node.props.children !== undefined ? { children: translate(node.props.children) } : {}),
      ...(node.props["aria-label"] ? { "aria-label": localizeDoctorText(node.props["aria-label"], language) } : {}),
    });
  });
  return translate(children);
}

function GlobalNav({ view, navigate, reset, language, setLanguage }: { view: View; navigate: (view: View) => void; reset: () => void; language: Language; setLanguage: (language: Language) => void }) {
  const es = language === "es";
  return <header className="global-nav">
    <button className="brand-button" onClick={() => navigate("home")} aria-label={es ? "Inicio de VozCare AI" : "VozCare AI home"}><Logo /></button>
    <nav aria-label={es ? "Vistas principales" : "Main views"}>
      <button aria-current={view === "home" ? "page" : undefined} className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><Icon name="home" size={17} />{es ? "Inicio" : "Home"}</button>
      <button aria-current={view === "doctor" ? "page" : undefined} className={view === "doctor" ? "active" : ""} onClick={() => navigate("doctor")}><Icon name="doctor" size={17} />{es ? "Vista médica" : "Doctor view"}</button>
      <button aria-current={view === "patient" ? "page" : undefined} className={view === "patient" ? "active" : ""} onClick={() => navigate("patient")}><Icon name="patient" size={17} />{es ? "Vista previa del paciente" : "Patient preview"}</button>
    </nav>
    <div className="nav-actions"><div className="language-toggle" role="group" aria-label={es ? "Idioma del sitio" : "Site language"}><button type="button" lang="es" aria-label="Español" aria-pressed={es} className={es ? "active" : ""} onClick={() => setLanguage("es")}>ES</button><button type="button" lang="en" aria-label="English" aria-pressed={!es} className={!es ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div><button className="reset-button" onClick={reset} aria-label={es ? "Reiniciar demo" : "Reset demo"}><Icon name="reset" size={16} /><span>{es ? "Reiniciar demo" : "Reset demo"}</span></button></div>
  </header>;
}

export default function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).get("view") === "doctor" ? "doctor" : "home");
  const [signedIn, setSignedIn] = useState(() => sessionStorage.getItem("vozcare-demo-doctor") === demoDoctor.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doctorTab, setDoctorTab] = useState<DoctorTab>("patients");
  const [language, setLanguage] = useState<Language>("en");
  const [toast, setToast] = useState("");
  const [patientToken, setPatientToken] = useState(() => window.location.hash.startsWith("#patient=") ? window.location.hash.slice(9) : null);
  const [storageReady] = useState(persistentDemoAvailable);
  const selected = workspace.records.find((item) => item.patient.id === selectedId && item.patient.doctorId === demoDoctor.id) ?? null;
  const link = patientToken !== null ? resolveLink(workspace, patientToken) : null;
  const personal = link?.record ?? null;
  useEffect(() => observeWorkspace(() => setWorkspace(loadWorkspace())), []);
  useEffect(() => {
    const change = () => setPatientToken(window.location.hash.startsWith("#patient=") ? window.location.hash.slice(9) : null);
    window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "es" ? "VozCare AI | Entiende tu cuidado" : "VozCare AI | Understand your care";
  }, [language]);
  const changeRecord = (patientId: string, update: (record: PatientRecord) => PatientRecord) => {
    try { mutateWorkspace((current) => ({ ...current, records: current.records.map((record) => record.patient.id === patientId ? update(record) : record) })); return true; }
    catch { setToast(language === "es" ? "No se pudo guardar. Revisa el almacenamiento del navegador e inténtalo de nuevo." : "Could not save. Check browser storage and try again."); return false; }
  };
  useEffect(() => {
    if (!personal) return;
    setLanguage(personal.packet!.deliveryLanguage);
    changeRecord(personal.patient.id, (record) => openPatientLink(record));
  }, [patientToken, personal?.access?.id]);
  useEffect(() => {
    if (patientToken === null) return;
    const timer = window.setInterval(() => setWorkspace(loadWorkspace()), 30000);
    return () => window.clearInterval(timer);
  }, [patientToken]);
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0 }); };
  const reset = () => {
    try { mutateWorkspace(() => initialWorkspace()); setSelectedId(null); setDoctorTab("patients"); setView("home"); setToast("Synthetic demo records reset."); }
    catch { setToast("Could not reset browser storage."); }
  };
  const setEducation: Dispatch<SetStateAction<EducationDraft>> = (value) => { if (selected) changeRecord(selected.patient.id, (record) => ({ ...record, draft: typeof value === "function" ? value(record.draft) : value })); };
  const approve = () => { if (selected) changeRecord(selected.patient.id, (record) => approveAndSend(record)); };
  const signIn = () => { sessionStorage.setItem("vozcare-demo-doctor", demoDoctor.id); setSignedIn(true); };
  const signOut = () => { sessionStorage.removeItem("vozcare-demo-doctor"); setSignedIn(false); setSelectedId(null); };
  const event = (patientId: string, action: AgentAction, statement: string, eventLanguage: Language, confirmed = false) => changeRecord(patientId, (record) => applyConversationEvent(record, makeEvent(record, action, statement, eventLanguage, confirmed)));
  return <SiteLanguageContext.Provider value={language}><div className="app">
    {patientToken === null && <GlobalNav view={view} navigate={navigate} reset={reset} language={language} setLanguage={setLanguage} />}
    {!storageReady && <p className="storage-warning" role="alert">{language === "es" ? "El almacenamiento local no está disponible. Esta demo no puede guardar paquetes ni enlaces." : "Browser storage is unavailable. This demo cannot save packets or personal links."}</p>}
    {patientToken !== null ? personal ? <PatientView key={personal.access!.id} record={personal} demo={personal.session} updateDemo={(patch) => changeRecord(personal.patient.id, (record) => ({ ...record, session: { ...record.session, ...patch } }))} onEvent={(action, statement = "", confirmed = false) => event(personal.patient.id, action, statement, language, confirmed)} language={language} setLanguage={setLanguage} setToast={setToast} retry={() => changeRecord(personal.patient.id, retryCall)} /> : <main className="patient-view"><div className="patient-shell"><Logo tagline language={language} /><section className="response-card"><h1>{language === "es" ? "Este enlace no está disponible" : "This link is unavailable"}</h1><p>{language === "es" ? "El enlace puede haber vencido o sido desactivado. Pide un enlace nuevo a tu equipo de atención." : "The link may have expired or been revoked. Ask your care team for a new link."}</p><PrototypeLabel>{language === "es" ? "Demo local · Solo funciona en este navegador" : "Local demo · Works only in this browser"}</PrototypeLabel></section></div></main>
    : <>
      {view === "home" && <Home navigate={navigate} language={language} />}
      {view === "doctor" && (!signedIn ? <main className="workspace"><section className="panel demo-login"><Logo /><p className="eyebrow">{language === "es" ? "ACCESO DEL EQUIPO" : "CARE TEAM SIGN-IN"}</p><h1>{language === "es" ? "Tus pacientes. Su próximo paso." : "Your patients. Their next step."}</h1><p>{language === "es" ? "En Base44 usarás Google para iniciar sesión. Por ahora, entra al espacio de un médico de demostración." : "Google sign-in will connect in Base44. For now, enter a clearly labeled demo doctor workspace."}</p><Button onClick={signIn}>{language === "es" ? "Continuar como médico de demo" : "Continue as demo doctor"}</Button><PrototypeLabel>{language === "es" ? "Acceso simulado · No es autenticación real" : "Simulated access · Not real authentication"}</PrototypeLabel></section></main> : <DoctorView records={workspace.records.filter((record) => record.patient.doctorId === demoDoctor.id)} record={selected} select={(patientId) => { setSelectedId(patientId); setDoctorTab("patients"); }} back={() => setSelectedId(null)} signOut={signOut} setEducation={setEducation} approve={approve} changeRecord={changeRecord} tab={doctorTab} setTab={setDoctorTab} setToast={setToast} />)}
      {view === "patient" && <main className="workspace"><section className="panel demo-login"><Logo /><h1>{language === "es" ? "Tu cuidado, en un enlace personal" : "Your care, through a personal link"}</h1><p>{language === "es" ? "Tu equipo revisa el paquete y envía tu enlace. Entra al panel médico para probar este recorrido con datos ficticios." : "Your team reviews your packet and sends your link. Open the doctor workspace to try this journey with fictional records."}</p><Button onClick={() => navigate("doctor")}>{language === "es" ? "Abrir panel médico de demo" : "Open demo doctor workspace"}</Button></section></main>}
    </>}
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </div></SiteLanguageContext.Provider>;
}

function Home({ navigate, language }: { navigate: (view: View) => void; language: Language }) {
  const es = language === "es";
  const features = es ? spanishHomeFeatures : homeFeatures;
  return <main className="home-view">
    <section className="hero">
      <div className="hero-copy">
        <PrototypeLabel>{es ? "Prototipo interactivo · Datos ficticios" : "Interactive prototype · Fictional data"}</PrototypeLabel>
        <p className="eyebrow">{es ? "SEGUIMIENTO POR VOZ QUE ACOMPAÑA AL PACIENTE" : "VOICE FOLLOW-UP THAT STAYS WITH THE PATIENT"}</p>
        <h1>{es ? "Cada paciente merece " : "Every patient deserves to "}<em>{es ? "entender su cuidado." : "understand their care."}</em></h1>
        <p className="hero-lead">{es ? "VozCare llama al día siguiente de la visita. Un sitio web sencillo responde junto con la conversación: instrucciones de cuidado, citas, indicaciones para llegar y una forma clara de contactar a tu equipo." : "VozCare follows up by phone the day after a visit. A simple website responds alongside the conversation—with care instructions, appointments, directions, and a clear path back to your team."}</p>
        <div className="hero-actions"><Button onClick={() => navigate("doctor")} icon="arrow">{es ? "Abrir panel médico" : "Open doctor dashboard"}</Button><Button onClick={() => navigate("patient")} variant="quiet">{es ? "Ver experiencia del paciente" : "Preview patient experience"}</Button></div>
        <p className="hero-note"><Icon name="shield" size={16} /> {es ? "Datos ficticios · Llamadas y mensajes simulados" : "Fictional data · Calls and texts are simulated"}</p>
      </div>
      <div className="hero-visual">
        <div className="portrait-backdrop" aria-hidden="true" />
        <img className="hero-grandmother" src="/images/grandmother-phone-v1.png" width="1024" height="1536" alt={es ? "Una mujer latina mayor escucha y habla por teléfono." : "An older Latina woman listening and speaking on her phone."} fetchPriority="high" />
        <div className="hero-feature-path">
          <svg className="feature-road" viewBox="0 0 300 600" fill="none" aria-hidden="true"><path d="M154 35 C154 90 64 85 64 135 S174 174 174 235 S64 272 64 335 S154 372 154 435 S64 475 64 535" /><path className="road-center" d="M154 35 C154 90 64 85 64 135 S174 174 174 235 S64 272 64 335 S154 372 154 435 S64 475 64 535" /></svg>
          <ol aria-label={es ? "Funciones de VozCare" : "VozCare features"}>{features.map((feature, index) => <li key={feature.id} className={`path-stop path-stop-${index + 1}`}><span className="path-icon"><Icon name={feature.icon} size={20} /></span><span>{feature.label}</span></li>)}</ol>
        </div>
      </div>
    </section>
    <FeatureWalkthrough navigate={navigate} language={language} />
    <div className="care-photo-section"><figure><img src="/images/clinician-patient-v1.png" width="1536" height="1024" loading="lazy" decoding="async" alt={es ? "Imagen ilustrativa de una médica y una paciente latina mayor revisando juntas las instrucciones de cuidado." : "Illustrative photo of a clinician and an older Latina patient reviewing care instructions together."} /></figure></div>
    <footer className="home-footer"><div><Logo /><p>{es ? "El cuidado continúa después de la visita." : "Care continues after the visit."}</p></div><nav aria-label={es ? "Navegación del pie de página" : "Footer views"}><button onClick={() => navigate("doctor")}>{es ? "Panel médico" : "Doctor dashboard"}</button><button onClick={() => navigate("patient")}>{es ? "Experiencia del paciente" : "Patient experience"}</button><a href="#features">{es ? "Explorar funciones" : "Explore features"}</a></nav><p className="footer-note">{es ? "Prototipo interactivo · Pacientes ficticios" : "Interactive prototype · Fictional patients"}<br />{es ? "Llamadas, mensajes y mapas simulados." : "Calls, texts, and maps are simulated."}</p></footer>
  </main>;
}

const homeFeatures: { id: string; label: string; icon: IconName; title: string; description: string }[] = [
  { id: "voice", label: "Voice follow-up", icon: "phone", title: "Start with a familiar conversation.", description: "Your team starts a next-day follow-up. Patients talk by phone in Spanish, with a companion website for the information they need." },
  { id: "care", label: "Care understanding", icon: "care", title: "Make the care plan easier to understand.", description: "Help patients explain what they understood. Show clinician-approved instructions alongside the conversation and bring unresolved questions back to your team." },
  { id: "appointment", label: "Appointments", icon: "calendar", title: "Turn appointment confusion into clarity.", description: "When a patient says, ‘I thought it was next week,’ show the saved date, time, and location. Their question does not change the appointment." },
  { id: "directions", label: "Directions", icon: "map", title: "Help patients see how to get there.", description: "Confirm their starting address, then show the route to the hospital. The demo previews driving, transit, and walking options." },
  { id: "access", label: "Access support", icon: "help", title: "Find out what is getting in the way.", description: "Give patients a way to ask for help with transportation, cost, or scheduling. Confirm the request before sending it to the care team." },
  { id: "staff", label: "Staff follow-up", icon: "tasks", title: "Give every request a clear next step.", description: "Patient-confirmed transportation requests appear in your assistance queue. Your team can review them, update their status, and keep the patient informed." },
];

const spanishHomeFeatures: typeof homeFeatures = [
  { id: "voice", label: "Seguimiento por voz", icon: "phone", title: "Empieza con una conversación familiar.", description: "Tu equipo inicia el seguimiento al día siguiente. Los pacientes hablan por teléfono en español y consultan la información que necesitan en un sitio web de apoyo." },
  { id: "care", label: "Entender el cuidado", icon: "care", title: "Haz que el plan de cuidado sea más fácil de entender.", description: "Ayuda a los pacientes a explicar lo que entendieron. Muestra las instrucciones aprobadas por su médico durante la conversación y comunica las dudas pendientes a tu equipo." },
  { id: "appointment", label: "Citas", icon: "calendar", title: "Aclara las dudas sobre la próxima cita.", description: "Si un paciente dice: ‘Pensé que era la próxima semana’, muestra la fecha, hora y lugar guardados. Su pregunta no cambia la cita." },
  { id: "directions", label: "Cómo llegar", icon: "map", title: "Ayuda a los pacientes a ver cómo llegar.", description: "Confirma su dirección de inicio y muestra la ruta al hospital. La demo incluye opciones ilustrativas de auto, transporte público y caminata." },
  { id: "access", label: "Ayuda para acceder", icon: "help", title: "Identifica qué dificulta recibir atención.", description: "Permite pedir ayuda con transporte, costos u horarios. Confirma la solicitud antes de enviarla al equipo de atención." },
  { id: "staff", label: "Seguimiento del equipo", icon: "tasks", title: "Dale un siguiente paso claro a cada solicitud.", description: "Las solicitudes de transporte confirmadas por el paciente aparecen en tu lista de asistencia. Tu equipo puede revisarlas, actualizar su estado e informar al paciente." },
];

function FeatureWalkthrough({ navigate, language }: { navigate: (view: View) => void; language: Language }) {
  const es = language === "es";
  const features = es ? spanishHomeFeatures : homeFeatures;
  const [active, setActive] = useState(0);
  const walkthrough = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const selectedStep = useRef<number | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 700px)").matches);

  useLayoutEffect(() => {
    if (selectedStep.current === null || !walkthrough.current || !stage.current) return;
    if (window.matchMedia("(max-width: 700px)").matches) { selectedStep.current = null; return; }
    const navHeight = document.querySelector(".global-nav")?.getBoundingClientRect().height || 70;
    const stickyTop = navHeight + Math.max(12, (window.innerHeight - navHeight - stage.current.offsetHeight) / 2);
    stage.current.style.setProperty("--feature-sticky-top", `${stickyTop}px`);
    const distance = Math.max(1, walkthrough.current.offsetHeight - stage.current.offsetHeight);
    const top = walkthrough.current.getBoundingClientRect().top + window.scrollY - stickyTop + distance * selectedStep.current / (homeFeatures.length - 1);
    // Match the scroll position before paint, so a click never cycles through
    // intervening features or measures the previous feature's height.
    window.scrollTo({ top, behavior: "instant" });
    selectedStep.current = null;
  }, [active]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const isCompact = window.matchMedia("(max-width: 700px)").matches;
      setCompact(isCompact);
      if (selectedStep.current !== null || !walkthrough.current || !stage.current || isCompact) return;
      const navHeight = document.querySelector(".global-nav")?.getBoundingClientRect().height || 70;
      const stickyTop = navHeight + Math.max(12, (window.innerHeight - navHeight - stage.current.offsetHeight) / 2);
      stage.current.style.setProperty("--feature-sticky-top", `${stickyTop}px`);
      const distance = Math.max(1, walkthrough.current.offsetHeight - stage.current.offsetHeight);
      const progress = Math.max(0, Math.min(1, (stickyTop - walkthrough.current.getBoundingClientRect().top) / distance));
      setActive(Math.round(progress * (homeFeatures.length - 1)));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    if (stage.current) observer.observe(stage.current);
    const nav = document.querySelector(".global-nav");
    if (nav) observer.observe(nav);
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.cancelAnimationFrame(frame); };
  }, [language]);

  const select = (index: number) => {
    if (index === active) return;
    selectedStep.current = index;
    setActive(index);
  };
  const feature = features[active];

  return <section className="home-features" id="features" aria-labelledby="features-title">
    <div className="feature-heading"><p className="eyebrow">{es ? "UNA CONVERSACIÓN. LA INFORMACIÓN NECESARIA." : "ONE CONVERSATION. THE RIGHT INFORMATION."}</p><h2 id="features-title">{es ? "Conoce el seguimiento de VozCare." : "See care follow-up in action."}</h2><p>{compact ? (es ? "Elige una función para ver cómo cambia el teléfono." : "Choose a feature to see the phone change with you.") : (es ? "Desplázate o elige una función. El teléfono cambia contigo." : "Scroll to explore, or choose a feature. The phone changes with you.")}</p></div>
    <div className="feature-walkthrough" ref={walkthrough}>
      <div className="feature-stage" ref={stage}>
        <div className="feature-selector">
          <p className="feature-counter">{es ? "EXPLORA VOZCARE" : "EXPLORE VOZCARE"}</p>
          <div className="feature-tabs" aria-label={es ? "Elige una función" : "Choose a feature"}>{features.map((item, index) => <button key={item.id} type="button" className={active === index ? "active" : ""} aria-current={active === index ? "step" : undefined} aria-controls="feature-detail" onClick={() => select(index)}><span className="feature-tab-icon"><Icon name={item.icon} /></span><span>{item.label}</span><Icon name="chevron" size={16} /></button>)}</div>
          <div id="feature-detail" className="feature-detail"><h3>{feature.title}</h3><p>{feature.description}</p><button className="feature-open" onClick={() => navigate(feature.id === "staff" ? "doctor" : "patient")}>{feature.id === "staff" ? (es ? "Abrir panel médico" : "Open doctor dashboard") : (es ? "Abrir experiencia del paciente" : "Open patient experience")}<Icon name="arrow" size={17} /></button></div>
        </div>
        <div className="feature-phone-column"><div className="phone-backdrop" aria-hidden="true" /><FeaturePhone feature={feature} language={language} /></div>
      </div>
    </div>
  </section>;
}

function FeaturePhone({ feature, language }: { feature: typeof homeFeatures[number]; language: Language }) {
  const es = language === "es";
  return <div className="hero-phone feature-phone" role="img" aria-label={`${es ? "Vista previa del sitio del paciente" : "Patient website preview"}: ${feature.label}`}>
    <div className="phone-camera" aria-hidden="true" />
    <div className="feature-phone-screen" inert aria-hidden="true">
      <div className="hero-phone-head"><Logo tagline language={language} /></div>
      <div className="call-pill"><span className="pulse" />{es ? "Llamada en curso" : "Call in progress"} <small>DEMO</small></div>
      <div className="phone-content" key={feature.id}>
        {feature.id === "voice" && <><h3>{es ? "Hola, María." : "Hello, María."}</h3><p className="phone-greeting">{es ? "Estoy aquí para ayudarte con tu cuidado." : "I’m here to help you understand your care."}</p><div className="phone-voice-orb"><Icon name="phone" size={32} /><div className="phone-wave">{[12, 25, 37, 19, 30, 42, 27, 15, 32].map((height, index) => <span key={index} style={{ height }} />)}</div></div><div className="phone-conversation"><small>VOZCARE</small><p>{es ? "Cuéntame qué entendiste de tu visita." : "Tell me what you understood from your visit."}</p></div><div className="hero-context-card"><span><Icon name="calendar" /></span><div><small>{es ? "PRÓXIMA CITA" : "NEXT APPOINTMENT"}</small><strong>{es ? "Lunes, 12 de octubre" : "Monday, October 12"}</strong><p>{es ? "10:30 a. m." : "10:30 AM"}</p></div></div></>}
        {feature.id === "care" && <PatientCareCard language={language} />}
        {feature.id === "appointment" && <AppointmentCard language={language} />}
        {feature.id === "directions" && <RouteCard language={language} address={initialDemo.startingAddress} changeAddress={() => {}} />}
        {feature.id === "access" && <HelpCard language={language} />}
        {feature.id === "staff" && <TransportCard language={language} demo={{ ...initialDemo, taskCreated: true }} createTask={() => {}} />}
      </div>
      <div className="hero-shortcuts"><span><Icon name="calendar" /></span><span><Icon name="map" /></span><span><Icon name="care" /></span><span><Icon name="help" /></span></div>
    </div>
    <div className="phone-home-bar" aria-hidden="true" />
  </div>;
}

function DoctorView({ records, record, select, back, signOut, setEducation, approve, changeRecord, tab, setTab, setToast }: {
  records: PatientRecord[]; record: PatientRecord | null; select: (id: string) => void; back: () => void; signOut: () => void;
  setEducation: Dispatch<SetStateAction<EducationDraft>>; approve: () => void; changeRecord: (id: string, update: (record: PatientRecord) => PatientRecord) => boolean;
  tab: DoctorTab; setTab: (tab: DoctorTab) => void; setToast: (value: string) => void;
}) {
  const language = useContext(SiteLanguageContext); const es = language === "es";
  const tabs: { id: DoctorTab; label: string }[] = [{ id: "patients", label: es ? "Resumen" : "Overview" }, { id: "care", label: es ? "Revisión educativa" : "Education review" }, { id: "session", label: es ? "Seguimiento" : "Follow-up" }, { id: "queue", label: es ? "Solicitudes" : "Assistance requests" }];
  return <main className="workspace doctor-view">
    <div className="workspace-heading"><div><PrototypeLabel /><p className="eyebrow">{es ? "ESPACIO DEL EQUIPO" : "CARE TEAM WORKSPACE"}</p><h1>{record ? record.patient.name : es ? "Mis pacientes" : "My patients"}</h1><p>{record ? (es ? "Visita del 10 de octubre · Datos ficticios" : "October 10 visit · Fictional record") : (es ? "Elige un paciente para revisar su visita y su paquete educativo." : "Choose a patient to review their visit and education packet.")}</p></div><div className="doctor-account"><strong>{demoDoctor.name}</strong><small>{es ? "Médico de demo" : "Demo doctor"}</small><Button variant="quiet" onClick={signOut}>{es ? "Salir" : "Sign out"}</Button></div></div>
    {!record ? <section className="panel patient-list-panel"><div className="panel-heading"><h2>{es ? "Pacientes asignados" : "Assigned patients"}</h2><span>{records.length}</span></div><div className="patient-table-head"><span>{es ? "Paciente" : "Patient"}</span><span>{es ? "Educación" : "Education"}</span><span>{es ? "Seguimiento" : "Follow-up"}</span><span>{es ? "Cita" : "Appointment"}</span></div>{records.map((item) => <button type="button" className="patient-row patient-select" key={item.patient.id} onClick={() => select(item.patient.id)} aria-label={`${es ? "Abrir" : "Open"} ${item.patient.name}`}><span className="person"><i>{item.patient.initials}</i><span><strong>{item.patient.name}</strong><small>{es ? "Español preferido · Ficticio" : "Spanish preferred · Fictional"}</small></span></span><Badge tone={item.draft.approvedAt ? "success" : "warning"}>{item.draft.approvedAt ? (es ? "Aprobado" : "Approved") : (es ? "Necesita revisión" : "Needs review")}</Badge><span>{item.session.openedAt ? es ? "Enlace abierto" : "Link opened" : item.delivery.status === "Sent in demo" ? es ? "Enlace enviado · demo" : "Link sent · demo" : es ? "Sin enviar" : "Not sent"}</span><span>{new Intl.DateTimeFormat(es ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: item.visit.appointment.timeZone }).format(new Date(item.visit.appointment.startsAt))}<Icon name="chevron" size={16} /></span></button>)}</section>
    : <><button type="button" className="back-to-patients" onClick={back}>← {es ? "Todos los pacientes" : "All patients"}</button>
      <div className="patient-record-context"><span className="person"><i>{record.patient.initials}</i><span><strong>{record.patient.name}</strong><small>{record.patient.phone} · {record.patient.preferredLanguage === "es" ? "Español" : "English"}</small></span></span><span>{record.patient.address || (es ? "Falta dirección" : "Address missing")}</span><Badge tone={record.draft.approvedAt ? "success" : "warning"}>{record.draft.approvedAt ? (es ? "Paquete aprobado" : "Packet approved") : (es ? "Borrador" : "Draft")}</Badge></div>
      <div className="doctor-tabs" role="tablist" aria-label={es ? "Registro del paciente" : "Patient record"} onKeyDown={(event) => { const index = tabs.findIndex((item) => item.id === tab); const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next < 0) return; event.preventDefault(); setTab(tabs[next].id); event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus(); }}>
        {tabs.map((item) => <button type="button" key={item.id} id={`doctor-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`doctor-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div><div role="tabpanel" id={`doctor-panel-${tab}`} aria-labelledby={`doctor-tab-${tab}`} tabIndex={0}>
        {tab === "patients" && <PatientOverview key={record.patient.id} record={record} changeRecord={changeRecord} review={() => setTab("care")} />}
        {tab === "care" && <><p className="workspace-language-note">{es ? "Los controles de revisión están en inglés. El paquete del paciente está disponible en español e inglés." : "Review controls are in English. Patient packets are available in Spanish and English."}</p><section className="panel delivery-review"><h2>{es ? "Datos de entrega guardados" : "Saved delivery details"}</h2><p>{record.patient.name} · {record.patient.phone} · {record.patient.address}</p><p>{appointmentLabel(record.visit.appointment, language)} · {record.visit.appointment.hospital}</p><p>{es ? "Al aprobar, se crea el enlace. La llamada empieza cuando el paciente lo abre." : "Approval creates the link. The call starts when the patient opens it."}</p>{deliveryProblem(record) && <p role="alert">{deliveryProblem(record)}</p>}</section><EducationReview key={record.patient.id} draft={record.draft} setDraft={setEducation} patientName={record.patient.name} firstName={record.patient.firstName} caseKind={record.patient.caseKind} onApprove={approve} deliveryProblem={deliveryProblem(record)} /><DeliveryPanel record={record} changeRecord={changeRecord} /></>}
        {tab === "session" && <><DeliveryPanel record={record} changeRecord={changeRecord} /><SessionSummary demo={record.session} /><section className="panel event-history"><h2>{es ? "Eventos de conversación · Demo" : "Conversation events · Demo"}</h2>{record.session.events.length ? <ol>{record.session.events.map((event) => <li key={event.id}><strong>{event.action}</strong> <span lang={event.language}>{event.statement}</span></li>)}</ol> : <p>{es ? "Aún no hay eventos." : "No conversation events yet."}</p>}</section></>}
        {tab === "queue" && <AssistanceQueue demo={record.session} patient={record.patient} updateDemo={(patch) => changeRecord(record.patient.id, (item) => ({ ...item, session: { ...item.session, ...patch } }))} setToast={setToast} />}
      </div></>}
  </main>;
}

function PatientOverview({ record, changeRecord, review }: { record: PatientRecord; changeRecord: (id: string, update: (record: PatientRecord) => PatientRecord) => boolean; review: () => void }) {
  const language = useContext(SiteLanguageContext); const es = language === "es";
  const [phone, setPhone] = useState(record.patient.phone); const [address, setAddress] = useState(record.patient.address);
  const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  const [startsAt, setStartsAt] = useState(localAppointmentValue(record.visit.appointment)); const [hospital, setHospital] = useState(record.visit.appointment.hospital); const [destination, setDestination] = useState(record.visit.appointment.address);
  return <div className="record-overview"><section className="panel profile-details"><h2>{es ? "Contacto y cita" : "Contact and appointment"}</h2><form onSubmit={(event) => { event.preventDefault(); let instant: string; try { instant = appointmentInstant(startsAt, record.visit.appointment.timeZone); } catch (error) { setSaved(false); setError(error instanceof Error ? error.message : "Invalid appointment time."); return; } setError(""); const didSave = changeRecord(record.patient.id, (item) => ({ ...item, patient: { ...item.patient, phone: phone.trim(), address: address.trim() }, visit: { ...item.visit, appointment: { ...item.visit.appointment, startsAt: instant, endsAt: new Date(Date.parse(instant) + 3600000).toISOString(), hospital: hospital.trim(), address: destination.trim() } }, draft: editEducation(item.draft, {}) })); setSaved(didSave); }}>
    <label>{es ? "Número de teléfono" : "Phone number"}<input type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false); }} required /></label>
    <label>{es ? "Dirección de inicio guardada" : "Saved starting address"}<input value={address} onChange={(event) => { setAddress(event.target.value); setSaved(false); }} required /></label>
    <label>{es ? "Fecha y hora de cita · Hora de Nueva York" : "Appointment date and time · New York time"}<input type="datetime-local" value={startsAt} onChange={(event) => { setStartsAt(event.target.value); setSaved(false); }} required /></label>
    <label>{es ? "Hospital" : "Hospital"}<input value={hospital} onChange={(event) => { setHospital(event.target.value); setSaved(false); }} required /></label>
    <label>{es ? "Dirección del hospital" : "Hospital address"}<input value={destination} onChange={(event) => { setDestination(event.target.value); setSaved(false); }} required /></label>
    <button type="submit" className="button secondary">{es ? "Guardar datos de demo" : "Save demo details"}</button>{saved && <p role="status">{es ? "Datos guardados. Revisa y aprueba un paquete nuevo para compartir cambios." : "Details saved. Review and approve a new packet to share changes."}</p>}
    {error && <p role="alert">{error}</p>}</form><p>{appointmentLabel(record.visit.appointment, language)} · {record.visit.appointment.hospital}</p></section>
    <section className="panel selected-patient"><p className="eyebrow">{es ? "EDUCACIÓN DE LA VISITA" : "VISIT EDUCATION"}</p><h2>{es ? `Ayuda a ${record.patient.firstName} a entender su visita.` : `Help ${record.patient.firstName} understand their visit.`}</h2><p>{record.patient.caseKind === "colon" ? es ? "Colon sigmoide · Estadio pendiente" : "Sigmoid colon · Stage pending" : es ? "Ejemplo de seguimiento · Sin diagnóstico registrado" : "Follow-up example · No diagnosis recorded"}</p><Badge tone={record.draft.approvedAt ? "success" : "warning"}>{record.draft.approvedAt ? (es ? "Aprobado" : "Approved") : (es ? "Necesita revisión" : "Needs review")}</Badge><Button onClick={review} icon="arrow">{es ? "Revisar paquete educativo" : "Review education draft"}</Button><p>{es ? "Revisa el contenido y los datos de entrega antes de enviar el enlace personal." : "Review the content and delivery details before sending the personal link."}</p></section></div>;
}

function DeliveryPanel({ record, changeRecord }: { record: PatientRecord; changeRecord: (id: string, update: (record: PatientRecord) => PatientRecord) => void }) {
  const language = useContext(SiteLanguageContext); const es = language === "es";
  if (!record.packet || !record.access) return null;
  const url = `${window.location.origin}${window.location.pathname}#patient=${record.access.token}`;
  const unavailable = !!record.access.revokedAt || Date.parse(record.access.expiresAt) <= Date.now();
  return <section className="panel delivery-panel"><div className="panel-heading"><div><h2>{es ? "Entrega y seguimiento" : "Delivery and follow-up"}</h2><p>{record.patient.name} · {es ? "Paquete" : "Packet"} v{record.packet.revision}</p></div><Badge tone={unavailable || record.delivery.status === "Failed in demo" ? "warning" : "success"}>{unavailable ? (es ? "Enlace desactivado" : "Link unavailable") : record.delivery.status === "Failed in demo" ? (es ? "Error de envío · demo" : "Delivery failed · demo") : (es ? "Enlace enviado · demo" : "Link sent · demo")}</Badge></div>
    <p>{es ? "Mensaje simulado a" : "Simulated text to"} {record.delivery.phone}. {es ? "No se envió ningún SMS real." : "No real SMS was sent."}</p><p>{es ? "Estado de llamada:" : "Call state:"} {({ "Not started": es ? "Esperando al paciente" : "Waiting for patient", Calling: es ? "Llamando" : "Calling", Connected: es ? "Conectada · demo" : "Connected · demo", "No answer": es ? "Sin respuesta" : "No answer", Ended: es ? "Finalizada" : "Ended" })[record.session.callState]} · {record.session.callAttempts} {es ? record.session.callAttempts === 1 ? "intento" : "intentos" : record.session.callAttempts === 1 ? "attempt" : "attempts"}</p>
    {!unavailable && record.delivery.status !== "Failed in demo" && <a className="button" href={url} target="_blank" rel="noreferrer">{es ? "Abrir enlace personal de demo" : "Open personal demo link"} ↗</a>}
    <p className="local-link-note">{es ? "Este enlace local solo funciona en este navegador. Base44 validará el acceso en el servidor." : "This local link works only in this browser. Base44 must validate access on the server."}</p>
    <Button variant="secondary" onClick={() => changeRecord(record.patient.id, renewPatientLink)}>{es ? "Crear enlace nuevo de demo" : "Create new demo link"}</Button>
    <details className="delivery-simulations"><summary>{es ? "Probar fallos de demo" : "Test demo failures"}</summary><div className="status-actions">
      <button type="button" onClick={() => changeRecord(record.patient.id, (item) => ({ ...item, delivery: { ...item.delivery, status: "Failed in demo" } }))}>{es ? "Simular error de SMS" : "Simulate SMS failure"}</button>
      <button type="button" onClick={() => changeRecord(record.patient.id, (item) => ({ ...item, delivery: { ...item.delivery, status: "Sent in demo", sentAt: new Date().toISOString() } }))}>{es ? "Reintentar SMS de demo" : "Retry demo SMS"}</button>
      <button type="button" disabled={!record.session.openedAt} onClick={() => changeRecord(record.patient.id, (item) => ({ ...item, session: { ...item.session, callState: "No answer", followUpStatus: "Ready for follow-up" } }))}>{es ? "Simular llamada sin respuesta" : "Simulate unanswered call"}</button>
      <button type="button" disabled={record.session.callState !== "No answer"} onClick={() => changeRecord(record.patient.id, retryCall)}>{es ? "Reintentar llamada de demo" : "Retry demo call"}</button>
      <button type="button" onClick={() => changeRecord(record.patient.id, (item) => ({ ...item, access: item.access ? { ...item.access, expiresAt: new Date(Date.now() - 1000).toISOString() } : null }))}>{es ? "Vencer enlace" : "Expire link"}</button>
      <button type="button" onClick={() => changeRecord(record.patient.id, (item) => ({ ...item, access: item.access ? { ...item.access, revokedAt: new Date().toISOString() } : null }))}>{es ? "Desactivar enlace" : "Revoke link"}</button>
    </div></details>
  </section>;
}

function SessionSummary({ demo }: { demo: DemoState }) {
  return <DoctorLocale><div className="summary-grid">
    <section className="panel teachback-panel"><div className="panel-heading"><div><h2>Teach-back results</h2><p>Demo conversation summary · original response and review</p></div><Badge tone={demo.followUpStatus === "Scheduled" ? "neutral" : "success"}>{demo.latestPatientStatement ? "Conversation available" : demo.followUpStatus === "Ready for follow-up" ? "Follow-up ready" : demo.followUpStatus === "Call in progress" ? "Call in progress" : demo.followUpStatus === "Conversation ended" ? "Conversation ended" : "Awaiting follow-up"}</Badge></div>
      <SummaryRow title="Appointment date" status={demo.cards.includes("appointment") ? "Appointment shown" : "Not assessed"} quote={demo.appointmentStatement ? `“${demo.appointmentStatement}”` : "No patient response yet."} quoteLanguage={demo.appointmentStatementLanguage ?? undefined} summary={demo.appointmentStatement ? "Patient asked about the appointment. The saved date was shown; understanding has not been confirmed." : demo.cards.includes("appointment") ? "The saved appointment was opened. No patient confirmation was recorded." : "Start the demo follow-up to assess understanding."} />
      <SummaryRow title="Transportation" status={demo.taskCreated ? (demo.taskStatus === "Resolved" ? "Review closed" : "Needs review") : "Not assessed"} quote={demo.taskCreated ? demo.transportationStatement ? `“${demo.transportationStatement}”` : "Requested through the website. No spoken statement recorded." : "No patient response yet."} quoteLanguage={demo.transportationStatementLanguage ?? undefined} summary={demo.taskCreated ? (demo.taskStatus === "Resolved" ? "The patient-confirmed request was marked resolved by staff. No ride booking is recorded in this demo." : "Patient confirmed a request for transportation help. No ride is booked.") : "No transportation request recorded."} />
      <SummaryRow title="Visit education" status="Not assessed" quote="No patient response yet." summary="The approved visit packet remains available in My care." />
    </section>
    <aside className="panel summary-side"><div className="panel-heading"><div><h2>Safety and barriers</h2></div></div><div className="safe-state"><span><Icon name="shield" /></span><div><strong>Urgent symptoms not assessed</strong><p>This prototype does not perform clinical monitoring.</p></div></div><div className="barrier-tags"><small>BARRIER CATEGORIES</small><div><Badge tone={demo.taskCreated ? "warning" : "neutral"}>Transportation</Badge><Badge>Cost</Badge><Badge>Scheduling</Badge><Badge>Directions</Badge></div></div></aside>
  </div></DoctorLocale>;
}

function SummaryRow({ title, status, quote, summary, quoteLanguage }: { title: string; status: string; quote: string; summary: string; quoteLanguage?: Language }) {
  return <DoctorLocale><article className="summary-row"><div><h3>{title}</h3><Badge tone={status === "Review closed" ? "success" : status === "Appointment shown" ? "info" : status === "Needs review" ? "warning" : "neutral"}>{status}</Badge></div><div className="summary-response"><span><small>ORIGINAL PATIENT STATEMENT</small><p data-preserve-language={quote.startsWith("“")} lang={quoteLanguage}>{quote}</p></span><span><small>REVIEW SUMMARY</small><p>{summary}</p></span></div></article></DoctorLocale>;
}

function AssistanceQueue({ demo, patient, updateDemo, setToast }: { demo: DemoState; patient: Patient; updateDemo: (patch: Partial<DemoState>) => void; setToast: (value: string) => void }) {
  const changeStatus = (status: TaskStatus) => { updateDemo({ taskStatus: status }); setToast(`Request marked ${status.toLowerCase()}`); };
  return <DoctorLocale><section className="panel queue-panel"><div className="panel-heading"><div><h2>Assistance queue</h2><p>Patient-confirmed requests that need human review</p></div><Badge tone={demo.taskCreated ? "warning" : "neutral"}>{demo.taskCreated ? "1 request" : "Queue clear"}</Badge></div>
    {!demo.taskCreated ? <div className="empty-state"><span><Icon name="tasks" /></span><h3>No patient requests yet</h3><p>A task appears here only after the patient confirms a request in Patient view.</p></div> :
      <article className="task-card updated"><div className="task-card-head"><div className="person"><i>{patient.initials}</i><span><strong>{patient.name}</strong><small>Created from demo conversation · Browser-local only</small></span></div><Badge tone={demo.taskStatus === "Resolved" ? "success" : demo.taskStatus === "In progress" ? "info" : "warning"}>{demo.taskStatus}</Badge></div>
        <div className="task-grid"><div><small>BARRIER</small><strong><Icon name="car" />Transportation</strong></div><div><small>PATIENT’S EXACT STATEMENT</small><p data-preserve-language lang={demo.transportationStatementLanguage ?? undefined}>{demo.transportationStatement ? `“${demo.transportationStatement}”` : "No spoken statement recorded. Requested through the website."}</p><span className="task-translation">Translation unavailable in this demo. Review the original statement.</span></div><div><small>REQUESTED ASSISTANCE</small><p>Patient would like staff to review transportation options.</p></div></div>
        <div className="pending-warning"><Icon name="alert" /><p>{demo.taskStatus === "Resolved" ? "The review task is closed. This demo does not record a ride booking." : "This request needs staff review. Transportation has not been arranged or guaranteed."}</p></div>
        <div className="status-actions"><span>Update status</span>{(["Open", "In progress", "Resolved"] as TaskStatus[]).map((status) => <button type="button" aria-pressed={demo.taskStatus === status} className={demo.taskStatus === status ? "active" : ""} onClick={() => changeStatus(status)} key={status}>{status}</button>)}</div>
      </article>}
  </section></DoctorLocale>;
}

const copy = {
  es: {
    greeting: "Hola, María.",
    sub: "Estoy aquí contigo durante esta llamada de seguimiento.",
    call: "Llamada de seguimiento en curso",
    ended: "La conversación terminó",
    latest: "ÚLTIMO TURNO DE LA CONVERSACIÓN",
    prompt: "Puedes escribir lo que dirías por teléfono. Este sitio responderá con información guardada.",
    placeholder: "Escribe una frase para la demostración…",
    send: "Enviar",
    appointment: "Cita",
    directions: "Cómo llegar",
    care: "Mi cuidado",
    help: "Ayuda",
    end: "Finalizar conversación",
    examples: "EJEMPLOS DE UN TOQUE",
    confusion: "Pensé que mi cita era la próxima semana.",
    lost: "No sé cómo llegar.",
    ride: "No tengo transporte.",
  },
  en: {
    greeting: "Hello, María.",
    sub: "I’m here with you during this follow-up call.",
    call: "Follow-up call in progress",
    ended: "Conversation ended",
    latest: "LATEST CONVERSATION TURN",
    prompt: "Type what you would say on the phone. This site will respond with saved information.",
    placeholder: "Type a statement for the demo…",
    send: "Send",
    appointment: "Appointment",
    directions: "Directions",
    care: "My care",
    help: "Help",
    end: "End conversation",
    examples: "ONE-TAP EXAMPLES",
    confusion: "I thought my appointment was next week.",
    lost: "I don't know how to get there.",
    ride: "I don't have a ride.",
  },
};

function PatientView({ record, demo, updateDemo, onEvent, language, setLanguage, setToast, retry }: { record: PatientRecord; demo: DemoState; updateDemo: (patch: Partial<DemoState>) => void; onEvent: (action: AgentAction, statement?: string, confirmed?: boolean) => boolean; language: Language; setLanguage: (language: Language) => void; setToast: (value: string) => void; retry: () => void }) {
  const t = copy[language];
  const activeContext = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [editAddress, setEditAddress] = useState(true);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const active = record.session.callState === "Connected";
  const ended = record.session.callState === "Ended";
  const latestEvent = record.session.events[record.session.events.length - 1];
  const latestAction = latestEvent?.action;
  useEffect(() => {
    if (!latestEvent || latestEvent.action === "end_call" || latestEvent.confirmed) return;
    activeContext.current?.focus({ preventScroll: true });
    activeContext.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [latestEvent?.id]);
  const agentText = latestAction === "end_call" ? (language === "es" ? "La conversación terminó. Tu información y la ayuda del equipo siguen disponibles." : "The conversation ended. Your information and care-team help are still available.") : latestAction === "show_appointment" ? (language === "es" ? "Aquí está tu cita guardada. Tu comentario no cambió la cita." : "Here is your saved appointment. Your statement did not change it.") : latestAction === "show_directions" ? (language === "es" ? "Aquí está la ruta desde tu dirección guardada." : "Here is the route from your saved starting address.") : latestAction === "show_education" ? (language === "es" ? "Aquí está la explicación que aprobó tu equipo." : "Here is the explanation your team approved.") : latestAction === "request_transportation" ? (demo.taskCreated ? (language === "es" ? "Tu solicitud está registrada. Puedes ver su estado aquí." : "Your request is recorded. You can view its status here.") : (language === "es" ? "Puedes confirmar una solicitud para que el personal revise opciones de transporte." : "You can confirm a request for staff to review transportation options.")) : latestAction === "show_help" ? (language === "es" ? "Puedes pedir ayuda a tu equipo." : "You can ask your care team for help.") : (language === "es" ? `Hola, ${record.patient.firstName}. Revisemos la información que aprobó tu equipo.` : `Hello, ${record.patient.firstName}. Let's review the information your team approved.`);
  const activateCard = (card: CardType) => {
    const target: CardType = card === "address" ? demo.startingAddress.trim() ? "route" : "address" : card;
    updateDemo({ activeCard: target, cards: [...new Set([...demo.cards, target])] });
  };
  const submit = (statement = input) => { if (!statement.trim() || !active) return; setInput(""); onEvent(inferAction(statement), statement.trim()); };
  const showRoute = () => { if (!demo.startingAddress.trim()) return; setLoadState("idle"); activateCard("route"); };
  const createTask = () => { if (onEvent("request_transportation", demo.transportationStatement, true)) setToast(language === "es" ? "Solicitud de demo enviada al equipo" : "Demo request sent to the care team"); };
  const end = () => { onEvent("end_call"); setToast(language === "es" ? "La conversación terminó; tu información sigue disponible" : "Conversation ended; your information remains available"); };

  return <main className="patient-view">
    <div className="patient-shell"><h1 className="visually-hidden">{language === "es" ? "Tu acompañamiento de VozCare" : "Your VozCare follow-up"}</h1>
      <header className="patient-header"><Logo tagline language={language} /><div className="language-toggle" role="group" aria-label={language === "es" ? "Idioma de la vista del paciente" : "Patient view language"}><Icon name="language" size={16} /><button type="button" aria-label="Español" aria-pressed={language === "es"} className={language === "es" ? "active" : ""} onClick={() => setLanguage("es")}>ES</button><button type="button" aria-label="English" aria-pressed={language === "en"} className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div></header>
      <p className="patient-identity">{record.patient.name} · {language === "es" ? "Paquete aprobado" : "Approved packet"} v{record.packet!.revision}</p>
      <div className={`call-status ${ended ? "ended" : active ? "" : "waiting"}`}><span className="pulse" /><div><strong>{ended ? t.ended : active ? t.call : language === "es" ? "La llamada no se conectó" : "The call did not connect"}</strong><small>{active ? (language === "es" ? "Llamada simulada. No se ha realizado una llamada real." : "Simulated call. No real call has been placed.") : language === "es" ? "No se ha realizado ninguna llamada real." : "No real call has been placed."}</small></div><PrototypeLabel>{active ? (language === "es" ? "Llamada simulada" : "Simulated call") : "Demo"}</PrototypeLabel></div>
      {record.session.callState === "No answer" && <section className="start-demo-card"><div><h2>{language === "es" ? "Tu información sigue disponible" : "Your information is still available"}</h2><p>{language === "es" ? "La llamada de demo no tuvo respuesta. Puedes reintentarla." : "The demo call was unanswered. You can retry it."}</p></div><Button onClick={retry}>{language === "es" ? "Reintentar llamada de demo" : "Retry demo call"}</Button></section>}
      <nav className="patient-shortcuts" aria-label={language === "es" ? "Información del paciente" : "Patient information"}>
        <button type="button" aria-pressed={demo.activeCard === "appointment"} className={demo.activeCard === "appointment" ? "active" : ""} onClick={() => activateCard("appointment")}><span><Icon name="calendar" /></span>{t.appointment}</button>
        <button type="button" aria-pressed={demo.activeCard === "address" || demo.activeCard === "route"} className={demo.activeCard === "address" || demo.activeCard === "route" ? "active" : ""} onClick={() => activateCard("address")}><span><Icon name="map" /></span>{t.directions}</button>
        <button type="button" aria-pressed={demo.activeCard === "care"} className={demo.activeCard === "care" ? "active" : ""} onClick={() => activateCard("care")}><span><Icon name="care" /></span>{t.care}</button>
        <button type="button" aria-pressed={demo.activeCard === "help" || demo.activeCard === "transport"} className={demo.activeCard === "help" || demo.activeCard === "transport" ? "active" : ""} onClick={() => activateCard("help")}><span><Icon name="help" /></span>{t.help}</button>
      </nav>
      <p className="visually-hidden" role="status">{demo.activeCard && (language === "es" ? "Información mostrada: " : "Information shown: ")}{demo.activeCard === "appointment" ? t.appointment : demo.activeCard === "address" || demo.activeCard === "route" ? t.directions : demo.activeCard === "care" ? t.care : demo.activeCard ? t.help : ""}</p><div className="patient-context-layout">
        <div className="active-context" ref={activeContext} tabIndex={-1}>
          {demo.activeCard ? <ActiveContextCard record={record} card={demo.activeCard} language={language} demo={demo} updateDemo={updateDemo} editAddress={editAddress} setEditAddress={setEditAddress} showRoute={showRoute} loadState={loadState} setLoadState={setLoadState} createTask={createTask} onTransportation={() => activateCard("transport")} onScheduling={() => activateCard("appointment")} /> : <ContextWelcome patient={record.patient} language={language} activateCard={activateCard} />}
        </div>
        <details className="conversation-card" open>
          <summary><span><Icon name="message" />{language === "es" ? "Conversación de demostración" : "Demo conversation"}</span><Icon name="chevron" size={16} /></summary>
          <div className="conversation-body">
            <PrototypeLabel>{language === "es" ? "Conversación de demo · Entrada escrita" : "Demo conversation · Typed input"}</PrototypeLabel>
            <div className="conversation-turns">
              {demo.latestPatientStatement && <div className="patient-turn"><small>{language === "es" ? "TÚ DIJISTE" : "YOU SAID"}</small><p lang={demo.latestPatientStatementLanguage ?? language}>“{demo.latestPatientStatement}”</p></div>}
              <div className="agent-turn"><small>VOZCARE AI</small><p>{agentText}</p></div>
            </div>
            <p className="conversation-prompt">{active ? t.prompt : language === "es" ? "Usa las tarjetas de arriba para revisar tu cuidado o pedir ayuda." : "Use the cards above to review your care or ask for help."}</p>
            <form onSubmit={(event) => { event.preventDefault(); submit(); }}><label htmlFor="demo-statement">{language === "es" ? "Tu respuesta escrita" : "Your typed response"}</label><div><input id="demo-statement" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t.placeholder} disabled={!active || ended} /><button type="submit" disabled={!active || ended || !input.trim()} aria-label={t.send}><Icon name="send" /></button></div></form>
            <div className="example-statements"><small>{t.examples}</small><div><button disabled={!active || ended} onClick={() => submit(t.confusion)}>{t.confusion}</button><button disabled={!active || ended} onClick={() => submit(t.lost)}>{t.lost}</button><button disabled={!active || ended} onClick={() => submit(t.ride)}>{t.ride}</button><button disabled={!active || ended} onClick={() => submit(language === "es" ? "No entendí la explicación de mi visita." : "I did not understand the explanation from my visit.")}>{language === "es" ? "No entendí la explicación de mi visita." : "I did not understand the explanation from my visit."}</button></div></div>
          </div>
        </details>
      </div>
      {demo.cards.length > 1 && <section className="saved-information"><div><strong>{language === "es" ? "Información guardada" : "Saved information"}</strong><small>{language === "es" ? "Vuelve a cualquier tarjeta sin perder tu lugar." : "Return to any card without losing your place."}</small></div><div>{demo.cards.filter((card) => card !== demo.activeCard && card !== "address").map((card) => <button key={card} onClick={() => activateCard(card)}><Icon name={card === "appointment" ? "calendar" : card === "route" ? "map" : card === "transport" ? "car" : card === "care" ? "care" : "help"} size={15} />{card === "appointment" ? t.appointment : card === "route" ? (language === "es" ? "Ruta" : "Route") : card === "transport" ? (language === "es" ? "Transporte" : "Transportation") : card === "care" ? t.care : t.help}</button>)}</div></section>}
      <footer className="patient-footer"><div><PrototypeLabel>{language === "es" ? "Prototipo interactivo · Datos ficticios" : "Interactive prototype · Fictional data"}</PrototypeLabel><p>{language === "es" ? "Datos ficticios guardados en este navegador. Este sitio no usa tu micrófono." : "Fictional data saved in this browser. This site does not use your microphone."}</p></div><div>{!ended && <Button variant="secondary" onClick={end} icon="close" disabled={!active}>{t.end}</Button>}</div></footer>
    </div>
  </main>;
}

function ContextWelcome({ patient, language, activateCard }: { patient: Patient; language: Language; activateCard: (card: CardType) => void }) {
  return <section className="response-card context-welcome"><span className="patient-avatar">{patient.initials}</span><p className="eyebrow">{language === "es" ? "ACOMPAÑAMIENTO DESPUÉS DE TU VISITA" : "SUPPORT AFTER YOUR VISIT"}</p><h2>{language === "es" ? `Hola, ${patient.firstName}.` : `Hello, ${patient.firstName}.`}</h2><p>{language === "es" ? "Tu información guardada está lista cuando la necesites." : "Your saved information is ready whenever you need it."}</p><Button onClick={() => activateCard("appointment")} icon="calendar">{language === "es" ? "Ver mi próxima cita" : "View my next appointment"}</Button></section>;
}

function ActiveContextCard({ record, card, language, demo, updateDemo, editAddress, setEditAddress, showRoute, loadState, setLoadState, createTask, onTransportation, onScheduling }: { record: PatientRecord; card: CardType; language: Language; demo: DemoState; updateDemo: (patch: Partial<DemoState>) => void; editAddress: boolean; setEditAddress: (value: boolean) => void; showRoute: () => void; loadState: "idle" | "loading" | "error"; setLoadState: (value: "idle" | "loading" | "error") => void; createTask: () => void; onTransportation: () => void; onScheduling: () => void }) {
  if (card === "appointment") return <AppointmentCard language={language} appointment={record.packet!.appointment} />;
  if (card === "address") return <AddressCard language={language} address={demo.startingAddress} setAddress={(address) => updateDemo({ startingAddress: address, routeConfirmedAddress: "" })} edit={editAddress} setEdit={setEditAddress} showRoute={showRoute} loadState={loadState} setLoadState={setLoadState} />;
  if (card === "route") return <RouteCard language={language} appointment={record.packet!.appointment} address={demo.startingAddress} changeAddress={() => updateDemo({ activeCard: "address", routeConfirmedAddress: "" })} />;
  if (card === "transport") return <TransportCard language={language} demo={demo} createTask={createTask} />;
  if (card === "care") return <ApprovedCare language={language} packet={record.packet!} />;
  return <HelpCard language={language} onTransportation={onTransportation} onScheduling={onScheduling} />;
}

function AppointmentCard({ language, appointment = initialWorkspace().records[0].visit.appointment }: { language: Language; appointment?: Appointment }) {
  const es = language === "es";
  const date = new Date(appointment.startsAt);
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone: appointment.timeZone }).formatToParts(date);
  const part = (name: string) => Number(parts.find((item) => item.type === name)?.value);
  const year = part("year"), month = part("month"), selectedDay = part("day");
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { ...options, timeZone: appointment.timeZone }).format(date);
  const download = () => {
    const utc = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
    const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VozCare Demo//EN", "BEGIN:VEVENT", `UID:${appointment.id}@example.invalid`, `DTSTAMP:${utc(new Date().toISOString())}`, `DTSTART:${utc(appointment.startsAt)}`, `DTEND:${utc(appointment.endsAt)}`, `SUMMARY:${es ? "Cita de seguimiento" : "Follow-up appointment"}`, `LOCATION:${escape(`${appointment.hospital}, ${appointment.address}`)}`, "DESCRIPTION:Fictional VozCare appointment", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); const link = document.createElement("a"); link.href = url; link.download = "vozcare-demo-appointment.ics"; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="response-card appointment-card updated"><div className="response-card-heading"><span><Icon name="calendar" /></span><div><small>{es ? "CITA GUARDADA" : "SAVED APPOINTMENT"}</small><h2>{es ? "Esta es la fecha correcta" : "This is the correct date"}</h2></div><Badge tone="success">{es ? "Guardada" : "Saved"}</Badge></div>
    <div className="calendar-layout"><div className="month"><div className="month-title"><strong>{format({ month: "long", year: "numeric" })}</strong></div><div className="weekdays">{(es ? ["D", "L", "M", "M", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"]).map((day, i) => <span key={i}>{day}</span>)}</div><div className="month-grid">{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => { const day = index - offset + 1; return <span className={day === selectedDay ? "selected" : day < 1 || day > days ? "blank" : ""} key={index}>{day >= 1 && day <= days ? day : ""}</span>; })}</div></div>
    <div className="appointment-details"><div><Icon name="calendar" /><span><small>{es ? "FECHA" : "DATE"}</small><strong>{format({ dateStyle: "full" })}</strong></span></div><div><Icon name="clock" /><span><small>{es ? "HORA" : "TIME"}</small><strong>{format({ hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</strong></span></div><div><Icon name="map" /><span><small>{es ? "LUGAR" : "LOCATION"}</small><strong>{appointment.hospital}</strong><p>{appointment.address}</p></span></div><Button variant="secondary" icon="download" onClick={download}>{es ? "Añadir al calendario" : "Add to calendar"}</Button></div></div><p className="saved-note">{es ? "Tu comentario no cambió la cita guardada." : "Your statement did not change the saved appointment."}</p></section>;
}

function AddressCard({ language, address, setAddress, edit, setEdit, showRoute, loadState, setLoadState }: { language: Language; address: string; setAddress: (value: string) => void; edit: boolean; setEdit: (value: boolean) => void; showRoute: () => void; loadState: "idle" | "loading" | "error"; setLoadState: (value: "idle" | "loading" | "error") => void }) {
  return <section className="response-card address-card updated">
    <div className="response-card-heading"><span><Icon name="route" /></span><div><small>{language === "es" ? "OTRO PUNTO DE INICIO" : "ANOTHER STARTING POINT"}</small><h2>{language === "es" ? "¿Desde dónde vas a salir?" : "Where will you be leaving from?"}</h2></div></div>
    <div className="saved-address"><span className="map-pin">A</span><div><small>{language === "es" ? "DIRECCIÓN PARA ESTA RUTA" : "ADDRESS FOR THIS ROUTE"}</small>{edit ? <input value={address} onChange={(event) => setAddress(event.target.value)} aria-label={language === "es" ? "Otra dirección de inicio" : "Alternative starting address"} /> : <strong>{address}</strong>}</div></div>
    <div className="address-actions"><Button onClick={showRoute} disabled={loadState === "loading" || !address.trim()}>{loadState === "loading" ? (language === "es" ? "Preparando ruta…" : "Preparing route…") : (edit ? (language === "es" ? "Confirmar esta dirección" : "Confirm this address") : (language === "es" ? "Usar dirección guardada" : "Use saved address"))}</Button><Button variant="secondary" onClick={() => setEdit(!edit)}>{edit ? (language === "es" ? "Listo" : "Done") : (language === "es" ? "Usar otra dirección" : "Use another address")}</Button></div>
    <button className="simulate-error" onClick={() => setLoadState("error")}>{language === "es" ? "Simular error de ruta" : "Simulate route error"}</button>
    {loadState === "error" && <div className="error-state"><Icon name="alert" /><p>{language === "es" ? "No pudimos preparar la ruta de demostración." : "We couldn’t prepare the demo route."}</p><button onClick={showRoute}>{language === "es" ? "Reintentar" : "Retry"}</button></div>}
  </section>;
}

function RouteCard({ language, address, changeAddress, appointment = initialWorkspace().records[0].visit.appointment }: { language: Language; address: string; changeAddress: () => void; appointment?: Appointment }) {
  const [travel, setTravel] = useState<"drive" | "transit" | "walk">("drive");
  const times = { drive: "18 min", transit: "34 min", walk: "1 h 42 min" };
  return <section className="response-card route-card updated">
    <div className="response-card-heading"><span><Icon name="map" /></span><div><small>{language === "es" ? "MAPA DE DEMOSTRACIÓN" : "DEMO MAP"}</small><h2>{language === "es" ? "Ruta al hospital" : "Route to the hospital"}</h2></div><PrototypeLabel>{language === "es" ? "No es navegación en vivo" : "Not live navigation"}</PrototypeLabel></div>
    <div className="travel-options"><button type="button" aria-pressed={travel === "drive"} className={travel === "drive" ? "active" : ""} onClick={() => setTravel("drive")}><Icon name="car" />{language === "es" ? "Auto" : "Drive"}<strong>18 min</strong></button><button type="button" aria-pressed={travel === "transit"} className={travel === "transit" ? "active" : ""} onClick={() => setTravel("transit")}><Icon name="bus" />{language === "es" ? "Transporte" : "Transit"}<strong>34 min</strong></button><button type="button" aria-pressed={travel === "walk"} className={travel === "walk" ? "active" : ""} onClick={() => setTravel("walk")}><Icon name="walk" />{language === "es" ? "A pie" : "Walk"}<strong>1 h 42</strong></button></div>
    <div className="map-illustration"><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><div className={`route-path ${travel}`} /><span className="origin-marker">A</span><span className="destination-marker"><Icon name="care" size={15} /></span><span className="map-label home-label">{address}</span><span className="map-label hospital-label">{appointment.hospital}</span><span className="travel-time">{times[travel]}</span></div>
    <div className="route-endpoints"><div><span>A</span><p><small>{language === "es" ? "INICIO" : "START"}</small><strong>{address}</strong></p><button onClick={changeAddress}>{language === "es" ? "¿Sales de otro lugar?" : "Starting somewhere else?"}</button></div><div><span className="end"><Icon name="care" size={13} /></span><p><small>{language === "es" ? "DESTINO" : "DESTINATION"}</small><strong>{appointment.hospital}</strong><em>{appointment.address}</em></p></div></div>
    <p className="demo-map-note"><Icon name="alert" size={15} />{language === "es" ? "El mapa y los tiempos son ilustrativos. Confirma tu ruta antes de salir." : "Map and travel times are illustrative. Confirm your route before leaving."}</p>
  </section>;
}

function TransportCard({ language, demo, createTask }: { language: Language; demo: DemoState; createTask: () => void }) {
  return <section className="response-card transport-card updated">
    <div className="response-card-heading"><span><Icon name="car" /></span><div><small>{language === "es" ? "AYUDA CON TRANSPORTE" : "TRANSPORTATION HELP"}</small><h2>{language === "es" ? "Podemos pedir que el personal lo revise" : "We can ask staff to review this"}</h2></div></div>
    <p>{language === "es" ? "Esto es diferente a mostrar cómo llegar. Si confirmas, enviaremos una solicitud pendiente al equipo de atención." : "This is separate from directions. If you confirm, we’ll send a pending request to the care team."}</p>
    {!demo.taskCreated ? <Button onClick={createTask} icon="send">{language === "es" ? "Solicitar ayuda con transporte" : "Request transportation help"}</Button> :
      <div className={`request-status ${demo.taskStatus.toLowerCase().replace(" ", "-")}`}><span><Icon name={demo.taskStatus === "Resolved" ? "check" : "clock"} /></span><div><small>{language === "es" ? "ESTADO DE LA SOLICITUD" : "REQUEST STATUS"}</small><strong>{demo.taskStatus === "Open" ? (language === "es" ? "Pendiente de revisión" : "Open for review") : demo.taskStatus === "In progress" ? (language === "es" ? "En revisión" : "In progress") : (language === "es" ? "Marcada como resuelta" : "Marked resolved")}</strong><p>{language === "es" ? "Esto no significa que haya un transporte reservado." : "This does not mean a ride has been booked."}</p></div></div>}
  </section>;
}

function PatientCareCard({ language }: { language: Language }) {
  const draft = initialEducation;
  return <section className="response-card simple-info-card"><div className="response-card-heading"><div><small>{language === "es" ? "EJEMPLO DE EDUCACIÓN" : "EDUCATION EXAMPLE"}</small><h2>{language === "es" ? "Mi cuidado" : "My care"}</h2></div></div><p>{language === "es" ? draft.spanish : draft.english}</p></section>;
}

function HelpCard({ language, onTransportation, onScheduling }: { language: Language; onTransportation?: () => void; onScheduling?: () => void }) {
  const [showCost, setShowCost] = useState(false);
  const es = language === "es";
  return <section className="response-card simple-info-card updated"><div className="response-card-heading"><span><Icon name="help" /></span><div><small>{es ? "APOYO HUMANO" : "HUMAN SUPPORT"}</small><h2>{es ? "¿Con qué necesitas ayuda?" : "What do you need help with?"}</h2></div></div><div className="support-options"><button type="button" onClick={onTransportation}><Icon name="car" />{es ? "Transporte" : "Transportation"}</button><button type="button" aria-expanded={showCost} aria-controls="cost-support-note" onClick={() => setShowCost(!showCost)}><Icon name="care" />{es ? "Costo de atención" : "Cost of care"}</button><button type="button" onClick={onScheduling}><Icon name="calendar" />{es ? "Horario de la cita" : "Scheduling"}</button></div>{showCost && <p id="cost-support-note" className="support-notice" role="status">{es ? "La ayuda con costos no está conectada en esta demo. Contacta a tu equipo de atención para revisar las opciones." : "Cost support is not connected in this demo. Contact your care team to review the options."}</p>}<p className="help-note">{es ? "Las solicitudes de transporte requieren tu confirmación. Para cambiar una cita, contacta a tu equipo. La asistencia no está garantizada." : "Transportation requests require your confirmation. To change an appointment, contact your care team. Assistance is not guaranteed."}</p></section>;
}
