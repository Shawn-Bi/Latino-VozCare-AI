import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { doctorTranslations } from "./doctor-translations";
import EducationReview from "./EducationReview";
import { initialEducation, editEducation, canApproveEducation, type EducationDraft } from "./education";
import ApprovedCare from "./ApprovedCare";
import { initialDemo, initialWorkspace, appointmentLabel, localAppointmentValue, appointmentInstant, type Patient, type Appointment, type DemoState, type Language, type Visit } from "./workflow";
import { useAuth } from "./lib/AuthContext";
import { loadAssignedPatients, loadPatientData, saveDraft, saveContactAndAppointment, approveDraft, type PatientListEntry, type LoadedPatientData } from "./lib/vozcare-api";
import UnavailableNotice from "./components/UnavailableNotice";
import AdminPanel from "./components/AdminPanel";
import { base44 } from "./api/base44Client";

type View = "home" | "doctor" | "patient";
type DoctorTab = "patients" | "care" | "session" | "queue";
type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";
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

function checkDeliveryProblem(patient: Patient, visit: Visit): string | null {
  if (!/^\+[1-9]\d{7,14}$/.test(patient.phone)) return "Add a valid phone number, including its country code.";
  if (!patient.address.trim()) return "Add the patient's saved starting address before sending.";
  if (!visit.appointment.hospital.trim() || !visit.appointment.address.trim() || !Number.isFinite(Date.parse(visit.appointment.startsAt))) return "Complete the saved appointment before sending.";
  return null;
}

function GlobalNav({ view, navigate, language, setLanguage, user, onSignOut }: { view: View; navigate: (view: View) => void; language: Language; setLanguage: (language: Language) => void; user: { email: string } | null; onSignOut: () => void }) {
  const es = language === "es";
  return <header className="global-nav">
    <button className="brand-button" onClick={() => navigate("home")} aria-label={es ? "Inicio de VozCare AI" : "VozCare AI home"}><Logo /></button>
    <nav aria-label={es ? "Vistas principales" : "Main views"}>
      <button aria-current={view === "home" ? "page" : undefined} className={view === "home" ? "active" : ""} onClick={() => navigate("home")}><Icon name="home" size={17} />{es ? "Inicio" : "Home"}</button>
      <button aria-current={view === "doctor" ? "page" : undefined} className={view === "doctor" ? "active" : ""} onClick={() => navigate("doctor")}><Icon name="doctor" size={17} />{es ? "Vista médica" : "Doctor view"}</button>
      <button aria-current={view === "patient" ? "page" : undefined} className={view === "patient" ? "active" : ""} onClick={() => navigate("patient")}><Icon name="patient" size={17} />{es ? "Vista previa del paciente" : "Patient preview"}</button>
    </nav>
    <div className="nav-actions"><div className="language-toggle" role="group" aria-label={es ? "Idioma del sitio" : "Site language"}><button type="button" lang="es" aria-label="Español" aria-pressed={es} className={es ? "active" : ""} onClick={() => setLanguage("es")}>ES</button><button type="button" lang="en" aria-label="English" aria-pressed={!es} className={!es ? "active" : ""} onClick={() => setLanguage("en")}>EN</button></div>{user && <button className="reset-button" onClick={onSignOut} aria-label={es ? "Salir" : "Sign out"}><Icon name="reset" size={16} /><span>{es ? "Salir" : "Sign out"}</span></button>}</div>
  </header>;
}

export default function App() {
  const { isAuthenticated, isLoadingAuth, user, authError } = useAuth();
  const [view, setView] = useState<View>(() => new URLSearchParams(window.location.search).get("view") === "doctor" ? "doctor" : "home");
  const [language, setLanguage] = useState<Language>("en");
  const [toast, setToast] = useState("");
  const [patients, setPatients] = useState<PatientListEntry[] | null>(null);
  const [patientsError, setPatientsError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<LoadedPatientData | null>(null);
  const [selectedError, setSelectedError] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [doctorTab, setDoctorTab] = useState<DoctorTab>("patients");
  const [draftSaveState, setDraftSaveState] = useState<SaveState>("idle");
  const [contactSaveState, setContactSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [approveState, setApproveState] = useState<SaveState>("idle");
  const [refreshKey, setRefreshKey] = useState(0);

  const isApproved = !!user?.care_team_approved;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === "es" ? "VozCare AI | Entiende tu cuidado" : "VozCare AI | Understand your care";
  }, [language]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  // Load assigned patients when entering doctor view as an approved doctor.
  useEffect(() => {
    if (view !== "doctor" || !isAuthenticated || !isApproved) return;
    let cancelled = false;
    setPatientsError("");
    loadAssignedPatients()
      .then((list) => { if (!cancelled) setPatients(list); })
      .catch((err) => { if (!cancelled) setPatientsError(err.message || "Could not load patients."); })
      .finally(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [view, isAuthenticated, isApproved, user?.id, refreshKey]);

  // Load selected patient's full data from server.
  useEffect(() => {
    if (!selectedId) { setSelectedData(null); return; }
    let cancelled = false;
    setIsLoadingData(true); setSelectedError("");
    loadPatientData(selectedId)
      .then((data) => { if (!cancelled) { setSelectedData(data); setDraftSaveState("idle"); setContactSaveState("idle"); setApproveState("idle"); } })
      .catch((err) => { if (!cancelled) setSelectedError(err.message || "Could not load this patient's data."); })
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, [selectedId, refreshKey]);

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0 }); };
  const handleSignOut = () => { base44.auth.logout("/"); setSelectedId(null); setPatients(null); };

  const setEducation: Dispatch<SetStateAction<EducationDraft>> = (value) => {
    if (!selectedData) return;
    const newDraft = typeof value === "function" ? value(selectedData.draft) : value;
    setSelectedData({ ...selectedData, draft: newDraft });
    setDraftSaveState("idle");
  };

  const handleSaveDraft = async () => {
    if (!selectedData) return;
    setDraftSaveState("saving");
    try {
      const result = await saveDraft(selectedData.draftId, selectedData.serverRevision, selectedData.draft);
      if (result.success) { setSelectedData({ ...selectedData, serverRevision: selectedData.draft.revision }); setDraftSaveState("saved"); }
      else if (result.conflict) setDraftSaveState("conflict");
      else setDraftSaveState("error");
    } catch { setDraftSaveState("error"); }
  };

  const handleSaveContact = async (phone: string, address: string, appointment: { startsAt: string; endsAt: string; hospital: string; address: string }) => {
    if (!selectedData) return;
    setContactSaveState("saving");
    try {
      await saveContactAndAppointment(selectedData.patient.id, selectedData.visitId, phone, address, appointment);
      setSelectedData({ ...selectedData, patient: { ...selectedData.patient, phone, address }, visit: { ...selectedData.visit, appointment: { ...selectedData.visit.appointment, ...appointment } } });
      setContactSaveState("saved");
    } catch { setContactSaveState("error"); }
  };

  const handleApprove = async () => {
    if (!selectedData) return;
    if (!canApproveEducation(selectedData.draft)) { setToast(language === "es" ? "Completa la revisión antes de aprobar." : "Complete the review before approving."); return; }
    const problem = checkDeliveryProblem(selectedData.patient, selectedData.visit);
    if (problem) { setToast(problem); return; }
    setApproveState("saving");
    try {
      const now = new Date().toISOString();
      const result = await approveDraft(selectedData.draftId, selectedData.serverRevision, selectedData.draft, now);
      if (result.success) {
        setSelectedData({ ...selectedData, draft: { ...selectedData.draft, approvedAt: now }, serverRevision: selectedData.draft.revision });
        setApproveState("saved");
        setToast(language === "es" ? "Paquete aprobado en el servidor." : "Packet approved on the server.");
      } else if (result.conflict) setApproveState("conflict");
      else setApproveState("error");
    } catch { setApproveState("error"); }
  };

  const handleReload = async () => {
    if (!selectedId) return;
    try {
      const data = await loadPatientData(selectedId);
      setSelectedData(data); setDraftSaveState("idle"); setApproveState("idle");
    } catch (err: any) { setSelectedError(err.message); }
  };

  const handleProvisioned = () => { setRefreshKey((k) => k + 1); };

  return <SiteLanguageContext.Provider value={language}><div className="app">
    <GlobalNav view={view} navigate={navigate} language={language} setLanguage={setLanguage} user={isAuthenticated ? user : null} onSignOut={handleSignOut} />
    {view === "home" && <Home navigate={navigate} language={language} />}
    {view === "doctor" && (
      isLoadingAuth ? <main className="workspace"><div className="loading-state">Loading…</div></main>
      : !isAuthenticated ? <DoctorSignIn language={language} onSignIn={() => base44.auth.loginWithProvider("google", window.location.pathname + window.location.search)} />
      : authError?.type === "user_not_registered" ? <PendingAccess language={language} onSignOut={handleSignOut} pending={false} />
      : !isApproved ? <PendingAccess language={language} onSignOut={handleSignOut} pending={true} />
      : <DoctorView
          user={user!} onSignOut={handleSignOut}
          patients={patients} isLoadingPatients={patients === null} patientsError={patientsError}
          selectedData={selectedData} isLoadingData={isLoadingData} selectedError={selectedError}
          onSelectPatient={(id) => { setSelectedId(id); setDoctorTab("patients"); }} onBack={() => setSelectedId(null)}
          setEducation={setEducation} onSaveDraft={handleSaveDraft} draftSaveState={draftSaveState} onReload={handleReload}
          onSaveContact={handleSaveContact} contactSaveState={contactSaveState}
          onApprove={handleApprove} approveState={approveState}
          isAdmin={isAdmin} onProvisioned={handleProvisioned}
          tab={doctorTab} setTab={setDoctorTab} setToast={setToast} language={language}
        />
    )}
    {view === "patient" && <PatientPreviewInfo language={language} navigate={navigate} />}
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </div></SiteLanguageContext.Provider>;
}

function DoctorSignIn({ language, onSignIn }: { language: Language; onSignIn: () => void }) {
  const es = language === "es";
  return <main className="workspace"><section className="panel doctor-signin">
    <Logo tagline language={language} />
    <p className="eyebrow">{es ? "ACCESO DEL EQUIPO" : "CARE TEAM SIGN-IN"}</p>
    <h1>{es ? "Tus pacientes. Su próximo paso." : "Your patients. Their next step."}</h1>
    <p>{es ? "Inicia sesión con Google para acceder a los pacientes asignados. Un administrador debe aprobar tu cuenta." : "Sign in with Google to access your assigned patients. An admin must approve your account."}</p>
    <button type="button" className="google-button" onClick={onSignIn}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
      {es ? "Continuar con Google" : "Continue with Google"}
    </button>
  </section></main>;
}

function PendingAccess({ language, onSignOut, pending }: { language: Language; onSignOut: () => void; pending: boolean }) {
  const es = language === "es";
  return <main className="workspace"><section className="panel pending-access">
    <Logo tagline language={language} />
    <p className="eyebrow">{es ? "ACCESO PENDIENTE" : "ACCESS PENDING"}</p>
    <h1>{es ? "Tu cuenta está en revisión" : "Your account is under review"}</h1>
    <p>{pending ? (es ? "Has iniciado sesión, pero un administrador aún no ha aprobado tu acceso al equipo de atención. No puedes ver pacientes hasta que se apruebe." : "You're signed in, but an admin has not yet approved your care-team access. You cannot view patients until approved.") : (es ? "Tu cuenta no está registrada como miembro del equipo de atención." : "Your account is not registered as a care-team member.")}</p>
    <Button variant="secondary" onClick={onSignOut}>{es ? "Salir" : "Sign out"}</Button>
  </section></main>;
}

function PatientPreviewInfo({ language, navigate }: { language: Language; navigate: (view: View) => void }) {
  const es = language === "es";
  return <main className="workspace"><section className="panel demo-login">
    <Logo tagline language={language} />
    <h1>{es ? "Tu cuidado, a través de un enlace personal" : "Your care, through a personal link"}</h1>
    <p>{es ? "Tu equipo revisa el paquete y envía tu enlace personal. El sitio del paciente se abre junto con la llamada de seguimiento." : "Your team reviews your packet and sends your personal link. The patient website opens alongside the follow-up call."}</p>
    <UnavailableNotice
      title={es ? "Enlaces personalizados no conectados" : "Personalized links are not connected"}
      message={es ? "El sistema de enlaces personalizados seguros y el servicio de llamadas no están configurados. Los enlaces del paciente requieren una sesión validada en el servidor y un proveedor de llamadas conectado." : "The secure personalized-link backend and call service have not been configured. Patient companion links require a server-validated session and a connected call provider."}
    />
    <Button onClick={() => navigate("doctor")} variant="secondary">{es ? "Abrir panel médico" : "Open doctor dashboard"}</Button>
  </section></main>;
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
  { id: "appointment", label: "Appointments", icon: "calendar", title: "Turn appointment confusion into clarity.", description: "When a patient says, 'I thought it was next week,' show the saved date, time, and location. Their question does not change the appointment." },
  { id: "directions", label: "Directions", icon: "map", title: "Help patients see how to get there.", description: "Confirm their starting address, then show the route to the hospital. The demo previews driving, transit, and walking options." },
  { id: "access", label: "Access support", icon: "help", title: "Find out what is getting in the way.", description: "Give patients a way to ask for help with transportation, cost, or scheduling. Confirm the request before sending it to the care team." },
  { id: "staff", label: "Staff follow-up", icon: "tasks", title: "Give every request a clear next step.", description: "Patient-confirmed transportation requests appear in your assistance queue. Your team can review them, update their status, and keep the patient informed." },
];

const spanishHomeFeatures: typeof homeFeatures = [
  { id: "voice", label: "Seguimiento por voz", icon: "phone", title: "Empieza con una conversación familiar.", description: "Tu equipo inicia el seguimiento al día siguiente. Los pacientes hablan por teléfono en español y consultan la información que necesitan en un sitio web de apoyo." },
  { id: "care", label: "Entender el cuidado", icon: "care", title: "Haz que el plan de cuidado sea más fácil de entender.", description: "Ayuda a los pacientes a explicar lo que entendieron. Muestra las instrucciones aprobadas por su médico durante la conversación y comunica las dudas pendientes a tu equipo." },
  { id: "appointment", label: "Citas", icon: "calendar", title: "Aclara las dudas sobre la próxima cita.", description: "Si un paciente dice: 'Pensé que era la próxima semana', muestra la fecha, hora y lugar guardados. Su pregunta no cambia la cita." },
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

  const select = (index: number) => { if (index === active) return; selectedStep.current = index; setActive(index); };
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
        {feature.id === "voice" && <><h3>{es ? "Hola, María." : "Hello, María."}</h3><p className="phone-greeting">{es ? "Estoy aquí para ayudarte con tu cuidado." : "I'm here to help you understand your care."}</p><div className="phone-voice-orb"><Icon name="phone" size={32} /><div className="phone-wave">{[12, 25, 37, 19, 30, 42, 27, 15, 32].map((height, index) => <span key={index} style={{ height }} />)}</div></div><div className="phone-conversation"><small>VOZCARE</small><p>{es ? "Cuéntame qué entendiste de tu visita." : "Tell me what you understood from your visit."}</p></div><div className="hero-context-card"><span><Icon name="calendar" /></span><div><small>{es ? "PRÓXIMA CITA" : "NEXT APPOINTMENT"}</small><strong>{es ? "Lunes, 12 de octubre" : "Monday, October 12"}</strong><p>{es ? "10:30 a. m." : "10:30 AM"}</p></div></div></>}
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

function DoctorView({ user, onSignOut, patients, isLoadingPatients, patientsError, selectedData, isLoadingData, selectedError, onSelectPatient, onBack, setEducation, onSaveDraft, draftSaveState, onReload, onSaveContact, contactSaveState, onApprove, approveState, isAdmin, onProvisioned, tab, setTab, setToast, language }: {
  user: { email: string; full_name: string | null; role: string }; onSignOut: () => void;
  patients: PatientListEntry[] | null; isLoadingPatients: boolean; patientsError: string;
  selectedData: LoadedPatientData | null; isLoadingData: boolean; selectedError: string;
  onSelectPatient: (id: string) => void; onBack: () => void;
  setEducation: Dispatch<SetStateAction<EducationDraft>>; onSaveDraft: () => void; draftSaveState: SaveState; onReload: () => void;
  onSaveContact: (phone: string, address: string, appointment: { startsAt: string; endsAt: string; hospital: string; address: string }) => void; contactSaveState: "idle" | "saving" | "saved" | "error";
  onApprove: () => void; approveState: SaveState;
  isAdmin: boolean; onProvisioned: () => void;
  tab: DoctorTab; setTab: (tab: DoctorTab) => void; setToast: (value: string) => void; language: Language;
}) {
  const es = language === "es";
  const tabs: { id: DoctorTab; label: string }[] = [{ id: "patients", label: es ? "Resumen" : "Overview" }, { id: "care", label: es ? "Revisión educativa" : "Education review" }, { id: "session", label: es ? "Seguimiento" : "Follow-up" }, { id: "queue", label: es ? "Solicitudes" : "Assistance requests" }];
  const deliveryIssue = selectedData ? checkDeliveryProblem(selectedData.patient, selectedData.visit) : null;

  return <main className="workspace doctor-view">
    <div className="workspace-heading"><div><PrototypeLabel /><p className="eyebrow">{es ? "ESPACIO DEL EQUIPO" : "CARE TEAM WORKSPACE"}</p><h1>{selectedData ? selectedData.patient.name : es ? "Mis pacientes" : "My patients"}</h1><p>{selectedData ? (es ? "Datos ficticios · Guardado en servidor" : "Fictional data · Saved to server") : (es ? "Elige un paciente para revisar su visita y su paquete educativo." : "Choose a patient to review their visit and education packet.")}</p></div><div className="doctor-account"><strong>{user.full_name || user.email}</strong><small>{es ? "Médico aprobado" : "Approved doctor"}</small><Button variant="quiet" onClick={onSignOut}>{es ? "Salir" : "Sign out"}</Button></div></div>

    {isAdmin && !selectedData && <AdminPanel onProvisioned={onProvisioned} />}

    {!selectedData ? <>
      <section className="panel patient-list-panel">
        <div className="panel-heading"><h2>{es ? "Pacientes asignados" : "Assigned patients"}</h2><span>{patients?.length ?? 0}</span></div>
        {isLoadingPatients ? <div className="loading-state">{es ? "Cargando pacientes…" : "Loading patients…"}</div>
        : patientsError ? <div className="loading-state" style={{ color: "var(--red)" }}>{patientsError}</div>
        : !patients || patients.length === 0 ? <div className="empty-state"><span><Icon name="patient" /></span><h3>{es ? "Sin pacientes asignados" : "No patients assigned"}</h3><p>{es ? "Un administrador puede asignarte pacientes usando el panel de administración." : "An admin can assign patients to you using the admin panel."}</p></div>
        : <>
          <div className="patient-table-head"><span>{es ? "Paciente" : "Patient"}</span><span>{es ? "Educación" : "Education"}</span><span>{es ? "Seguimiento" : "Follow-up"}</span><span>{es ? "Cita" : "Appointment"}</span></div>
          {patients.map((item) => <button type="button" className="patient-row patient-select" key={item.id} onClick={() => onSelectPatient(item.id)} aria-label={`${es ? "Abrir" : "Open"} ${item.name}`}>
            <span className="person"><i>{item.initials}</i><span><strong>{item.name}</strong><small>{item.preferredLanguage === "es" ? "Español preferido" : "English preferred"} · {es ? "Ficticio" : "Fictional"}</small></span></span>
            <Badge tone={item.draftApproved ? "success" : "warning"}>{item.draftApproved ? (es ? "Aprobado" : "Approved") : (es ? "Necesita revisión" : "Needs review")}</Badge>
            <span>{item.draftApproved ? (es ? "Paquete aprobado" : "Packet approved") : (es ? "Borrador" : "Draft")}</span>
            <span>{item.appointmentStartsAt ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: item.appointmentTimeZone }).format(new Date(item.appointmentStartsAt)) : "—"}<Icon name="chevron" size={16} /></span>
          </button>)}
        </>}
      </section>
    </> : <>
      <button type="button" className="back-to-patients" onClick={onBack}>← {es ? "Todos los pacientes" : "All patients"}</button>
      <div className="patient-record-context"><span className="person"><i>{selectedData.patient.initials}</i><span><strong>{selectedData.patient.name}</strong><small>{selectedData.patient.phone} · {selectedData.patient.preferredLanguage === "es" ? "Español" : "English"}</small></span></span><span>{selectedData.patient.address || (es ? "Falta dirección" : "Address missing")}</span><Badge tone={selectedData.draft.approvedAt ? "success" : "warning"}>{selectedData.draft.approvedAt ? (es ? "Paquete aprobado" : "Packet approved") : (es ? "Borrador" : "Draft")}</Badge></div>

      {selectedError ? <div className="loading-state" style={{ color: "var(--red)" }}>{selectedError}</div>
      : isLoadingData ? <div className="loading-state">{es ? "Cargando datos del paciente…" : "Loading patient data…"}</div>
      : <>
        <div className="doctor-tabs" role="tablist" aria-label={es ? "Registro del paciente" : "Patient record"} onKeyDown={(event) => { const index = tabs.findIndex((item) => item.id === tab); const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next < 0) return; event.preventDefault(); setTab(tabs[next].id); event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus(); }}>
          {tabs.map((item) => <button type="button" key={item.id} id={`doctor-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`doctor-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
        </div>
        <div role="tabpanel" id={`doctor-panel-${tab}`} aria-labelledby={`doctor-tab-${tab}`} tabIndex={0}>
          {tab === "patients" && <PatientOverview key={selectedData.patient.id} data={selectedData} onSaveContact={onSaveContact} contactSaveState={contactSaveState} review={() => setTab("care")} language={language} />}
          {tab === "care" && <>
            <p className="workspace-language-note">{es ? "Los controles de revisión están en inglés. El paquete del paciente está disponible en español e inglés." : "Review controls are in English. Patient packets are available in Spanish and English."}</p>
            <section className="panel delivery-review"><h2>{es ? "Datos de entrega guardados" : "Saved delivery details"}</h2><p>{selectedData.patient.name} · {selectedData.patient.phone} · {selectedData.patient.address}</p><p>{appointmentLabel(selectedData.visit.appointment, language)} · {selectedData.visit.appointment.hospital}</p><p>{es ? "La aprobación marca el paquete en el servidor. La entrega por SMS y las llamadas no están conectadas." : "Approval marks the packet on the server. SMS delivery and calls are not connected."}</p>{deliveryIssue && <p role="alert">{deliveryIssue}</p>}</section>
            <EducationReview key={selectedData.patient.id} draft={selectedData.draft} setDraft={setEducation} patientName={selectedData.patient.name} firstName={selectedData.patient.firstName} caseKind={selectedData.patient.caseKind} onApprove={onApprove} deliveryProblem={deliveryIssue} onSave={onSaveDraft} saveState={draftSaveState} onReload={onReload} />
            <DeliveryPanel selectedData={selectedData} language={language} />
          </>}
          {tab === "session" && <section className="panel"><div className="panel-heading"><div><h2>{es ? "Seguimiento" : "Follow-up"}</h2></div></div><UnavailableNotice title={es ? "Llamadas y conversación no conectadas" : "Calls and conversation are not connected"} message={es ? "El servicio de llamadas y el agente de conversación no están configurados. No se realiza ninguna llamada ni se procesan eventos de conversación." : "The call service and conversation agent have not been configured. No calls are placed and no conversation events are processed."} /></section>}
          {tab === "queue" && <section className="panel"><div className="panel-heading"><div><h2>{es ? "Solicitudes" : "Assistance requests"}</h2></div></div><UnavailableNotice title={es ? "Solicitudes no disponibles" : "Assistance requests are not available"} message={es ? "Las solicitudes de asistencia requieren un enlace de paciente seguro y un servicio de llamadas conectados." : "Assistance requests require a connected patient link backend and call service."} /></section>}
        </div>
      </>}
    </>}
  </main>;
}

function PatientOverview({ data, onSaveContact, contactSaveState, review, language }: { data: LoadedPatientData; onSaveContact: (phone: string, address: string, appointment: { startsAt: string; endsAt: string; hospital: string; address: string }) => void; contactSaveState: "idle" | "saving" | "saved" | "error"; review: () => void; language: Language }) {
  const es = language === "es";
  const [phone, setPhone] = useState(data.patient.phone);
  const [address, setAddress] = useState(data.patient.address);
  const [startsAt, setStartsAt] = useState(localAppointmentValue(data.visit.appointment));
  const [hospital, setHospital] = useState(data.visit.appointment.hospital);
  const [destination, setDestination] = useState(data.visit.appointment.address);
  const [error, setError] = useState("");

  useEffect(() => {
    setPhone(data.patient.phone); setAddress(data.patient.address);
    setStartsAt(localAppointmentValue(data.visit.appointment));
    setHospital(data.visit.appointment.hospital); setDestination(data.visit.appointment.address);
    setError("");
  }, [data.patient.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let instant: string;
    try { instant = appointmentInstant(startsAt, data.visit.appointment.timeZone); }
    catch (err: any) { setError(err instanceof Error ? err.message : "Invalid appointment time."); return; }
    setError("");
    onSaveContact(phone.trim(), address.trim(), {
      startsAt: instant,
      endsAt: new Date(Date.parse(instant) + 3600000).toISOString(),
      hospital: hospital.trim(),
      address: destination.trim(),
    });
  };

  return <div className="record-overview">
    <section className="panel profile-details">
      <h2>{es ? "Contacto y cita" : "Contact and appointment"}</h2>
      <form onSubmit={handleSubmit}>
        <label>{es ? "Número de teléfono" : "Phone number"}<input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); }} required /></label>
        <label>{es ? "Dirección de inicio guardada" : "Saved starting address"}<input value={address} onChange={(e) => { setAddress(e.target.value); }} required /></label>
        <label>{es ? "Fecha y hora de cita · Hora de Nueva York" : "Appointment date and time · New York time"}<input type="datetime-local" value={startsAt} onChange={(e) => { setStartsAt(e.target.value); }} required /></label>
        <label>{es ? "Hospital" : "Hospital"}<input value={hospital} onChange={(e) => { setHospital(e.target.value); }} required /></label>
        <label>{es ? "Dirección del hospital" : "Hospital address"}<input value={destination} onChange={(e) => { setDestination(e.target.value); }} required /></label>
        <button type="submit" className="button secondary" disabled={contactSaveState === "saving"}>{contactSaveState === "saving" ? (es ? "Guardando…" : "Saving…") : (es ? "Guardar datos" : "Save details")}</button>
        {contactSaveState === "saved" && <p role="status">{es ? "Datos guardados en el servidor." : "Details saved to server."}</p>}
        {contactSaveState === "error" && <p role="alert">{es ? "No se pudo guardar. Inténtalo de nuevo." : "Could not save. Try again."}</p>}
        {error && <p role="alert">{error}</p>}
      </form>
      <p>{appointmentLabel(data.visit.appointment, language)} · {data.visit.appointment.hospital}</p>
    </section>
    <section className="panel selected-patient">
      <p className="eyebrow">{es ? "EDUCACIÓN DE LA VISITA" : "VISIT EDUCATION"}</p>
      <h2>{es ? `Ayuda a ${data.patient.firstName} a entender su visita.` : `Help ${data.patient.firstName} understand their visit.`}</h2>
      <p>{data.patient.caseKind === "colon" ? (es ? "Colon sigmoide · Estadio pendiente" : "Sigmoid colon · Stage pending") : (es ? "Ejemplo de seguimiento · Sin diagnóstico registrado" : "Follow-up example · No diagnosis recorded")}</p>
      <Badge tone={data.draft.approvedAt ? "success" : "warning"}>{data.draft.approvedAt ? (es ? "Aprobado" : "Approved") : (es ? "Necesita revisión" : "Needs review")}</Badge>
      <Button onClick={review} icon="arrow">{es ? "Revisar paquete educativo" : "Review education draft"}</Button>
      <p>{es ? "Revisa el contenido antes de aprobar el paquete." : "Review the content before approving the packet."}</p>
    </section>
  </div>;
}

function DeliveryPanel({ selectedData, language }: { selectedData: LoadedPatientData; language: Language }) {
  const es = language === "es";
  const approved = !!selectedData.draft.approvedAt;
  return <section className="panel delivery-panel">
    <div className="panel-heading"><div><h2>{es ? "Entrega y seguimiento" : "Delivery and follow-up"}</h2><p>{selectedData.patient.name} · {es ? "Paquete" : "Packet"} v{selectedData.draft.revision}</p></div>
      <Badge tone={approved ? "success" : "warning"}>{approved ? (es ? "Aprobado" : "Approved") : (es ? "Borrador" : "Draft")}</Badge></div>
    <UnavailableNotice
      title={es ? "SMS y llamadas no conectados" : "SMS and calls are not connected"}
      message={es ? "La entrega por SMS y el servicio de llamadas no están configurados. La aprobación marca el borrador en el servidor, pero no se envía ningún enlace ni se realiza ninguna llamada." : "The SMS delivery and call service have not been configured. Approval marks the draft on the server, but no link is sent and no call is placed."}
    />
  </section>;
}

function AppointmentCard({ language, appointment = initialWorkspace().records[0].visit.appointment }: { language: Language; appointment?: Appointment }) {
  const es = language === "es";
  const date = new Date(appointment.startsAt);
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", day: "numeric", timeZone: appointment.timeZone }).formatToParts(date);
  const part = (name: string) => Number(parts.find((item) => item.type === name)?.value);
  const year = part("year"), month = part("month"), selectedDay = part("day");
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { ...options, timeZone: appointment.timeZone }).format(date);
  return <section className="response-card appointment-card updated"><div className="response-card-heading"><span><Icon name="calendar" /></span><div><small>{es ? "CITA GUARDADA" : "SAVED APPOINTMENT"}</small><h2>{es ? "Esta es la fecha correcta" : "This is the correct date"}</h2></div><Badge tone="success">{es ? "Guardada" : "Saved"}</Badge></div>
    <div className="calendar-layout"><div className="month"><div className="month-title"><strong>{format({ month: "long", year: "numeric" })}</strong></div><div className="weekdays">{(es ? ["D", "L", "M", "M", "J", "V", "S"] : ["S", "M", "T", "W", "T", "F", "S"]).map((day, i) => <span key={i}>{day}</span>)}</div><div className="month-grid">{Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => { const day = index - offset + 1; return <span className={day === selectedDay ? "selected" : day < 1 || day > days ? "blank" : ""} key={index}>{day >= 1 && day <= days ? day : ""}</span>; })}</div></div>
    <div className="appointment-details"><div><Icon name="calendar" /><span><small>{es ? "FECHA" : "DATE"}</small><strong>{format({ dateStyle: "full" })}</strong></span></div><div><Icon name="clock" /><span><small>{es ? "HORA" : "TIME"}</small><strong>{format({ hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</strong></span></div><div><Icon name="map" /><span><small>{es ? "LUGAR" : "LOCATION"}</small><strong>{appointment.hospital}</strong><p>{appointment.address}</p></span></div></div></div><p className="saved-note">{es ? "Tu comentario no cambió la cita guardada." : "Your statement did not change the saved appointment."}</p></section>;
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
    <p>{language === "es" ? "Esto es diferente a mostrar cómo llegar. Si confirmas, enviaremos una solicitud pendiente al equipo de atención." : "This is separate from directions. If you confirm, we'll send a pending request to the care team."}</p>
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