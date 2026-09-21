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
      className="flex items-start gap-3 rounded-xl border border-navy-600 bg-navy-800 p-4 transition hover:border-indigo-400/60 hover:bg-navy-700 focus-visible:border-indigo-400"
    >
      <CategoryIcon category={issue.category} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium text-white">{issue.title}</h3>
          <StatusBadge status={issue.status} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={12} aria-hidden="true" />
          {issue.location.address}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <Users size={12} aria-hidden="true" />
          {issue.corroborationCount} corroborating reports · ~{issue.estimatedAffectedPopulation} people affected
        </p>
      </div>
      <PriorityBadge score={issue.priorityScore} />
    </Link>
  );
}
