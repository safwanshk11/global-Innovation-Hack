import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, MapPin, Clock, Languages, Lock, SearchX } from "lucide-react";
import { getSampleIssueById } from "../../data/sampleIssues";
import { CategoryBadge } from "../../components/CategoryIcon";
import { StatusBadge } from "../../components/StatusBadge";
import { PriorityBadge } from "../../components/PriorityBadge";
import { IssueMap } from "../../components/IssueMap";
import { BrandLogo } from "../../components/BrandLogo";

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const issue = id ? getSampleIssueById(id) : undefined;

  if (!issue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-4 text-slate-100">
        <div className="animate-scale-in flex flex-col items-center gap-4 rounded-2xl border border-navy-800 bg-navy-900 p-10 text-center shadow-xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-slate-500">
            <SearchX size={26} aria-hidden="true" />
          </span>
          <p className="text-lg font-bold text-white">Signal not found</p>
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
          <Stat icon={Users} accent="text-cyan-400 bg-cyan-500/10 border-cyan-500/20" label="Corroborating reports" value={issue.corroborationCount.toString()} delay={60} />
          <Stat icon={Users} accent="text-cyan-400 bg-cyan-500/10 border-cyan-500/20" label="Est. affected pop." value={`~${issue.estimatedAffectedPopulation}`} delay={110} />
          <Stat icon={Clock} accent="text-amber-400 bg-amber-500/10 border-amber-500/20" label="Days open" value={issue.daysOpen.toString()} delay={160} />
          <Stat icon={Languages} accent="text-teal-400 bg-teal-500/10 border-teal-500/20" label="Reported in" value={issue.reportedLanguages.join(", ")} delay={210} />
        </dl>

        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-300 bg-navy-900 p-4 rounded-xl border border-navy-800 shadow-sm">
          <MapPin size={18} className="text-teal-500" aria-hidden="true" />
          {issue.location.address}
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
