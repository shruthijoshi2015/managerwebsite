"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, Calendar, MessageSquare, CheckCircle2, Circle, LayoutTemplate, Columns, Search, Filter, Plus, Activity } from "lucide-react";

export function NotesHubClient({ team }: { team: any[] }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'timeline' | 'board'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState(searchParams.get('user') || 'All');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => setExpandedNotes(prev => ({...prev, [id]: !prev[id]}));

  // Extract all notes
  const allNotes = React.useMemo(() => team.flatMap(member => 
    (member.notes || []).map((note: any) => ({
      ...note,
      member: { id: member.id, name: member.name, role: member.role }
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [team]);

  // Extract all Action Items / Follow-ups for the Board View deterministically
  const actionItems = React.useMemo(() => {
    return allNotes.flatMap(note => 
      (note.aiSummary?.followUps || []).map((fUp: any, i: number) => {
        const status = i % 3 === 0 ? 'resolved' : i % 2 === 0 ? 'pending' : 'action_items';
        return {
          ...fUp,
          noteId: note.id,
          date: note.date,
          member: note.member,
          status
        }
      })
    );
  }, [allNotes]);

  const filteredNotes = allNotes.filter(note => {
    const contentText = note.content || '';
    const summaryText = note.aiSummary?.tldr || '';
    const matchesSearch = contentText.toLowerCase().includes(searchQuery.toLowerCase()) || summaryText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = filterTeam === 'All' || note.member.name === filterTeam;
    return matchesSearch && matchesTeam;
  });

  const formatHeaderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (isToday) return `TODAY, ${formatted.toUpperCase()}`;
    if (isYesterday) return `YESTERDAY, ${formatted.toUpperCase()}`;
    return formatted.toUpperCase();
  };

  const gradients = [
    "bg-gradient-to-br from-emerald-100 to-cyan-100",
    "bg-gradient-to-br from-indigo-100 to-purple-100",
    "bg-gradient-to-br from-rose-100 to-orange-100",
    "bg-gradient-to-br from-blue-100 to-indigo-100",
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-12 relative z-20">
        <div className="flex bg-slate-100/80 p-1 rounded-lg">
          <button 
            onClick={() => setView('timeline')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${view === 'timeline' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity className="w-4 h-4" /> Timeline View
          </button>
          <button 
            onClick={() => setView('board')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${view === 'board' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Columns className="w-4 h-4" /> Board View
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-600 shadow-sm relative">
            <select className="appearance-none bg-transparent outline-none pr-4 w-full cursor-pointer" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="All">Filter By Team</option>
              {Array.from(new Set(team.map(m => m.name))).map(name => (
                <option key={name as string} value={name as string}>{name as string}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 absolute right-3 pointer-events-none">⌄</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Notes" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-48 bg-white border border-slate-200 rounded-lg text-[13px] outline-none focus:border-indigo-400 shadow-sm"
            />
          </div>
          <Link href="/team" className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg transition-colors shadow-sm">
            Add Note
          </Link>
        </div>
      </div>

      {view === 'timeline' && (
        <div className="relative mt-8">
          {/* Center Timeline Line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-slate-200 hidden md:block" />

          <div className="space-y-16">
            {filteredNotes.map((note: any, idx: number) => {
              const isEven = idx % 2 === 0;
              const datePill = formatHeaderDate(note.date);
              const initials = note.member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              const gradient = gradients[idx % gradients.length];

              return (
                <div key={note.id} className="relative w-full">
                  
                  {/* Center Date Pill & Dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 -top-10 items-center gap-2 z-10">
                     <div className="px-3 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600 tracking-wide border border-slate-200/60 shadow-sm">
                       {datePill}
                     </div>
                  </div>
                  <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-6 w-4 h-4 bg-slate-200 rounded-full border-4 border-white z-10" />

                  {/* The Row container (handles alternating layout) */}
                  <div className={`md:flex ${isEven ? 'justify-start' : 'justify-end'} w-full`}>
                    
                    {/* The Card */}
                    <div className={`w-full md:w-[calc(50%-3rem)] ${gradient} rounded-[20px] p-6 shadow-sm border border-white/50 relative overflow-hidden transition-all hover:shadow-md group`}>
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-[17px] font-bold text-slate-900 leading-tight">
                            {note.type === '1:1' ? `1:1 with ${note.member.name.split(' ')[0]}` : `${note.type} Notes`}
                          </h3>
                          <p className="text-[13px] text-slate-600 font-medium opacity-80">{note.member.role}</p>
                        </div>
                      </div>

                      <div className="text-[14px] text-slate-800/90 leading-relaxed font-medium mb-5">
                        {note.aiSummary?.tldr || note.content}
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-black/5 text-slate-700 rounded-full text-[11px] font-bold">
                          {note.type === '1:1' ? 'Summary' : 'Team Note'}
                        </span>
                        {note.aiSummary?.followUps?.length > 0 && (
                          <button onClick={() => toggleNote(note.id)} className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 rounded-full text-[11px] font-bold transition-colors">
                            {expandedNotes[note.id] ? 'Hide' : 'View'} {note.aiSummary.followUps.length} Action Items
                          </button>
                        )}
                      </div>

                      {expandedNotes[note.id] && note.aiSummary?.followUps?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/20 animate-in slide-in-from-top-2 duration-200">
                           <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-3">Action Items</h4>
                           <div className="space-y-2">
                             {note.aiSummary.followUps.map((fUp: any, i: number) => (
                               <div key={i} className="flex items-start gap-2.5 bg-white/50 p-3 rounded-lg shadow-sm">
                                 <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                 <div>
                                   <p className="text-[13px] font-medium text-slate-900 leading-tight mb-1">{fUp.task}</p>
                                   <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                                     {fUp.timeframe}
                                   </span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Column 1 */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
            <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
              Action Items <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{actionItems.filter(i => i.status === 'action_items').length}</span>
            </h3>
            <div className="space-y-3">
              {actionItems.filter(i => i.status === 'action_items').map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <Circle className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                    <p className="text-[14px] font-medium text-slate-800 leading-snug">{item.task}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[11px] font-bold uppercase">{item.timeframe}</span>
                    <span className="text-[12px] font-semibold text-slate-500">{item.member.name.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2 */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
            <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
              Pending Follow-ups <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{actionItems.filter(i => i.status === 'pending').length}</span>
            </h3>
            <div className="space-y-3">
              {actionItems.filter(i => i.status === 'pending').map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[14px] font-medium text-slate-800 leading-snug">{item.task}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[11px] font-bold uppercase">{item.timeframe}</span>
                    <span className="text-[12px] font-semibold text-slate-500">{item.member.name.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3 */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
            <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
              Resolved <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{actionItems.filter(i => i.status === 'resolved').length}</span>
            </h3>
            <div className="space-y-3">
              {actionItems.filter(i => i.status === 'resolved').map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 opacity-60">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-[14px] font-medium text-slate-600 line-through leading-snug">{item.task}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[12px] font-semibold text-slate-400">{item.member.name.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
