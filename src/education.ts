import { demoEducation } from "../base44/shared/demoScenario.ts";
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
export type SavedDrawing = { image: string; view: ModelView; fileUri?: string };
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
  ...demoEducation,
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