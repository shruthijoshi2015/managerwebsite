"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Reportee } from "@/lib/db";
import { designateManagerRole } from "@/lib/actions";
import { PrepBriefPanel } from "./PrepBriefPanel";
import { DailyDigestBanner } from "./DailyDigestBanner";
import { WeeklyReviewPanel } from "./WeeklyReviewPanel";
import { SentimentTrendPanel } from "./SentimentTrendPanel";
import { SkillMatrixPanel } from "./SkillMatrixPanel";
import { RiskRadarPanel } from "./RiskRadarPanel";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, CheckSquare, CalendarDays, Zap, Users, AlertTriangle,
  TrendingUp, BarChart2, Clock, MessageSquare, Trophy,
  Smile, Building2, Activity, GripVertical, Plus, X, RotateCcw,
  Star, Flame, Timer, CheckCircle2, Calendar, Hourglass,
  PartyPopper, Shuffle, AlertCircle, Check, LayoutGrid,
  ArrowUpRight, Sparkles, Brain, ShieldAlert, ChevronDown
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Size = "sm" | "md" | "lg";
type TabId = "me" | "team";

interface WidgetInstance {
  instanceId: string;
  widgetId: string;
  size: Size;
}

interface WidgetDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  category: "productivity" | "performance" | "team" | "awareness";
  defaultSize: Size;
}

// ─── Utility ─────────────────────────────────────────────────────────────────
let _counter = 0;
function uid() { return `w${++_counter}`; }
function mkW(widgetId: string, size: Size): WidgetInstance {
  return { instanceId: uid(), widgetId, size };
}
const CS: Record<Size, string> = { sm: "col-span-1", md: "col-span-2", lg: "col-span-4" };

// ─── Static Data ──────────────────────────────────────────────────────────────
const ME_GOALS: any[] = [];
const ME_TASKS: any[] = [];
const MEETINGS_1ON1: any[] = [];
const OKR_DATA: any[] = [];
const BLOCKERS: any[] = [];
const FEEDBACK: any[] = [];
const KUDOS_WALL: any[] = [];
const TIME_ALLOC: any[] = [];
const COMPANY_UPDATES: any[] = [];
const WAITING_ON_ME: any[] = [];
const LEADERBOARD: any[] = [];

// Pre-computed heatmap data (empty when no data)
const HEATMAP = Array.from({ length: 12 }, () =>
  Array.from({ length: 5 }, () => 0)
);

// ─── Shared Sub-Components ────────────────────────────────────────────────────
function Av({ initials, color, textColor, size = "md" }: { initials: string; color: string; textColor: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[12px]";
  return (
    <div className={`${s} rounded-full flex items-center justify-center font-semibold shrink-0`} style={{ backgroundColor: color, color: textColor }}>
      {initials}
    </div>
  );
}

function Hdr({ icon, label, count, actionUrl, actionLabel }: { icon: React.ReactNode; label: string; count?: number; actionUrl?: string; actionLabel?: string }) {
  return (
    <div className="flex items-center mb-4">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-slate-400 shrink-0">{icon}</span>
        <span className="text-[11px] font-semibold text-slate-500 tracking-[0.08em] uppercase">{label}</span>
        {count !== undefined && <span className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 leading-none">{count}</span>}
      </div>
      {actionUrl && actionLabel && (
        <Link href={actionUrl} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function Empty({ emoji, title, sub, cta }: { emoji: string; title: string; sub: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="text-[14px] font-semibold text-slate-700 mb-1">{title}</div>
      <div className="text-[12px] text-slate-400 mb-5 max-w-[200px] leading-relaxed">{sub}</div>
      {cta && (
        <button onClick={cta.onClick} className="px-4 py-1.5 rounded-lg border border-slate-300 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          {cta.label}
        </button>
      )}
    </div>
  );
}

function StatTile({ label, val, subEl, amber }: { label: string; val: React.ReactNode; subEl?: React.ReactNode; amber?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-slate-500 mb-1">{label}</div>
      <div className={`text-[30px] font-bold leading-none mb-2 ${amber ? "text-amber-600" : "text-slate-900"}`}>{val}</div>
      {subEl}
    </div>
  );
}

function initials(name: string) { return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(); }

// ─── ME TAB WIDGETS ───────────────────────────────────────────────────────────

function MeFocusBanner() {
  const atRisk = ME_GOALS.filter(g => g.progress < 60).length;
  const urgent = ME_TASKS.filter(t => !t.done && t.urgent).length;
  const allClear = atRisk === 0 && urgent === 0;

  if (allClear) {
    return (
      <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg,#fefce8,#fef9c3)" }}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div>
            <div className="text-[11px] font-semibold text-amber-700 tracking-[0.1em] uppercase mb-1">ALL CLEAR</div>
            <div className="text-[15px] font-semibold text-slate-800">No urgent items today. Great time to plan ahead or take a breather.</div>
          </div>
        </div>
      </div>
    );
  }

  const parts: string[] = [];
  if (urgent) parts.push(`${urgent} task${urgent > 1 ? "s" : ""} due this week`);
  if (MEETINGS_1ON1.length) parts.push(`${MEETINGS_1ON1.length} 1:1s scheduled`);
  if (atRisk) parts.push(`${atRisk} goal${atRisk > 1 ? "s" : ""} at risk`);
  if (parts.length === 0) parts.push("No urgent tasks or meetings");

  return (
    <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff 60%,#ede9fe)" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold text-indigo-600 tracking-[0.1em] uppercase mb-1">YOUR FOCUS TODAY</div>
          <div className="text-[15px] font-bold text-slate-900 mb-3">{parts.join(" · ")}</div>
          <div className="flex flex-wrap gap-2">
            {[{ icon: <Clock className="w-3 h-3" />, label: "Review tasks" },
              { icon: <CalendarDays className="w-3 h-3" />, label: "Prep 1:1s" },
              ...(atRisk ? [{ icon: <AlertTriangle className="w-3 h-3" />, label: "At-risk goal" }] : [])
            ].map((b, i) => (
              <button key={i} className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-700 bg-white/70 border border-white/50 rounded-full px-3 py-1 hover:bg-white transition-colors">
                {b.icon}{b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalProgressStat({ manager }: { manager?: Reportee }) {
  const goals = manager?.goals?.length ? manager.goals : ME_GOALS;
  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;
  const url = manager ? `/goals?user=${encodeURIComponent(manager.name)}` : "/goals";
  return <StatTile label="Goal progress" val={<>{avg}<span className="text-[18px]">%</span></>} subEl={<Link href={url} className="flex items-center gap-1 text-[12px] text-emerald-600 hover:underline"><TrendingUp className="w-3.5 h-3.5" />View manager goals →</Link>} />;
}

function TasksDoneStat({ manager }: { manager?: Reportee }) {
  const tasks = manager?.tasks?.length ? manager.tasks : ME_TASKS;
  const done = tasks.filter(t => t.done).length;
  const url = manager ? `/actions?user=${encodeURIComponent(manager.name)}` : "/actions";
  return <StatTile label="Tasks done" val={<>{done}<span className="text-[18px] font-normal text-slate-400">/{tasks.length}</span></>} subEl={<Link href={url} className="flex items-center gap-1 text-[12px] text-slate-500 hover:underline"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />View manager tasks →</Link>} />;
}

function GoalsAtRiskStat({ manager }: { manager?: Reportee }) {
  const goals = manager?.goals?.length ? manager.goals : ME_GOALS;
  const n = goals.filter((g: any) => g.status === 'at_risk' || g.status === 'off_track' || g.progress < 60).length;
  const url = manager ? `/goals?user=${encodeURIComponent(manager.name)}` : "/goals";
  return <StatTile amber label="Goals at risk" val={n} subEl={<div><div className="flex items-center gap-1 text-[12px] text-amber-600 mb-0.5"><AlertTriangle className="w-3 h-3" />Needs attention</div><Link href={url} className="text-[12px] text-slate-400 hover:text-slate-700 inline-block font-medium">Review manager goals →</Link></div>} />;
}

function MyActiveGoals({ manager }: { manager?: Reportee }) {
  const goals = manager?.goals?.length ? manager.goals : ME_GOALS;
  const url = manager ? `/goals?user=${encodeURIComponent(manager.name)}` : "/goals";
  if (!goals.length) return <><Hdr icon={<Target className="w-4 h-4" />} label="MY ACTIVE GOALS" count={0} actionUrl={url} actionLabel="View all" /><Empty emoji="🎯" title="No goals yet" sub="Set your first goal to start tracking what matters to you." cta={{ label: "+ Create a goal", onClick: () => {} }} /></>;
  return (
    <>
      <Hdr icon={<Target className="w-4 h-4" />} label="MY ACTIVE GOALS" count={goals.length} actionUrl={url} actionLabel="View all" />
      <div className="space-y-3">
        {goals.slice(0, 6).map((g, idx) => {
          const colors = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];
          const color = (g as any).color || colors[idx % colors.length];
          return (
            <div key={g.id} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <Link href={url} className="text-[13px] text-slate-700 truncate flex-1 hover:text-indigo-600 font-medium">{g.title}</Link>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${g.progress}%`, backgroundColor: color }} />
                </div>
                <span className="text-[12px] font-semibold text-slate-700 w-8 text-right">{g.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MyTasks({ manager }: { manager?: Reportee }) {
  const tasks = manager?.tasks?.length ? manager.tasks : ME_TASKS;
  const url = manager ? `/actions?user=${encodeURIComponent(manager.name)}` : "/actions";
  if (!tasks.length) return <><Hdr icon={<CheckSquare className="w-4 h-4" />} label="MY TASKS" count={0} actionUrl={url} actionLabel="View all" /><Empty emoji="✅" title="No tasks right now" sub="You're caught up. Add a task when something new comes up." cta={{ label: "+ Add task", onClick: () => {} }} /></>;
  return (
    <>
      <Hdr icon={<CheckSquare className="w-4 h-4" />} label="MY TASKS" count={tasks.length} actionUrl={url} actionLabel="View all" />
      <div className="space-y-2.5">
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${t.done ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
              {t.done && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <Link href={url} className={`text-[13px] flex-1 truncate hover:text-indigo-600 font-medium ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{t.title}</Link>
            <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${(t as any).urgent || (t as any).priority === 'P0' ? "bg-red-50 text-red-600 border border-red-100" : "bg-slate-100 text-slate-500"}`}>{(t as any).due || (t as any).timeframe || "No Due Date"}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function MissingManagerBanner({ team }: { team: Reportee[] }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("Alex Manager");
  const [role, setRole] = useState("Engineering Manager");
  const [email, setEmail] = useState("manager@company.com");
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    if (selectedId) {
      await designateManagerRole(Number(selectedId));
    } else {
      await designateManagerRole(null, { name, role, email });
    }
    setIsSubmitting(false);
    setShowModal(false);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white mb-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl bg-white/20 p-2 rounded-lg">👑</div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">No Manager Profile Designated</h3>
            <p className="text-xs sm:text-sm text-indigo-100">To personalize your "Me" dashboard widgets and track your own tasks & goals, designate or create your manager profile.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 shadow-sm">
          Setup Manager Profile →
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold mb-1">Setup Manager Profile</h3>
            <p className="text-xs text-slate-500 mb-4">Choose an existing team member as the Manager, or create a new Manager profile.</p>
            
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designate Existing Team Member</label>
              <select 
                value={selectedId} 
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
              >
                <option value="">-- Create New Manager Profile Instead --</option>
                {team.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            {!selectedId && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="text-xs font-semibold text-indigo-600">New Manager Details</div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Role</label>
                  <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button disabled={isSubmitting} onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow">
                {isSubmitting ? "Saving..." : "Save Manager Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Upcoming1on1s({ onPrep }: { onPrep?: (name: string) => void }) {
  if (!MEETINGS_1ON1.length) return <><Hdr icon={<CalendarDays className="w-4 h-4" />} label="UPCOMING 1:1S" count={0} /><Empty emoji="📅" title="Nothing scheduled" sub="No 1:1s booked. Schedule one when you're ready." cta={{ label: "Schedule 1:1", onClick: () => {} }} /></>;
  return (
    <>
      <Hdr icon={<CalendarDays className="w-4 h-4" />} label="UPCOMING 1:1S" count={MEETINGS_1ON1.length} />
      <div className="space-y-1">
        {MEETINGS_1ON1.map(m => (
          <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
            <div className="text-center shrink-0 w-8">
              <div className="text-[9px] font-semibold text-slate-400 uppercase">{m.date}</div>
              <div className="text-[16px] font-bold text-slate-800 leading-tight">{m.day}</div>
            </div>
            <Av initials={m.initials} color={m.color} textColor={m.textColor} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-slate-800">{m.name}</div>
              <div className="text-[11px] text-slate-400">{m.time}</div>
            </div>
            <button onClick={() => onPrep?.(m.name)} className="text-[11px] px-2.5 py-1 border border-indigo-200 rounded-full text-indigo-600 hover:bg-indigo-50 shrink-0 flex items-center gap-1 font-medium transition-colors"><span className="text-[10px]">✨</span> Prep</button>
          </div>
        ))}
      </div>
    </>
  );
}

function QuickActions() {
  const actions = [
    { icon: <Target className="w-5 h-5" />, label: "New goal", sub: "Set a new objective", color: "text-indigo-500", bg: "bg-indigo-50", url: "/goals?new=true" },
    { icon: <CheckSquare className="w-5 h-5" />, label: "New task", sub: "Add an action item", color: "text-emerald-500", bg: "bg-emerald-50", url: "/actions?new=true" },
    { icon: <CalendarDays className="w-5 h-5" />, label: "Schedule 1:1", sub: "Pick a time slot", color: "text-blue-500", bg: "bg-blue-50", url: "/team" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Check-in", sub: "Daily reflection", color: "text-violet-500", bg: "bg-violet-50", url: "/notes" },
  ];
  return (
    <>
      <Hdr icon={<Zap className="w-4 h-4" />} label="QUICK ACTIONS" />
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a, i) => (
          <Link href={a.url} key={i} className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-100 text-left hover:border-slate-200 hover:bg-slate-50 transition-colors">
            <div className={`${a.bg} ${a.color} p-1.5 rounded-md w-fit`}>{a.icon}</div>
            <div className="text-[12px] font-semibold text-slate-800">{a.label}</div>
            <div className="text-[11px] text-slate-400">{a.sub}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

// ─── GALLERY WIDGETS (Me) ─────────────────────────────────────────────────────

function MonthlyCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = today.toLocaleString("default", { month: "long" }).toUpperCase();
  const dayHeaders = ["S", "M", "T", "W", "T", "F", "S"];
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayDate = today.getDate();
  const events = new Set([6, 9, 13, 21, 28]);
  return (
    <>
      <Hdr icon={<Calendar className="w-4 h-4" />} label={`${monthName} ${year}`} />
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {dayHeaders.map((d, i) => <div key={i} className="font-medium text-slate-400 pb-1">{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={`aspect-square flex items-center justify-center rounded-full text-[11px] font-medium transition-colors ${d === todayDate ? "bg-slate-900 text-white" : events.has(d!) ? "bg-blue-100 text-blue-700" : d ? "text-slate-700 hover:bg-slate-100 cursor-pointer" : ""}`}>
            {d}
          </div>
        ))}
      </div>
    </>
  );
}

function TimeAllocation() {
  if (!TIME_ALLOC.length) return <><Hdr icon={<BarChart2 className="w-4 h-4" />} label="TIME ALLOCATION" /><Empty emoji="⏱️" title="No time tracked" sub="Time allocation data will appear as meetings and tasks are logged." /></>;
  return (
    <>
      <Hdr icon={<BarChart2 className="w-4 h-4" />} label="TIME ALLOCATION" />
      <div className="text-[11px] text-slate-400 mb-3">7 days</div>
      <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
        {TIME_ALLOC.map((t, i) => <div key={i} className="h-full rounded-sm" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {TIME_ALLOC.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />{t.label} {t.pct}%
          </div>
        ))}
      </div>
    </>
  );
}

function QuarterlyOKR() {
  if (!OKR_DATA.length) return <><Hdr icon={<BarChart2 className="w-4 h-4" />} label="QUARTERLY OKR ROLLUP" /><Empty emoji="📊" title="No OKRs defined" sub="Quarterly objectives will appear here." /></>;
  return (
    <>
      <Hdr icon={<BarChart2 className="w-4 h-4" />} label="QUARTERLY OKR ROLLUP" />
      <div className="text-[11px] font-medium text-slate-400 mb-3">Q2 2026</div>
      <div className="space-y-2">
        {OKR_DATA.map((o, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-[13px] font-medium text-slate-800">{o.objective}</span>
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-md ${o.score >= 0.7 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{o.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CheckinHeatmap() {
  const getColor = (v: number) => {
    if (v > 0.8) return "#0d9488";
    if (v > 0.6) return "#14b8a6";
    if (v > 0.3) return "#5eead4";
    return "#ccfbf1";
  };
  return (
    <>
      <Hdr icon={<Flame className="w-4 h-4" />} label="CHECK-IN HEATMAP" />
      <div className="text-[11px] text-slate-400 mb-3">12 weeks</div>
      <div className="flex gap-1 mb-3">
        {HEATMAP.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-1">
            {col.map((v, di) => <div key={di} className="aspect-square rounded-sm" style={{ backgroundColor: getColor(v) }} />)}
          </div>
        ))}
      </div>
      <div className="text-[12px] text-slate-500">0 day streak</div>
    </>
  );
}

function RecentFeedback() {
  if (!FEEDBACK.length) return <><Hdr icon={<MessageSquare className="w-4 h-4" />} label="RECENT FEEDBACK" count={0} /><Empty emoji="💬" title="No feedback yet" sub="Feedback from your team will show up here." /></>;
  return (
    <>
      <Hdr icon={<MessageSquare className="w-4 h-4" />} label="RECENT FEEDBACK" count={FEEDBACK.length} />
      <div className="space-y-3">
        {FEEDBACK.map(f => (
          <div key={f.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-slate-700">{f.from}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${f.type === "Kudos" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{f.type}</span>
            </div>
            <p className="text-[12px] text-slate-500 italic">{f.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function TopBlockers() {
  if (!BLOCKERS.length) return <><Hdr icon={<AlertCircle className="w-4 h-4" />} label="TOP BLOCKERS" count={0} /><Empty emoji="✅" title="No blockers!" sub="Your team is running smoothly." /></>;
  return (
    <>
      <Hdr icon={<AlertCircle className="w-4 h-4" />} label="TOP BLOCKERS" count={BLOCKERS.length} />
      <div className="space-y-1">
        {BLOCKERS.map(b => (
          <div key={b.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
            <div className={`w-1 self-stretch rounded-full shrink-0 ${b.severity === "critical" ? "bg-red-400" : "bg-amber-400"}`} />
            <span className="text-[13px] text-slate-800 flex-1">{b.title}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${b.severity === "critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{b.days}d</span>
          </div>
        ))}
      </div>
    </>
  );
}

function TeamMood() {
  return (
    <>
      <Hdr icon={<Smile className="w-4 h-4" />} label="TEAM MOOD" />
      <div className="flex items-end gap-3 mt-1">
        <div className="text-4xl">😐</div>
        <div>
          <div className="text-[26px] font-bold text-slate-900 leading-none">--<span className="text-[14px] font-normal text-slate-400"> /10</span></div>
          <div className="text-[12px] text-slate-400 mt-1">No check-in mood data logged yet</div>
        </div>
      </div>
    </>
  );
}

function KudosWall() {
  if (!KUDOS_WALL.length) return <><Hdr icon={<PartyPopper className="w-4 h-4" />} label="KUDOS WALL" /><Empty emoji="🎉" title="No kudos yet" sub="Give praise to your teammates to fill up the wall!" /></>;
  return (
    <>
      <Hdr icon={<PartyPopper className="w-4 h-4" />} label="KUDOS WALL" />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {KUDOS_WALL.map(k => (
          <div key={k.id} className={`flex-shrink-0 w-44 p-4 rounded-xl bg-gradient-to-br ${k.bg} border border-white/80 shadow-sm`}>
            <div className="text-2xl mb-2">{k.emoji}</div>
            <div className="text-[12px] font-semibold text-slate-800 mb-1">{k.quote}</div>
            <div className="text-[11px] text-slate-500">{k.from} → {k.to}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function TeamLeaderboard() {
  if (!LEADERBOARD.length) return <><Hdr icon={<Trophy className="w-4 h-4" />} label="LEADERBOARD" /><Empty emoji="🏆" title="No leaderboard data" sub="Leaderboard rankings will appear as goals and tasks are completed." /></>;
  return (
    <>
      <Hdr icon={<Trophy className="w-4 h-4" />} label="LEADERBOARD" />
      <div className="space-y-2.5">
        {LEADERBOARD.map(l => (
          <div key={l.rank} className="flex items-center gap-3">
            <span className="text-lg w-6 text-center shrink-0">{l.medal}</span>
            <Av initials={l.initials} color={l.color} textColor={l.textColor} size="sm" />
            <span className="text-[13px] font-medium text-slate-800 flex-1">{l.name}</span>
            <span className="text-[13px] font-bold text-slate-600">{l.points}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function WaitingOnMe() {
  if (!WAITING_ON_ME.length) return <><Hdr icon={<Hourglass className="w-4 h-4" />} label="WAITING ON ME" count={0} /><Empty emoji="🎉" title="All caught up!" sub="No one is waiting on your input." /></>;
  return (
    <>
      <Hdr icon={<Hourglass className="w-4 h-4" />} label="WAITING ON ME" count={WAITING_ON_ME.length} />
      <div className="space-y-1">
        {WAITING_ON_ME.map(w => (
          <div key={w.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
            <Av initials={w.initials} color={w.color} textColor={w.textColor} size="sm" />
            <span className="text-[13px] text-slate-700 flex-1">{w.name} · {w.item}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${w.days >= 2 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{w.days}d</span>
          </div>
        ))}
      </div>
    </>
  );
}

function CompanyUpdates() {
  if (!COMPANY_UPDATES.length) return <><Hdr icon={<Building2 className="w-4 h-4" />} label="COMPANY UPDATES" /><Empty emoji="📣" title="No updates yet" sub="Company announcements will appear here." /></>;
  return (
    <>
      <Hdr icon={<Building2 className="w-4 h-4" />} label="COMPANY UPDATES" />
      <div className="space-y-3">
        {COMPANY_UPDATES.map(u => (
          <div key={u.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
            <div className="text-[13px] font-medium text-slate-800">{u.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{u.time}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function RecentActivity({ team }: { team: Reportee[] }) {
  if (!team.length) return <><Hdr icon={<Activity className="w-4 h-4" />} label="RECENT ACTIVITY" /><Empty emoji="🌱" title="No activity yet" sub="Activity from your team will appear here as people make progress." /></>;
  const acts = team.slice(0, 4).map(m => ({ name: m.name, init: initials(m.name), action: `completed ${m.goals.filter(g => g.progress === 100).length} goal(s)` }));
  return (
    <>
      <Hdr icon={<Activity className="w-4 h-4" />} label="RECENT ACTIVITY" />
      <div className="space-y-2">
        {acts.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600 shrink-0">{a.init}</div>
            <span className="text-slate-600"><span className="font-semibold text-slate-800">{a.name}</span> {a.action}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── MY TEAM TAB WIDGETS ──────────────────────────────────────────────────────

function TeamFocusBanner({ team }: { team: Reportee[] }) {
  const atRisk = team.filter(m => {
    const avg = m.goals.length ? m.goals.reduce((a, g) => a + g.progress, 0) / m.goals.length : 0;
    return avg < 40;
  }).length;
  return (
    <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg,#f0f4ff,#e8eeff 60%,#f0f0ff)" }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-slate-600" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold text-indigo-500 tracking-[0.1em] uppercase mb-1">TEAM FOCUS TODAY</div>
          <div className="text-[15px] font-bold text-slate-900 mb-3">
            {atRisk} members at risk · {team.length} team members
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/team" className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-700 bg-white/70 border border-white/60 rounded-full px-3 py-1 hover:bg-white transition-colors">
              <Users className="w-3 h-3" />View all team members
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamAvgProgressStat({ team }: { team: Reportee[] }) {
  let total = 0, count = 0;
  team.forEach(m => m.goals.forEach(g => { total += g.progress; count++; }));
  const avg = count ? Math.round(total / count) : 0;
  return <StatTile label="Team avg progress" val={<>{avg}<span className="text-[18px]">%</span></>} subEl={<div className="flex items-center gap-1 text-[12px] text-emerald-600"><TrendingUp className="w-3.5 h-3.5" />Active goals average</div>} />;
}

function OnTrackStat({ team }: { team: Reportee[] }) {
  const on = team.filter(m => {
    const avg = m.goals.length ? m.goals.reduce((a, g) => a + g.progress, 0) / m.goals.length : 0;
    return avg >= 60;
  }).length;
  return <StatTile label="On track" val={<>{on}<span className="text-[18px] font-normal text-slate-400">/{team.length}</span></>} subEl={<div className="text-[12px] text-slate-400">Members</div>} />;
}

function MembersAtRiskStat({ team }: { team: Reportee[] }) {
  const n = team.filter(m => {
    const avg = m.goals.length ? m.goals.reduce((a, g) => a + g.progress, 0) / m.goals.length : 0;
    return avg < 40;
  }).length;
  return <StatTile amber label="Members at risk" val={n} subEl={<div className="flex items-center gap-1 text-[12px] text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />Needing attention</div>} />;
}

function NeedsAttention({ team }: { team: Reportee[] }) {
  const AV_COLORS = [{ color: "#fee2e2", textColor: "#991b1b" }, { color: "#fbcfe8", textColor: "#9d174d" }, { color: "#fde68a", textColor: "#92400e" }];
  const attention = team.filter(m => {
    const avg = m.goals.length ? m.goals.reduce((a, g) => a + g.progress, 0) / m.goals.length : 0;
    return avg < 40;
  }).slice(0, 3);

  if (!attention.length) return (
    <>
      <Hdr icon={<AlertCircle className="w-4 h-4" />} label="NEEDS ATTENTION" count={0} />
      <div className="flex items-center gap-2 py-4 text-[13px] text-emerald-600"><CheckCircle2 className="w-4 h-4" />All good — no one needs attention right now</div>
    </>
  );

  const getAction = (m: Reportee, i: number) => {
    const overdueTasks = m.tasks.filter(t => !t.done).length;
    if (overdueTasks > 2) return { label: "Review", reason: `${overdueTasks} tasks incomplete · flagged at risk` };
    return { label: "View", reason: `Goal "${(m.goals[0]?.title || "goal").slice(0, 24)}" at risk` };
  };

  return (
    <>
      <Hdr icon={<AlertCircle className="w-4 h-4" />} label="NEEDS ATTENTION" count={attention.length} />
      <div className="space-y-1">
        {attention.map((m, i) => {
          const ac = AV_COLORS[i % AV_COLORS.length];
          const action = getAction(m, i);
          return (
            <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
              <Av initials={initials(m.name)} color={ac.color} textColor={ac.textColor} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-800">{m.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{action.reason}</div>
              </div>
              <Link href={`/team/${m.id}`} className="text-[11px] px-3 py-1 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 shrink-0">{action.label}</Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WeeklyRiskRollup({ team }: { team: Reportee[] }) {
  const allGoals = team.flatMap(m => m.goals.map(g => ({ ...g, ownerName: m.name })));
  const riskyGoals = allGoals.filter(g => g.status === 'at_risk' || g.status === 'off_track');
  
  if (riskyGoals.length === 0) {
    return <><Hdr icon={<AlertTriangle className="w-4 h-4" />} label="WEEKLY RISK ROLLUP" count={0} /><Empty emoji="🎉" title="No risks detected" sub="All goals are looking healthy!" cta={{ label: "View Team Goals", onClick: () => window.location.href = '/goals' }} /></>;
  }

  return (
    <>
      <Hdr icon={<AlertTriangle className="w-4 h-4" />} label="WEEKLY RISK ROLLUP" count={riskyGoals.length} />
      <div className="space-y-3">
        {riskyGoals.slice(0, 5).map(g => (
          <div key={g.id} className="flex gap-3 items-start p-3 bg-amber-50/50 rounded-xl border border-amber-100">
            <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${g.status === 'off_track' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] font-bold text-slate-800 truncate">{g.title}</span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${g.status === 'off_track' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {g.status === 'off_track' ? 'Off Track' : 'At Risk'}
                </span>
              </div>
              <div className="text-[12px] text-slate-600 mb-2">
                <span className="font-semibold">{g.ownerName}</span> is currently at {g.progress}% progress.
                {g.dueDate && ` Due ${new Date(g.dueDate).toLocaleDateString()}.`}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-amber-200/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.status === 'off_track' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${g.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ThisWeek1on1s({ team }: { team: Reportee[] }) {
  const schedule: any[] = [];
  if (!schedule.length) return <><Hdr icon={<CalendarDays className="w-4 h-4" />} label="THIS WEEK" count={0} /><Empty emoji="📅" title="Nothing this week" sub="No 1:1s scheduled yet." /></>;
  return (
    <>
      <Hdr icon={<CalendarDays className="w-4 h-4" />} label="THIS WEEK" count={schedule.length} />
    </>
  );
}

function MyTeamList({ team }: { team: Reportee[] }) {
  const AV_COLORS = [{ color: "#bbf7d0", textColor: "#14532d" }, { color: "#fbcfe8", textColor: "#9d174d" }, { color: "#fde68a", textColor: "#92400e" }, { color: "#fee2e2", textColor: "#991b1b" }, { color: "#bfdbfe", textColor: "#1e40af" }];

  if (!team.length) return <><Hdr icon={<Users className="w-4 h-4" />} label="MY TEAM" count={0} /><Empty emoji="👥" title="No team members yet" sub="Add your first team member to get started." cta={{ label: "Add member", onClick: () => {} }} /></>;

  return (
    <>
      <Hdr icon={<Users className="w-4 h-4" />} label="MY TEAM" count={team.length} />
      <div>
        {team.map((m, i) => {
          const avg = m.goals.length ? Math.round(m.goals.reduce((a, g) => a + g.progress, 0) / m.goals.length) : 0;
          const statusLabel = m.goals.length === 0 ? "No goals" : avg < 30 ? "Off track" : avg < 50 ? "At risk" : "On track";
          const statusColor = statusLabel === "Off track" ? { color: "#ef4444", bg: "#fee2e2" } : statusLabel === "At risk" ? { color: "#f59e0b", bg: "#fef3c7" } : statusLabel === "No goals" ? { color: "#64748b", bg: "#f1f5f9" } : { color: "#10b981", bg: "#d1fae5" };
          const barColor = statusColor.color;
          const trendText = m.goals.length === 0 ? "No goals assigned" : `${m.goals.length} goals · ${avg >= 80 ? "trending up" : avg >= 50 ? "all on track" : `${m.tasks.filter(t => !t.done).length} tasks incomplete`}`;
          const nextDate = m.checkInFreq ? `${m.checkInFreq}` : "No cadence";
          const ac = AV_COLORS[i % AV_COLORS.length];
          return (
            <Link key={m.id} href={`/team/${m.id}`} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 relative hover:bg-slate-50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm" style={{ backgroundColor: statusColor.color }} />
              <div className="pl-3">
                <Av initials={initials(m.name)} color={ac.color} textColor={ac.textColor} />
              </div>
              <div className="w-28 shrink-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{m.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{m.role}</div>
              </div>
              <div className="flex-1 min-w-0 px-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: barColor }} />
                  </div>
                  <span className="text-[12px] font-bold text-slate-800 shrink-0 w-7 text-right">{avg}%</span>
                </div>
                <div className="text-[11px] text-slate-400">{trendText}</div>
              </div>
              <div className="shrink-0">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
                  {statusLabel}
                </span>
              </div>
              <div className="text-[12px] shrink-0 w-20 text-right text-slate-600">{nextDate}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function OneOnOneCadence({ team }: { team: Reportee[] }) {
  const withCadence = team.filter(m => m.checkInFreq && m.checkInFreq !== "").length;
  const pct = team.length ? Math.round((withCadence / team.length) * 100) : 0;
  return <StatTile label="1:1 cadence" val={<>{pct}<span className="text-[18px]">%</span></>} subEl={<div className="text-[12px] text-slate-400">have check-in cadence set</div>} />;
}

// ─── WIDGET DEFINITIONS ───────────────────────────────────────────────────────
const ME_DEFS: WidgetDef[] = [
  { id: "focus-banner", label: "Focus banner", description: "What needs your attention today", icon: <Star className="w-5 h-5" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-500", category: "productivity", defaultSize: "lg" },
  { id: "goal-progress", label: "Goal progress", description: "Your overall goal completion", icon: <Target className="w-5 h-5" />, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", category: "productivity", defaultSize: "sm" },
  { id: "tasks-done", label: "Tasks done", description: "Completed tasks vs total", icon: <CheckSquare className="w-5 h-5" />, iconBg: "bg-blue-50", iconColor: "text-blue-500", category: "productivity", defaultSize: "sm" },
  { id: "goals-at-risk", label: "Goals at risk", description: "Goals needing attention", icon: <AlertTriangle className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", category: "productivity", defaultSize: "sm" },
  { id: "my-active-goals", label: "My active goals", description: "Your goals with progress bars", icon: <Target className="w-5 h-5" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-500", category: "productivity", defaultSize: "md" },
  { id: "my-tasks", label: "My tasks", description: "Checklist with due dates", icon: <CheckSquare className="w-5 h-5" />, iconBg: "bg-green-50", iconColor: "text-green-500", category: "productivity", defaultSize: "md" },
  { id: "upcoming-1on1s", label: "Upcoming 1:1s", description: "Next meetings with prep", icon: <CalendarDays className="w-5 h-5" />, iconBg: "bg-blue-50", iconColor: "text-blue-500", category: "productivity", defaultSize: "md" },
  { id: "quick-actions", label: "Quick actions", description: "Shortcuts for common flows", icon: <Zap className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", category: "productivity", defaultSize: "md" },
  { id: "monthly-calendar", label: "Monthly calendar", description: "Compact month with events", icon: <Calendar className="w-5 h-5" />, iconBg: "bg-sky-50", iconColor: "text-sky-500", category: "productivity", defaultSize: "sm" },
  { id: "time-allocation", label: "Time allocation", description: "How you spent your week", icon: <BarChart2 className="w-5 h-5" />, iconBg: "bg-violet-50", iconColor: "text-violet-500", category: "productivity", defaultSize: "md" },
  { id: "quarterly-okr", label: "Quarterly OKR rollup", description: "Objectives and key results", icon: <BarChart2 className="w-5 h-5" />, iconBg: "bg-teal-50", iconColor: "text-teal-500", category: "performance", defaultSize: "md" },
  { id: "checkin-heatmap", label: "Check-in heatmap", description: "Activity grid over 12 weeks", icon: <Flame className="w-5 h-5" />, iconBg: "bg-orange-50", iconColor: "text-orange-500", category: "performance", defaultSize: "md" },
  { id: "recent-feedback", label: "Recent feedback", description: "Kudos and suggestions", icon: <MessageSquare className="w-5 h-5" />, iconBg: "bg-purple-50", iconColor: "text-purple-500", category: "team", defaultSize: "md" },
  { id: "top-blockers", label: "Top blockers", description: "Issues blocking your team", icon: <AlertCircle className="w-5 h-5" />, iconBg: "bg-red-50", iconColor: "text-red-500", category: "team", defaultSize: "md" },
  { id: "team-mood", label: "Team mood", description: "Pulse on energy and clarity", icon: <Smile className="w-5 h-5" />, iconBg: "bg-yellow-50", iconColor: "text-yellow-500", category: "team", defaultSize: "sm" },
  { id: "kudos-wall", label: "Kudos wall", description: "Recognition across the team", icon: <PartyPopper className="w-5 h-5" />, iconBg: "bg-pink-50", iconColor: "text-pink-500", category: "team", defaultSize: "lg" },
  { id: "team-leaderboard", label: "Team leaderboard", description: "Top contributors this sprint", icon: <Trophy className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", category: "team", defaultSize: "sm" },
  { id: "waiting-on-me", label: "Waiting on me", description: "People waiting on your input", icon: <Hourglass className="w-5 h-5" />, iconBg: "bg-slate-50", iconColor: "text-slate-500", category: "team", defaultSize: "md" },
  { id: "company-updates", label: "Company updates", description: "Latest announcements", icon: <Building2 className="w-5 h-5" />, iconBg: "bg-slate-50", iconColor: "text-slate-500", category: "awareness", defaultSize: "sm" },
  { id: "recent-activity", label: "Recent activity", description: "What your team is up to", icon: <Activity className="w-5 h-5" />, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", category: "team", defaultSize: "md" },
];

const TEAM_DEFS: WidgetDef[] = [
  { id: "team-focus-banner", label: "Team focus banner", description: "Today's team-level summary", icon: <Users className="w-5 h-5" />, iconBg: "bg-indigo-50", iconColor: "text-indigo-500", category: "team", defaultSize: "lg" },
  { id: "team-avg-progress", label: "Team avg progress", description: "Average goal completion", icon: <TrendingUp className="w-5 h-5" />, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", category: "performance", defaultSize: "sm" },
  { id: "on-track", label: "On track", description: "Members hitting their targets", icon: <CheckCircle2 className="w-5 h-5" />, iconBg: "bg-green-50", iconColor: "text-green-500", category: "performance", defaultSize: "sm" },
  { id: "members-at-risk", label: "Members at risk", description: "Members needing attention", icon: <AlertTriangle className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", category: "performance", defaultSize: "sm" },
  { id: "needs-attention", label: "Needs attention", description: "Who needs you right now", icon: <AlertCircle className="w-5 h-5" />, iconBg: "bg-red-50", iconColor: "text-red-500", category: "team", defaultSize: "md" },
  { id: "weekly-risk-rollup", label: "Weekly risk rollup", description: "AI detected risks and unrealistic deadlines", icon: <AlertTriangle className="w-5 h-5" />, iconBg: "bg-orange-50", iconColor: "text-orange-500", category: "performance", defaultSize: "lg" },
  { id: "this-week-1on1s", label: "This week's 1:1s", description: "Upcoming meetings this week", icon: <CalendarDays className="w-5 h-5" />, iconBg: "bg-blue-50", iconColor: "text-blue-500", category: "team", defaultSize: "md" },
  { id: "my-team-list", label: "My team list", description: "Full roster with status", icon: <Users className="w-5 h-5" />, iconBg: "bg-slate-50", iconColor: "text-slate-500", category: "team", defaultSize: "lg" },
  { id: "1on1-cadence", label: "1:1 cadence", description: "% of 1:1s on schedule", icon: <Timer className="w-5 h-5" />, iconBg: "bg-teal-50", iconColor: "text-teal-500", category: "team", defaultSize: "sm" },
  { id: "top-blockers", label: "Top blockers", description: "Issues blocking your team", icon: <AlertCircle className="w-5 h-5" />, iconBg: "bg-red-50", iconColor: "text-red-500", category: "team", defaultSize: "md" },
  { id: "team-mood", label: "Team mood", description: "Pulse on energy and clarity", icon: <Smile className="w-5 h-5" />, iconBg: "bg-yellow-50", iconColor: "text-yellow-500", category: "team", defaultSize: "sm" },
  { id: "kudos-wall", label: "Kudos wall", description: "Recognition across the team", icon: <PartyPopper className="w-5 h-5" />, iconBg: "bg-pink-50", iconColor: "text-pink-500", category: "team", defaultSize: "lg" },
  { id: "team-leaderboard", label: "Team leaderboard", description: "Top contributors this sprint", icon: <Trophy className="w-5 h-5" />, iconBg: "bg-amber-50", iconColor: "text-amber-500", category: "team", defaultSize: "sm" },
  { id: "waiting-on-me", label: "Waiting on me", description: "People waiting on your input", icon: <Hourglass className="w-5 h-5" />, iconBg: "bg-slate-50", iconColor: "text-slate-500", category: "team", defaultSize: "md" },
  { id: "company-updates", label: "Company updates", description: "Latest announcements", icon: <Building2 className="w-5 h-5" />, iconBg: "bg-slate-50", iconColor: "text-slate-500", category: "awareness", defaultSize: "sm" },
];

// ─── DEFAULT LAYOUTS ──────────────────────────────────────────────────────────
const ME_DEFAULT: WidgetInstance[] = [
  mkW("focus-banner", "lg"),
  mkW("goal-progress", "sm"), mkW("tasks-done", "sm"), mkW("goals-at-risk", "sm"),
  mkW("my-active-goals", "md"), mkW("my-tasks", "md"),
  mkW("upcoming-1on1s", "md"), mkW("quick-actions", "md"),
];

const TEAM_DEFAULT: WidgetInstance[] = [
  mkW("team-focus-banner", "lg"),
  mkW("team-avg-progress", "sm"), mkW("on-track", "sm"), mkW("members-at-risk", "sm"),
  mkW("weekly-risk-rollup", "lg"),
  mkW("needs-attention", "md"), mkW("this-week-1on1s", "md"),
  mkW("my-team-list", "lg"),
];

// ─── WIDGET WRAPPER ───────────────────────────────────────────────────────────
function WidgetWrapper({ instance, children, isReorderMode, isDragOver, onRemove, onResize, onDragStart, onDragOver, onDrop, onDragEnd }: {
  instance: WidgetInstance; children: React.ReactNode; isReorderMode: boolean; isDragOver: boolean;
  onRemove: () => void; onResize: (s: Size) => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void; onDragEnd: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const fromHandle = useRef(false);
  const isBanner = instance.widgetId === "focus-banner" || instance.widgetId === "team-focus-banner";
  const showCtrl = isReorderMode;

  return (
    <div
      className={`${CS[instance.size]} relative group transition-all`}
      draggable
      onDragStart={e => { if (!fromHandle.current && !isReorderMode) { e.preventDefault(); return; } onDragStart(); }}
      onDragOver={e => { e.preventDefault(); onDragOver(e); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragEnd={() => { fromHandle.current = false; onDragEnd(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isDragOver && <div className="absolute inset-0 border-2 border-indigo-400 rounded-xl z-20 pointer-events-none bg-indigo-50/20 transition-all" />}

      <div className={`bg-white border border-slate-200 rounded-xl shadow-sm h-full ${isBanner ? "p-4" : "p-4"}`}>
        {children}
      </div>

      {showCtrl && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 bg-white border border-slate-200 rounded-lg px-1.5 py-1 shadow-sm animate-in fade-in duration-150">
          <button
            className="cursor-grab p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            onMouseDown={() => { fromHandle.current = true; }}
            onMouseUp={() => { fromHandle.current = false; }}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
          {(["sm", "md", "lg"] as Size[]).map(s => (
            <button key={s} onClick={() => onResize(s)} className={`w-5 h-5 text-[9px] font-bold rounded transition-colors ${instance.size === s ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {s.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
          <button onClick={onRemove} className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── GALLERY MODAL ────────────────────────────────────────────────────────────
const CAT_LABELS: Record<string, string> = { productivity: "PRODUCTIVITY", performance: "PERFORMANCE & GOALS", team: "TEAM & COLLABORATION", awareness: "AWARENESS" };

function GalleryModal({ tab, activeWidgets, onAdd, onClose }: { tab: TabId; activeWidgets: WidgetInstance[]; onAdd: (id: string, size: Size) => void; onClose: () => void }) {
  const defs = tab === "me" ? ME_DEFS : TEAM_DEFS;
  const activeIds = new Set(activeWidgets.map(w => w.widgetId));
  const cats = ["productivity", "performance", "team", "awareness"] as const;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[640px] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold text-slate-900">Widget gallery</h2>
            <p className="text-[13px] text-slate-500">Add widgets to customize your dashboard</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cats.map(cat => {
            const widgets = defs.filter(d => d.category === cat);
            if (!widgets.length) return null;
            return (
              <div key={cat} className="mb-6 last:mb-0">
                <div className="text-[10px] font-semibold text-slate-400 tracking-[0.1em] uppercase mb-3">{CAT_LABELS[cat]}</div>
                <div className="grid grid-cols-2 gap-3">
                  {widgets.map(def => {
                    const added = activeIds.has(def.id);
                    return (
                      <button
                        key={def.id}
                        onClick={() => !added && onAdd(def.id, def.defaultSize)}
                        className={`text-left p-4 rounded-xl border transition-all relative ${added ? "border-slate-100 bg-slate-50 cursor-default" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"}`}
                      >
                        {added && (
                          <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <Check className="w-3 h-3" />Added
                          </div>
                        )}
                        <div className={`${def.iconBg} ${def.iconColor} w-9 h-9 rounded-lg flex items-center justify-center mb-2.5`}>{def.icon}</div>
                        <div className="text-[13px] font-semibold text-slate-800 mb-0.5 pr-12">{def.label}</div>
                        <div className="text-[12px] text-slate-400">{def.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function DashboardClient({ team }: { team: Reportee[] }) {
  const [tab, setTab] = useState<TabId>("me");
  const [meWidgets, setMeWidgets] = useState<WidgetInstance[]>(() => ME_DEFAULT.map(w => ({ ...w })));
  const [teamWidgets, setTeamWidgets] = useState<WidgetInstance[]>(() => TEAM_DEFAULT.map(w => ({ ...w })));
  const [showGallery, setShowGallery] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState(-1);
  const dragFromIdx = useRef(-1);

  // 1:1 Prep Assistant state
  const [prepTarget, setPrepTarget] = useState<{ id: number; name: string } | null>(null);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);
  const [showSkillMatrix, setShowSkillMatrix] = useState(false);
  const [showRiskRadar, setShowRiskRadar] = useState(false);
  const [isAiDropdownOpen, setIsAiDropdownOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const aiAction = searchParams.get("ai");
    if (aiAction) {
      if (aiAction === "weekly-review") setShowWeeklyReview(true);
      if (aiAction === "sentiment") setShowSentiment(true);
      if (aiAction === "skill-matrix") setShowSkillMatrix(true);
      if (aiAction === "risk-radar") setShowRiskRadar(true);
      
      // Clean up the URL so it doesn't reopen on refresh
      router.replace("/");
    }
  }, [searchParams, router]);

  function handlePrepClick(name: string) {
    // Try to find matching team member by name
    const match = team.find(m => m.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(m.name.split(' ')[0].toLowerCase()));
    if (match) {
      setPrepTarget({ id: match.id, name: match.name });
    } else if (team.length > 0) {
      // Fallback: use first team member for demo
      setPrepTarget({ id: team[0].id, name });
    }
  }

  const isManagerUser = (m: Reportee) => m.isManager || m.role?.toLowerCase().includes("manager") || m.id === 999;
  const managerUser = useMemo(() => {
    return team.find(isManagerUser) || team[0] || undefined;
  }, [team]);
  const hasDesignatedManager = useMemo(() => team.some(isManagerUser), [team]);

  function renderContent(inst: WidgetInstance): React.ReactNode {
    switch (inst.widgetId) {
      case "focus-banner": return <MeFocusBanner />;
      case "goal-progress": return <GoalProgressStat manager={managerUser} />;
      case "tasks-done": return <TasksDoneStat manager={managerUser} />;
      case "goals-at-risk": return <GoalsAtRiskStat manager={managerUser} />;
      case "my-active-goals": return <MyActiveGoals manager={managerUser} />;
      case "my-tasks": return <MyTasks manager={managerUser} />;
      case "upcoming-1on1s": return <Upcoming1on1s onPrep={handlePrepClick} />;
      case "quick-actions": return <QuickActions />;
      case "monthly-calendar": return <MonthlyCalendar />;
      case "time-allocation": return <TimeAllocation />;
      case "quarterly-okr": return <QuarterlyOKR />;
      case "checkin-heatmap": return <CheckinHeatmap />;
      case "recent-feedback": return <RecentFeedback />;
      case "top-blockers": return <TopBlockers />;
      case "team-mood": return <TeamMood />;
      case "kudos-wall": return <KudosWall />;
      case "team-leaderboard": return <TeamLeaderboard />;
      case "waiting-on-me": return <WaitingOnMe />;
      case "company-updates": return <CompanyUpdates />;
      case "recent-activity": return <RecentActivity team={team} />;
      case "team-focus-banner": return <TeamFocusBanner team={team} />;
      case "team-avg-progress": return <TeamAvgProgressStat team={team} />;
      case "on-track": return <OnTrackStat team={team} />;
      case "members-at-risk": return <MembersAtRiskStat team={team} />;
      case "weekly-risk-rollup": return <WeeklyRiskRollup team={team} />;
      case "needs-attention": return <NeedsAttention team={team} />;
      case "this-week-1on1s": return <ThisWeek1on1s team={team} />;
      case "my-team-list": return <MyTeamList team={team} />;
      case "1on1-cadence": return <OneOnOneCadence team={team} />;
      default: return <div className="text-slate-400 text-sm">Unknown widget</div>;
    }
  }

  const activeWidgets = tab === "me" ? meWidgets : teamWidgets;
  const setActiveWidgets = tab === "me" ? setMeWidgets : setTeamWidgets;

  function addWidget(widgetId: string, size: Size) {
    setActiveWidgets(prev => [...prev, mkW(widgetId, size)]);
  }
  function removeWidget(instanceId: string) {
    setActiveWidgets(prev => prev.filter(w => w.instanceId !== instanceId));
  }
  function resizeWidget(instanceId: string, size: Size) {
    setActiveWidgets(prev => prev.map(w => w.instanceId === instanceId ? { ...w, size } : w));
  }
  function reorder(from: number, to: number) {
    if (from === to) return;
    setActiveWidgets(prev => {
      const arr = [...prev];
      const [el] = arr.splice(from, 1);
      arr.splice(to, 0, el);
      return arr;
    });
  }
  function resetDefault() {
    const base = tab === "me" ? ME_DEFAULT : TEAM_DEFAULT;
    const fresh = base.map(w => ({ ...w, instanceId: uid() }));
    if (tab === "me") setMeWidgets(fresh); else setTeamWidgets(fresh);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-y-auto relative">
      {/* Header */}
      <div className="px-6 lg:px-8 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-4 whitespace-nowrap relative z-50">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tracker Dashboard</h1>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm shrink-0">
              <button onClick={() => setTab("me")} className={`px-4 py-1.5 text-[13px] font-semibold rounded transition-colors ${tab === "me" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>Me</button>
              <button onClick={() => setTab("team")} className={`px-4 py-1.5 text-[13px] font-semibold rounded transition-colors ${tab === "team" ? "bg-slate-100 text-slate-800" : "text-slate-400 hover:text-slate-600"}`}>Team</button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <button 
                  onClick={() => setIsAiDropdownOpen(!isAiDropdownOpen)}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[13px] font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-indigo-100" />
                  AI Insights
                  <ChevronDown className="w-4 h-4 opacity-70 ml-1" />
                </button>
                
                {isAiDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAiDropdownOpen(false)}></div>
                    <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                      <button 
                        onClick={() => { setShowWeeklyReview(true); setIsAiDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800">Weekly AI Review</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => { setShowSentiment(true); setIsAiDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800">Sentiment Trend</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => { setShowSkillMatrix(true); setIsAiDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center shrink-0">
                          <Users className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800">Skill Matrix</div>
                        </div>
                      </button>
                      <button 
                        onClick={() => { setShowRiskRadar(true); setIsAiDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800">Risk Radar</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-lg text-[13px] font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />Add widget
            </button>
            <button
              onClick={() => setIsReorderMode(r => !r)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${isReorderMode ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Shuffle className="w-4 h-4" />Reorder
            </button>
            <span className="text-[13px] text-slate-400 px-1">{activeWidgets.length} widget{activeWidgets.length !== 1 ? "s" : ""}</span>
            <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={resetDefault}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />Reset to default
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-8 pt-6 pb-4">

        {/* Grid */}
        {!hasDesignatedManager && <MissingManagerBanner team={team} />}
        {tab === "team" && activeWidgets.length > 0 && <DailyDigestBanner />}
        {activeWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="text-5xl mb-4">🧩</div>
            <div className="text-[16px] font-semibold text-slate-700 mb-2">Your dashboard is empty</div>
            <div className="text-[13px] text-slate-400 mb-6">Add widgets to start customizing your view.</div>
            <button onClick={() => setShowGallery(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-slate-800 transition-colors">
              <Plus className="w-4 h-4" />Browse widgets
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {activeWidgets.map((inst, idx) => (
              <WidgetWrapper
                key={inst.instanceId}
                instance={inst}
                isReorderMode={isReorderMode}
                isDragOver={dragOverIdx === idx}
                onRemove={() => removeWidget(inst.instanceId)}
                onResize={s => resizeWidget(inst.instanceId, s)}
                onDragStart={() => { dragFromIdx.current = idx; }}
                onDragOver={() => setDragOverIdx(idx)}
                onDrop={() => { if (dragFromIdx.current !== -1) { reorder(dragFromIdx.current, idx); } dragFromIdx.current = -1; setDragOverIdx(-1); }}
                onDragEnd={() => { dragFromIdx.current = -1; setDragOverIdx(-1); }}
              >
                {renderContent(inst)}
              </WidgetWrapper>
            ))}
          </div>
        )}

        {/* Bottom Add widget */}
        {activeWidgets.length > 0 && (
          <div className="mt-5">
            <button onClick={() => setShowGallery(true)} className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-[13px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-white transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add widget
            </button>
          </div>
        )}
      </div>

      {showGallery && (
        <GalleryModal tab={tab} activeWidgets={activeWidgets} onAdd={(id, size) => { addWidget(id, size); }} onClose={() => setShowGallery(false)} />
      )}

      {prepTarget && (
        <PrepBriefPanel
          reporteeId={prepTarget.id}
          reporteeName={prepTarget.name}
          onClose={() => setPrepTarget(null)}
        />
      )}

      {showWeeklyReview && (
        <WeeklyReviewPanel onClose={() => setShowWeeklyReview(false)} />
      )}

      {showSentiment && (
        <SentimentTrendPanel onClose={() => setShowSentiment(false)} />
      )}

      {showSkillMatrix && (
        <SkillMatrixPanel onClose={() => setShowSkillMatrix(false)} />
      )}

      {showRiskRadar && (
        <RiskRadarPanel onClose={() => setShowRiskRadar(false)} />
      )}
    </div>
  );
}
