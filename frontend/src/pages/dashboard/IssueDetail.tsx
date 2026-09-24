import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, MapPin, Clock, Languages, Lock, SearchX } from "lucide-react";
import { getIssue } from "../../lib/api";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { CategoryBadge } from "../../components/CategoryIcon";
import { StatusBadge } from "../../components/StatusBadge";
import { PriorityBadge } from "../../components/PriorityBadge";
import { IssueMap } from "../../components/IssueMap";
import { BrandLogo } from "../../components/BrandLogo";

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, error, loading, refresh } = useLiveQuery(id ?? "", signal => getIssue(id ?? "", signal));

  if (!issue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-4 text-slate-100">
        <div className="animate-scale-in flex flex-col items-center gap-4 rounded-2xl border border-navy-800 bg-navy-900 p-10 text-center shadow-xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-slate-500">
            <SearchX size={26} aria-hidden="true" />
          </span>
          <p className="text-lg font-bold text-white">{loading ? "Loading issue…" : error?.status === 404 ? "Issue not found" : "Unable to load issue"}</p>
          {error && error.status !== 404 && <button onClick={refresh} className="text-teal-400 underline">Try again</button>}
          <Link to="/dashboard" className="btn-primary rounded-full px-6 py-3 text-sm">
            Return to command center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <header className="glass-nav sticky top-0 z-20 px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="icon-btn flex h-10 w-10 text-slate-400 hover:bg-navy-800 hover:text-white active:bg-navy-700"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="h-6 w-px bg-navy-700"></div>
            <BrandLogo variant="dark" className="scale-75 origin-left hidden sm:block" />
            <div className="h-6 w-px bg-navy-700 hidden sm:block"></div>
            <h1 className="text-sm font-bold text-white tracking-wide uppercase">Signal Details</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">ID</p>
            <p className="text-sm font-mono font-bold text-teal-400">{issue.id.split("-")[0]}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-3 justify-between text-xs text-slate-400">
          <p>Issue updated {new Date(issue.updatedAt).toLocaleString()}</p>
          <button className="text-teal-400 underline" disabled={loading} onClick={refresh}>Refresh issue</button>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-amber-500/30 p-4 text-sm text-amber-300">Connection interrupted. Showing the last loaded issue; its details may be out of date.</p>}
        <div className="glass-panel-dark animate-fade-up rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={issue.category} />
            <StatusBadge status={issue.status} />
            <PriorityBadge score={issue.priorityScore} />
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">{issue.title}</h2>
          <p className="mt-3 text-base text-slate-300 leading-relaxed max-w-3xl">{issue.description}</p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Users} accent="text-cyan-400 bg-cyan-500/10 border-cyan-500/20" label="Linked reports" value={issue.corroborationCount.toString()} delay={60} />
          <Stat icon={Users} accent="text-cyan-400 bg-cyan-500/10 border-cyan-500/20" label="Est. affected pop." value={issue.estimatedAffectedPopulation === null ? "Not estimated" : `~${issue.estimatedAffectedPopulation}`} delay={110} />
          <Stat icon={Clock} accent="text-amber-400 bg-amber-500/10 border-amber-500/20" label="Days open" value={issue.daysOpen.toString()} delay={160} />
          <Stat icon={Languages} accent="text-teal-400 bg-teal-500/10 border-teal-500/20" label="Reported in" value={issue.reportedLanguages.map(languageName).join(", ") || "Not recorded"} delay={210} />
        </dl>

        <p className="mt-4 text-sm text-slate-400">{issue.reportCountMeaning}</p>
        {issue.populationSource && <p className="mt-2 text-sm text-slate-400">Population source: {issue.populationSource}</p>}
        <details className="glass-panel-dark mt-6 rounded-2xl p-5 sm:p-6">
          <summary className="cursor-pointer font-bold text-teal-400">Why this priority? · {issue.priorityScore}/100</summary>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <p>Reported severity: {issue.priorityExplanation.inputs.severity}. Based on {issue.priorityExplanation.inputs.linkedReports} linked reports and {issue.priorityExplanation.inputs.ageDays.toFixed(2)} elapsed days.</p>
            <table className="w-full text-left"><caption className="sr-only">Priority components</caption><thead><tr className="border-b border-navy-700"><th className="py-2">Component</th><th>Weight</th><th className="text-right">Points</th></tr></thead><tbody>
              {Object.entries(issue.priorityExplanation.weightedPoints).map(([name, points]) => <tr key={name} className="border-b border-navy-800"><th className="py-3 capitalize font-medium">{name}</th><td>{(issue.priorityExplanation.effectiveWeights[name] * 100).toFixed(1)}%</td><td className="text-right">{points.toFixed(2)}</td></tr>)}
              <tr><th className="py-3 font-medium">Severity floor adjustment</th><td /><td className="text-right">+{issue.priorityExplanation.severityFloorAdjustment.toFixed(2)}</td></tr>
              <tr><th className="py-3 font-medium">Rounding adjustment</th><td /><td className="text-right">{issue.priorityExplanation.roundingAdjustment.toFixed(2)}</td></tr>
              <tr className="text-white"><th className="py-3">Final score</th><td /><td className="text-right font-bold">{issue.priorityExplanation.finalScore}</td></tr>
            </tbody></table>
            {issue.priorityExplanation.omittedPopulationReason && <p>{issue.priorityExplanation.omittedPopulationReason} The remaining weights are adjusted proportionally.</p>}
            <p>{issue.priorityExplanation.limitations}</p>
            <p className="text-xs text-slate-400">Calculated {new Date(issue.priorityExplanation.calculatedAt).toLocaleString()} · {issue.priorityExplanation.priorityVersion}</p>
          </div>
        </details>
        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-300 bg-navy-900 p-4 rounded-xl border border-navy-800 shadow-sm">
          <MapPin size={18} className="text-teal-500" aria-hidden="true" />
          {issue.location.address ?? "Reported location"}
        </div>

        <div className="mt-4 h-[400px] rounded-xl overflow-hidden border border-navy-800 shadow-lg">
          <IssueMap issues={[issue]} />
        </div>

        <div className="mt-10 flex flex-col items-end gap-2 border-t border-navy-800 pt-8">
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-full bg-navy-800 px-8 py-4 text-sm font-bold tracking-wide uppercase text-slate-500 cursor-not-allowed"
            title="Evidence verification required to close"
          >
            <Lock size={16} aria-hidden="true" />
            Verify and resolve signal
          </button>
          <p className="text-xs font-medium text-slate-500">Evidence verification required to close this signal.</p>
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  accent,
  label,
  value,
  delay,
}: {
  icon: typeof Users;
  accent: string;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <div
      className="card-hover group animate-fade-up flex flex-col justify-between rounded-xl border border-navy-800 bg-navy-900 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`inline-flex items-center justify-center rounded-lg border p-2 transition-transform duration-200 group-hover:scale-110 ${accent}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div>
        <dd className="text-2xl font-bold text-white tracking-tight">{value}</dd>
        <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{label}</dt>
      </div>
    </div>
  );
}

function languageName(code: string) {
  try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code; }
  catch { return code; }
}
