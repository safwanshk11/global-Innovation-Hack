import { useState } from "react";
import { Link } from "react-router-dom";
import { Home, Loader2 } from "lucide-react";
import type { IssueCategory, IssueStatus } from "../../types/issue";
import { getIssues } from "../../lib/api";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { SummaryCards } from "../../components/SummaryCards";
import { FilterBar } from "../../components/FilterBar";
import { IssueRow } from "../../components/IssueRow";
import { IssueMap } from "../../components/IssueMap";
import { BrandLogo } from "../../components/BrandLogo";

export function Dashboard() {
  const [category, setCategory] = useState<IssueCategory | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, error, loading, refresh } = useLiveQuery(`${category}:${status}`, signal => getIssues(category, status, signal));
  const selected = data?.items.some(i => i.id === selectedId) ? selectedId : null;
  return <div className="min-h-screen bg-navy-950 text-slate-100 selection:bg-teal-500 selection:text-white">
    <header className="glass-nav sticky top-0 z-20 px-4 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Link to="/" className="icon-btn text-slate-400" aria-label="Back to home"><Home size={20} /></Link><BrandLogo variant="dark" className="scale-75 origin-left" /><span className="hidden sm:block text-sm font-bold tracking-wide">STAFF COMMAND CENTER</span></div>
      <p className="text-sm font-semibold text-teal-400">Reported issues</p>
    </div></header>
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap justify-between items-center gap-3"><h1 className="text-xl font-bold">Reported issues</h1><button onClick={refresh} disabled={loading} className="rounded-full border border-navy-700 px-4 py-2 text-sm text-teal-400 disabled:opacity-50">Refresh issues</button></div>
      <div role="status" aria-live="polite" className="mb-4 text-sm text-slate-400">
        {error ? <p className="rounded-xl border border-amber-500/30 p-4 text-amber-300">{data ? "Connection interrupted. Showing the last saved view; these results may be out of date." : "Unable to load reported issues. Please try refreshing."}</p> : loading && !data ? <p><Loader2 size={16} className="inline animate-spin mr-2" />Loading reported issues…</p> : data ? `Updated ${new Date(data.calculatedAt).toLocaleTimeString()}` : null}
      </div>
      {data && <SummaryCards summary={data.summary} />}
      {data?.truncated && <p className="mt-4 text-sm text-amber-300">Showing {data.items.length} of {data.totalCount} issues. The map shows these {data.items.length}; summary cards cover all filtered active issues.</p>}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <section className="flex-1 min-w-0 lg:max-w-md" aria-label="Issue queue">
          <FilterBar selectedCategory={category} selectedStatus={status} onCategoryChange={setCategory} onStatusChange={setStatus} />
          <div className="mt-4 flex flex-col gap-3">
            {data?.items.length === 0 && <div className="glass-panel-dark p-8 rounded-xl text-center"><h2 className="font-bold">No issues found</h2><p className="mt-2 text-sm text-slate-400">{category !== "all" || status !== "all" ? "Try another category or status." : "Saved reports appear here after analysis completes."}</p>{(category !== "all" || status !== "all") && <button className="mt-4 text-teal-400 underline" onClick={() => { setCategory("all"); setStatus("all"); }}>Clear filters</button>}</div>}
            {data?.items.map(issue => <IssueRow key={issue.id} issue={issue} selected={selected === issue.id} onSelect={() => setSelectedId(issue.id)} />)}
          </div>
        </section>
        <section className="flex-1 min-w-0 h-[420px] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]" aria-label="Issue map"><IssueMap issues={data?.items ?? []} selectedId={selected} onSelect={setSelectedId} /></section>
      </div>
    </main>
  </div>;
}
