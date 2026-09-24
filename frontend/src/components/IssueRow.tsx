import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { IssueWithPriority } from "../types/issue";
import { CategoryIcon } from "./CategoryIcon";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

export function IssueRow({ issue, selected, onSelect }: { issue: IssueWithPriority; selected: boolean; onSelect: () => void }) {
  return <article className={`rounded-xl border bg-navy-900 p-4 shadow-sm transition-colors ${selected ? "border-teal-400 ring-1 ring-teal-400" : "border-navy-800 hover:border-teal-500/50"}`}>
    <button onClick={onSelect} aria-pressed={selected} aria-label={`Select ${issue.title} on map`} className="flex w-full items-start gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-teal-400">
      <span className="shrink-0"><CategoryIcon category={issue.category} /></span>
      <span className="min-w-0 flex-1"><span className="block font-bold text-white">{issue.title}</span><span className="mt-2 block"><StatusBadge status={issue.status} /></span></span>
    </button>
    <p className="mt-3 flex gap-2 text-xs text-slate-400"><MapPin size={14} className="shrink-0" />{issue.location.address ?? "Reported location"}</p>
    <p className="mt-2 text-xs text-slate-400">{issue.corroborationCount} linked {issue.corroborationCount === 1 ? "report" : "reports"} · Population: {issue.estimatedAffectedPopulation === null ? "Not estimated" : `~${issue.estimatedAffectedPopulation}`}</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><PriorityBadge score={issue.priorityScore} /><Link className="text-sm font-semibold text-teal-400 underline underline-offset-4" to={`/dashboard/issues/${issue.id}`}>View details</Link></div>
  </article>;
}
