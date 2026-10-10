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

type Props = { includeProcedure: boolean; onSaveDrawing: (drawing: SavedDrawing) => void; notes: AnatomyNote[]; onSaveNote: (note: AnatomyNote) => void; onRemoveNote: (id: string) => void };

export default function ColonModel({ includeProcedure, onSaveDrawing, notes, onSaveNote, onRemoveNote }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<ModelApi | null>(null);
  const partMarker = useRef<HTMLButtonElement>(null);
  const activeStroke = useRef<Stroke | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const [strokeVersion, setStrokeVersion] = useState(0);
  const [view, setView] = useState<ModelView>("body");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState<AnatomyPart | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteNotice, setNoteNotice] = useState("");
  const sequence = (Object.keys(modelViews) as ModelView[]).filter((key) => key !== "procedure" || includeProcedure);
  const depth = sequence.indexOf(view);
  const noteKey = `${view}:${selectedPart}`;
  const nextView = selectedPart ? deeperView(view, selectedPart) : sequence[depth + 1] ?? null;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
    catch { setError("3D is unavailable in this browser. The notes and approval tools still work; use a browser with WebGL enabled to review the visual."); return; }
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
      const from = camera.position.clone();
      const fromTarget = controls.target.clone();
      const start = performance.now();
      const duration = animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 650 : 0;
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
      const size = box.getSize(new THREE.Vector3());
      const target = box.getCenter(new THREE.Vector3());
      const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.15 + size.z / 2;
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
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
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
    const contextLost = (event: Event) => { event.preventDefault(); setError("The 3D view was interrupted. Reopen Education review to reload it before approving the visual."); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(`${import.meta.env.BASE_URL}models/reference-anatomy.glb`, (gltf) => {
      if (cancelled) { disposeGroup(gltf.scene); return; }
      anatomy = gltf.scene;
      const skin = anatomy.getObjectByName("VH_F_skin");
      if (!skin) { disposeGroup(anatomy); anatomy = null; setError("The anatomy asset is incomplete. Reopen this review to reload it."); setLoading(false); return; }
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
    }, undefined, () => { if (!cancelled) { setLoading(false); setError("The reference anatomy could not load. Reopen Education review to try again."); } });
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
        if (hit.point.y < abdomenBox.min.y - size.y * .12 || hit.point.y > abdomenBox.max.y + size.y * .12 || hit.point.x < abdomenBox.min.x - size.x * .1 || hit.point.x > abdomenBox.max.x + size.x * .1) { select(null); setNoteNotice("This demo supports the abdomen. Select it to reveal the organs."); return; }
      }
      select(hit.object.userData.selection as AnatomyPart);
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
  }, []);

  useEffect(() => {
    if (!includeProcedure && view === "procedure") {
      setDrawing(false); api.current?.enable(true); strokes.current = []; activeStroke.current = null;
      setStrokeVersion((value) => value + 1); setSelectedPart(null); setView("layers"); api.current?.setView("layers");
    }
  }, [includeProcedure, view]);

  const changeView = (next: ModelView) => {
    setDrawing(false); setSelectedPart(null); setNoteNotice(""); api.current?.enable(true); setView(next); api.current?.setView(next);
    strokes.current = []; setStrokeVersion((value) => value + 1); setSaved(false);
  };
  const selectPart = (part: AnatomyPart | null) => { api.current?.select(part); };
  const goDeeper = () => {
    if (!nextView) return;
    const previous = selectedPart;
    changeView(nextView);
    if (nextView === "location" && (previous === "colon" || previous === "sigmoid")) { selectPart(previous); api.current?.focus(previous); }
  };
  const saveNote = () => {
    const text = (noteDrafts[noteKey] ?? "").trim();
    if (!selectedPart || !text || !api.current) return;
    onSaveNote({ id: crypto.randomUUID(), part: selectedPart, view, text, pose: api.current.pose() });
    setNoteDrafts((current) => ({ ...current, [noteKey]: "" }));
    setNoteNotice("Note saved with this part and camera angle.");
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

  return <div className="colon-model">
    <div className="model-view-buttons" aria-label="Model views">{sequence.map((key) => <button type="button" key={key} aria-pressed={view === key} className={view === key ? "active" : ""} disabled={drawing || loading || !!error} onClick={() => changeView(key)}>{modelViews[key].label}</button>)}</div>
    <div className="model-stage">
      <div ref={host} className="model-canvas" />
      <span className="model-corner-label">{["body", "abdomen", "location"].includes(view) ? "HUMAN REFERENCE ANATOMY" : "ILLUSTRATIVE DETAIL"}</span>
      <button ref={partMarker} type="button" className={`model-part-marker ${selectedPart ? "selected" : ""}`} style={{ visibility: "hidden" }} disabled={drawing || loading || !!error} onClick={() => { if (selectedPart) api.current?.focus(selectedPart); else selectPart("abdomen"); }} aria-label={selectedPart ? `Focus ${anatomyParts[selectedPart]}` : "Select abdomen on model"}>{selectedPart ? anatomyParts[selectedPart] : "Abdomen · Select"}</button>
      {loading && <div className="model-error" role="status">Loading reference anatomy…</div>}
      {error && <div className="model-error" role="alert">{error}</div>}
      {drawing && <svg className="model-drawing" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Draw over the current model view" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const stroke = [point(event)]; strokes.current.push(stroke); activeStroke.current = stroke; setStrokeVersion((value) => value + 1); }} onPointerMove={(event) => { if (!activeStroke.current) return; activeStroke.current.push(point(event)); setStrokeVersion((value) => value + 1); }} onPointerUp={() => { activeStroke.current = null; }} onPointerCancel={() => { activeStroke.current = null; }}>
        <g data-version={strokeVersion}>{strokes.current.map((stroke, index) => <polyline key={index} points={stroke.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--teal-deep)" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />)}</g>
      </svg>}
    </div>
    <div className="model-depth-navigation"><button type="button" disabled={depth === 0 || drawing || loading || !!error} onClick={() => changeView(sequence[depth - 1])}>← Back a level</button><span>{depth + 1} / {sequence.length} · {view === "body" ? "Body surface" : view === "abdomen" ? "Organs revealed" : view === "location" ? "Colon isolated" : "Illustrative detail"}</span><button type="button" disabled={!nextView || drawing || loading || !!error} onClick={goDeeper}>{selectedPart && nextView ? `Go deeper in ${anatomyParts[selectedPart].toLowerCase()} →` : depth === 2 ? "Explore inside →" : "Go deeper →"}</button></div>
    <div className="model-selection-panel">
      <p className="eyebrow">SELECT A PART TO DISCUSS</p>
      <div className="model-part-options" role="group" aria-label="Selectable anatomy">{selectableParts[view].map((part) => <button key={part} type="button" aria-pressed={selectedPart === part} disabled={drawing || loading || !!error} className={selectedPart === part ? "active" : ""} onClick={() => selectPart(part)}>{anatomyParts[part]}</button>)}</div>
      {selectedPart ? <>
        <div className="model-selected-heading"><strong role="status">Selected: {anatomyParts[selectedPart]}</strong><button type="button" disabled={drawing || loading || !!error} onClick={() => api.current?.focus(selectedPart)}>Focus selected part</button><button type="button" disabled={drawing} onClick={() => selectPart(null)}>Clear selection</button></div>
        {!nextView && <p className="model-help">{selectedPart === "liver" || selectedPart === "smallIntestine" ? "This demo has a reference surface for this organ. An interior model is not available." : "You have reached the deepest available illustration for this part."}</p>}
        <label htmlFor="anatomy-note">Doctor note · {anatomyParts[selectedPart]}<textarea id="anatomy-note" rows={3} placeholder="What do you want to explain about this part?" value={noteDrafts[noteKey] ?? ""} onChange={(event) => { setNoteDrafts((current) => ({ ...current, [noteKey]: event.target.value })); setNoteNotice(""); }} /></label>
        <div className="drawing-tools"><button type="button" disabled={drawing || loading || !!error || !(noteDrafts[noteKey] ?? "").trim()} onClick={saveNote}>Save part note</button><span>Doctor notes only · Not translated or shared</span></div>
      </> : <p className="model-help">Click {view === "body" ? "the abdomen on the body" : "an organ or detail in the model"}, or use the part buttons. Drag to rotate without selecting.</p>}
      {noteNotice && <p className="model-help" role="status">{noteNotice}</p>}
    </div>
    {notes.length > 0 && <details className="model-notes"><summary>Saved doctor notes ({notes.length})</summary>{notes.map((note) => <article key={note.id}><strong>{anatomyParts[note.part]} <small>· {modelViews[note.view].label}</small></strong><p>{note.text}</p><div className="drawing-tools"><button type="button" disabled={drawing || loading || !!error || (note.view === "procedure" && !includeProcedure)} onClick={() => revisitNote(note)}>Return to this part</button><button type="button" onClick={() => onRemoveNote(note.id)}>Remove note</button></div>{note.view === "procedure" && !includeProcedure && <small>Enable the surgery explanation to reopen this view.</small>}</article>)}</details>}
    <div className="model-angle-controls" aria-label="Camera angle">{(["front", "side", "back"] as const).map((angle) => <button type="button" key={angle} disabled={drawing || loading || !!error} onClick={() => api.current?.angle(angle)}>{angle === "front" ? "Front" : angle === "side" ? "Side" : "Back"}</button>)}</div>
    <div className="model-controls" aria-label="Model controls">
      <button type="button" disabled={drawing || loading || !!error} onClick={() => api.current?.rotate(-Math.PI / 8)}>↶ Rotate</button><button type="button" disabled={drawing || loading || !!error} onClick={() => api.current?.rotate(Math.PI / 8)}>Rotate ↷</button><button type="button" disabled={drawing || loading || !!error} aria-label="Zoom in" onClick={() => api.current?.zoom(.85)}>＋</button><button type="button" disabled={drawing || loading || !!error} aria-label="Zoom out" onClick={() => api.current?.zoom(1.18)}>−</button><button type="button" disabled={drawing || loading || !!error} onClick={() => changeView(view)}>Reset view</button>
    </div>
    {view === "layers" && <div className="layer-legend">{[["Inner lining", palette.mucosa], ["Supporting tissue", palette.submucosa], ["Muscle", palette.muscle], ["Outer covering", palette.outer]].map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>}
    {view === "abdomen" && <div className="layer-legend">{[["Colon", "#d78691"], ["Sigmoid region", "#b02f52"], ["Small intestine", "#e7bf9b"], ["Liver", "#bb8070"]].map(([label, color]) => <span key={label}><i style={{ background: color }} />{label}</span>)}</div>}
    <p className="model-description">{modelViews[view].description}</p>
    <div className="drawing-tools"><button type="button" className={drawing ? "active" : ""} disabled={loading || !!error} onClick={() => { setDrawing(!drawing); api.current?.enable(drawing); setSaved(false); }}> {drawing ? "Cancel drawing" : "Draw on this view"}</button>{drawing && <><button type="button" disabled={strokes.current.length === 0} onClick={() => { strokes.current.pop(); setStrokeVersion((value) => value + 1); }}>Undo</button><button type="button" disabled={strokes.current.length === 0} onClick={save}>Save drawing</button></>}{saved && <span role="status">Drawing saved to the draft.</span>}</div>
    <p className="model-attribution">Reference anatomy: <a href="https://doi.org/10.48539/HBM352.BTSQ.586" target="_blank" rel="noreferrer">Human Reference Atlas / HuBMAP</a> · <a href={`${import.meta.env.BASE_URL}models/ATTRIBUTION.md`} target="_blank" rel="noreferrer">CC BY 4.0 · Asset credits</a></p>
    <p className="model-help">{drawing ? "The camera is locked while drawing. Save your marks with this angle." : "Click to select a part · Drag to rotate · Scroll to zoom · Part buttons support keyboard selection. Drawings save the current angle."}</p>
  </div>;
}
