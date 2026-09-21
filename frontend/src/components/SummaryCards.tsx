import { AlertTriangle, ListChecks, Users, Clock } from "lucide-react";
import type { IssueWithPriority } from "../types/issue";

interface SummaryCardsProps {
  issues: IssueWithPriority[];
}

export function SummaryCards({ issues }: SummaryCardsProps) {
  const openIssues = issues.filter((i) => i.status !== "resolved");
  const criticalCount = openIssues.filter((i) => i.priorityScore >= 90).length;
  const totalCorroboration = openIssues.reduce((sum, i) => sum + i.corroborationCount, 0);
  const avgDaysOpen = openIssues.length
    ? Math.round(openIssues.reduce((sum, i) => sum + i.daysOpen, 0) / openIssues.length)
    : 0;

  const cards = [
    { label: "Open issues", value: openIssues.length, icon: ListChecks, classes: "text-indigo-300 bg-indigo-500/15" },
    { label: "Critical priority", value: criticalCount, icon: AlertTriangle, classes: "text-red-300 bg-red-500/15" },
    { label: "Reports corroborating open issues", value: totalCorroboration, icon: Users, classes: "text-cyan-300 bg-cyan-500/15" },
    { label: "Avg. days open", value: avgDaysOpen, icon: Clock, classes: "text-amber-300 bg-amber-500/15" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-navy-600 bg-navy-800 p-4">
          <span className={`inline-flex items-center justify-center rounded-lg p-2 ${card.classes}`}>
            <card.icon size={18} aria-hidden="true" />
          </span>
          <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
          <p className="text-xs text-slate-400">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
