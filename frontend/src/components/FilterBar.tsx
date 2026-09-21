import type { IssueCategory, IssueStatus } from "../types/issue";
import { categoryLabel } from "./CategoryIcon";

const CATEGORIES: IssueCategory[] = ["sewage", "pothole", "garbage", "streetlight", "water", "other"];
const STATUSES: { value: IssueStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

interface FilterBarProps {
  selectedCategory: IssueCategory | "all";
  selectedStatus: IssueStatus | "all";
  onCategoryChange: (category: IssueCategory | "all") => void;
  onStatusChange: (status: IssueStatus | "all") => void;
}

export function FilterBar({ selectedCategory, selectedStatus, onCategoryChange, onStatusChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="category-filter" className="text-xs font-medium text-slate-400">
          Category
        </label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as IssueCategory | "all")}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-400"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="status-filter" className="text-xs font-medium text-slate-400">
          Status
        </label>
        <select
          id="status-filter"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as IssueStatus | "all")}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-400"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
