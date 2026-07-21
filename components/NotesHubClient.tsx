"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, Calendar, MessageSquare, CheckCircle2, Circle, LayoutTemplate, Columns, Search, Filter, Plus, Activity, X, Download, FileText } from "lucide-react";
import { NotesEditor } from "@/components/NotesEditor";

export function NotesHubClient({ team }: { team: any[] }) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'timeline' | 'board'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_notes_view');
      if (saved === 'timeline' || saved === 'board') return saved;
    }
    return 'timeline';
  });
  const handleSetView = (v: 'timeline' | 'board') => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('manager_pref_notes_view', v);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState(searchParams.get('user') || 'All');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number>(team[0]?.id || 0);

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
    <div className="flex-1 h-full flex flex-col relative bg-[#f8f9fa] overflow-y-auto">
      {/* Header */}
      <div className="px-6 lg:px-8 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notes Hub</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex bg-slate-100/80 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => handleSetView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'timeline' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Activity className="w-3.5 h-3.5" /> Timeline View
            </button>
            <button 
              onClick={() => handleSetView('board')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-semibold transition-all ${view === 'board' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Columns className="w-3.5 h-3.5" /> Board View
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[12px] sm:text-[13px] font-medium text-slate-600 shadow-sm relative shrink-0 max-w-[130px] sm:max-w-[160px]">
            <select className="appearance-none bg-transparent outline-none pr-4 w-full cursor-pointer text-ellipsis" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="All">Filter By Team</option>
              {Array.from(new Set(team.map(m => m.name))).map(name => (
                <option key={name as string} value={name as string}>{name as string}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 absolute right-2.5 pointer-events-none">⌄</span>
          </div>
          <div className="relative min-w-[140px] max-w-[180px] sm:max-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search check-ins, notes & takeaways..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] sm:text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 shadow-sm transition-colors"
            />
          </div>
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (!printWindow) return;
              printWindow.document.write(`
                <html>
                <head><title>Check-in Notes Hub Export</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 40px; }
                  h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
                  .note-item { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
                  .note-header { font-weight: bold; font-size: 16px; color: #0f172a; margin-bottom: 6px; }
                  .note-date { font-size: 12px; color: #64748b; margin-bottom: 8px; }
                  .note-content { font-size: 14px; color: #334155; }
                  @media print { body { padding: 0; } }
                </style>
                </head>
                <body>
                  <h1>Check-in Notes Hub (${filterTeam === 'All' ? 'All Team Members' : filterTeam})</h1>
                  ${filteredNotes.map((note: any) => `
                    <div class="note-item">
                      <div class="note-header">${note.type === '1:1' ? `1:1 with ${note.member.name}` : `${note.type} Notes (${note.member.name})`}</div>
                      <div class="note-date">${new Date(note.date).toLocaleDateString()} - Role: ${note.member.role || 'Team Member'}</div>
                      <div class="note-content">${note.content || note.aiSummary?.tldr || ''}</div>
                    </div>
                  `).join('')}
                  <script>window.onload = () => { window.print(); };</script>
                </body>
                </html>
              `);
              printWindow.document.close();
            }}
            title="Export Check-in Notes (.pdf / .doc)"
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold shadow-sm transition-colors shrink-0"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Export Notes (.doc / .pdf)
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold shadow-sm transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </div>

      <div className="px-8 pt-6 pb-24 max-w-7xl mx-auto w-full">
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
                      
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[14px] shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <h3 className="text-[17px] font-bold text-slate-900 leading-tight">
                              {note.type === '1:1' ? `1:1 with ${note.member.name.split(' ')[0]}` : `${note.type} Notes`}
                            </h3>
                            <p className="text-[13px] text-slate-600 font-medium opacity-80">{note.member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (!printWindow) return;
                              printWindow.document.write(`
                                <html>
                                <head><title>${note.type} Note - ${note.member.name}</title>
                                <style>
                                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 40px; }
                                  h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 16px; }
                                  .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
                                  .content { font-size: 15px; color: #1e293b; }
                                  @media print { body { padding: 0; } }
                                </style>
                                </head>
                                <body>
                                  <h1>${note.type === '1:1' ? `1:1 Check-in Note` : `${note.type} Note`} - ${note.member.name}</h1>
                                  <div class="meta">Date: ${new Date(note.date).toLocaleDateString()} | Role: ${note.member.role}</div>
                                  <div class="content">${note.content || note.aiSummary?.tldr || ''}</div>
                                  <script>window.onload = () => { window.print(); };</script>
                                </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }}
                            title="Export Note to PDF / Word (.doc)"
                            className="p-1.5 bg-white/80 hover:bg-white rounded-lg text-slate-700 shadow-2xs flex items-center gap-1 text-[11px] font-semibold transition"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600" /> Export (.doc/.pdf)
                          </button>
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

      {showAddModal && (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[600px] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-[15px]">Add Note for Team Member</span>
                <select 
                  value={selectedMemberId} 
                  onChange={e => setSelectedMemberId(Number(e.target.value))}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-md text-[13px] font-medium text-slate-700 outline-none"
                >
                  {team.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {(() => {
                const member = team.find(m => m.id === selectedMemberId) || team[0];
                return member ? (
                  <NotesEditor reporteeName={member.name} reporteeId={member.id} initialNotes={member.notes || []} />
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
