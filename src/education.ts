export type ModelView = "body" | "abdomen" | "location" | "inside" | "layers" | "procedure";
export const modelViews: Record<ModelView, { label: string; description: string }> = {
  body: { label: "1 · Whole body", description: "Start with a reference human body. Go deeper to reveal the abdominal organs. This is generic female anatomy, not María’s scan." },
  abdomen: { label: "2 · Abdomen", description: "The body surface becomes transparent to reveal the colon, small intestine, and liver. The colon is pink; the sigmoid region is highlighted in red." },
  location: { label: "3 · Colon", description: "Isolate the reference colon and rotate it to see its shape. The red sigmoid region is the location described in the fictional note, not a measured tumor." },
  inside: { label: "4 · Inside", description: "Switch to an illustrative view inside a colon segment. The example growth is not part of the reference atlas and is not a colonoscopy or a measurement." },
  layers: { label: "5 · Wall layers", description: "An illustrative cutaway of a short segment. Layer thickness is exaggerated to explain anatomy; stage remains pending." },
  procedure: { label: "6 · Surgery discussion", description: "A schematic of removing a section. This depicts a possible procedure discussed in the note, not a selected treatment." },
};

export type ResourceDecision = "pending" | "accepted" | "rejected";
export type SavedDrawing = { image: string; view: ModelView };
export type AnatomyPart = "abdomen" | "colon" | "sigmoid" | "smallIntestine" | "liver" | "lining" | "growth" | "wall";
export type ModelPose = { position: [number, number, number]; target: [number, number, number] };
export type AnatomyNote = { id: string; part: AnatomyPart; view: ModelView; text: string; pose: ModelPose };
export const anatomyParts: Record<AnatomyPart, string> = {
  abdomen: "Abdomen", colon: "Colon", sigmoid: "Sigmoid colon", smallIntestine: "Small intestine",
  liver: "Liver", lining: "Inner lining", growth: "Example growth", wall: "Colon wall",
};
export const selectableParts: Record<ModelView, AnatomyPart[]> = {
  body: ["abdomen"], abdomen: ["colon", "sigmoid", "smallIntestine", "liver"],
  location: ["colon", "sigmoid"], inside: ["lining", "growth"], layers: ["wall", "lining", "growth"], procedure: ["colon"],
};
export function deeperView(view: ModelView, part: AnatomyPart): ModelView | null {
  if (view === "body" && part === "abdomen") return "abdomen";
  if (view === "abdomen" && (part === "colon" || part === "sigmoid")) return "location";
  if (view === "location" && (part === "colon" || part === "sigmoid")) return "inside";
  if (view === "inside") return "layers";
  return null;
}
export type EducationDraft = {
  revision: number;
  note: string;
  english: string;
  spanish: string;
  planEnglish: string;
  planSpanish: string;
  captionEnglish: string;
  captionSpanish: string;
  includeProcedure: boolean;
  deliveryLanguage: "es" | "en";
  resources: ResourceDecision[];
  drawing: SavedDrawing | null;
  anatomyNotes: AnatomyNote[];
  checks: { note: boolean; language: boolean; visual: boolean };
  approvedAt: string | null;
};

export const educationResources = [
  { title: "Colon Cancer Treatment", publisher: "National Cancer Institute", language: "English", url: "https://www.cancer.gov/types/colorectal/patient/colon-treatment-pdq" },
  { title: "Tratamiento del cáncer de colon", publisher: "Instituto Nacional del Cáncer", language: "Spanish", url: "https://www.cancer.gov/espanol/tipos/colorrectal/paciente/tratamiento-colorrectal-pdq" },
];

export const initialEducation: EducationDraft = {
  revision: 1,
  note: "FICTIONAL DEMO NOTE · October 10, 2026\n\nSigmoid colon biopsy reports adenocarcinoma. Depth of invasion and final stage have not been established in this sample record.\n\nDiscussed the location of the colon and the purpose of further evaluation. Removal of the affected colon segment was discussed as a possible treatment, pending staging and specialist review. No treatment decision or medication change is recorded.\n\nFollow-up: October 12, 2026 at 10:30 AM, Central Community Hospital. Patient prefers Spanish. Bring questions to the care team.",
  english: "Your sample biopsy report found cancer in the sigmoid colon, a part of the large intestine. This illustration helps explain where the colon is and how its wall is arranged. It does not show the exact size or depth of your cancer. The stage is still pending in this fictional record.",
  spanish: "En este caso ficticio, el informe de la biopsia encontró cáncer en el colon sigmoide, una parte del intestino grueso. Esta ilustración explica dónde está el colon y cómo está formada su pared. No muestra el tamaño ni la profundidad exactos de su cáncer. El estadio aún está pendiente en este registro ficticio.",
  planEnglish: "The care team discussed surgery to remove the affected section as a possible treatment. A treatment decision has not been made. Your next appointment is October 12, 2026 at 10:30 AM at Central Community Hospital. Bring your questions about the tests and treatment choices.",
  planSpanish: "El equipo médico habló de la cirugía para retirar la parte afectada como un posible tratamiento. Aún no se ha tomado una decisión sobre el tratamiento. Su próxima cita es el 12 de octubre de 2026 a las 10:30 a. m. en Central Community Hospital. Lleve sus preguntas sobre las pruebas y las opciones de tratamiento.",
  captionEnglish: "The body and organ views show reference anatomy. The red region marks the sigmoid colon. The inside view shows an example growth. These illustrations do not show the exact size or depth of your cancer and do not establish its stage.",
  captionSpanish: "Las vistas del cuerpo y de los órganos muestran una anatomía de referencia. La región roja señala el colon sigmoide. La vista interior muestra un ejemplo de un crecimiento. Estas ilustraciones no muestran el tamaño ni la profundidad exactos de su cáncer y no determinan su estadio.",
  includeProcedure: false,
  deliveryLanguage: "es",
  resources: ["pending", "pending"],
  drawing: null,
  anatomyNotes: [],
  checks: { note: false, language: false, visual: false },
  approvedAt: null,
};

// Every content edit invalidates review of the exact packet. No patient data is sent.
export function editEducation(current: EducationDraft, patch: Partial<EducationDraft>): EducationDraft {
  return { ...current, ...patch, revision: current.approvedAt ? current.revision + 1 : current.revision, checks: { note: false, language: false, visual: false }, approvedAt: null };
}

export function canApproveEducation(draft: EducationDraft): boolean {
  return Object.values(draft.checks).every(Boolean)
    && draft.resources.every((decision) => decision !== "pending")
    && [draft.note, draft.english, draft.spanish, draft.planEnglish, draft.planSpanish, draft.captionEnglish, draft.captionSpanish].every((value) => value.trim().length > 0);
}
