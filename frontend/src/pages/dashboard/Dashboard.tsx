import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { SAMPLE_ISSUES } from "../../data/sampleIssues";
import type { IssueCategory, IssueStatus } from "../../types/issue";
import { SummaryCards } from "../../components/SummaryCards";
import { FilterBar } from "../../components/FilterBar";
import { IssueRow } from "../../components/IssueRow";
import { IssueMap } from "../../components/IssueMap";

export function Dashboard() {
  const [category, setCategory] = useState<IssueCategory | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");

  const filteredIssues = useMemo(() => {
    return SAMPLE_ISSUES.filter((issue) => {
      if (category !== "all" && issue.category !== category) return false;
      if (status !== "all" && issue.status !== status) return false;
      return true;
    });
  }, [category, status]);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <header className="border-b border-navy-700 bg-navy-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            to="/"
            className="rounded-full p-2 text-slate-400 hover:bg-navy-700 hover:text-white"
            aria-label="Back to home"
          >
            <Home size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">Staff action queue</h1>
            <p className="text-xs text-slate-400">Ward 7, Rivermill District</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <SummaryCards issues={SAMPLE_ISSUES} />

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 lg:max-w-md">
            <div className="mb-4">
              <FilterBar
                selectedCategory={category}
                selectedStatus={status}
                onCategoryChange={setCategory}
                onStatusChange={setStatus}
              />
            </div>
            <div className="flex flex-col gap-3">
              {filteredIssues.length === 0 ? (
                <p className="rounded-xl border border-navy-600 bg-navy-800 p-4 text-sm text-slate-400">
                  No issues match the current filters.
                </p>
              ) : (
                filteredIssues.map((issue) => <IssueRow key={issue.id} issue={issue} />)
              )}
            </div>
          </section>

          <section className="flex-1 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
            <IssueMap issues={filteredIssues} />
          </section>
        </div>
      </main>
    </div>
  );
}
