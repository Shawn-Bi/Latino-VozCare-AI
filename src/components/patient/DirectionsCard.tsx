import { useState } from "react";
import type { PatientPacketView } from "../../lib/vozcare-api";
import type { Language } from "../../workflow";

// Directions from the saved address (or, on request, the device location) to the saved hospital.
export default function DirectionsCard({ p, language, missing }: { p: PatientPacketView; language: Language; missing: string }) {
  const es = language === "es";
  const a = p.appointment;
  const destination = [a.hospital, a.address].filter(Boolean).join(", ");
  const exampleRoute = /example|demo|fictional|sample|ficticia|ejemplo/i.test(`${p.startingAddress} ${destination}`);
  const [coords, setCoords] = useState("");
  const [locState, setLocState] = useState<"idle" | "asking" | "denied">("idle");
  const origin = coords || p.startingAddress;
  const q = `saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}`;
  const canMap = !exampleRoute && !!destination;

  const useLocation = () => {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(`${pos.coords.latitude},${pos.coords.longitude}`); setLocState("idle"); },
      () => setLocState("denied"),
      { timeout: 15000 },
    );
  };

  return <section className="pv-card" aria-labelledby="d-route">
    <h2 id="d-route">{es ? "Cómo llegar" : "Getting there"}</h2>
    <dl className="pv-dl">
      <dt>{es ? "Sales desde" : "Starting from"}</dt><dd>{coords ? (es ? "Tu ubicación actual" : "Your current location") : p.startingAddress || missing}</dd>
      <dt>{es ? "Lugar de la cita" : "Appointment location"}</dt><dd>{destination || missing}</dd>
    </dl>
    {exampleRoute && <p className="pv-example-route" role="note">{es ? "Ruta de ejemplo: estas direcciones son ficticias, así que no mostramos indicaciones reales." : "Example route: these addresses are fictional, so real directions are not shown."}</p>}
    {canMap && <>
      <iframe className="pv-map" title={es ? "Mapa con indicaciones al hospital" : "Map with directions to the hospital"} src={`https://www.google.com/maps?${q}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <div className="pv-map-actions">
        {!coords && <button type="button" className="button secondary" disabled={locState === "asking"} onClick={useLocation}>{locState === "asking" ? (es ? "Buscando tu ubicación…" : "Finding your location…") : (es ? "Usar mi ubicación actual" : "Use my current location")}</button>}
        <a className="button secondary" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer">{es ? "Abrir en Google Maps" : "Open in Google Maps"}</a>
      </div>
      {locState === "denied" && <p className="pv-meta" role="status">{es ? "No pudimos usar tu ubicación. Mostramos la ruta desde tu dirección guardada." : "We couldn't use your location. Showing the route from your saved address."}</p>}
    </>}
  </section>;
}