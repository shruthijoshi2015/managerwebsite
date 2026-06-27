"use client";
import React, { useState, useEffect } from "react";
import {
  X, TrendingUp, AlertTriangle, MessageSquare, HelpCircle,
  ListChecks, UserCheck, Copy, Check, Loader2, Sparkles,
  ChevronRight, Trophy, ClipboardList,
} from "lucide-react";

type PrepBrief = {
  snapshot: {
    summary: string;
    goalsMoved: string[];
    tasksCompleted: string;
    keyWin: string | null;
  };
  risks: { title: string; detail: string; severity: string }[];
  unresolvedTopics: string[];
  suggestedQuestions: string[];
  talkingPoints: string[];
  managerActions: string[];
};

type Props = {
  reporteeId: number;
  reporteeName: string;
  onClose: () => void;
};

function SectionCard({
  icon, title, color, delay, children,
}: {
  icon: React.ReactNode; title: string; color: string; delay: number; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both", animationDuration: "400ms" }}
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 ${color}`}>
        {icon}
        <span className="text-[12px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const c = severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-400" : "bg-emerald-500";
  return <span className={`w-2 h-2 rounded-full ${c} shrink-0 mt-1`} />;
}

// Shimmer loading skeleton
function Skeleton() {
  return (
    <div className="space-y-4 p-5 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="h-10 bg-slate-100" />
          <div className="p-4 space-y-2.5">
            <div className="h-3 bg-slate-100 rounded-full w-full" />
            <div className="h-3 bg-slate-100 rounded-full w-4/5" />
            <div className="h-3 bg-slate-100 rounded-full w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrepBriefPanel({ reporteeId, reporteeName, onClose }: Props) {
  const [brief, setBrief] = useState<PrepBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchBrief() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-prep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reporteeId }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to generate brief");
        }
        const data = await res.json();
        if (!cancelled) setBrief(data.brief);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBrief();
    return () => { cancelled = true; };
  }, [reporteeId]);

  const copyBrief = () => {
    if (!brief) return;
    const text = [
      `1:1 PREP BRIEF — ${reporteeName}`,
      `Generated ${new Date().toLocaleDateString()}`,
      "",
      "── SNAPSHOT ──",
      brief.snapshot.summary,
      ...(brief.snapshot.goalsMoved.length > 0 ? ["Goals:", ...brief.snapshot.goalsMoved.map((g) => `  • ${g}`)] : []),
      brief.snapshot.tasksCompleted,
      ...(brief.snapshot.keyWin ? [`🏆 Key Win: ${brief.snapshot.keyWin}`] : []),
      "",
      "── RISKS & ATTENTION ──",
      ...brief.risks.map((r) => `[${r.severity.toUpperCase()}] ${r.title}\n   ${r.detail}`),
      "",
      "── UNRESOLVED TOPICS ──",
      ...brief.unresolvedTopics.map((t) => `  • ${t}`),
      "",
      "── SUGGESTED QUESTIONS ──",
      ...brief.suggestedQuestions.map((q, i) => `  ${i + 1}. ${q}`),
      "",
      "── TALKING POINTS ──",
      ...brief.talkingPoints.map((p) => `  • ${p}`),
      "",
      "── YOUR PENDING ACTIONS ──",
      ...brief.managerActions.map((a) => `  ☐ ${a}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-lg bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">1:1 Prep Brief</h2>
              <p className="text-[12px] text-slate-500">{reporteeName} · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {brief && (
              <button
                onClick={copyBrief}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy brief</>}
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && <Skeleton />}

          {error && (
            <div className="p-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Failed to generate brief</p>
                  <p className="text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {brief && !loading && (
            <div className="p-5 space-y-4">
              {/* Snapshot */}
              <SectionCard
                icon={<TrendingUp className="w-4 h-4" />}
                title="Snapshot"
                color="bg-indigo-50 text-indigo-700"
                delay={0}
              >
                <p className="text-[13px] text-slate-700 leading-relaxed mb-3">{brief.snapshot.summary}</p>

                {brief.snapshot.goalsMoved.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Goals Progress</p>
                    <div className="space-y-1">
                      {brief.snapshot.goalsMoved.map((g, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-slate-600">
                          <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[12px]">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <ListChecks className="w-3.5 h-3.5" />
                    {brief.snapshot.tasksCompleted}
                  </span>
                  {brief.snapshot.keyWin && (
                    <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <Trophy className="w-3.5 h-3.5" />
                      {brief.snapshot.keyWin}
                    </span>
                  )}
                </div>
              </SectionCard>

              {/* Risks */}
              <SectionCard
                icon={<AlertTriangle className="w-4 h-4" />}
                title={`Risks & Attention (${brief.risks.length})`}
                color="bg-amber-50 text-amber-700"
                delay={80}
              >
                <div className="space-y-3">
                  {brief.risks.map((r, i) => (
                    <div key={i} className="flex gap-2.5">
                      <SeverityDot severity={r.severity} />
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{r.title}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{r.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Unresolved Topics */}
              <SectionCard
                icon={<MessageSquare className="w-4 h-4" />}
                title="Unresolved Topics"
                color="bg-rose-50 text-rose-700"
                delay={160}
              >
                <ul className="space-y-2">
                  {brief.unresolvedTopics.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Suggested Questions */}
              <SectionCard
                icon={<HelpCircle className="w-4 h-4" />}
                title="Suggested Questions"
                color="bg-sky-50 text-sky-700"
                delay={240}
              >
                <div className="space-y-2.5">
                  {brief.suggestedQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span className="italic leading-relaxed">&ldquo;{q}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Talking Points */}
              <SectionCard
                icon={<ClipboardList className="w-4 h-4" />}
                title="Talking Points"
                color="bg-emerald-50 text-emerald-700"
                delay={320}
              >
                <ul className="space-y-2">
                  {brief.talkingPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Manager Actions */}
              <SectionCard
                icon={<UserCheck className="w-4 h-4" />}
                title="Your Pending Actions"
                color="bg-violet-50 text-violet-700"
                delay={400}
              >
                <ul className="space-y-2">
                  {brief.managerActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <div className="w-4 h-4 border-2 border-violet-300 rounded mt-0.5 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Footer */}
              <div className="text-center pt-2 pb-4">
                <p className="text-[11px] text-slate-400">
                  <Sparkles className="w-3 h-3 inline-block mr-1" />
                  Generated by AI · Based on goals, tasks, and notes data
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
