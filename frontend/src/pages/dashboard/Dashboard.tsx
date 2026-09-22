import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Home, FilterX } from "lucide-react";
import { SAMPLE_ISSUES } from "../../data/sampleIssues";
import type { IssueCategory, IssueStatus } from "../../types/issue";
import { SummaryCards } from "../../components/SummaryCards";
import { FilterBar } from "../../components/FilterBar";
import { IssueRow } from "../../components/IssueRow";
import { IssueMap } from "../../components/IssueMap";
import { BrandLogo } from "../../components/BrandLogo";

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

  const hasActiveFilters = category !== "all" || status !== "all";

  function clearFilters() {
    setCategory("all");
    setStatus("all");
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <header className="glass-nav sticky top-0 z-20 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="icon-btn flex h-10 w-10 text-slate-400 hover:bg-navy-800 hover:text-white active:bg-navy-700"
              aria-label="Back to home"
            >
              <Home size={20} />
            </Link>
            <div className="h-6 w-px bg-navy-700"></div>
            <BrandLogo variant="dark" className="scale-75 origin-left" />
            <div className="h-6 w-px bg-navy-700 hidden sm:block"></div>
            <div className="hidden sm:block">
              <h1 className="flex items-center gap-2 text-sm font-bold text-white tracking-wide">
                STAFF COMMAND CENTER
                <span className="rounded-md border border-navy-700 bg-navy-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-teal-400">
                  Example data
                </span>
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 motion-safe:animate-pulse" aria-hidden="true" />
              Active Region
            </p>
            <p className="text-sm font-bold text-teal-400">Ward 7, Rivermill</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="animate-fade-up">
          <SummaryCards issues={SAMPLE_ISSUES} />
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 lg:max-w-md">
            <div className="mb-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
              <FilterBar
                selectedCategory={category}
                selectedStatus={status}
                onCategoryChange={setCategory}
                onStatusChange={setStatus}
              />
            </div>
            <div className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
              {filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-navy-800 bg-navy-900 p-8 text-center shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-slate-500">
                    <FilterX size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-300">No signals match the current filters</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Try widening your category or status selection.</p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-1 rounded-full border border-navy-700 bg-navy-800 px-4 py-2 text-xs font-bold text-teal-400 transition-all duration-200 hover:border-teal-500/40 hover:bg-navy-700 active:scale-95"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredIssues.map((issue, i) => (
                  <div key={issue.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                    <IssueRow issue={issue} />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="flex-1 animate-fade-up lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]" style={{ animationDelay: "100ms" }}>
            <IssueMap issues={filteredIssues} />
          </section>
        </div>
      </main>
    </div>
  );
}
