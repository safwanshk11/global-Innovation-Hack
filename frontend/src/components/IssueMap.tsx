import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import type { IssueWithPriority } from "../types/issue";
import { MapErrorBoundary } from "./MapErrorBoundary";
import { categoryLabel } from "./CategoryIcon";

interface IssueMapProps {
  issues: IssueWithPriority[];
}

function colorForScore(score: number): string {
  if (score >= 90) return "#f87171";
  if (score >= 65) return "#fb923c";
  if (score >= 40) return "#facc15";
  return "#94a3b8";
}

export function IssueMap({ issues }: IssueMapProps) {
  const navigate = useNavigate();

  if (issues.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-navy-600 bg-navy-800 text-sm text-slate-400">
        No issues match the current filters.
      </div>
    );
  }

  const center: [number, number] = [issues[0].location.lat, issues[0].location.lng];

  return (
    <MapErrorBoundary>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full min-h-[280px] w-full rounded-xl"
        aria-label="Map of open civic issues, colored by priority"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issues.map((issue) => (
          <CircleMarker
            key={issue.id}
            center={[issue.location.lat, issue.location.lng]}
            radius={8 + Math.min(issue.priorityScore / 15, 10)}
            pathOptions={{ color: colorForScore(issue.priorityScore), fillColor: colorForScore(issue.priorityScore), fillOpacity: 0.6 }}
            eventHandlers={{
              click: () => navigate(`/dashboard/issues/${issue.id}`),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{issue.title}</p>
                <p className="text-xs text-slate-600">
                  {categoryLabel(issue.category)} · Priority {issue.priorityScore}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </MapErrorBoundary>
  );
}
