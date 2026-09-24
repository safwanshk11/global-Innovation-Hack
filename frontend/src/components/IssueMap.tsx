import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { IssueWithPriority } from "../types/issue";
import { MapErrorBoundary } from "./MapErrorBoundary";
import { categoryLabel } from "./CategoryIcon";

interface IssueMapProps { issues: IssueWithPriority[]; selectedId?: string | null; onSelect?: (id: string) => void }
function colorForScore(score: number) {
  return score >= 90 ? "#f87171" : score >= 65 ? "#fb923c" : score >= 40 ? "#facc15" : "#94a3b8";
}
function Extent({ issues, fit }: { issues: IssueWithPriority[]; fit: number }) {
  const map = useMap();
  const initial = useRef(false);
  const lastFit = useRef(fit);
  useEffect(() => {
    if (!issues.length || (initial.current && fit === lastFit.current)) return;
    map.fitBounds(issues.map(i => [i.location.lat, i.location.lng] as [number, number]), { padding: [30, 30], maxZoom: 15 });
    initial.current = true; lastFit.current = fit;
  }, [issues, fit, map]);
  return null;
}
export function IssueMap({ issues, selectedId, onSelect }: IssueMapProps) {
  const [fit, setFit] = useState(0);
  const [tileError, setTileError] = useState(false);
  return <div className="h-full min-h-[320px] flex flex-col gap-2">
    <div className="flex justify-between items-center gap-3 text-xs text-slate-400">
      <span>{issues.length ? "Markers show the displayed issues" : "No issues to show on the map"}</span>
      <button className="shrink-0 rounded-lg border border-navy-700 px-3 py-2 text-teal-400 disabled:opacity-40" disabled={!issues.length} onClick={() => setFit(v => v + 1)}>Fit issues</button>
    </div>
    {tileError && <p role="status" className="text-xs text-amber-300">Map tiles are unavailable. The issue list and details remain usable.</p>}
    <MapErrorBoundary><MapContainer center={[0, 0]} zoom={2} scrollWheelZoom={false} className="flex-1 min-h-[280px] w-full rounded-xl border border-navy-800 z-0" aria-label="Reported issues colored by priority">
      <Extent issues={issues} fit={fit} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTileError(true) }} />
      {issues.map(issue => <CircleMarker key={issue.id} center={[issue.location.lat, issue.location.lng]} radius={8 + Math.min(issue.priorityScore / 15, 10)} pathOptions={{ color: selectedId === issue.id ? "#67D7C0" : colorForScore(issue.priorityScore), weight: selectedId === issue.id ? 4 : 2, fillColor: colorForScore(issue.priorityScore), fillOpacity: 0.75 }} eventHandlers={{ click: () => onSelect?.(issue.id) }}>
        <Popup><div className="text-sm text-white"><p className="font-bold mb-1">{issue.title}</p><p className="text-xs text-teal-400">{categoryLabel(issue.category)} · Priority {issue.priorityScore}</p><Link to={`/dashboard/issues/${issue.id}`} className="underline">View issue details</Link></div></Popup>
      </CircleMarker>)}
    </MapContainer></MapErrorBoundary>
  </div>;
}
