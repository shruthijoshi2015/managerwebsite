"use client";

import { useState } from "react";
import { Save, FileText, Sparkles, Loader2, MessageSquare, Clock, CheckCircle2, Trash2, Brain, Tag, Target, CalendarClock, AlertCircle } from "lucide-react";
import { saveNotes, addTask, updateGoalProgress } from "@/lib/actions";


export function NotesEditor({ reporteeName, reporteeId, initialNotes = [], freqId, templates = [] }: { reporteeName: string, reporteeId: number, initialNotes: {id: number, type: string, date: string, content: string}[], freqId: string, templates: {id: string, type: string, freqId?: string, name: string, content: string}[] }) {
  const [isSaving, setIsSaving] = useState(false);
  
  const availableTemplates = (templates || []).filter(t => (t.type === 'frequency' && t.freqId === freqId) || t.type === 'generic').sort((a, b) => {
    if (a.type === 'frequency' && b.type === 'generic') return -1;
    if (a.type === 'generic' && b.type === 'frequency') return 1;
    return 0;
  });
  const [selectedType, setSelectedType] = useState(availableTemplates.length > 0 ? availableTemplates[0].name : "Note");
  const [content, setContent] = useState(availableTemplates.length > 0 ? availableTemplates[0].content : "");
  const [activeTab, setActiveTab] = useState<'write' | 'timeline'>('write');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedActions, setExtractedActions] = useState<{
    tasks: { title: string, owner: string, selected: boolean }[],
    goalUpdates: { goalId: number, suggestedProgress: number, reason: string, selected: boolean }[],
    calendar: { title: string, timeframe: string, selected: boolean }[],
    sentiment: { issue: string, selected: boolean }[],
    blockers: { description: string, selected: boolean }[],
    kudos: { reason: string, selected: boolean }[],
    agenda: { topic: string, selected: boolean }[]
  } | null>(null);
  const [isApplyingActions, setIsApplyingActions] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [noteSummaries, setNoteSummaries] = useState<Record<number, any>>(() => {
    // Initialize from any existing aiSummary data on notes
    const map: Record<number, any> = {};
    initialNotes.forEach(n => { if ((n as any).aiSummary) map[n.id] = (n as any).aiSummary; });
    return map;
  });

  const handleApplyActions = async () => {
    setIsApplyingActions(true);
    if (!extractedActions) return;

    // Apply tasks
    for (const task of extractedActions.tasks.filter(t => t.selected)) {
      const fd = new FormData();
      fd.set("title", task.title);
      fd.set("owner", task.owner);
      await addTask(reporteeId, fd);
    }
    // Apply calendar (as manager tasks)
    for (const cal of extractedActions.calendar.filter(c => c.selected)) {
      const fd = new FormData();
      fd.set("title", `[Follow-up] ${cal.title} (${cal.timeframe})`);
      fd.set("owner", "manager");
      await addTask(reporteeId, fd);
    }
    // Apply sentiment
    for (const s of extractedActions.sentiment.filter(s => s.selected)) {
      const fd = new FormData();
      fd.set("title", `[Watch] ${s.issue}`);
      fd.set("owner", "manager");
      await addTask(reporteeId, fd);
    }
    // Apply blockers
    for (const b of extractedActions.blockers.filter(b => b.selected)) {
      const fd = new FormData();
      fd.set("title", `[Blocker] Resolve: ${b.description}`);
      fd.set("owner", "manager");
      await addTask(reporteeId, fd);
    }
    // Apply kudos
    for (const k of extractedActions.kudos.filter(k => k.selected)) {
      const fd = new FormData();
      fd.set("title", `[Kudos] Shoutout for: ${k.reason}`);
      fd.set("owner", "manager");
      await addTask(reporteeId, fd);
    }
    // Apply agenda
    for (const a of extractedActions.agenda.filter(a => a.selected)) {
      const fd = new FormData();
      fd.set("title", `[Agenda] Next 1:1 - ${a.topic}`);
      fd.set("owner", "manager");
      await addTask(reporteeId, fd);
    }
    // Apply goal updates
    for (const goal of extractedActions.goalUpdates.filter(g => g.selected)) {
      await updateGoalProgress(reporteeId, goal.goalId, goal.suggestedProgress);
    }

    setIsApplyingActions(false);
    setExtractedActions(null);
    setContent("");
    setActiveTab('timeline');
  };

  const renderEditorArea = () => (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full relative">
      <div className="flex-1 p-5 relative">
        <textarea 
          placeholder={`Start typing a new note for ${reporteeName}...`}
          className="w-full h-full bg-transparent border-0 ring-0 focus:ring-0 outline-none resize-none text-slate-700 font-mono text-[13px] leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {content === "" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col text-slate-400 gap-2 opacity-50">
             <FileText className="w-8 h-8" />
             <p className="text-[12px]">Select a template to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-slate-600"><MessageSquare className="w-4 h-4" /></div>
            <h2 className="text-[14px] font-semibold text-slate-800">Check-in Notes</h2>
          </div>
          
          <div className="flex bg-slate-200/50 p-0.5 rounded">
             <button role="tab" aria-selected={activeTab === 'write'} onClick={() => setActiveTab('write')} className={`px-3 py-1 text-[12px] font-medium rounded-sm transition-all ${activeTab === 'write' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Draft</button>
             <button role="tab" aria-selected={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} className={`px-3 py-1 text-[12px] font-medium rounded-sm transition-all ${activeTab === 'timeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
          </div>
        </div>

        {activeTab === 'write' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-2.5 py-1 text-[11px] font-medium border rounded transition-colors flex items-center gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {selectedType} <span className="text-[9px] text-slate-400 ml-0.5">▼</span>
              </button>
              
              {showTemplates && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-md py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Template</span>
                    </div>
                    {availableTemplates.map((tpl, i) => (
                      <button 
                        key={i}
                        onClick={() => { setSelectedType(tpl.name); setContent(tpl.content); setShowTemplates(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors
                          ${selectedType === tpl.name && content !== "" ? "font-semibold text-indigo-700 bg-indigo-50/50" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={async () => {
                if (!content.trim()) return;
                setIsSaving(true);
                await saveNotes(reporteeId, selectedType, content);
                setIsSaving(false);
                
                setIsExtracting(true);
                try {
                  const res = await fetch("/api/ai-extract-actions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ noteContent: content, reporteeId })
                  });
                  const data = await res.json();
                  if (data.error) {
                    alert(data.error);
                    setContent("");
                    setActiveTab('timeline');
                  } else if (data.tasks || data.goalUpdates || data.calendar || data.sentiment || data.blockers || data.kudos || data.agenda) {
                    setExtractedActions({
                      tasks: (data.tasks || []).map((t: any) => ({ ...t, selected: true })),
                      goalUpdates: (data.goalUpdates || []).map((g: any) => ({ ...g, selected: true })),
                      calendar: (data.calendar || []).map((c: any) => ({ ...c, selected: true })),
                      sentiment: (data.sentiment || []).map((s: any) => ({ ...s, selected: true })),
                      blockers: (data.blockers || []).map((b: any) => ({ ...b, selected: true })),
                      kudos: (data.kudos || []).map((k: any) => ({ ...k, selected: true })),
                      agenda: (data.agenda || []).map((a: any) => ({ ...a, selected: true }))
                    });
                  } else {
                    setContent("");
                    setActiveTab('timeline');
                  }
                } catch (e) {
                  console.error(e);
                  setContent("");
                  setActiveTab('timeline');
                }
                setIsExtracting(false);

                // Also trigger the Smart Note Summarizer
                if (content.trim().length >= 80) {
                  setIsSummarizing(true);
                  try {
                    const sumRes = await fetch("/api/ai-note-summarizer", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ noteContent: content, reporteeId })
                    });
                    const sumData = await sumRes.json();
                    if (!sumData.error && !sumData.skipped) {
                      // Store the summary locally so it renders immediately
                      const latestNoteId = initialNotes.length > 0 
                        ? Math.max(...initialNotes.map(n => n.id)) + 1 
                        : 1;
                      setNoteSummaries(prev => ({ ...prev, [latestNoteId]: sumData }));
                    }
                  } catch (e) {
                    console.error("Summarizer error:", e);
                  }
                  setIsSummarizing(false);
                }
              }}
              disabled={isSaving || content.trim() === ""}
              className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-semibold rounded shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
        )}
      </div>
      
      {extractedActions && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-indigo-100 shadow-2xl rounded-2xl w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 max-h-[85vh] flex flex-col">
            <div className="p-6 pb-3 shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-[16px] font-bold text-slate-800">AI Suggested Actions</h3>
              </div>
              <p className="text-[13px] text-slate-500">Based on your note, here are some actionable follow-ups. Select the ones you want to apply.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              {extractedActions.tasks.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tasks</h4>
                  {extractedActions.tasks.map((task, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${task.selected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={task.selected} onChange={() => {
                        const newTasks = [...extractedActions.tasks];
                        newTasks[i].selected = !newTasks[i].selected;
                        setExtractedActions({...extractedActions, tasks: newTasks});
                      }} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">{task.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Assigned to: {task.owner === 'manager' ? 'You' : reporteeName}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.goalUpdates.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Goal Updates</h4>
                  {extractedActions.goalUpdates.map((goal, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${goal.selected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={goal.selected} onChange={() => {
                        const newGoals = [...extractedActions.goalUpdates];
                        newGoals[i].selected = !newGoals[i].selected;
                        setExtractedActions({...extractedActions, goalUpdates: newGoals});
                      }} className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Update progress to {goal.suggestedProgress}%</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Reason: {goal.reason}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.calendar.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Follow-ups</h4>
                  {extractedActions.calendar.map((cal, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${cal.selected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={cal.selected} onChange={() => {
                        const newCal = [...extractedActions.calendar];
                        newCal[i].selected = !newCal[i].selected;
                        setExtractedActions({...extractedActions, calendar: newCal});
                      }} className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">{cal.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Timeframe: {cal.timeframe} (Will create a task for you)</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.sentiment.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Sentiment Alerts</h4>
                  {extractedActions.sentiment.map((sent, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sent.selected ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={sent.selected} onChange={() => {
                        const newSent = [...extractedActions.sentiment];
                        newSent[i].selected = !newSent[i].selected;
                        setExtractedActions({...extractedActions, sentiment: newSent});
                      }} className="mt-0.5 rounded text-red-600 focus:ring-red-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Create private [Watch] task</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Issue: {sent.issue}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.blockers.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Blockers Detected</h4>
                  {extractedActions.blockers.map((blk, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${blk.selected ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={blk.selected} onChange={() => {
                        const newBlk = [...extractedActions.blockers];
                        newBlk[i].selected = !newBlk[i].selected;
                        setExtractedActions({...extractedActions, blockers: newBlk});
                      }} className="mt-0.5 rounded text-amber-600 focus:ring-amber-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Create [Blocker] task</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Dependency: {blk.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.kudos.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Praise & Kudos</h4>
                  {extractedActions.kudos.map((kud, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${kud.selected ? 'bg-fuchsia-50/50 border-fuchsia-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={kud.selected} onChange={() => {
                        const newKud = [...extractedActions.kudos];
                        newKud[i].selected = !newKud[i].selected;
                        setExtractedActions({...extractedActions, kudos: newKud});
                      }} className="mt-0.5 rounded text-fuchsia-600 focus:ring-fuchsia-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Add to [Kudos] tracking</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Reason: {kud.reason}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.agenda.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Next 1:1 Agenda</h4>
                  {extractedActions.agenda.map((ag, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${ag.selected ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={ag.selected} onChange={() => {
                        const newAg = [...extractedActions.agenda];
                        newAg[i].selected = !newAg[i].selected;
                        setExtractedActions({...extractedActions, agenda: newAg});
                      }} className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Add [Agenda] topic</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Topic: {ag.topic}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 pt-4 shrink-0 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    setExtractedActions(null);
                    setContent("");
                    setActiveTab('timeline');
                  }}
                  disabled={isApplyingActions}
                  className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Skip & Close
                </button>
                <button 
                  onClick={handleApplyActions}
                  disabled={isApplyingActions || (!extractedActions.tasks.some(t=>t.selected) && !extractedActions.goalUpdates.some(g=>g.selected) && !extractedActions.calendar.some(c=>c.selected) && !extractedActions.sentiment.some(s=>s.selected) && !extractedActions.blockers.some(b=>b.selected) && !extractedActions.kudos.some(k=>k.selected) && !extractedActions.agenda.some(a=>a.selected))}
                  className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplyingActions ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Apply Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExtracting && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center flex-col gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-[13px] font-medium text-indigo-900">AI is scanning your note for action items...</p>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        {activeTab === 'write' ? renderEditorArea() : (
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
            {initialNotes.length === 0 && <p className="text-slate-400 text-[13px] text-center py-10">No past checks-ins recorded yet.</p>}
            {initialNotes.map(note => {
              const summary = noteSummaries[note.id] || (note as any).aiSummary;
              return (
              <div key={note.id} className="bg-white border border-slate-200 rounded-md p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-[14px] font-semibold text-slate-800">{note.type}</h4>
                    <span className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-1"><Clock className="w-3 h-3" /> {new Date(note.date).toLocaleString()}</span>
                  </div>
                </div>

                {/* AI Summary Block */}
                {summary && (
                  <div className="mb-4 bg-gradient-to-r from-indigo-50/70 to-violet-50/70 border border-indigo-100 rounded-lg p-4 space-y-3">
                    {/* TL;DR */}
                    <div className="flex items-start gap-2">
                      <Brain className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">AI Summary</div>
                        <p className="text-[13px] text-slate-700 leading-relaxed">{summary.tldr}</p>
                      </div>
                    </div>

                    {/* Sentiment Badge */}
                    {summary.sentiment && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          summary.sentiment.includes('Positive') || summary.sentiment === 'Very Positive' ? 'bg-emerald-100 text-emerald-700' :
                          summary.sentiment === 'Neutral' ? 'bg-slate-100 text-slate-600' :
                          summary.sentiment === 'Frustrated' || summary.sentiment === 'Concerned' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{summary.sentiment}</span>
                      </div>
                    )}

                    {/* Signals */}
                    {summary.signals && summary.signals.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {summary.signals.map((s: string, i: number) => (
                            <span key={i} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {summary.skills && summary.skills.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {summary.skills.map((s: string, i: number) => (
                            <span key={i} className="text-[11px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal Mentions */}
                    {summary.goalMentions && summary.goalMentions.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          {summary.goalMentions.map((g: any, i: number) => (
                            <div key={i} className="text-[12px]">
                              <span className="font-semibold text-emerald-700">{g.goalTitle}</span>
                              <span className="text-slate-500"> — {g.suggestedAction}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-ups */}
                    {summary.followUps && summary.followUps.length > 0 && (
                      <div className="flex items-start gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          {summary.followUps.map((f: any, i: number) => (
                            <div key={i} className="text-[12px]">
                              <span className="font-medium text-slate-700">{f.task}</span>
                              <span className="text-blue-600 ml-1.5">📅 {f.timeframe}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-slate-700 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{note.content}</div>
              </div>
              );
            })}
          </div>
        )}
        <div className="border-t border-slate-100 bg-white p-2 flex justify-center shrink-0">
           <button className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors font-medium">View all →</button>
        </div>
      </div>
    </div>
  );
}
