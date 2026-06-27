"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, List, LayoutGrid, CheckCircle2, Circle, AlertCircle, Clock, ChevronDown, MessageSquare, Paperclip } from "lucide-react";
import { ActionModal } from "./ActionModal";

export function ActionItemsClient({ team }: { team: any[] }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'list' | 'grouped'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState(searchParams.get('user') || 'All');
  const [showActionModal, setShowActionModal] = useState(false);

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
            date: task.completedAt || new Date().toISOString(),
            member: { id: member.id, name: member.name, role: member.role, avatar: member.name.substring(0, 2).toUpperCase(), colorIndex: member.id }
          });
        });
      }
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [team]);

  const filteredItems = useMemo(() => {
    return allActionItems.filter(item => {
      const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = filterTeam === 'All' || item.member.name === filterTeam;
      return matchesSearch && matchesTeam;
    });
  }, [allActionItems, searchQuery, filterTeam]);

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

  return (
    <div className="flex-1 h-full flex flex-col relative bg-[#f8f9fa] overflow-y-auto">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-5 pb-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Action Items</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button 
              onClick={() => setView('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'grouped' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grouped
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block shrink-0"></div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[12px] sm:text-[13px] font-medium text-slate-600 shadow-sm relative shrink-0 max-w-[130px] sm:max-w-[160px]">
            <select className="appearance-none bg-transparent outline-none pr-4 w-full cursor-pointer text-ellipsis" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="All">Filter By Team</option>
              {Array.from(new Set(team.map(m => m.name))).map(name => (
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
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] sm:text-[13px] font-bold rounded-lg transition-colors shadow-sm ml-1 shrink-0"
          >
            New Task
          </button>
        </div>
      </div>

      <div className="p-8 max-w-[1400px] mx-auto pb-24 w-full">

      {showActionModal && (
        <ActionModal team={team} onClose={() => setShowActionModal(false)} />
      )}

      {/* Views */}
      {view === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Task Description</th>
                <th className="px-6 py-4 font-bold">Assignee</th>
                <th className="px-6 py-4 font-bold">Priority</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Source Note</th>
                <th className="px-6 py-4 font-bold">Due / Timeframe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                      <span className={`text-[14px] font-medium leading-snug ${item.status === 'resolved' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {item.task}
                      </span>
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
                    <span className="text-[13px] font-medium text-slate-600">
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-600 border border-slate-200">
                      {item.noteType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[12px] font-semibold text-slate-500">
                      {item.timeframe}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-[14px]">
                    No action items found matching your filters.
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
                    <div key={item.id} className={`bg-white border ${item.status === 'resolved' ? 'border-slate-100 opacity-60' : 'border-slate-200'} rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-4 h-4 rounded border-2 border-slate-300 mt-0.5 shrink-0 flex items-center justify-center text-white bg-white group-hover:border-indigo-400 transition-colors">
                          {item.status === 'resolved' && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                        </div>
                        <p className={`text-[14px] font-bold leading-snug ${item.status === 'resolved' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {item.task}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3 pl-7">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityColor(item.priority)}`}>
                          {item.priority === 'P0' ? 'High' : item.priority === 'P1' ? 'Medium' : 'Low'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
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
          {groupedItems.length === 0 && (
            <div className="w-full py-12 text-center text-slate-500 text-[14px]">
              No action items found matching your filters.
            </div>
          )}
        </div>
      )}
      </div>

    </div>
  );
}
