interface PriorityBadgeProps {
  score: number;
}

function tierFor(score: number): { label: string; classes: string } {
  if (score >= 90) return { label: "Critical priority", classes: "bg-red-500/15 text-red-300 border-red-500/40" };
  if (score >= 65) return { label: "High priority", classes: "bg-orange-500/15 text-orange-300 border-orange-500/40" };
  if (score >= 40) return { label: "Medium priority", classes: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" };
  return { label: "Low priority", classes: "bg-slate-500/15 text-slate-300 border-slate-500/40" };
}

export function PriorityBadge({ score }: PriorityBadgeProps) {
  const tier = tierFor(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tier.classes}`}
    >
      {tier.label}
      <span className="opacity-70">·{score}</span>
    </span>
  );
}
