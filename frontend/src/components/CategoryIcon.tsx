import { Droplets, Construction, Trash2, Lightbulb, CircleHelp } from "lucide-react";
import type { IssueCategory } from "../types/issue";

const CATEGORY_META: Record<IssueCategory, { label: string; icon: typeof Droplets; classes: string }> = {
  sewage: { label: "Sewage", icon: Droplets, classes: "text-cyan-300 bg-cyan-500/15" },
  water: { label: "Water supply", icon: Droplets, classes: "text-blue-300 bg-blue-500/15" },
  pothole: { label: "Pothole", icon: Construction, classes: "text-amber-300 bg-amber-500/15" },
  garbage: { label: "Garbage", icon: Trash2, classes: "text-lime-300 bg-lime-500/15" },
  streetlight: { label: "Streetlight", icon: Lightbulb, classes: "text-yellow-300 bg-yellow-500/15" },
  other: { label: "Other", icon: CircleHelp, classes: "text-slate-300 bg-slate-500/15" },
};

export function categoryLabel(category: IssueCategory): string {
  return CATEGORY_META[category].label;
}

export function CategoryIcon({ category, size = 18 }: { category: IssueCategory; size?: number }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg p-2 ${meta.classes}`}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}

export function CategoryBadge({ category }: { category: IssueCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.classes}`}>
      <meta.icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
