import { initialWorkspace, type Workspace } from "./workflow";
// Synthetic data only. This is a same-browser demo adapter, not authentication or server access control.
export const WORKSPACE_KEY = "vozcare-patient-workflow-v1";
const CHANGE_EVENT = "vozcare-workspace-changed";
let memory = initialWorkspace();
export function loadWorkspace(): Workspace {
  try {
    const saved = localStorage.getItem(WORKSPACE_KEY);
    if (saved) { const parsed = JSON.parse(saved); if (parsed.version === 1 && Array.isArray(parsed.records)) return parsed; }
  } catch { /* Fall back to temporary memory; the UI reports this limitation. */ }
  return memory;
}
export function persistentDemoAvailable(): boolean {
  try { localStorage.setItem("vozcare-storage-check", "1"); localStorage.removeItem("vozcare-storage-check"); return true; } catch { return false; }
}
export function mutateWorkspace(update: (workspace: Workspace) => Workspace): Workspace {
  const next = update(loadWorkspace());
  // Write before notifying the UI. Quota errors preserve the previous record instead of claiming a saved approval.
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(next));
  memory = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}
export function observeWorkspace(onChange: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === WORKSPACE_KEY) onChange(); };
  window.addEventListener("storage", storage); window.addEventListener(CHANGE_EVENT, onChange);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(CHANGE_EVENT, onChange); };
}
