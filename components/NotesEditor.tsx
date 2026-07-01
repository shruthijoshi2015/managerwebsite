"use client";

import { useState, useRef, useEffect } from "react";
import { Save, FileText, Sparkles, Loader2, MessageSquare, Clock, CheckCircle2, Trash2, Brain, Tag, Target, CalendarClock, AlertCircle, Bold, Italic, List, CheckSquare, Heading, Eye, Edit3, Columns, ListOrdered, Calendar, Minus } from "lucide-react";
import { saveNotes, addTask, updateGoalProgress } from "@/lib/actions";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { getStorageConfig } from "@/lib/storageProvider";

export function formatToHtml(raw: string) {
  if (!raw) return "";
  if (raw.includes("<h") || raw.includes("<div") || raw.includes("<ul") || raw.includes("<strong") || raw.includes("<p")) {
    return raw;
  }
  const lines = raw.split('\n');
  let html = "";
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('[ ] ')) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
      html += `<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" style="cursor: pointer; width: 15px; height: 15px;" /> <span>${trimmed.replace(/^(- )?\[ \] /, '')}</span></div>`;
      continue;
    }
    if (trimmed.startsWith('- [x] ') || trimmed.startsWith('[x] ')) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
      html += `<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" checked style="cursor: pointer; width: 15px; height: 15px;" /> <span style="text-decoration: line-through; color: #94a3b8;">${trimmed.replace(/^(- )?\[[xX]\] /, '')}</span></div>`;
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) {
        html += `<ul style="margin-left: 24px; padding-left: 8px; list-style-type: disc !important; margin-top: 6px; margin-bottom: 6px;">`;
        inUl = true;
      }
      html += `<li style="display: list-item !important; list-style-type: disc !important; margin: 4px 0;">${trimmed.replace(/^[-*]\s+/, '')}</li>`;
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) {
        html += `<ol style="margin-left: 24px; padding-left: 8px; list-style-type: decimal !important; margin-top: 6px; margin-bottom: 6px;">`;
        inOl = true;
      }
      html += `<li style="display: list-item !important; list-style-type: decimal !important; margin: 4px 0;">${trimmed.replace(/^\d+\.\s+/, '')}</li>`;
      continue;
    }

    if (inUl) { html += "</ul>"; inUl = false; }
    if (inOl) { html += "</ol>"; inOl = false; }

    if (!trimmed) {
      html += "<div style='height: 12px;'></div>";
    } else if (trimmed.startsWith('### ')) {
      html += `<h3 style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 14px; margin-bottom: 6px;">${trimmed.slice(4)}</h3>`;
    } else {
      html += `<div style="margin: 4px 0; color: #334155;">${line}</div>`;
    }
  }

  if (inUl) html += "</ul>";
  if (inOl) html += "</ol>";

  return html;
}

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i} className="italic text-slate-800">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function renderFormattedNote(content: string) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-slate-700 text-[13px] leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="text-[13px] font-bold text-slate-900 mt-3 mb-1 pb-1 border-b border-slate-100 uppercase tracking-wider">{parseInlineFormatting(trimmed.slice(4))}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="text-[14px] font-bold text-slate-900 mt-4 mb-1.5 pb-1 border-b border-slate-200">{parseInlineFormatting(trimmed.slice(3))}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="text-[16px] font-bold text-slate-900 mt-4 mb-2">{parseInlineFormatting(trimmed.slice(2))}</h2>;
        }
        if (trimmed.startsWith('> ')) {
          const calloutText = trimmed.replace(/^> (\[!.*?\]\s*)?/, '');
          return (
            <div key={idx} className="my-2 p-3 bg-indigo-50/70 border-l-4 border-indigo-500 rounded-r text-indigo-900 text-[13px]">
              {parseInlineFormatting(calloutText)}
            </div>
          );
        }
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-3 border-t border-slate-200" />;
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s+(.*)/);
          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 ml-2">
              <span className="text-indigo-600 font-semibold text-[12px] mt-0.5 shrink-0">{match ? match[1] : '•'}</span>
              <span>{parseInlineFormatting(match ? match[2] : trimmed)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('[ ] ')) {
          const taskText = trimmed.replace(/^(- )?\[ \] /, '');
          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 ml-1">
              <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center mt-0.5 shrink-0 bg-white" />
              <span className="text-slate-700 font-medium">{parseInlineFormatting(taskText)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('- [x] ') || trimmed.startsWith('[x] ') || trimmed.startsWith('- [X] ')) {
          const taskText = trimmed.replace(/^(- )?\[[xX]\] /, '');
          return (
            <div key={idx} className="flex items-start gap-2 py-0.5 ml-1">
              <div className="w-4 h-4 rounded border border-emerald-500 bg-emerald-500 text-white flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
              </div>
              <span className="text-slate-400 line-through">{parseInlineFormatting(taskText)}</span>
            </div>
          );
        }
        if (trimmed === '---') {
          return <hr key={idx} className="my-2 border-slate-200" />;
        }
        if (trimmed.match(/^\d+\.\s/)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="font-bold text-indigo-600 shrink-0">{trimmed.split('.')[0]}.</span>
              <span>{parseInlineFormatting(trimmed.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-indigo-500 font-bold mt-0.5">•</span>
              <span>{parseInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed === '') {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx} className="py-0.5">{parseInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

export const NOTE_DEFAULT_TEMPLATES: { id: string; type: string; freqId?: string; name: string; content: string; }[] = [
  {
    id: "t_weekly",
    type: "frequency",
    freqId: "weekly",
    name: "Weekly Check-in",
    content: "### Highlights & Wins\n- \n\n### Current Focus & Priorities\n- \n\n### Roadblocks & Support Needed\n- \n\n### Action Items\n- [ ] \n"
  },
  {
    id: "t_monthly",
    type: "frequency",
    freqId: "monthly",
    name: "Monthly Check-in",
    content: "### Monthly Highlights & Accomplishments\n- \n\n### Goal Progress Review\n- \n\n### Growth & Development Discussion\n- \n\n### Next Month Objectives\n- [ ] \n"
  },
  {
    id: "t_quarterly",
    type: "frequency",
    freqId: "quarterly",
    name: "Quarterly Check-in",
    content: "### Quarterly Review & Key Achievements\n- \n\n### OKRs & Strategic Alignment\n- \n\n### Career Aspirations & Feedback\n- \n\n### Objectives for Next Quarter\n- [ ] \n"
  },
  {
    id: "t_perf",
    type: "frequency",
    freqId: "performance",
    name: "Performance Check-in",
    content: "### Performance Evaluation & Strengths\n- \n\n### Core Competencies Review\n- \n\n### Areas for Growth & Coaching\n- \n\n### Action Plan & Next Steps\n- [ ] \n"
  }
];

export function NotesEditor({ reporteeName, reporteeId, initialNotes = [], freqId, templates = [] }: { reporteeName: string, reporteeId: number, initialNotes: {id: number, type: string, date: string, content: string}[], freqId?: string, templates?: {id: string, type: string, freqId?: string, name: string, content: string}[] }) {
  const [isSaving, setIsSaving] = useState(false);
  
  const storedConfig = (typeof window !== 'undefined' ? getStorageConfig() : null) as any;
  const freqs = (storedConfig?.checkInFrequencies && storedConfig.checkInFrequencies.length > 0)
    ? storedConfig.checkInFrequencies
    : [
        { id: "weekly", label: "Weekly Check-in" },
        { id: "monthly", label: "Monthly Check-in" },
        { id: "quarterly", label: "Quarterly Check-in" },
        { id: "performance", label: "Performance Review" }
      ];

  const effTemplates = (storedConfig?.templates && storedConfig.templates.length > 0)
    ? storedConfig.templates
    : (templates && templates.length > 0 ? templates : NOTE_DEFAULT_TEMPLATES);

  const getFallbackContent = (fid: string = "", label: string = "") => {
    const id = fid.toLowerCase();
    const lbl = label.toLowerCase();
    if (id.includes('week') || lbl.includes('week')) {
      return "### Highlights & Wins\n- \n\n### Current Focus & Priorities\n- \n\n### Roadblocks & Support Needed\n- \n\n### Action Items\n- [ ] \n";
    }
    if (id.includes('month') || lbl.includes('month')) {
      return "### Monthly Highlights & Accomplishments\n- \n\n### Goal Progress Review\n- \n\n### Growth & Development Discussion\n- \n\n### Next Month Objectives\n- [ ] \n";
    }
    if (id.includes('quart') || lbl.includes('quart')) {
      return "### Quarterly Review & Key Achievements\n- \n\n### OKRs & Strategic Alignment\n- \n\n### Career Aspirations & Feedback\n- \n\n### Objectives for Next Quarter\n- [ ] \n";
    }
    if (id.includes('perf') || lbl.includes('perf') || id.includes('review')) {
      return "### Performance Evaluation & Strengths\n- \n\n### Core Competencies Review\n- \n\n### Areas for Growth & Coaching\n- \n\n### Action Plan & Next Steps\n- [ ] \n";
    }
    return `### Key Discussion Points (${label || fid})\n- \n\n### Action Items\n- [ ] \n`;
  };

  const getTemplateContentForFreq = (freq: { id: string, label: string }) => {
    const found = effTemplates.find((t: any) => t.freqId === freq.id || t.name === freq.label);
    return found && found.content ? found.content : getFallbackContent(freq.id, freq.label);
  };

  const initialFreq = freqs.find((f: any) => f.id === freqId || f.label === freqId) || freqs[0];
  const [selectedFreqId, setSelectedFreqId] = useState(initialFreq ? initialFreq.id : "weekly");
  const [selectedType, setSelectedType] = useState(initialFreq ? initialFreq.label : "Weekly Check-in");
  const [content, setContent] = useState(() => initialFreq ? formatToHtml(getTemplateContentForFreq(initialFreq)) : "");
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
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      const initContent = content || (initialFreq ? getTemplateContentForFreq(initialFreq) : "");
      const formatted = formatToHtml(initContent);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
        setContent(formatted);
      }
    }
  }, [reporteeId]);

  const handleExecCommand = (command: string, val: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === 'heading') {
      document.execCommand('formatBlock', false, '<h3>');
    } else if (command === 'checkbox') {
      document.execCommand('insertHTML', false, '<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" style="cursor: pointer; width: 15px; height: 15px;" /> <span>&nbsp;</span></div>');
    } else if (command === 'completedCheckbox') {
      document.execCommand('insertHTML', false, '<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;"><input type="checkbox" checked style="cursor: pointer; width: 15px; height: 15px;" /> <span style="text-decoration: line-through; color: #94a3b8;">&nbsp;</span></div>');
    } else if (command === 'callout') {
      document.execCommand('insertHTML', false, '<div style="padding: 12px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; margin: 8px 0; color: #15803d; font-weight: 500;">Note: &nbsp;</div>');
    } else if (command === 'divider') {
      document.execCommand('insertHorizontalRule', false);
    } else if (command === 'date') {
      document.execCommand('insertHTML', false, `<span style="font-weight: 600; color: #b45309;">[Date: ${new Date().toISOString().split('T')[0]}]</span> `);
    } else {
      document.execCommand(command, false, val);
    }
    setContent(editorRef.current.innerHTML);
  };

  const renderEditorArea = () => (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full relative">
      {/* Formatting Toolbar */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => handleExecCommand('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Bold"><Bold className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Italic"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button onClick={() => handleExecCommand('heading')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Heading"><Heading className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Bullet List"><List className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('checkbox')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Task Checkbox"><CheckSquare className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('completedCheckbox')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Completed Task"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></button>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <button onClick={() => handleExecCommand('callout')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Callout Box"><AlertCircle className="w-4 h-4 text-indigo-600" /></button>
          <button onClick={() => handleExecCommand('divider')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Divider"><Minus className="w-4 h-4" /></button>
          <button onClick={() => handleExecCommand('date')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition" title="Insert Date Stamp"><Calendar className="w-4 h-4 text-amber-600" /></button>
        </div>
      </div>

      <div className="flex-1 p-5 relative overflow-y-auto">
        <div 
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setContent(e.currentTarget.innerHTML)}
          className="w-full h-full min-h-[350px] outline-none text-slate-800 font-sans text-[14px] leading-relaxed overflow-y-auto"
        />
        {!content && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col text-slate-400 gap-2 opacity-50 pt-10">
            <FileText className="w-6 h-6" />
            <p className="text-[12px]">Type here or select a frequency above...</p>
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
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                value={selectedFreqId}
                onChange={(e) => {
                  const fid = e.target.value;
                  setSelectedFreqId(fid);
                  const freqObj = freqs.find((f: any) => f.id === fid) || { id: fid, label: fid };
                  setSelectedType(freqObj.label);
                  const rawTpl = getTemplateContentForFreq(freqObj);
                  const formatted = formatToHtml(rawTpl);
                  setContent(formatted);
                  if (editorRef.current) editorRef.current.innerHTML = formatted;
                }}
                className="bg-transparent text-[12px] font-medium text-slate-700 outline-none cursor-pointer pr-1"
              >
                {freqs.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            <VoiceInputButton onResult={(text) => setContent(prev => (prev ? prev + ' ' : '') + text)} />
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
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Team Health & Sentiment</h4>
                  {extractedActions.sentiment.map((sent, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sent.selected ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={sent.selected} onChange={() => {
                        const newSent = [...extractedActions.sentiment];
                        newSent[i].selected = !newSent[i].selected;
                        setExtractedActions({...extractedActions, sentiment: newSent});
                      }} className="mt-0.5 rounded text-amber-600 focus:ring-amber-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Monitor issue: {sent.issue}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Will create a tracking item on your radar</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.blockers.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Blockers</h4>
                  {extractedActions.blockers.map((blk, i) => (
                    <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${blk.selected ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={blk.selected} onChange={() => {
                        const newBlk = [...extractedActions.blockers];
                        newBlk[i].selected = !newBlk[i].selected;
                        setExtractedActions({...extractedActions, blockers: newBlk});
                      }} className="mt-0.5 rounded text-rose-600 focus:ring-rose-500" />
                      <div>
                        <div className="text-[13px] font-medium text-slate-800">Resolve blocker: {blk.description}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Will flag as an urgent priority action</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {extractedActions.kudos.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Kudos & Recognition</h4>
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
                        }`}>
                          Sentiment: {summary.sentiment}
                        </span>
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

                <div className="mt-2">{renderFormattedNote(note.content)}</div>
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
