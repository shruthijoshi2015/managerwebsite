"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, List, LayoutGrid, CheckCircle2, Circle, AlertCircle, Clock, ChevronDown, MessageSquare, Paperclip, ArrowUpDown, ArrowUp, ArrowDown, Check, Pencil, X, Plus } from "lucide-react";
import { ActionModal } from "./ActionModal";

type SortDir = "asc" | "desc" | null;
type SortCol = "task" | "member" | "priority" | "status" | "timeframe" | null;

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
      <button className="flex items-center gap-1 text-[12px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors" onClick={() => setOpen(v => !v)}>
        {label} <Icon className="w-3.5 h-3.5" />
        {activeFilters && activeFilters.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </button>
      {open && (
        <div className="absolute top-6 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-1 font-normal capitalize" onMouseLeave={() => setOpen(false)}>
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

export function ActionItemsClient({ team }: { team: any[] }) {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const u = searchParams.get('user');
    if (u) setFilterTeam(u);
  }, [searchParams]);
  const [view, setView] = useState<'list' | 'grouped'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_actions_view');
      if (saved === 'list' || saved === 'grouped') return saved;
    }
    return 'list';
  });
  const handleSetView = (v: 'list' | 'grouped') => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('manager_pref_actions_view', v);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState(searchParams.get('user') || 'All');
  const [showActionModal, setShowActionModal] = useState(false);

  // Edit Action Item State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskAssignee, setEditTaskAssignee] = useState<number>(team[0]?.id || 0);
  const [editTaskPriority, setEditTaskPriority] = useState<string>("P2");
  const [editTaskStatus, setEditTaskStatus] = useState<string>("pending");
  const [editTaskTimeframe, setEditTaskTimeframe] = useState<string>("");
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);

  const handleEditClick = (item: any) => {
    setEditingItem(item);
  };

  const handleToggleStatus = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = item.status === 'resolved' ? 'pending' : 'resolved';
    try {
      await fetch("/api/update-action-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          reporteeId: item.member.id,
          status: newStatus
        })
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  // Sorting & Column Filtering State
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<string, string[]>>>({});

  const toggleColFilter = (col: string, val: string) => {
    setColFilters(prev => {
      const cur = prev[col] || [];
      return { ...prev, [col]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : d === "desc" ? null : "asc");
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // Extract all Action Items
  const allActionItems = useMemo(() => {
    const items: any[] = [];
    team.forEach(member => {
      if (member.notes) {
        member.notes.forEach((note: any) => {
          if (note.aiSummary?.followUps) {
            note.aiSummary.followUps.forEach((fUp: any, i: number) => {
              // Deterministic pseudo-random status and priority for UI demo
              const charCode = fUp.task.charCodeAt(0) || 0;
              const isResolved = i % 4 === 0;
              const status = isResolved ? 'resolved' : charCode % 2 === 0 ? 'in_progress' : 'pending';
              const priority = charCode % 3 === 0 ? 'P0' : charCode % 2 === 0 ? 'P1' : 'P2';
              
              items.push({
                id: `ai-${note.id}-${i}`,
                task: fUp.task,
                timeframe: fUp.timeframe,
                status,
                priority,
                noteType: note.type,
                owner: fUp.owner || 'reportee',
                date: note.date,
                member: { id: member.id, name: member.name, role: member.role, avatar: member.name.substring(0, 2).toUpperCase(), colorIndex: member.id }
              });
            });
          }
        });
      }
      
      if (member.tasks) {
        member.tasks.forEach((task: any) => {
          items.push({
            id: `manual-${task.id}`,
            task: task.title,
            timeframe: task.timeframe || 'No Due Date',
            status: task.status || (task.done ? 'resolved' : 'pending'),
            priority: task.priority || 'P2',
            noteType: 'Manual Task',
            owner: task.owner || 'reportee',
            date: task.completedAt || new Date().toISOString(),
            member: { id: member.id, name: member.name, role: member.role, avatar: member.name.substring(0, 2).toUpperCase(), colorIndex: member.id }
          });
        });
      }
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [team]);

  const memberValues = useMemo(() => [...new Set(allActionItems.map(i => i.member.name))], [allActionItems]);
  const priorityValues = useMemo(() => [...new Set(allActionItems.map(i => i.priority))], [allActionItems]);
  const statusValues = useMemo(() => [...new Set(allActionItems.map(i => i.status))], [allActionItems]);

  const filteredItems = useMemo(() => {
    let items = allActionItems.filter(item => {
      const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = filterTeam === 'All' || item.member.name === filterTeam;
      const matchesColMember = !colFilters.member?.length || colFilters.member.includes(item.member.name);
      const matchesColPriority = !colFilters.priority?.length || colFilters.priority.includes(item.priority);
      const matchesColStatus = !colFilters.status?.length || colFilters.status.includes(item.status);
      return matchesSearch && matchesTeam && matchesColMember && matchesColPriority && matchesColStatus;
    });

    if (sortCol && sortDir) {
      items = [...items].sort((a, b) => {
        let av = "";
        let bv = "";
        if (sortCol === "task") { av = a.task; bv = b.task; }
        else if (sortCol === "member") { av = a.member.name; bv = b.member.name; }
        else if (sortCol === "priority") { av = a.priority; bv = b.priority; }
        else if (sortCol === "status") { av = a.status; bv = b.status; }
        else if (sortCol === "timeframe") { av = a.timeframe; bv = b.timeframe; }
        return sortDir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
      });
    }
    return items;
  }, [allActionItems, searchQuery, filterTeam, colFilters, sortCol, sortDir]);

  // Group items by member for the grouped view
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.member.name]) groups[item.member.name] = [];
      groups[item.member.name].push(item);
    });
    return Object.entries(groups).map(([name, items]) => ({
      name,
      avatar: items[0].member.avatar,
      colorIndex: items[0].member.colorIndex || 0,
      items
    }));
  }, [filteredItems]);

  const getPriorityColor = (p: string) => {
    if (p === 'P0') return "bg-rose-100 text-rose-700 border-rose-200";
    if (p === 'P1') return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getStatusIcon = (s: string) => {
    if (s === 'resolved') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === 'in_progress') return <Clock className="w-4 h-4 text-amber-500" />;
    return <Circle className="w-4 h-4 text-slate-300" />;
  };

  const getStatusText = (s: string) => {
    if (s === 'resolved') return "Resolved";
    if (s === 'in_progress') return "In Progress";
    return "Pending";
  };

  const getStatusBadgeClass = (s: string) => {
    if (s === 'resolved') return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === 'in_progress') return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === 'blocked') return "bg-red-50 text-red-700 border-red-200";
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 h-full flex flex-col relative bg-[#f8f9fa] overflow-y-auto">
      {/* Header */}
      <div className="px-6 lg:px-8 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Action Items</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => handleSetView('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button 
              onClick={() => handleSetView('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'grouped' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grouped
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block shrink-0"></div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[12px] sm:text-[13px] font-medium text-slate-600 shadow-sm relative shrink-0 max-w-[130px] sm:max-w-[160px]">
            <select className="appearance-none bg-transparent outline-none pr-4 w-full cursor-pointer text-ellipsis" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="All">Filter By Team</option>
              {Array.from(new Set(allActionItems.map(m => m.member.name))).map(name => (
                <option key={name as string} value={name as string}>{name as string}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          <div className="relative min-w-[120px] max-w-[160px] sm:max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search actions..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 w-full bg-white border border-slate-200 rounded-lg text-[12px] sm:text-[13px] outline-none focus:border-indigo-400 shadow-sm"
            />
          </div>

          <button 
            onClick={() => setShowActionModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] sm:text-[13px] font-semibold rounded-lg transition-colors shadow-sm ml-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        </div>
      </div>

      <div className="px-8 pt-6 pb-24 max-w-7xl mx-auto w-full">

      {showActionModal && (
        <ActionModal team={team} onClose={() => setShowActionModal(false)} />
      )}

      {/* Views */}
      {view === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4"><ColHeader label="Task Description" col="task" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-6 py-4"><ColHeader label="Assignee" col="member" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} filterValues={memberValues} activeFilters={colFilters.member} onFilter={v=>toggleColFilter("member",v)} /></th>
                <th className="px-6 py-4"><ColHeader label="Priority" col="priority" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} filterValues={priorityValues} activeFilters={colFilters.priority} onFilter={v=>toggleColFilter("priority",v)} /></th>
                <th className="px-6 py-4"><ColHeader label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} filterValues={statusValues} activeFilters={colFilters.status} onFilter={v=>toggleColFilter("status",v)} /></th>
                <th className="px-6 py-4"><ColHeader label="Due / Timeframe" col="timeframe" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={(e) => handleToggleStatus(item, e)} className="mt-0.5 p-0.5 hover:scale-110 transition-transform cursor-pointer focus:outline-none shrink-0" title={item.status === 'resolved' ? "Mark unresolved" : "Mark resolved (close)"}>
                        {getStatusIcon(item.status)}
                      </button>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[14px] font-medium leading-snug ${item.status === 'resolved' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {item.task}
                        </span>
                        {item.owner === 'manager' && (
                          <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 rounded-sm shrink-0 whitespace-nowrap">My Action</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {item.member.avatar}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700">{item.member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[12px] font-semibold text-slate-500">
                      {item.timeframe}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100" title="Edit Action Item">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto py-6">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <h3 className="text-[15px] font-bold text-slate-800 mb-1">No action items found</h3>
                      <p className="text-[13px] text-slate-500 mb-4">No action items match your current filter or search criteria.</p>
                      <button onClick={() => { setSearchQuery(''); setFilterTeam('All'); setColFilters({}); }} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[13px] font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'grouped' && (
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x animate-in fade-in duration-200">
          {groupedItems.map((group, idx) => {
            const columnColors = [
              "bg-blue-50/50", "bg-emerald-50/50", "bg-purple-50/50", "bg-amber-50/50", "bg-rose-50/50", "bg-cyan-50/50"
            ];
            const headerColors = [
              "bg-blue-500", "bg-emerald-400", "bg-purple-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400"
            ];
            const colBg = columnColors[group.colorIndex % columnColors.length];
            const headBg = headerColors[group.colorIndex % headerColors.length];
            
            return (
              <div key={group.name} className={`min-w-[300px] w-[300px] rounded-2xl shrink-0 snap-start flex flex-col ${colBg}`}>
                <div className={`relative w-full h-[120px] rounded-t-2xl ${headBg} p-4 flex flex-col items-center justify-end mb-4`}>
                  {/* Avatar overlapping top border */}
                  <div className="absolute -top-6 w-12 h-12 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center overflow-hidden z-10 text-slate-700 font-bold text-[14px]">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=f1f5f9&color=475569`} alt="avatar" />
                  </div>
                  
                  {/* White card info box */}
                  <div className="w-full bg-white/90 backdrop-blur-sm rounded-xl py-3 px-4 text-center shadow-sm">
                    <h2 className="text-[15px] font-bold text-slate-800">{group.name}</h2>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">({group.items.length} items)</p>
                  </div>
                </div>
                
                  <div className="px-4 pb-4 flex flex-col gap-3 flex-1 overflow-y-auto">
                    {group.items.map(item => (
                      <div key={item.id} className={`bg-white border ${item.status === 'resolved' ? 'border-slate-100 opacity-60' : 'border-slate-200'} rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button type="button" onClick={(e) => handleToggleStatus(item, e)} className="w-4 h-4 rounded border-2 border-slate-300 mt-0.5 shrink-0 flex items-center justify-center text-white bg-white hover:border-indigo-500 transition-colors cursor-pointer focus:outline-none" title={item.status === 'resolved' ? "Mark unresolved" : "Mark resolved (close)"}>
                              {item.status === 'resolved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <p className={`text-[14px] font-bold leading-snug ${item.status === 'resolved' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {item.task}
                              </p>
                              {item.owner === 'manager' && (
                                <span className="w-fit px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 rounded-sm shrink-0 whitespace-nowrap">My Action</span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded hover:bg-slate-100 shrink-0" title="Edit Action Item">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3 pl-7 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityColor(item.priority)}`}>
                            {item.priority === 'P0' ? 'High' : item.priority === 'P1' ? 'Medium' : 'Low'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-auto">
                             <Clock className="w-3 h-3" />
                             {item.timeframe === 'No Due Date' ? 'No date' : item.timeframe}
                          </span>
                        </div>
                        
                        <div className="flex justify-end items-center gap-3 text-slate-300 mt-2">
                          <MessageSquare className="w-4 h-4 hover:text-slate-400" />
                          <Paperclip className="w-4 h-4 hover:text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          {filteredItems.length === 0 && (
            <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center my-6 max-w-xl mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-800 mb-1">No action items found</h3>
              <p className="text-[13px] text-slate-500 mb-4">No action items match your current filter or search criteria.</p>
              <button onClick={() => { setSearchQuery(''); setFilterTeam('All'); setColFilters({}); }} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[13px] font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {editingItem && (
        <ActionModal
          editTask={{
            id: editingItem.id,
            title: editingItem.task,
            status: editingItem.status,
            priority: editingItem.priority,
            timeframe: editingItem.timeframe,
            owner: editingItem.owner || 'reportee'
          } as any}
          reporteeId={editingItem.member.id}
          team={team}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
