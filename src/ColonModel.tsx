import { useEffect, useRef, useState, type PointerEvent } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { anatomyParts, deeperView, selectableParts, modelViews, type AnatomyNote, type AnatomyPart, type ModelPose, type ModelView, type SavedDrawing } from "./education";



const palette = { mucosa: "#d993a3", submucosa: "#efd5b0", muscle: "#ba788c", outer: "#a3bfb9", growth: "#ac4560", background: "#eff6f8" };
type Point = { x: number; y: number };
type Stroke = Point[];
type ModelApi = { setView: (view: ModelView) => void; select: (part: AnatomyPart | null) => void; focus: (part: AnatomyPart) => void; pose: () => ModelPose; restore: (pose: ModelPose) => void; rotate: (amount: number) => void; zoom: (factor: number) => void; enable: (enabled: boolean) => void; angle: (direction: "front" | "side" | "back") => void; snapshot: () => HTMLCanvasElement };

function ringSegment(inner: number, outer: number, length: number, start = 0, arc = Math.PI * 2) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, start, start + arc, false);
  shape.lineTo(Math.cos(start + arc) * inner, Math.sin(start + arc) * inner);
  shape.absarc(0, 0, inner, start + arc, start, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 72 });
}

// Illustrative soft folds, separate from the atlas's external organ surfaces.
function innerSurface() {
  const geometry = new THREE.PlaneGeometry(Math.PI * 2, 7, 96, 160);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const angle = positions.getX(index) + Math.PI;
    const z = positions.getY(index);
    const fold = Math.pow(.5 + .5 * Math.cos(z * 6 + .35 * Math.sin(angle)), 8)
      * Math.pow(.5 + .5 * Math.cos(angle * 3 + z * .6), 2);
    const radius = .83 - .15 * fold + .025 * Math.cos(angle * 2 + z * .6);
    positions.setXYZ(index, Math.cos(angle) * radius, Math.sin(angle) * radius, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildModel(view: ModelView): THREE.Group {
  const group = new THREE.Group();
  const material = (color: string, opacity = 1) => new THREE.MeshStandardMaterial({ color, roughness: .65, side: THREE.DoubleSide, transparent: opacity < 1, opacity });
  const mesh = (geometry: THREE.BufferGeometry, color: string, opacity = 1) => {
    const result = new THREE.Mesh(geometry, material(color, opacity));
    result.userData.selection = view === "procedure" ? "colon" : color === palette.growth ? "growth" : color === palette.mucosa ? "lining" : "wall";
    group.add(result);
    return result;
  };
  if (view === "procedure") {
    for (const [x, y, color] of [[-1.85, 0, palette.mucosa], [0, 1.3, palette.growth], [1.85, 0, palette.mucosa]] as const) {
      const section = mesh(ringSegment(.65, .9, 1.4), color);
      section.rotation.y = Math.PI / 2;
      section.position.set(x - .7, y, 0);
    }
  } else {
    const length = view === "inside" ? 7 : 3;
    const start = view === "layers" ? Math.PI * .18 : 0;
    const arc = view === "layers" ? Math.PI * 1.6 : Math.PI * 2;
    const layers = [[.85, .97, palette.mucosa], [.97, 1.09, palette.submucosa], [1.09, 1.25, palette.muscle], [1.25, 1.34, palette.outer]] as const;
    for (const [inner, outer, color] of layers) {
      const layer = mesh(ringSegment(inner, outer, length, start, arc), color);
      layer.position.z = -length / 2;
    }
    if (view === "inside") {
      mesh(innerSurface(), palette.mucosa);
    }
    const growth = mesh(new THREE.SphereGeometry(.35, 32, 20), palette.growth);
    growth.scale.set(.5, 1, 1.1);
    growth.position.set(-.69, .12, view === "inside" ? -.7 : .25);
    for (const [y, z] of [[.05, -.05], [.18, .15], [-.06, .24]]) {
      const lobe = mesh(new THREE.SphereGeometry(.14, 20, 14), palette.growth);
      lobe.position.set(-.55, .12 + y, (view === "inside" ? -.7 : .25) + z);
    }
  }
  return group;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

type Props = { language?: "en" | "es"; includeProcedure: boolean; onSaveDrawing?: (drawing: SavedDrawing) => void; notes?: AnatomyNote[]; onSaveNote?: (note: AnatomyNote) => void; onRemoveNote?: (id: string) => void; viewOnly?: boolean };

export default function ColonModel({ includeProcedure, onSaveDrawing = () => {}, notes = [], onSaveNote = () => {}, onRemoveNote = () => {}, viewOnly = false, language = "en" }: Props) {
  const es = language === "es";
  const partNames: Record<AnatomyPart, string> = es ? { abdomen: "Abdomen", colon: "Colon", sigmoid: "Colon sigmoide", smallIntestine: "Intestino delgado", liver: "Hígado", lining: "Revestimiento interior", growth: "Crecimiento de ejemplo", wall: "Pared del colon" } : anatomyParts;
  const viewNames: Record<ModelView, string> = es ? { body: "Cuerpo", abdomen: "Abdomen", location: "Colon", inside: "Interior", layers: "Capas de la pared", procedure: "Posible cirugía" } : { body: "Body", abdomen: "Abdomen", location: "Colon", inside: "Inside", layers: "Wall layers", procedure: "Surgery discussion" };
  const descriptions: Record<ModelView, string> = {
    body: "Cuerpo humano de referencia. Explore el abdomen para ver los órganos. Esta anatomía es genérica, no un estudio de imagen de María.",
    abdomen: "La superficie del cuerpo se vuelve transparente para mostrar el colon, el intestino delgado y el hígado. El colon es rosado y la región sigmoide está marcada en rojo.",
    location: "El colon de referencia se muestra por separado. La región roja indica el colon sigmoide descrito en la nota ficticia, no un tumor medido.",
    inside: "Vista ilustrativa del interior de un segmento del colon. El crecimiento es un ejemplo, no una colonoscopia ni una medida.",
    layers: "Ilustración de las capas de la pared del colon. El grosor de las capas se exagera para explicar la anatomía; el estadio aún está pendiente.",
    procedure: "Esquema de la extracción de un segmento. Muestra un posible procedimiento mencionado en la nota, no un tratamiento seleccionado.",
  };
  const host = useRef<HTMLDivElement>(null);
  const activatePartRef = useRef<(part: AnatomyPart) => void>(() => {});
  const api = useRef<ModelApi | null>(null);
  const partMarker = useRef<HTMLButtonElement>(null);
  const activeStroke = useRef<Stroke | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const [strokeVersion, setStrokeVersion] = useState(0);
  const [view, setView] = useState<ModelView>("body");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<"" | "unavailable" | "interrupted" | "incomplete" | "load">("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedPart, setSelectedPart] = useState<AnatomyPart | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteNotice, setNoteNotice] = useState<"" | "abdomen" | "saved">("");
  const sequence = (Object.keys(modelViews) as ModelView[]).filter((key) => key !== "procedure" || includeProcedure);
  const depth = sequence.indexOf(view);
  const noteKey = `${view}:${selectedPart}`;
  const nextView = selectedPart ? deeperView(view, selectedPart) : sequence[depth + 1] ?? null;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
    catch { setError("unavailable"); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.background);
    const camera = new THREE.PerspectiveCamera(42, 1, .05, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = .8;
    controls.maxDistance = 16;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x567080, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 6);
    scene.add(light);
    let illustration: THREE.Group | null = null;
    let anatomy: THREE.Group | null = null;
    let currentView: ModelView = "body";
    let cancelled = false;
    let animation = 0;
    let selected: AnatomyPart | null = null;
    let pointerStart: { x: number; y: number } | null = null;
    const anatomyMeshes: THREE.Mesh[] = [];
    const bodyBox = new THREE.Box3();
    const colonBox = new THREE.Box3();
    const abdomenBox = new THREE.Box3();
    const partBox = (part: AnatomyPart) => {
      if (part === "abdomen") return abdomenBox.clone();
      if (part === "colon" && anatomy?.visible) return colonBox.clone();
      const box = new THREE.Box3();
      const root = anatomy?.visible ? anatomy : illustration;
      root?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.visible) return;
        if (object.userData.selection === part || (part === "colon" && object.userData.part === "colon") || (part === "wall" && illustration && object.userData.selection !== "growth")) box.union(new THREE.Box3().setFromObject(object));
      });
      return box;
    };
    const render = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.render(scene, camera);
      const marker = partMarker.current;
      const part = selected ?? (currentView === "body" ? "abdomen" : null);
      if (!marker || !part || !anatomy) { if (marker) marker.style.visibility = "hidden"; return; }
      const box = partBox(part);
      if (box.isEmpty()) { marker.style.visibility = "hidden"; return; }
      const center = box.getCenter(new THREE.Vector3());
      center.z = box.max.z;
      center.project(camera);
      marker.style.visibility = center.z < 1 && center.z > -1 && Math.abs(center.x) < .9 && Math.abs(center.y) < .9 ? "visible" : "hidden";
      marker.style.left = `${(center.x + 1) * 50}%`;
      marker.style.top = `${(-center.y + 1) * 50}%`;
    };
    const highlight = () => {
      for (const root of [anatomy, illustration]) root?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material as THREE.MeshStandardMaterial;
        const matches = object.name !== "VH_F_skin" && selected && (object.userData.selection === selected || (selected === "colon" && object.userData.part === "colon") || (selected === "wall" && root === illustration && object.userData.selection !== "growth"));
        material.emissive.set(matches ? "#169b9a" : "#000000");
        material.emissiveIntensity = matches ? .3 : 0;
      });
      render();
    };
    const select = (part: AnatomyPart | null) => { selected = part; setSelectedPart(part); setNoteNotice(""); highlight(); };
    const stopAnimation = () => { cancelAnimationFrame(animation); animation = 0; };
    const moveCamera = (position: THREE.Vector3, target: THREE.Vector3, animate: boolean) => {
      stopAnimation();
      if (![...position.toArray(), ...target.toArray()].every(Number.isFinite)) return;
      const from = camera.position.clone();
      const fromTarget = controls.target.clone();
      const start = performance.now();
      const validStart = [...from.toArray(), ...fromTarget.toArray()].every(Number.isFinite);
      const duration = animate && validStart && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 650 : 0;
      if (!duration) {
        // Copy directly: interpolating from an invalid hidden-view pose cannot recover it.
        camera.position.copy(position); controls.target.copy(target); controls.update(); render();
        return;
      }
      const step = (now: number) => {
        const progress = duration ? Math.min((now - start) / duration, 1) : 1;
        const eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(from, position, eased);
        controls.target.lerpVectors(fromTarget, target, eased);
        controls.update(); render();
        if (progress < 1) animation = requestAnimationFrame(step);
        else animation = 0;
      };
      step(start);
    };
    const frameBox = (box: THREE.Box3, animate: boolean) => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0 || box.isEmpty() || !Number.isFinite(camera.aspect) || camera.aspect <= 0) return;
      const size = box.getSize(new THREE.Vector3());
      const target = box.getCenter(new THREE.Vector3());
      const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.15 + size.z / 2;
      if (!Number.isFinite(distance) || distance <= 0) return;
      controls.minDistance = Math.max(size.length() * .12, .2);
      controls.maxDistance = Math.max(distance * 3, 16);
      moveCamera(target.clone().add(new THREE.Vector3(distance * .06, 0, distance)), target, animate);
    };
    const setView = (next: ModelView, animate = true) => {
      currentView = next;
      selected = null; setSelectedPart(null); setNoteNotice("");
      if (!anatomy) return;
      const referenceView = next === "body" || next === "abdomen" || next === "location";
      anatomy.visible = referenceView;
      if (illustration) { scene.remove(illustration); disposeGroup(illustration); illustration = null; }
      if (referenceView) {
        for (const mesh of anatomyMeshes) {
          const skin = mesh.name === "VH_F_skin";
          const colon = mesh.userData.part === "colon";
          mesh.visible = next === "body" ? skin : next === "location" ? colon : true;
          const material = mesh.material as THREE.MeshStandardMaterial;
          material.opacity = skin && next === "abdomen" ? .10 : 1;
          material.transparent = material.opacity < 1;
          material.depthWrite = !material.transparent;
          material.needsUpdate = true;
        }
        highlight();
        frameBox(next === "body" ? bodyBox : next === "abdomen" ? abdomenBox : colonBox, animate);
      } else {
        illustration = buildModel(next); scene.add(illustration); highlight();
        controls.minDistance = .4; controls.maxDistance = 16;
        if (next === "inside") moveCamera(new THREE.Vector3(0, 0, 3.25), new THREE.Vector3(0, 0, -1), animate);
        else if (next === "layers") moveCamera(new THREE.Vector3(4, 2.5, 5), new THREE.Vector3(), animate);
        else moveCamera(new THREE.Vector3(1, 3, 8.5), new THREE.Vector3(), animate);
      }
    };
    let lastWidth = 0, lastHeight = 0;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      // Collapsed review panels have zero dimensions. Wait for ResizeObserver to
      // report the visible canvas instead of creating a zero-aspect projection.
      if (width <= 0 || height <= 0) return;
      // Returning from a hidden review preserves the camera and unsaved marks.
      if (width === lastWidth && height === lastHeight) { render(); return; }
      lastWidth = width; lastHeight = height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (anatomy && (currentView === "body" || currentView === "abdomen" || currentView === "location")) {
        frameBox(currentView === "body" ? bodyBox : currentView === "abdomen" ? abdomenBox : colonBox, false);
      } else render();
    };
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Interactive human anatomy model. Explore whole body, abdomen, colon, and illustrative interior views.");
    renderer.domElement.setAttribute("role", "img");
    controls.addEventListener("change", render);
    controls.addEventListener("start", stopAnimation);
    const contextLost = (event: Event) => { event.preventDefault(); setError("interrupted"); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(`${import.meta.env.BASE_URL}models/reference-anatomy.glb`, (gltf) => {
      if (cancelled) { disposeGroup(gltf.scene); return; }
      anatomy = gltf.scene;
      const skin = anatomy.getObjectByName("VH_F_skin");
      if (!skin) { disposeGroup(anatomy); anatomy = null; setError("incomplete"); setLoading(false); return; }
      const rawBox = new THREE.Box3().setFromObject(skin);
      const scale = 6.8 / rawBox.getSize(new THREE.Vector3()).y;
      anatomy.scale.setScalar(scale);
      anatomy.position.copy(rawBox.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
      anatomy.updateMatrixWorld(true);
      anatomy.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const oldMaterials = Array.isArray(object.material) ? object.material : [object.material];
        oldMaterials.forEach((material) => material.dispose());
        let parent: THREE.Object3D | null = object;
        let part = "context";
        while (parent) {
          if (parent.name === "VH_F_colon") part = "colon";
          parent = parent.parent;
        }
        object.userData.part = part;
        object.userData.selection = object.name === "VH_F_skin" ? "abdomen" : object.name === "VH_F_sigmoid_colon" ? "sigmoid" : part === "colon" ? "colon" : /liver|lobe|segment/.test(object.name) ? "liver" : "smallIntestine";
        const color = object.name === "VH_F_skin" ? "#b8cbd2" : object.name === "VH_F_sigmoid_colon" ? "#b02f52" : part === "colon" ? "#d78691" : object.name.includes("liver") || object.name.includes("lobe") || object.name.includes("segment") ? "#bb8070" : "#e7bf9b";
        object.material = new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: 0, side: THREE.DoubleSide });
        anatomyMeshes.push(object);
        if (object.name === "VH_F_skin") bodyBox.setFromObject(object);
        else {
          const box = new THREE.Box3().setFromObject(object);
          abdomenBox.union(box);
          if (part === "colon") colonBox.union(box);
        }
      });
      scene.add(anatomy);
      setLoading(false); setView(currentView, false);
    }, undefined, () => { if (!cancelled) { setLoading(false); setError("load"); } });
    const raycaster = new THREE.Raycaster();
    const pointerDown = (event: globalThis.PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const pointerUp = (event: globalThis.PointerEvent) => {
      if (!pointerStart || !controls.enabled || animation || !anatomy || event.button !== 0) { pointerStart = null; return; }
      const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      pointerStart = null;
      if (distance > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const root = anatomy.visible ? anatomy : illustration;
      const candidates: THREE.Object3D[] = [];
      root?.traverse((object) => { if (object instanceof THREE.Mesh && object.visible && (currentView === "body" || object.name !== "VH_F_skin")) candidates.push(object); });
      const hit = raycaster.intersectObjects(candidates, false)[0];
      if (!hit) { select(null); return; }
      if (currentView === "body") {
        // A skin hit outside the abdominal region does not select an unrelated organ.
        const size = abdomenBox.getSize(new THREE.Vector3());
        if (hit.point.y < abdomenBox.min.y - size.y * .12 || hit.point.y > abdomenBox.max.y + size.y * .12 || hit.point.x < abdomenBox.min.x - size.x * .1 || hit.point.x > abdomenBox.max.x + size.x * .1) { select(null); setNoteNotice("abdomen"); return; }
      }
      activatePartRef.current(hit.object.userData.selection as AnatomyPart);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const pointerCancel = () => { pointerStart = null; };
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
    const cameraLight = new THREE.PointLight(0xffe8df, 2, 12, 0);
    camera.add(cameraLight); scene.add(camera);
    api.current = {
      setView(next) { setView(next); },
      select(part) { select(part); },
      focus(part) { const box = partBox(part); if (!box.isEmpty()) frameBox(box, true); },
      pose() { stopAnimation(); return { position: camera.position.toArray(), target: controls.target.toArray() }; },
      restore(pose) { moveCamera(new THREE.Vector3(...pose.position), new THREE.Vector3(...pose.target), true); },
      rotate(amount) { stopAnimation(); const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), amount); camera.position.copy(controls.target).add(offset); controls.update(); render(); },
      zoom(factor) { stopAnimation(); const offset = camera.position.clone().sub(controls.target); const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance); offset.setLength(distance); camera.position.copy(controls.target).add(offset); controls.update(); render(); },
      angle(direction) { const distance = camera.position.distanceTo(controls.target); const offset = direction === "side" ? new THREE.Vector3(distance, 0, 0) : new THREE.Vector3(0, 0, direction === "back" ? -distance : distance); moveCamera(controls.target.clone().add(offset), controls.target.clone(), true); },
      enable(enabled) { stopAnimation(); controls.enabled = enabled; },
      snapshot() { stopAnimation(); render(); return renderer.domElement; },
    };
    return () => { cancelled = true; stopAnimation(); api.current = null; observer.disconnect(); controls.dispose(); if (anatomy) disposeGroup(anatomy); if (illustration) disposeGroup(illustration); renderer.domElement.removeEventListener("webglcontextlost", contextLost); renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("pointercancel", pointerCancel); renderer.dispose(); renderer.domElement.remove(); };
  }, [loadAttempt]);

  useEffect(() => {
    if (!includeProcedure && view === "procedure") {
      setDrawing(false); api.current?.enable(true); strokes.current = []; activeStroke.current = null;
      setStrokeVersion((value) => value + 1); setSelectedPart(null); setView("layers"); api.current?.setView("layers");
    }
  }, [includeProcedure, view]);

  useEffect(() => {
    host.current?.querySelector("canvas")?.setAttribute("aria-label", es ? "Modelo educativo de anatomía. Seleccione el abdomen o una parte compatible para explorar más; arrastre para girar." : "Educational anatomy model. Select the abdomen or a supported part to explore deeper; drag to rotate.");
  }, [es, loading]);

  const changeView = (next: ModelView) => {
    setDrawing(false); setSelectedPart(null); setNoteNotice(""); api.current?.enable(true); setView(next); api.current?.setView(next);
    strokes.current = []; setStrokeVersion((value) => value + 1); setSaved(false);
  };
  const selectPart = (part: AnatomyPart | null) => { api.current?.select(part); };
  const activatePart = (part: AnatomyPart) => {
    const next = deeperView(view, part);
    if (next && sequence.includes(next)) {
      changeView(next);
      if (selectableParts[next].includes(part)) { selectPart(part); api.current?.focus(part); }
    } else { selectPart(part); api.current?.focus(part); }
  };
  activatePartRef.current = activatePart;
  const saveNote = () => {
    const text = (noteDrafts[noteKey] ?? "").trim();
    if (!selectedPart || !text || !api.current) return;
    onSaveNote({ id: crypto.randomUUID(), part: selectedPart, view, text, pose: api.current.pose() });
    setNoteDrafts((current) => ({ ...current, [noteKey]: "" }));
    setNoteNotice("saved");
  };
  const revisitNote = (note: AnatomyNote) => {
    changeView(note.view); selectPart(note.part); api.current?.restore(note.pose);
  };
  const point = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 1000 };
  };
  const save = () => {
    const source = api.current?.snapshot();
    if (!source || strokes.current.length === 0) return;
    const canvas = document.createElement("canvas"); canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext("2d"); if (!context) return;
    context.drawImage(source, 0, 0);
    context.strokeStyle = "#08736f"; context.lineWidth = source.width / 180; context.lineCap = "round"; context.lineJoin = "round";
    for (const stroke of strokes.current) {
      context.beginPath(); stroke.forEach((p, index) => { const x = p.x / 1000 * canvas.width; const y = p.y / 1000 * canvas.height; if (index === 0) context.moveTo(x, y); else context.lineTo(x, y); }); context.stroke();
    }
    onSaveDrawing({ image: canvas.toDataURL("image/png"), view });
    setSaved(true); setDrawing(false); api.current?.enable(true); strokes.current = []; setStrokeVersion((value) => value + 1);
  };

  const disabled = drawing || loading || !!error;
  const primaryParts: AnatomyPart[] = view === "inside" ? ["lining"] : view === "layers" ? ["wall"] : selectableParts[view].filter((part) => !!deeperView(view, part));
  const reloadModel = () => {
    setError(""); setLoading(true); setView("body"); setSelectedPart(null); setDrawing(false); setSaved(false);
    strokes.current = []; activeStroke.current = null; setStrokeVersion((value) => value + 1);
    setLoadAttempt((value) => value + 1);
  };
  const errorMessage = es ? (error === "unavailable" ? "El modelo 3D no está disponible en este navegador. Intente cargarlo de nuevo o use un navegador con WebGL. El texto sigue disponible." : "No se pudo mostrar la anatomía. Cargue el modelo de nuevo. El texto sigue disponible.") : error === "unavailable" ? "3D is unavailable in this browser. Try reloading the model or use a browser with WebGL. Written information remains available." : "The anatomy could not be displayed. Reload the model to try again. Written information remains available.";
  const selectionNotice = noteNotice === "saved" ? (es ? "Nota guardada con esta parte y ángulo de vista." : "Note saved with this part and camera angle.") : (es ? "Esta demostración permite explorar el abdomen. Selecciónelo para ver los órganos." : "This demo supports the abdomen. Select it to reveal the organs.");

  return <div className="colon-model" lang={language}>
    <div className="model-depth-navigation" aria-label={es ? "Ruta de anatomía" : "Anatomy path"}><button type="button" disabled={depth === 0 || disabled} onClick={() => changeView(sequence[depth - 1])}>{es ? "← Atrás" : "← Back"}</button><span role="status">{sequence.slice(0, depth + 1).map((key) => viewNames[key]).join(" / ")}</span></div>
    <div className="model-stage">
      <div ref={host} className="model-canvas" />
      <span className="model-corner-label">{["body", "abdomen", "location"].includes(view) ? (es ? "ANATOMÍA DE REFERENCIA" : "REFERENCE ANATOMY") : (es ? "DETALLE ILUSTRATIVO" : "ILLUSTRATIVE DETAIL")}</span>
      <button ref={partMarker} type="button" className={`model-part-marker ${selectedPart ? "selected" : ""}`} style={{ visibility: "hidden" }} disabled={disabled} onClick={() => activatePart(selectedPart ?? "abdomen")} aria-label={es ? `Explorar ${partNames[selectedPart ?? "abdomen"]}` : `Explore ${partNames[selectedPart ?? "abdomen"]}`}>{partNames[selectedPart ?? "abdomen"]} →</button>
      {loading && !error && <div className="model-error" role="status">{es ? "Cargando anatomía de referencia…" : "Loading reference anatomy…"}</div>}
      {error && <div className="model-error" role="alert"><div><p>{errorMessage}</p><button type="button" className="button secondary" onClick={reloadModel}>{es ? "Volver a cargar el modelo" : "Reload model"}</button></div></div>}
      {!viewOnly && drawing && <svg className="model-drawing" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label={es ? "Dibujar sobre la vista actual" : "Draw over the current model view"} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const stroke = [point(event)]; strokes.current.push(stroke); activeStroke.current = stroke; setStrokeVersion((value) => value + 1); }} onPointerMove={(event) => { if (!activeStroke.current) return; activeStroke.current.push(point(event)); setStrokeVersion((value) => value + 1); }} onPointerUp={() => { activeStroke.current = null; }} onPointerCancel={() => { activeStroke.current = null; }}>
        <g data-version={strokeVersion}>{strokes.current.map((stroke, index) => <polyline key={index} points={stroke.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--teal-deep)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />)}</g>
      </svg>}
    </div>
    <p className="model-help">{drawing ? (es ? "La cámara está bloqueada mientras dibuja." : "The camera is locked while drawing.") : (es ? "Seleccione una parte del modelo para explorar más. Arrastre para girar." : "Click a part in the model to explore deeper. Drag to rotate.")}</p>
    <div className="model-part-options" role="group" aria-label={es ? "Explorar anatomía" : "Explore anatomy"}>{primaryParts.map((part) => <button key={part} type="button" disabled={disabled} onClick={() => activatePart(part)}>{view === "inside" ? (es ? "Ver capas de la pared →" : "View wall layers →") : view === "layers" ? (es ? "Enfocar pared del colon" : "Focus colon wall") : `${es ? "Explorar" : "Explore"} ${partNames[part]} →`}</button>)}</div>
    {selectedPart && <p className="model-help" role="status">{es ? "Parte seleccionada" : "Selected part"}: {partNames[selectedPart]}{!nextView && (selectedPart === "liver" || selectedPart === "smallIntestine") ? (es ? ". No hay una vista interior disponible de este órgano." : ". An interior view is not available for this organ.") : ""}</p>}
    {noteNotice && <p className="model-help" role="status">{selectionNotice}</p>}
    {view === "layers" && <div className="layer-legend">{[[es ? "Revestimiento interior" : "Inner lining", palette.mucosa], [es ? "Tejido de soporte" : "Supporting tissue", palette.submucosa], [es ? "Músculo" : "Muscle", palette.muscle], [es ? "Cubierta exterior" : "Outer covering", palette.outer]].map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>}
    {view === "abdomen" && <div className="layer-legend">{[["Colon", "#d78691"], [es ? "Región sigmoide" : "Sigmoid region", "#b02f52"], [es ? "Intestino delgado" : "Small intestine", "#e7bf9b"], [es ? "Hígado" : "Liver", "#bb8070"]].map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>}
    <p className="model-description">{es ? descriptions[view] : modelViews[view].description}</p>

    <details className="model-notes"><summary className="button secondary">{es ? "Más opciones ▾" : "More options ▾"}</summary>
      <div className="model-view-buttons" role="group" aria-label={es ? "Todas las vistas" : "All views"}>{sequence.map((key) => <button type="button" key={key} aria-pressed={view === key} className={view === key ? "active" : ""} disabled={disabled} onClick={() => changeView(key)}>{viewNames[key]}</button>)}</div>
      <div className="model-angle-controls" role="group" aria-label={es ? "Ángulo de vista" : "Camera angle"}>{(["front", "side", "back"] as const).map((angle) => <button type="button" key={angle} disabled={disabled} onClick={() => api.current?.angle(angle)}>{angle === "front" ? (es ? "Frente" : "Front") : angle === "side" ? (es ? "Lado" : "Side") : (es ? "Atrás" : "Back")}</button>)}</div>
      <div className="model-controls" role="group" aria-label={es ? "Controles del modelo" : "Model controls"}><button type="button" disabled={disabled} onClick={() => api.current?.rotate(-Math.PI / 8)}>{es ? "↶ Girar" : "↶ Rotate"}</button><button type="button" disabled={disabled} onClick={() => api.current?.rotate(Math.PI / 8)}>{es ? "Girar ↷" : "Rotate ↷"}</button><button type="button" disabled={disabled} aria-label={es ? "Acercar" : "Zoom in"} onClick={() => api.current?.zoom(.85)}>＋</button><button type="button" disabled={disabled} aria-label={es ? "Alejar" : "Zoom out"} onClick={() => api.current?.zoom(1.18)}>−</button><button type="button" disabled={disabled} onClick={() => changeView(view)}>{es ? "Restablecer vista" : "Reset view"}</button></div>
      <div className="model-selection-panel"><p className="eyebrow">{viewOnly ? (es ? "SELECCIONAR UNA PARTE" : "SELECT A PART") : (es ? "SELECCIONAR UNA PARTE PARA ANOTAR" : "SELECT A PART FOR NOTES")}</p><div className="model-part-options" role="group" aria-label={es ? "Partes seleccionables" : "Selectable anatomy"}>{selectableParts[view].map((part) => <button key={part} type="button" aria-pressed={selectedPart === part} disabled={disabled} className={selectedPart === part ? "active" : ""} onClick={() => { selectPart(part); api.current?.focus(part); }}>{partNames[part]}</button>)}</div>
        {selectedPart && <><div className="model-selected-heading"><strong>{partNames[selectedPart]}</strong><button type="button" disabled={disabled} onClick={() => api.current?.focus(selectedPart)}>{es ? "Enfocar parte" : "Focus part"}</button><button type="button" disabled={drawing} onClick={() => selectPart(null)}>{es ? "Borrar selección" : "Clear selection"}</button></div>{!viewOnly && <><label htmlFor="anatomy-note">{es ? "Nota del médico" : "Doctor note"} · {partNames[selectedPart]}<textarea id="anatomy-note" rows={3} placeholder={es ? "¿Qué desea explicar sobre esta parte?" : "What do you want to explain about this part?"} value={noteDrafts[noteKey] ?? ""} onChange={(event) => { setNoteDrafts((current) => ({ ...current, [noteKey]: event.target.value })); setNoteNotice(""); }} /></label><div className="drawing-tools"><button type="button" disabled={disabled || !(noteDrafts[noteKey] ?? "").trim()} onClick={saveNote}>{es ? "Guardar nota" : "Save part note"}</button><span>{es ? "Solo notas del médico · No se comparten" : "Doctor notes only · Not shared"}</span></div></>}</>}
      </div>
      {!viewOnly && !drawing && <div className="drawing-tools"><button type="button" disabled={loading || !!error} onClick={() => { setDrawing(true); api.current?.enable(false); setSaved(false); }}>{es ? "Dibujar en esta vista" : "Draw on this view"}</button></div>}
    <p className="model-attribution">{es ? "Anatomía de referencia" : "Reference anatomy"}: <a href="https://doi.org/10.48539/HBM352.BTSQ.586" target="_blank" rel="noreferrer">Human Reference Atlas / HuBMAP</a> · <a href={`${import.meta.env.BASE_URL}models/ATTRIBUTION.md`} target="_blank" rel="noreferrer">{es ? "CC BY 4.0 · Créditos" : "CC BY 4.0 · Asset credits"}</a></p>
    </details>
    {!viewOnly && drawing && <div className="drawing-tools"><button type="button" onClick={() => { setDrawing(false); api.current?.enable(true); }}>{es ? "Cancelar dibujo" : "Cancel drawing"}</button><button type="button" disabled={strokes.current.length === 0} onClick={() => { strokes.current.pop(); setStrokeVersion((value) => value + 1); }}>{es ? "Deshacer" : "Undo"}</button><button type="button" disabled={strokes.current.length === 0} onClick={save}>{es ? "Guardar dibujo" : "Save drawing"}</button></div>}
    {!viewOnly && saved && <p className="model-help" role="status">{es ? "Dibujo guardado en el borrador." : "Drawing saved to the draft."}</p>}
    {!viewOnly && notes.length > 0 && <details className="model-notes"><summary>{es ? "Notas guardadas del médico" : "Saved doctor notes"} ({notes.length})</summary>{notes.map((note) => <article key={note.id}><strong>{partNames[note.part]} <small>· {viewNames[note.view]}</small></strong><p>{note.text}</p><div className="drawing-tools"><button type="button" disabled={disabled || (note.view === "procedure" && !includeProcedure)} onClick={() => revisitNote(note)}>{es ? "Volver a esta parte" : "Return to this part"}</button><button type="button" onClick={() => onRemoveNote(note.id)}>{es ? "Eliminar nota" : "Remove note"}</button></div>{note.view === "procedure" && !includeProcedure && <small>{es ? "Habilite la explicación de cirugía para abrir esta vista." : "Enable the surgery explanation to reopen this view."}</small>}</article>)}</details>}
  </div>;
}
