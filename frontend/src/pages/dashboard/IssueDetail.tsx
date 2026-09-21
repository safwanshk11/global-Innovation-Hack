import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, MapPin, Clock, Languages } from "lucide-react";
import { getSampleIssueById } from "../../data/sampleIssues";
import { CategoryBadge } from "../../components/CategoryIcon";
import { StatusBadge } from "../../components/StatusBadge";
import { PriorityBadge } from "../../components/PriorityBadge";
import { IssueMap } from "../../components/IssueMap";

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const issue = id ? getSampleIssueById(id) : undefined;

  if (!issue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 text-slate-100">
        <p className="text-lg font-medium">Issue not found</p>
        <Link to="/dashboard" className="text-sm text-indigo-300 underline-offset-2 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <header className="border-b border-navy-700 bg-navy-900 px-4 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-full p-2 text-slate-400 hover:bg-navy-700 hover:text-white"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-semibold text-white">Issue details</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={issue.category} />
          <StatusBadge status={issue.status} />
          <PriorityBadge score={issue.priorityScore} />
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-white">{issue.title}</h2>
        <p className="mt-2 text-sm text-slate-300">{issue.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Users} label="Corroborating reports" value={issue.corroborationCount.toString()} />
          <Stat icon={Users} label="Est. affected population" value={`~${issue.estimatedAffectedPopulation}`} />
          <Stat icon={Clock} label="Days open" value={issue.daysOpen.toString()} />
          <Stat icon={Languages} label="Reported in" value={issue.reportedLanguages.join(", ")} />
        </dl>

        <div className="mt-6 flex items-center gap-1.5 text-sm text-slate-400">
          <MapPin size={14} aria-hidden="true" />
          {issue.location.address}
        </div>

        <div className="mt-4 h-72">
          <IssueMap issues={[issue]} />
        </div>

        <div className="mt-6 rounded-xl border border-navy-600 bg-navy-800 p-4 text-sm text-slate-400">
          Closure actions and evidence verification are not implemented in this preview.
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-600 bg-navy-800 p-3">
      <Icon size={16} className="text-indigo-300" aria-hidden="true" />
      <dd className="mt-2 text-sm font-semibold text-white">{value}</dd>
      <dt className="text-xs text-slate-400">{label}</dt>
    </div>
  );
}
