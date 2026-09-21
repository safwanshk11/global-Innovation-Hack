import { Link } from "react-router-dom";
import { Mic, LayoutDashboard, ShieldCheck, Languages, Users } from "lucide-react";

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-4 py-16 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            CivicPulse
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Speak your civic complaint. We group it with everyone else reporting the same
            problem, so the issues affecting the most people rise to the top.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <Link
            to="/report"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-sky-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white">
              <Mic size={26} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-slate-900">Report an issue</span>
            <span className="text-sm text-slate-500">
              Record a voice note, attach a photo, share your location — no typing required.
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
              <LayoutDashboard size={26} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-slate-900">Staff dashboard</span>
            <span className="text-sm text-slate-500">
              Explore the ranked action queue and map staff use to triage issues.
            </span>
          </Link>
        </div>

        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          <Feature
            icon={Languages}
            title="Any language, no form"
            body="Voice-first intake removes the literacy and language filter that decides whose problems get logged."
          />
          <Feature
            icon={Users}
            title="Duplicates become evidence"
            body="Repeat reports of the same issue raise its priority instead of getting lost as separate tickets."
          />
          <Feature
            icon={ShieldCheck}
            title="Evidence-gated closure"
            body="Issues close only once a matching photo confirms the problem was actually fixed."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Languages;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
      <Icon size={20} className="text-sky-600" aria-hidden="true" />
      <h2 className="mt-2 text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  );
}
