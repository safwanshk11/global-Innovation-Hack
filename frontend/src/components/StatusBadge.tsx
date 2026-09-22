import type { IssueStatus } from "../types/issue";

const STATUS_META: Record<IssueStatus, { label: string; classes: string }> = {
  open: { label: "Open", classes: "bg-slate-400/10 text-slate-300 border-transparent" },
  in_progress: { label: "In progress", classes: "bg-indigo-400/10 text-indigo-300 border-transparent" },
  resolved: { label: "Resolved", classes: "bg-emerald-400/10 text-emerald-400 border-transparent" },
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.classes}`}>
      {meta.label}
    </span>
  );
}
