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
    { label: "Active signals", value: openIssues.length, icon: ListChecks, classes: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
    { label: "Critical priority", value: criticalCount, icon: AlertTriangle, classes: "text-red-400 bg-red-500/10 border-red-500/20" },
    { label: "Total corroborations", value: totalCorroboration, icon: Users, classes: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { label: "Avg. days open", value: avgDaysOpen, icon: Clock, classes: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="card-hover group flex flex-col gap-2 rounded-xl border border-navy-800 bg-navy-900 p-5 shadow-lg animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center rounded-lg p-2 border transition-transform duration-200 group-hover:scale-110 ${card.classes}`}>
              <card.icon size={16} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-extrabold text-white tracking-tight">{card.value}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
