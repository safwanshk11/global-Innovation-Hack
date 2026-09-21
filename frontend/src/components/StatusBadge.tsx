import type { IssueStatus } from "../types/issue";

const STATUS_META: Record<IssueStatus, { label: string; classes: string }> = {
  open: { label: "Open", classes: "bg-red-500/15 text-red-300 border-red-500/30" },
  in_progress: { label: "In progress", classes: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  resolved: { label: "Resolved", classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.classes}`}>
      {meta.label}
    </span>
  );
}
