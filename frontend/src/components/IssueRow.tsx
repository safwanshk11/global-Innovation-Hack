import { Link } from "react-router-dom";
import { Users, MapPin } from "lucide-react";
import type { IssueWithPriority } from "../types/issue";
import { CategoryIcon } from "./CategoryIcon";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

export function IssueRow({ issue }: { issue: IssueWithPriority }) {
  return (
    <Link
      to={`/dashboard/issues/${issue.id}`}
      className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-navy-800 bg-navy-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/50 hover:bg-navy-800 hover:shadow-lg active:translate-y-0 active:scale-[0.99] focus-visible:border-teal-500"
    >
      <span className="absolute inset-y-0 left-0 w-0 bg-teal-500 transition-all duration-300 group-hover:w-1" aria-hidden="true" />
      <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
        <CategoryIcon category={issue.category} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="truncate text-base font-bold text-white group-hover:text-teal-400 transition-colors">{issue.title}</h3>
          <StatusBadge status={issue.status} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <MapPin size={14} aria-hidden="true" />
          {issue.location.address}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Users size={14} aria-hidden="true" />
          {issue.corroborationCount} corroborations <span className="opacity-50">|</span> ~{issue.estimatedAffectedPopulation} affected
        </p>
      </div>
      <PriorityBadge score={issue.priorityScore} />
    </Link>
  );
}
