interface PriorityBadgeProps {
  score: number;
}

function tierFor(score: number): { label: string; classes: string } {
  if (score >= 90) return { label: "Critical priority", classes: "bg-red-400/10 text-red-400 border-transparent" };
  if (score >= 65) return { label: "High priority", classes: "bg-orange-400/10 text-orange-400 border-transparent" };
  if (score >= 40) return { label: "Medium priority", classes: "bg-yellow-400/10 text-yellow-400 border-transparent" };
  return { label: "Low priority", classes: "bg-slate-400/10 text-slate-400 border-transparent" };
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
