import { ChevronDown } from "lucide-react";
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 bg-navy-900 p-4 rounded-xl border border-navy-800 shadow-sm transition-colors duration-200 hover:border-navy-700">
      <div className="flex flex-col gap-2 flex-1">
        <label htmlFor="category-filter" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Category
        </label>
        <div className="relative">
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as IssueCategory | "all")}
            className="w-full appearance-none rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 pr-9 text-sm font-medium text-white shadow-inner outline-none transition-all duration-200 hover:border-navy-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <label htmlFor="status-filter" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Status
        </label>
        <div className="relative">
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as IssueStatus | "all")}
            className="w-full appearance-none rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 pr-9 text-sm font-medium text-white shadow-inner outline-none transition-all duration-200 hover:border-navy-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
