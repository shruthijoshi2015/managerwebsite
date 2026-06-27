"use client";
import React, { useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Target, Plus, Search, ChevronDown, ChevronRight, MoreHorizontal, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, List, User, Pencil, X, Check, Sparkles, Wand2, AlertTriangle, Calendar } from "lucide-react";
import type { Goal } from "@/lib/db";
import { useCardConfig } from "@/lib/CardConfigContext";
import { AIGoalStatusPill } from "./AIGoalStatusPill";
import { RiskExplanationPopover } from "./RiskExplanationPopover";

type GoalRow = Goal & { ownerName: string; ownerId: number };
type TeamMember = { id: number; name: string; role: string; goals: Goal[] };
type SortDir = "asc" | "desc" | null;
type SortCol = "title" | "user" | "progress" | "status" | "completed" | null;

const STATUS_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  on_track:  { label: "On track",  dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk:   { label: "At risk",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200"       },
  off_track: { label: "Off track", dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200"             },
  achieved:  { label: "Achieved",  dot: "bg-slate-700",   badge: "bg-slate-100 text-slate-700 border-slate-200"      },
};

function pct(g: { progress: number; total: number }) { return Math.min(100, Math.round((g.progress / (g.total || 100)) * 100)); }
function progressColor(p: number, s?: string) {
  if (s === "achieved" || p === 100) return "bg-emerald-500";
  if (s === "at_risk") return "bg-amber-400";
  if (s === "off_track") return "bg-red-500";
  return p >= 70 ? "bg-emerald-500" : p >= 40 ? "bg-lime-500" : "bg-amber-400";
}

function Av({ name, sz = 6 }: { name: string; sz?: number }) {
  const i = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const c = ["bg-indigo-100 text-indigo-700","bg-sky-100 text-sky-700","bg-rose-100 text-rose-700","bg-amber-100 text-amber-700","bg-emerald-100 text-emerald-700"];
  return <div className={`w-${sz} h-${sz} rounded-full ${c[name.charCodeAt(0)%c.length]} flex items-center justify-center text-[10px] font-bold shrink-0`}>{i}</div>;
}

function PBar({ g }: { g: { progress: number; total: number; status?: string } }) {
  const p = pct(g);
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${progressColor(p, g.status)}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-[12px] text-slate-500 w-8 text-right">{p}%</span>
    </div>
  );
}

function Badge({ status }: { status?: string }) {
  const s = status ? STATUS_MAP[status] : null;
  if (!s) return <span className="text-[11px] text-slate-400">—</span>;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${s.badge}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>;
}

function Donut({ p, r=34, s=88 }: { p: number; r?: number; s?: number }) {
  const c = 2*Math.PI*r, off = c-(p/100)*c;
  const col = p>=70?"#10b981":p>=40?"#84cc16":"#f59e0b";
  return (
    <div className="relative" style={{width:s,height:s}}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="9"/>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth="9" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${s/2} ${s/2})`} style={{transition:"stroke-dashoffset 0.5s"}}/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[13px] font-bold text-slate-800">{p}%</span></div>
    </div>
  );
}

/* Column Header with sort + filter */
function ColHeader({ label, col, sortCol, sortDir, onSort, filterValues, activeFilters, onFilter }:
  { label: string; col: SortCol; sortCol: SortCol; sortDir: SortDir; onSort:(c:SortCol)=>void;
    filterValues?: string[]; activeFilters?: string[]; onFilter?: (v:string)=>void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = sortCol === col;
  const Icon = !isActive || sortDir === null ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors" onClick={() => setOpen(v => !v)}>
        {label} <Icon className="w-3 h-3" />
        {activeFilters && activeFilters.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </button>
      {open && (
        <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-1" onMouseLeave={() => setOpen(false)}>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50" onClick={() => { onSort(col); setOpen(false); }}>
            <ArrowUp className="w-3.5 h-3.5 text-slate-400" /> Sort A → Z
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50" onClick={() => { onSort(col); setOpen(false); }}>
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" /> Sort Z → A
          </button>
          {filterValues && filterValues.length > 0 && (
            <>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <p className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider">Filter</p>
                {filterValues.map(v => (
                  <button key={v} className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50" onClick={() => onFilter?.(v)}>
                    <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center ${activeFilters?.includes(v) ? "bg-slate-800 border-slate-800" : "border-slate-300"}`}>
                      {activeFilters?.includes(v) && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Row menu */
function RowMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v=>!v)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded hover:bg-slate-100">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-36 py-1" onMouseLeave={() => setOpen(false)}>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50" onClick={() => { onEdit(); setOpen(false); }}>
            <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

/* List view row */
function LRow({ goal, childMap, depth=0, onEdit, onDragStart, onDragOver, onDrop, cardSize='compact' }:
  { goal: GoalRow; childMap: Record<number,GoalRow[]>; depth?: number; onEdit:(g:GoalRow)=>void;
    onDragStart:(id:number)=>void; onDragOver:(e:React.DragEvent)=>void; onDrop:(id:number)=>void; cardSize?: string }) {
  const [expanded, setExpanded] = useState(true);
  const children = childMap[goal.id] || [];
  const p = pct(goal);
  const fmt = (d?: string) => d ? new Date(d).toISOString().slice(0, 10) : "—";

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors group cursor-pointer ${cardSize === 'mini' ? 'text-[11px]' : cardSize === 'large' ? 'text-[14px]' : 'text-[13px]'}`}
        draggable onDragStart={() => onDragStart(goal.id)} onDragOver={onDragOver} onDrop={() => onDrop(goal.id)}>
        {/* Title */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pl-4 pr-2 min-w-0`}>
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth*24}px` }}>
            {children.length > 0
              ? <button onClick={() => setExpanded(v=>!v)} className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0">{expanded?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}</button>
              : <span className="w-4 shrink-0" />}
            <span className="text-[13px] font-medium text-slate-800 truncate max-w-xs">{goal.title}</span>
          </div>
        </td>
        {/* User */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-36`}>
          <div className="flex items-center gap-2">
            <Av name={goal.ownerName} sz={6}/>
            <span className="text-[12px] text-slate-600 truncate max-w-[90px]">{goal.ownerName}</span>
          </div>
        </td>
        {/* Progress */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-52`}><PBar g={goal}/></td>
        {/* Status */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-48`}>
          <div className="flex items-center gap-2">
            <Badge status={goal.status}/>
            {(goal.status === 'at_risk' || goal.status === 'off_track') && (
              <RiskExplanationPopover goalId={goal.id} reporteeId={goal.ownerId} />
            )}
            <AIGoalStatusPill goalId={goal.id} reporteeId={goal.ownerId} currentStatus={goal.status} onStatusUpdated={() => window.location.reload()} />
          </div>
        </td>
        {/* Completed */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-36 ${cardSize === 'mini' ? 'text-[11px]' : 'text-[12px]'} text-slate-500`}>{fmt(goal.completedAt)}</td>
        {/* Actions */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-2 w-16`}>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <RowMenu onEdit={() => onEdit(goal)} />
            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
          </div>
        </td>
      </tr>
      {expanded && children.map(c => <LRow key={c.id} goal={c} childMap={childMap} depth={depth+1} onEdit={onEdit} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} cardSize={cardSize} />)}
    </>
  );
}

/* User view member card */
function MCard({ m, onShowGoals, cardSize='compact' }: { m: TeamMember; onShowGoals: () => void; cardSize?: string }) {
  const [show, setShow] = useState(false);
  const parents = m.goals.filter(g => !g.parentId);
  const overall = m.goals.length > 0 ? Math.round(m.goals.reduce((s,g) => s+g.progress,0)/m.goals.length) : 0;
  const cnt = (s?: string) => m.goals.filter(g => g.status===s).length;
  
  const pad = cardSize === 'mini' ? 'p-3' : cardSize === 'large' ? 'p-6' : 'p-5';
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className={`${pad} border-b border-slate-100`}>
        <div className="flex items-center gap-3 mb-4"><Av name={m.name} sz={8}/><div><p className={`font-semibold text-slate-800 ${cardSize === 'large' ? 'text-[16px]' : 'text-[14px]'}`}>{m.name}</p><p className={`text-[11px] text-slate-400 ${cardSize === 'large' ? 'text-[13px]' : 'text-[11px]'}`}>{m.role}</p></div></div>
        <div className="flex items-center gap-4">
          <Donut p={overall} r={26} s={64}/>
          <div className="flex-1 space-y-1 text-[11px]">
            {[["No status","bg-slate-300","text-slate-500",undefined],["On track","bg-emerald-500","text-emerald-700","on_track"],["At risk","bg-amber-400","text-amber-700","at_risk"],["Off track","bg-red-500","text-red-700","off_track"],["Achieved","bg-slate-700","text-slate-700","achieved"]].map(([label,dot,text,st])=>(
              <div key={label as string} className={`flex items-center justify-between ${text}`}>
                <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${dot}`}/>{label}</span>
                <span className="font-medium">{cnt(st as string|undefined)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={onShowGoals} className="text-[12px] text-indigo-600 hover:text-indigo-800 font-medium">View all goals →</button>
        </div>
      </div>
      {show && <div className="divide-y divide-slate-50">
        {parents.length===0
          ? <p className="text-[12px] text-slate-400 text-center py-6">No goals.</p>
          : parents.map(g=>(
            <div key={g.id} className={`px-5 hover:bg-slate-50/50 ${cardSize === 'mini' ? 'py-2' : cardSize === 'large' ? 'py-4' : 'py-3.5'}`}>
              <p className={`font-medium text-slate-800 mb-2 ${cardSize === 'mini' ? 'text-[12px]' : cardSize === 'large' ? 'text-[14px]' : 'text-[13px]'}`}>{g.title}</p>
              <PBar g={g}/>
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  <Badge status={g.status}/>
                  {(g.status === 'at_risk' || g.status === 'off_track') && (
                    <RiskExplanationPopover goalId={g.id} reporteeId={m.id} />
                  )}
                  <AIGoalStatusPill goalId={g.id} reporteeId={m.id} currentStatus={g.status} onStatusUpdated={() => window.location.reload()} />
                </div>
                {g.completedAt && <span className="text-[11px] text-slate-400">{new Date(g.completedAt).toISOString().slice(0, 10)}</span>}
              </div>
            </div>
          ))}
      </div>}
    </div>
  );
}

/* Main */
export function GoalsPageClient({ goals, teamMembers=[] }: { goals: GoalRow[]; teamMembers?: TeamMember[] }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"list"|"user">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(searchParams.get('user') || 'All Team');
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<string,string[]>>>({});
  const [order, setOrder] = useState(() => goals.filter(g=>!g.parentId).map(g=>g.id));
  const [dragId, setDragId] = useState<number|null>(null);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalUserId, setNewGoalUserId] = useState(teamMembers[0]?.id || 0);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // AI Goal Drafter State
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiSentence, setAiSentence] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isMakingSmart, setIsMakingSmart] = useState(false);
  const [draftedGoal, setDraftedGoal] = useState<any>(null);
  const [workloadWarning, setWorkloadWarning] = useState<string | null>(null);
  
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
  const [aiSuggestedSubgoals, setAiSuggestedSubgoals] = useState<string[]>([]);

  const handleAiDraft = async () => {
    if (!aiSentence.trim()) return;
    setIsDrafting(true);
    setWorkloadWarning(null);
    setAiSuggestedTags([]);
    setAiSuggestedSubgoals([]);
    try {
      const res = await fetch("/api/ai-goal-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: aiSentence })
      });
      const data = await res.json();
      setDraftedGoal(data);
      setNewGoalTitle(data.title);
      setNewGoalUserId(data.suggestedOwnerId || teamMembers[0]?.id);
      if (data.workloadWarning) setWorkloadWarning(data.workloadWarning);
      
      // Seed suggestions
      if (data.tags) setAiSuggestedTags(data.tags);
      if (data.subgoals) setAiSuggestedSubgoals(data.subgoals);
      
      // Initialize draftedGoal's internal arrays to empty since they start as suggestions
      setDraftedGoal({ ...data, tags: [], subgoals: [] });
    } catch (e) {
      console.error(e);
    }
    setIsDrafting(false);
  };

  const handleMakeSmart = async () => {
    if (!newGoalTitle.trim()) return;
    setIsMakingSmart(true);
    try {
      const res = await fetch("/api/ai-make-smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newGoalTitle })
      });
      const data = await res.json();
      if (data.title) setNewGoalTitle(data.title);
    } catch (e) {
      console.error(e);
    }
    setIsMakingSmart(false);
  };
  const { cardConfig } = useCardConfig();
  const cardSize = cardConfig.cardSize || 'compact';

  const childMap = useMemo(() => {
    const m: Record<number,GoalRow[]> = {};
    goals.filter(g=>g.parentId).forEach(g=>{ if(!m[g.parentId!]) m[g.parentId!]=[]; m[g.parentId!].push(g); });
    return m;
  }, [goals]);

  const toggleColFilter = (col: string, val: string) => {
    setColFilters(prev => {
      const cur = prev[col] || [];
      return { ...prev, [col]: cur.includes(val) ? cur.filter(v=>v!==val) : [...cur, val] };
    });
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) { setSortDir(d => d==="asc"?"desc":d==="desc"?null:"asc"); if (sortDir==="desc") setSortCol(null); }
    else { setSortCol(col); setSortDir("asc"); }
  };

  const parents = goals.filter(g=>!g.parentId);
  const statusValues = [...new Set(parents.map(g=>g.status||"No status"))];
  const userValues = [...new Set(parents.map(g=>g.ownerName))];

  let displayed = parents.filter(g => {
    const ms = !search || g.title.toLowerCase().includes(search.toLowerCase()) || g.ownerName.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter==="all" || g.status===statusFilter;
    const csf = !colFilters.status?.length || colFilters.status.includes(g.status||"No status");
    const cuf = !colFilters.user?.length || colFilters.user.includes(g.ownerName);
    return ms && mf && csf && cuf;
  });

  if (sortCol && sortDir) {
    displayed = [...displayed].sort((a,b) => {
      let av: string|number = "", bv: string|number = "";
      if (sortCol==="title") { av=a.title; bv=b.title; }
      else if (sortCol==="user") { av=a.ownerName; bv=b.ownerName; }
      else if (sortCol==="progress") { av=pct(a); bv=pct(b); }
      else if (sortCol==="status") { av=a.status||""; bv=b.status||""; }
      else if (sortCol==="completed") { av=a.completedAt||""; bv=b.completedAt||""; }
      return sortDir==="asc" ? (av<bv?-1:av>bv?1:0) : (av>bv?-1:av<bv?1:0);
    });
  } else {
    displayed = order.map(id=>displayed.find(g=>g.id===id)).filter(Boolean) as GoalRow[];
  }

  const overallGoals = displayed;
  const overall = overallGoals.length>0 ? Math.round(overallGoals.reduce((s,g)=>s+g.progress,0)/overallGoals.length) : 0;
  const cnt = (s?:string) => overallGoals.filter(g=>g.status===s).length;
  const circ=2*Math.PI*34, dash=circ-(overall/100)*circ;

  const isFilterActive = search || statusFilter !== "all" || Object.values(colFilters).some(v => v && v.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-5 pb-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Goals</h1>
          <div className="flex items-center gap-1">
            {["all","on_track","at_risk","off_track","achieved"].map(f=>(
              <button key={f} onClick={()=>setStatusFilter(f)} className={`px-2.5 py-1.5 text-[12px] sm:text-[13px] font-medium rounded-md transition-colors ${statusFilter===f?"bg-slate-900 text-white":"text-slate-500 hover:bg-slate-100"}`}>
                {f==="all"?"All":STATUS_MAP[f]?.label||f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isFilterActive ? (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setColFilters({}); }} className="text-[11px] text-indigo-600 font-medium hover:text-indigo-800 transition-colors flex items-center gap-1 mr-1 bg-indigo-50 px-2 py-1 rounded shrink-0">
              <X className="w-3 h-3" /> Clear filters
            </button>
          ) : null}
          <div className="relative min-w-[120px] max-w-[180px] sm:max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search goals..." className="w-full pl-8 pr-4 py-1.5 text-[12px] bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400 shadow-sm"/>
          </div>
          <button onClick={() => setShowNewGoal(true)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-700 text-white text-[13px] font-medium rounded-md transition-colors shadow-sm shrink-0"><Plus className="w-4 h-4"/> New goal</button>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 space-y-5 flex flex-col overflow-hidden">
        {/* Summary bar */}
        <div className="flex items-center gap-6 p-5 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0">
          <div className="relative shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="34" fill="none" stroke="#f1f5f9" strokeWidth="9"/>
              <circle cx="44" cy="44" r="34" fill="none" stroke={overall>=70?"#10b981":overall>=40?"#84cc16":"#f59e0b"} strokeWidth="9" strokeDasharray={circ} strokeDashoffset={dash} strokeLinecap="round" transform="rotate(-90 44 44)" style={{transition:"stroke-dashoffset 0.6s"}}/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-[15px] font-bold text-slate-800">{overall}%</span></div>
          </div>
          <div><p className="text-[13px] font-semibold text-slate-700">Overall progress</p><p className="text-[11px] text-slate-400 mt-0.5">{goals.length} goals</p></div>
          <div className="flex items-center gap-5 text-[12px] ml-4">
            {[["No status","bg-slate-300","text-slate-500",undefined],["On track","bg-emerald-500","text-emerald-700","on_track"],["At risk","bg-amber-400","text-amber-700","at_risk"],["Off track","bg-red-500","text-red-700","off_track"],["Achieved","bg-slate-700","text-slate-700","achieved"]].map(([l,d,t,s])=>(
              <div key={l as string} className={`flex items-center gap-1.5 ${t}`}><span className={`w-2 h-2 rounded-full ${d} shrink-0`}/>{cnt(s as string|undefined)} {l}</div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {([["list","List view",<List key="l" className="w-3.5 h-3.5"/>],["user","User view",<User key="u" className="w-3.5 h-3.5"/>]] as [string,string,React.ReactNode][]).map(([id,label,icon])=>(
              <button key={id} onClick={()=>setView(id as "list"|"user")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${view===id?"bg-slate-900 text-white shadow-sm":"text-slate-500 hover:text-slate-800 hover:bg-white"}`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {view==="list" && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-3 pl-4 pr-2"><ColHeader label="Title" col="title" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}/></th>
                      <th className="text-left py-3 pr-4 w-36"><ColHeader label="User" col="user" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} filterValues={userValues} activeFilters={colFilters.user} onFilter={v=>toggleColFilter("user",v)}/></th>
                      <th className="text-left py-3 pr-4 w-52"><ColHeader label="Progress" col="progress" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}/></th>
                      <th className="text-left py-3 pr-4 w-32"><ColHeader label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} filterValues={statusValues} activeFilters={colFilters.status} onFilter={v=>toggleColFilter("status",v)}/></th>
                      <th className="text-left py-3 pr-4 w-36"><ColHeader label="Completed" col="completed" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}/></th>
                      <th className="w-16"/>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length===0
                      ? <tr><td colSpan={6} className="py-16 text-center text-[13px] text-slate-400">No goals found.</td></tr>
                      : displayed.map(g=>(
                        <LRow key={g.id} goal={g} childMap={childMap} depth={0}
                          onEdit={()=>{}}
                          onDragStart={id=>setDragId(id)}
                          onDragOver={e=>e.preventDefault()}
                          onDrop={toId=>{
                            if (dragId===null||dragId===toId) return;
                            setOrder(prev=>{
                              const next=[...prev];
                              const fi=next.indexOf(dragId), ti=next.indexOf(toId);
                              if(fi<0||ti<0) return prev;
                              next.splice(fi,1); next.splice(ti,0,dragId);
                              return next;
                            });
                            setDragId(null);
                          }}
                          cardSize={cardSize}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {view==="user" && (
          <div className="overflow-y-auto flex-1 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teamMembers
                .map(m => {
                  const filteredGoals = m.goals.filter(g => {
                    if (g.parentId) return true; // keep children
                    const ms = !search || g.title.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
                    const mf = statusFilter==="all" || g.status===statusFilter;
                    const csf = !colFilters.status?.length || colFilters.status.includes(g.status||"No status");
                    const cuf = !colFilters.user?.length || colFilters.user.includes(m.name);
                    return ms && mf && csf && cuf;
                  });
                  return { ...m, goals: filteredGoals };
                })
                .filter(m => !isFilterActive || m.goals.some(g => !g.parentId))
                .map(m=><MCard key={m.id} m={m} cardSize={cardSize} onShowGoals={() => {
                  setColFilters({ user: [m.name] });
                  setView('list');
                }}/>)}
            </div>
          </div>
        )}
      </div>

      {showNewGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowNewGoal(false)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl mx-4 overflow-hidden relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                New Goal 
                <button 
                  onClick={() => setIsAiMode(!isAiMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${isAiMode ? "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Mode
                </button>
              </h3>
              <button onClick={() => setShowNewGoal(false)} className="text-slate-400 hover:bg-slate-100 rounded p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {isAiMode && !draftedGoal && (
                <div className="bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-fuchsia-200/40 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                    <label className="flex items-center gap-2 text-[13px] font-bold text-fuchsia-800 mb-2">
                      <Sparkles className="w-4 h-4" /> Draft from a sentence
                    </label>
                    <textarea 
                      autoFocus
                      rows={3}
                      value={aiSentence}
                      onChange={e => setAiSentence(e.target.value)}
                      placeholder="e.g., Migrate the analytics events to the new schema by Q3 end..."
                      className="w-full px-3 py-2 text-[13px] bg-white border border-fuchsia-200 rounded-lg outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 shadow-sm resize-none mb-3 placeholder:text-fuchsia-300/70"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAiDraft}
                        disabled={isDrafting || !aiSentence.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors shadow-sm"
                      >
                        {isDrafting ? "Drafting..." : "Generate Goal"}
                        {!isDrafting && <Wand2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {workloadWarning && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[12.5px] leading-relaxed">
                    <span className="font-semibold block mb-0.5">Context-Aware Warning</span>
                    {workloadWarning}
                  </div>
                </div>
              )}

              {(!isAiMode || draftedGoal) && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-700 mb-1">Goal Title</label>
                    <div className="flex gap-2">
                      <input type="text" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="e.g. Launch Q3 campaign" className="flex-1 px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                      {!isAiMode && (
                        <button 
                          onClick={handleMakeSmart}
                          disabled={isMakingSmart || !newGoalTitle.trim()}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-600 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isMakingSmart ? "Thinking..." : "Make SMART"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-slate-700 mb-1">Assign To</label>
                    <select value={newGoalUserId} onChange={e => setNewGoalUserId(parseInt(e.target.value))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white appearance-none">
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>

                  {draftedGoal && (
                    <>
                      <div>
                        <label className="block text-[12px] font-medium text-slate-700 mb-1">Description</label>
                        <textarea rows={2} value={draftedGoal.description} onChange={e => setDraftedGoal({...draftedGoal, description: e.target.value})} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white resize-none" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-1">Due Date</label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="date" value={draftedGoal.dueDate} onChange={e => setDraftedGoal({...draftedGoal, dueDate: e.target.value})} className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-1">Tags</label>
                          <input type="text" value={draftedGoal.tags?.join(", ")} onChange={e => setDraftedGoal({...draftedGoal, tags: e.target.value.split(', ')})} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white" />
                        </div>
                      </div>

                      {draftedGoal.subgoals && draftedGoal.subgoals.length > 0 && (
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-2">Accepted Subgoals</label>
                          <div className="space-y-2">
                            {draftedGoal.subgoals.map((sg: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-md px-3 py-2 text-[12.5px] text-slate-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                {sg}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Suggested Additions */}
                      {(aiSuggestedTags.length > 0 || aiSuggestedSubgoals.length > 0) && (
                        <div className="mt-6 p-5 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[13px] font-bold text-fuchsia-800 flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> AI Suggested Additions</h4>
                            <button onClick={() => { setAiSuggestedTags([]); setAiSuggestedSubgoals([]); }} className="text-[12px] font-medium text-fuchsia-600 hover:text-fuchsia-800 transition-colors">Dismiss All</button>
                          </div>
                          
                          {aiSuggestedTags.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[11px] font-semibold text-fuchsia-600/70 uppercase tracking-wider mb-2">Suggested Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {aiSuggestedTags.map(t => (
                                  <div key={t} className="flex items-center gap-1 bg-white border border-fuchsia-200 text-fuchsia-700 px-2.5 py-1 rounded-full text-[12px] font-medium shadow-sm group transition-all hover:border-fuchsia-300">
                                    <span>{t}</span>
                                    <div className="flex items-center ml-1 border-l border-fuchsia-100 pl-1">
                                      <button onClick={() => { setDraftedGoal({...draftedGoal, tags: [...(draftedGoal.tags || []), t]}); setAiSuggestedTags(aiSuggestedTags.filter(x => x !== t)); }} className="p-0.5 hover:bg-fuchsia-100 rounded text-emerald-600 transition-colors" title="Accept"><Check className="w-3 h-3" /></button>
                                      <button onClick={() => setAiSuggestedTags(aiSuggestedTags.filter(x => x !== t))} className="p-0.5 hover:bg-fuchsia-100 rounded text-red-500 transition-colors" title="Reject"><X className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiSuggestedSubgoals.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-fuchsia-600/70 uppercase tracking-wider mb-2">Suggested Subgoals</p>
                              <div className="space-y-2">
                                {aiSuggestedSubgoals.map((sg, i) => (
                                  <div key={i} className="flex items-center justify-between bg-white border border-fuchsia-200 rounded-lg px-3 py-2 shadow-sm group hover:border-fuchsia-300 transition-colors">
                                    <span className="text-[13px] font-medium text-fuchsia-900">{sg}</span>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setDraftedGoal({...draftedGoal, subgoals: [...(draftedGoal.subgoals || []), sg]}); setAiSuggestedSubgoals(aiSuggestedSubgoals.filter((_, idx) => idx !== i)); }} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded text-[11px] font-bold transition-colors">
                                        <Check className="w-3 h-3"/> Accept
                                      </button>
                                      <button onClick={() => setAiSuggestedSubgoals(aiSuggestedSubgoals.filter((_, idx) => idx !== i))} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded text-[11px] font-bold transition-colors">
                                        <X className="w-3 h-3"/> Reject
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button onClick={() => { setShowNewGoal(false); setDraftedGoal(null); setIsAiMode(false); setWorkloadWarning(null); }} className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button 
                disabled={!newGoalTitle.trim() || isSavingGoal || !newGoalUserId}
                onClick={async () => {
                  setIsSavingGoal(true);
                  try {
                    // Simulating a save to DB
                    await fetch("/api/add-goal", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reporteeId: newGoalUserId, title: newGoalTitle, status: "on_track" })
                    });
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                  }
                  setIsSavingGoal(false);
                }} 
                className="px-4 py-2 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSavingGoal ? "Saving..." : "Create Goal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
