"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useIndexedDB } from "./IndexedDBProvider";
import { Target, Plus, Search, ChevronDown, ChevronRight, MoreHorizontal, GripVertical, ArrowUpDown, ArrowUp, ArrowDown, List, User, Pencil, X, Check, Sparkles, Wand2, AlertTriangle, Calendar } from "lucide-react";
import type { Goal } from "@/lib/db";
import { useCardConfig } from "@/lib/CardConfigContext";
import { AIGoalStatusPill } from "./AIGoalStatusPill";
import { RiskExplanationPopover } from "./RiskExplanationPopover";
import { GoalModal } from "./ProfileLayoutClient";

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
  const router = useRouter();
  const { persistAfterMutation } = useIndexedDB();
  const [expanded, setExpanded] = useState(true);
  const children = childMap[goal.id] || [];
  const p = pct(goal);
  const fmt = (d?: string) => d ? new Date(d).toISOString().slice(0, 10) : "—";

  const handleStatusUpdated = async () => {
    await persistAfterMutation();
    router.refresh();
  };

  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors group cursor-pointer ${cardSize === 'mini' ? 'text-[11px]' : cardSize === 'large' ? 'text-[14px]' : 'text-[13px]'}`}
        draggable onDragStart={() => onDragStart(goal.id)} onDragOver={onDragOver} onDrop={() => onDrop(goal.id)}>
        {/* Title */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pl-4 pr-3 max-w-[320px]`}>
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
            {children.length > 0 ? (
              <button type="button" onClick={() => setExpanded(v=>!v)} className="p-0.5 rounded hover:bg-slate-200 text-slate-400 shrink-0">
                {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
              </button>
            ) : <span className="w-4 shrink-0"/>}
            <span className="cursor-grab text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"><GripVertical size={13}/></span>
            <span className="font-semibold text-slate-800 hover:text-indigo-600 truncate transition-colors cursor-pointer" onClick={() => onEdit(goal)}>{goal.title}</span>
          </div>
        </td>
        {/* User */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-36`}>
          <span className="flex items-center gap-1.5 text-slate-600 truncate">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-600">{goal.ownerName.slice(0,2).toUpperCase()}</span>
            <span className="truncate">{goal.ownerName}</span>
          </span>
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
            <AIGoalStatusPill goalId={goal.id} reporteeId={goal.ownerId} currentStatus={goal.status} onStatusUpdated={handleStatusUpdated} />
          </div>
        </td>
        {/* Completed */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-4 w-36 ${cardSize === 'mini' ? 'text-[11px]' : 'text-[12px]'} text-slate-500`}>{fmt(goal.completedAt)}</td>
        {/* Actions */}
        <td className={`py-${cardSize === 'mini' ? '1.5' : cardSize === 'large' ? '4' : '3'} pr-2 w-20`}>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(goal); }} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-100" title="Edit Goal">
              <Pencil className="w-3.5 h-3.5" />
            </button>
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
  const router = useRouter();
  const { persistAfterMutation } = useIndexedDB();
  const [show, setShow] = useState(false);
  const parents = m.goals.filter(g => !g.parentId);
  const overall = m.goals.length > 0 ? Math.round(m.goals.reduce((s,g) => s+g.progress,0)/m.goals.length) : 0;
  const cnt = (s?: string) => m.goals.filter(g => g.status===s).length;
  
  const pad = cardSize === 'mini' ? 'p-3' : cardSize === 'large' ? 'p-6' : 'p-5';
  
  const handleStatusUpdated = async () => {
    await persistAfterMutation();
    router.refresh();
  };

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
                  <AIGoalStatusPill goalId={g.id} reporteeId={m.id} currentStatus={g.status} onStatusUpdated={handleStatusUpdated} />
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const u = searchParams.get('user');
    if (u) {
      setSelectedUser(u);
      setColFilters({ user: [u] });
    }
    if (searchParams.get('new') === 'true') {
      setShowNewGoal(true);
    }
  }, [searchParams]);
  const [view, setView] = useState<"list"|"user">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_goals_view');
      if (saved === 'list' || saved === 'user') return saved;
    }
    return "list";
  });
  const handleSetView = (v: "list" | "user") => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('manager_pref_goals_view', v);
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(searchParams.get('user') || 'All Team');
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<string,string[]>>>(() => {
    const u = searchParams.get('user');
    return u ? { user: [u] } : {};
  });
  const [order, setOrder] = useState(() => goals.filter(g=>!g.parentId).map(g=>g.id));
  const [dragId, setDragId] = useState<number|null>(null);
  const [showNewGoal, setShowNewGoal] = useState(searchParams.get('new') === 'true');
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalUserId, setNewGoalUserId] = useState(teamMembers[0]?.id || 0);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUserId, setEditUserId] = useState<number>(teamMembers[0]?.id || 0);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("on_track");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  const handleEditClick = (g: GoalRow) => {
    setEditingGoal(g);
    setEditTitle(g.title);
    setEditUserId(g.ownerId);
    setEditProgress(g.progress);
    setEditStatus(g.status || "on_track");
    setEditDueDate(g.dueDate || "");
    setEditDescription(g.description || "");
  };

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

  if (!mounted) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="px-6 lg:px-8 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
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

      <div className="flex-1 px-8 pt-6 pb-4 max-w-7xl mx-auto w-full space-y-5 flex flex-col overflow-hidden">
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
              <button key={id} onClick={()=>handleSetView(id as "list"|"user")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${view===id?"bg-slate-900 text-white shadow-sm":"text-slate-500 hover:text-slate-800 hover:bg-white"}`}>
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
                          onEdit={handleEditClick}
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
                  handleSetView('list');
                }}/>)}
            </div>
          </div>
        )}
      </div>

      {showNewGoal && (
        <GoalModal 
          reporteeId={newGoalUserId} 
          allGoals={goals} 
          teamMembers={teamMembers}
          onReporteeChange={(id) => setNewGoalUserId(id)}
          onClose={() => { setShowNewGoal(false); setDraftedGoal(null); setIsAiMode(false); setWorkloadWarning(null); }} 
        />
      )}

      {editingGoal && (
        <GoalModal 
          reporteeId={editUserId} 
          allGoals={goals} 
          editGoal={editingGoal}
          teamMembers={teamMembers}
          onReporteeChange={(id) => setEditUserId(id)}
          onClose={() => setEditingGoal(null)} 
        />
      )}
    </div>
  );
}
