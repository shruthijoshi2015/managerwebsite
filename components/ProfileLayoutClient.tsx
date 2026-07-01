"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, X, Target, Plus, Pencil, Sparkles, Wand2, AlertTriangle, Check, ChevronDown, Trash2 } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { UserQuickScratchpad } from "@/components/UserQuickScratchpad";

/* ─── Hierarchy Icon SVG ─── */
const HierarchyIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="5" x2="10" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="9" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" />
    <line x1="5" y1="9" x2="5" y2="11" stroke="currentColor" strokeWidth="1.5" />
    <line x1="15" y1="9" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
import { NotesEditor } from "./NotesEditor";
import { TaskItem, FreqSelect, GoalProgressSlider, TaskForm } from "./ProfileClient";
import { ActionModal } from "./ActionModal";
import { Avatar } from "./Avatar";
import { PrepBriefPanel } from "./PrepBriefPanel";
import { PerfReviewPanel } from "./PerfReviewPanel";
import { AgendaGenPanel } from "./AgendaGenPanel";
import { RiskExplanationPopover } from "./RiskExplanationPopover";
import { Reportee, TemplateConfig, Task, Goal, FreqConfig } from "@/lib/db";
import { addGoal, updateGoal, updateReporteeProfile, deleteGoal, deleteReportee } from "@/lib/actions";
import { useCardConfig } from "@/lib/CardConfigContext";

import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

/* ─── Progress Ring Component ─── */
const ProgressRing = ({ progress, colorClass, size = 36 }: { progress: number, colorClass: string, size?: number }) => {
  const radius = size * 0.4;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const strokeColor = colorClass.replace('bg-', 'text-').split(' ')[0] || 'text-emerald-500';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={size >= 36 ? "3" : "2.5"} fill="transparent" className="text-slate-100" />
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={size >= 36 ? "3" : "2.5"} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className={`transition-all duration-500 ${strokeColor}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-800" style={{ fontSize: size >= 36 ? '12px' : '10px' }}>{progress}</div>
    </div>
  );
};

/* ─── Goal Detail Modal ─── */
const STATUS_OPTIONS = [
  { value: 'on_track', label: 'On Track', color: 'bg-emerald-500' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-amber-500' },
  { value: 'off_track', label: 'Off Track', color: 'bg-red-500' },
  { value: 'achieved', label: 'Achieved', color: 'bg-slate-800' },
];

  // INLINE ACTION MODAL REMOVED

const ICONS = ["🚀", "🎯", "📈", "⭐", "💡", "🔥", "🏆", "🛠️", "⚡", "✨", "📊", "✅"];

export function GoalModal({ 
  reporteeId, allGoals, onClose, editGoal, initialParentId, teamMembers, onReporteeChange, initialTitle, initialDescription
}: { 
  reporteeId: number; allGoals: Goal[]; onClose: () => void; editGoal?: Goal; initialParentId?: number;
  teamMembers?: { id: number; name: string }[];
  onReporteeChange?: (id: number) => void;
  initialTitle?: string;
  initialDescription?: string;
}) {
  const { goalModalConfig } = useCardConfig();
  const [title, setTitle] = useState(editGoal?.title || initialTitle || "");
  const [description, setDescription] = useState(editGoal?.description || initialDescription || "");
  const [parentId, setParentId] = useState<string>(editGoal?.parentId?.toString() || initialParentId?.toString() || "");
  const [status, setStatus] = useState<string>(editGoal?.status || "on_track");
  
  const [icon, setIcon] = useState<string>(editGoal?.icon || "🚀");
  const [tags, setTags] = useState<string[]>(editGoal?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [measurementType, setMeasurementType] = useState<string>(editGoal?.measurementType || "percent");
  const [measurementStart, setMeasurementStart] = useState<string>(editGoal?.measurementStart?.toString() || "0");
  const [measurementTarget, setMeasurementTarget] = useState<string>(editGoal?.measurementTarget?.toString() || "100");
  const [dueDate, setDueDate] = useState<string>(editGoal?.dueDate || "");
  const [priority, setPriority] = useState<string>(editGoal?.priority || "P0");
  const [confidence, setConfidence] = useState<number>(editGoal?.confidence || 7);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showSubgoalInput, setShowSubgoalInput] = useState(false);
  const [newSubgoalTitle, setNewSubgoalTitle] = useState("");
  const [isSavingSubgoal, setIsSavingSubgoal] = useState(false);
  const [pendingSubgoals, setPendingSubgoals] = useState<string[]>([]);

  // AI Goal Drafter State
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiSentence, setAiSentence] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isMakingSmart, setIsMakingSmart] = useState(false);
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
      setTitle(data.title);
      setDescription(data.description || "");
      if (data.tags) setAiSuggestedTags(data.tags);
      if (data.dueDate) setDueDate(data.dueDate);
      if (data.subgoals) setAiSuggestedSubgoals(data.subgoals);
      if (data.workloadWarning) setWorkloadWarning(data.workloadWarning);
      setIsAiMode(false); // Switch to form view to review
    } catch (e) {
      console.error(e);
    }
    setIsDrafting(false);
  };

  const handleMakeSmart = async () => {
    if (!title.trim()) return;
    setIsMakingSmart(true);
    try {
      const res = await fetch("/api/ai-make-smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
    } catch (e) {
      console.error(e);
    }
    setIsMakingSmart(false);
  };

  const isEditing = !!editGoal;
  const parentGoals = allGoals.filter(g => !g.parentId && g.id !== editGoal?.id);
  const subgoals = isEditing ? allGoals.filter(sg => sg.parentId === editGoal.id) : [];
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  const handleAddSubgoal = async () => {
    if (!newSubgoalTitle.trim()) return;
    
    if (isEditing) {
      setIsSavingSubgoal(true);
      const fd = new FormData();
      fd.set("title", newSubgoalTitle);
      fd.set("parentId", editGoal.id.toString());
      fd.set("status", "on_track");
      await addGoal(reporteeId, fd);
      setIsSavingSubgoal(false);
    } else {
      setPendingSubgoals([...pendingSubgoals, newSubgoalTitle.trim()]);
    }
    
    setNewSubgoalTitle("");
    setShowSubgoalInput(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }
    setNewTag("");
    setShowTagInput(false);
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    if (isEditing) {
      await updateGoal(reporteeId, editGoal.id, { 
        title, description, parentId: parentId ? parseInt(parentId) : undefined, status: status as any,
        icon, tags, measurementType: measurementType as any, 
        measurementStart: measurementStart ? parseFloat(measurementStart) : undefined, 
        measurementTarget: measurementTarget ? parseFloat(measurementTarget) : undefined, 
        dueDate, priority: priority as any, confidence 
      });
    } else {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("description", description);
      fd.set("status", status);
      if (parentId) fd.set("parentId", parentId);
      fd.set("icon", icon);
      fd.set("tags", JSON.stringify(tags));
      if (measurementType) fd.set("measurementType", measurementType);
      if (measurementStart) fd.set("measurementStart", measurementStart);
      if (measurementTarget) fd.set("measurementTarget", measurementTarget);
      if (dueDate) fd.set("dueDate", dueDate);
      if (priority) fd.set("priority", priority);
      if (confidence) fd.set("confidence", confidence.toString());
      if (pendingSubgoals.length > 0) fd.set("pendingSubgoals", JSON.stringify(pendingSubgoals));
      await addGoal(reporteeId, fd);
    }
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className={`bg-[#f9f9f9] rounded-xl shadow-2xl border border-slate-200 w-full ${goalModalConfig?.size === 'mini' ? 'max-w-[600px]' : 'max-w-[900px]'} mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col`} onClick={e => e.stopPropagation()}>
        
        <div className="flex flex-1 overflow-hidden min-h-0 bg-white">
          {/* LEFT COLUMN - Main content */}
          <div className={`flex-1 overflow-y-auto p-8 ${goalModalConfig?.size === 'mini' ? '' : 'border-r border-slate-200'}`}>
            
            {/* AI Toggle & Title Row */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">{isEditing ? 'Edit Goal' : 'New Goal'}</h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsAiMode(!isAiMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border ${isAiMode ? "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Mode
                </button>
              )}
            </div>

            {isAiMode ? (
              <div className="bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl p-6 relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-fuchsia-200/40 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <label className="flex items-center gap-2 text-[14px] font-bold text-fuchsia-800 mb-3">
                    <Sparkles className="w-4.5 h-4.5" /> Draft from a sentence
                  </label>
                  <textarea 
                    autoFocus
                    rows={4}
                    value={aiSentence}
                    onChange={e => setAiSentence(e.target.value)}
                    placeholder="e.g., Migrate the analytics events to the new schema by Q3 end..."
                    className="w-full px-4 py-3 text-[14px] bg-white border border-fuchsia-200 rounded-xl outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100/50 shadow-sm resize-none mb-4 placeholder:text-fuchsia-300/70"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleAiDraft}
                      disabled={isDrafting || !aiSentence.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-[14px] font-medium rounded-lg transition-colors shadow-sm"
                    >
                      {isDrafting ? "Drafting..." : "Generate Goal"}
                      {!isDrafting && <Wand2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {workloadWarning && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-amber-800 mb-6">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[13px] leading-relaxed">
                      <span className="font-semibold block mb-0.5">Context-Aware Warning</span>
                      {workloadWarning}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-6 relative z-50">
                  <div className="relative mt-1">
                    <button 
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-10 h-10 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-xl hover:bg-slate-50 transition-colors shrink-0"
                    >
                      {icon}
                    </button>
                    {showIconPicker && (
                      <div className="absolute top-12 left-0 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-48 grid grid-cols-4 gap-1">
                        {ICONS.map(i => (
                          <button key={i} onClick={() => { setIcon(i); setShowIconPicker(false); }} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded text-xl">
                            {i}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <input 
                        type="text" value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="Goal title..."
                        className="flex-1 w-full text-[24px] font-bold text-slate-900 outline-none placeholder:text-slate-300 bg-transparent border-0 px-0"
                        autoFocus={!isAiMode}
                      />
                      <VoiceInputButton onResult={(text) => setTitle(prev => (prev ? prev + ' ' : '') + text)} className="mt-2" />
                      {!isEditing && (
                        <button 
                          onClick={handleMakeSmart}
                          disabled={isMakingSmart || !title.trim()}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 h-10 bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-600 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50 mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isMakingSmart ? "Thinking..." : "Make SMART"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

            {/* Mini Mode Sleek Metadata Pill Bar */}
            {/* Mini Mode Sleek Metadata Layout */}
            {goalModalConfig?.size === 'mini' && (
              <div className="flex flex-col gap-3 mb-6 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-indigo-50/80 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-indigo-900 border border-indigo-100 shadow-2xs">
                    <span>👤 Assigned:</span>
                    <select 
                      value={reporteeId} 
                      onChange={e => onReporteeChange?.(parseInt(e.target.value))} 
                      disabled={isEditing || !onReporteeChange} 
                      className="bg-transparent outline-none cursor-pointer font-bold text-indigo-700"
                    >
                      {teamMembers && teamMembers.length > 0 ? (
                        teamMembers.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))
                      ) : (
                        <option value={reporteeId}>Current Team Member</option>
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-700 border border-slate-200 shadow-2xs">
                    <span>🎯</span>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="bg-transparent outline-none cursor-pointer font-semibold">
                      {STATUS_OPTIONS.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-700 border border-slate-200 shadow-2xs">
                    <span>🔥</span>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-transparent outline-none cursor-pointer font-semibold">
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Medium</option>
                    </select>
                  </div>
                </div>
                {goalModalConfig?.showConfidence !== false && (
                  <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200/80">
                    <span className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">📊 Confidence Target:</span>
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="10" value={confidence} onChange={e => setConfidence(parseInt(e.target.value))} className="w-28 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                      <span className="font-bold text-[13px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{confidence}/10</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {goalModalConfig?.size !== 'mini' && goalModalConfig?.showDescription !== false && (
              <div className="relative mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] font-semibold text-slate-500">Description</span>
                  <VoiceInputButton onResult={(text) => setDescription(prev => (prev ? prev + ' ' : '') + text)} />
                </div>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Add description..."
                  className="w-full min-h-[60px] text-[14px] text-slate-800 outline-none resize-y leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* AI Suggested Additions */}
            {!isAiMode && (aiSuggestedTags.length > 0 || aiSuggestedSubgoals.length > 0) && (
              <div className="mb-8 p-5 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
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
                            <button onClick={() => { setTags([...tags, t]); setAiSuggestedTags(aiSuggestedTags.filter(x => x !== t)); }} className="p-0.5 hover:bg-fuchsia-100 rounded text-emerald-600 transition-colors" title="Accept"><Check className="w-3 h-3" /></button>
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
                            <button onClick={() => { setPendingSubgoals([...pendingSubgoals, sg]); setAiSuggestedSubgoals(aiSuggestedSubgoals.filter((_, idx) => idx !== i)); }} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded text-[11px] font-bold transition-colors">
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

            {/* Progress bar (edit mode) */}
            {isEditing && (
              <div className="mb-6">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${editGoal.progress}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {subgoals.length > 0 ? "Progress is calculated from subgoal progress" : `Goal progress is ${editGoal.progress}%`}
                </p>
              </div>
            )}

            {/* Tags */}
            {goalModalConfig?.size !== 'mini' && goalModalConfig?.showTags !== false && (
              <div className="flex flex-wrap items-center gap-2 mb-8">
                {tags.map((t, i) => {
                  const colors = ['bg-indigo-50 text-indigo-700', 'bg-teal-50 text-teal-700', 'bg-amber-50 text-amber-700', 'bg-rose-50 text-rose-700', 'bg-blue-50 text-blue-700'];
                  const c = colors[i % colors.length];
                  return (
                    <div key={t} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium ${c}`}>
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-black opacity-50 hover:opacity-100 ml-1">✕</button>
                    </div>
                  );
                })}
                {showTagInput ? (
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-full px-3 py-1 shadow-sm">
                    <input autoFocus type="text" value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleAddTag(); if(e.key==='Escape')setShowTagInput(false);}} className="w-20 text-[12px] outline-none bg-transparent" placeholder="tag name"/>
                  </div>
                ) : (
                  <button onClick={() => setShowTagInput(true)} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[12px] font-medium text-slate-600 hover:bg-slate-50 shadow-sm flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Tag
                  </button>
                )}
              </div>
            )}

            {/* Subgoals */}
            {goalModalConfig?.size !== 'mini' && goalModalConfig?.showSubgoals !== false && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HierarchyIcon className="w-4 h-4 text-slate-800" />
                    <h4 className="text-[15px] font-bold text-slate-900">Subgoals <span className="text-slate-400 font-medium text-[13px] ml-1">{isEditing ? subgoals.length : pendingSubgoals.length}</span></h4>
                  </div>
                  <button
                    onClick={() => setShowSubgoalInput(v => !v)}
                    className="text-[12px] text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors border border-slate-200 rounded px-2.5 py-1 bg-white hover:bg-slate-50 shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                
                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-2 bottom-6 w-px bg-slate-200" />
                  {isEditing && subgoals.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {subgoals.map((sg, i) => (
                        <div key={sg.id} className="relative flex items-center gap-3">
                          <div className="absolute -left-6 top-1/2 w-4 h-px bg-slate-200" />
                          <div className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-[14px] font-medium text-slate-800">{sg.title}</div>
                          <select value={sg.status || "on_track"} disabled className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-[13px] font-medium text-slate-700 outline-none w-32 appearance-none">
                            <option value="on_track">On track ⌄</option>
                            <option value="at_risk">At risk ⌄</option>
                            <option value="off_track">Off track ⌄</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!isEditing && pendingSubgoals.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {pendingSubgoals.map((sg, i) => (
                        <div key={i} className="relative flex items-center gap-3">
                          <div className="absolute -left-6 top-1/2 w-4 h-px bg-slate-200" />
                          <div className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-[14px] font-medium text-slate-800">{sg}</div>
                          <button onClick={() => setPendingSubgoals(pendingSubgoals.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition-colors p-2 text-xl font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showSubgoalInput && (
                     <div className="relative flex items-center gap-3 mb-4">
                       <div className="absolute -left-6 top-1/2 w-4 h-px bg-slate-200" />
                       <input
                         autoFocus type="text" value={newSubgoalTitle} onChange={e => setNewSubgoalTitle(e.target.value)}
                         onKeyDown={e => {
                           if (e.key === 'Enter') handleAddSubgoal();
                           if (e.key === 'Escape') { setShowSubgoalInput(false); setNewSubgoalTitle(""); }
                         }}
                         placeholder="Subgoal title..."
                         className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm text-[14px] font-medium text-slate-800 outline-none focus:border-indigo-400"
                       />
                       <button onClick={handleAddSubgoal} disabled={!newSubgoalTitle.trim() || isSavingSubgoal} className="px-4 py-2.5 bg-slate-800 text-white font-medium text-[13px] rounded-lg disabled:opacity-50">
                         {isSavingSubgoal ? "..." : "Save"}
                       </button>
                     </div>
                  )}

                  {!showSubgoalInput && (
                    <div className="relative flex items-center gap-3 mt-4">
                      <div className="absolute -left-6 top-1/2 w-4 h-px bg-slate-200" />
                      <button onClick={() => setShowSubgoalInput(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-full text-[13px] font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add subgoal
                      </button>
                      {isEditing && subgoals.length === 0 && (
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[13px] font-medium text-indigo-700 hover:bg-indigo-100 shadow-sm transition-colors">
                          ✨ Suggest
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN - Metadata / Settings */}
          {goalModalConfig?.size !== 'mini' && (
            <div className="w-[300px] overflow-y-auto bg-slate-50 p-6 flex flex-col gap-6 shrink-0">
              
              {/* Status */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-[#eff1f3] border-0 rounded-lg font-medium text-[14px] text-slate-800 outline-none cursor-pointer appearance-none">
                  {STATUS_OPTIONS.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">⌄</div>
              </div>
            </div>

            {/* Parent Goal */}
            {goalModalConfig?.showParentGoal !== false && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parent Goal</label>
                <div className={`w-full bg-[#eff1f3] rounded-lg ${parentId ? 'p-4' : 'px-3 py-1.5'}`}>
                  <select value={parentId} onChange={e => setParentId(e.target.value)}
                    className={`w-full bg-transparent border-0 font-semibold text-[14px] text-slate-800 outline-none cursor-pointer appearance-none ${parentId ? 'mb-3' : ''}`}>
                    <option value="">None</option>
                    {parentGoals.map(g => (<option key={g.id} value={g.id}>◎ {g.title}</option>))}
                  </select>
                  {parentId && parentGoals.find(g => g.id.toString() === parentId) && (
                    <>
                      <div className="w-full bg-white rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${parentGoals.find(g => g.id.toString() === parentId)?.progress || 0}%` }} />
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium">
                        {parentGoals.find(g => g.id.toString() === parentId)?.progress || 0}% · {allGoals.filter(g => g.parentId?.toString() === parentId).length} sibling goals
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Due Date */}
            {goalModalConfig?.showDueDate !== false && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg font-medium text-[14px] text-slate-800 outline-none focus:border-indigo-400" />
                {dueDate && (
                   <p className="text-[12px] text-slate-500 font-medium pt-1">
                     ~{Math.max(0, Math.round((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))} weeks remaining
                   </p>
                )}
              </div>
            )}

            {/* Priority */}
            {goalModalConfig?.showPriority !== false && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                <div className="relative">
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full pl-4 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg font-medium text-[14px] text-slate-800 outline-none cursor-pointer appearance-none shadow-sm">
                    <option value="P0">🔴 P0 - Critical</option>
                    <option value="P1">🟠 P1 - High</option>
                    <option value="P2">🟡 P2 - Medium</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">⌄</div>
                </div>
              </div>
            )}

            {/* Assignee */}
            {teamMembers && onReporteeChange && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned To</label>
                <div className="relative">
                  <select 
                    value={reporteeId} 
                    onChange={(e) => onReporteeChange(parseInt(e.target.value))}
                    disabled={isEditing}
                    className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg font-medium text-[14px] text-slate-800 outline-none cursor-pointer appearance-none shadow-sm"
                  >
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>👤 {m.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">⌄</div>
                </div>
              </div>
            )}

            {/* Confidence */}
            {goalModalConfig?.showConfidence !== false && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confidence</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="10" value={confidence} onChange={e => setConfidence(parseInt(e.target.value))} className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                  <span className="font-bold text-[16px] text-slate-900">{confidence}</span>
                </div>
                <p className="text-[12px] font-medium text-slate-500">{confidence >= 8 ? 'Very likely to hit target' : confidence >= 5 ? 'Likely to hit target' : 'At risk of missing target'}</p>
              </div>
            )}

            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center gap-3 p-5 bg-[#f9f9f9] border-t border-slate-200 shrink-0">
          <div>
            {isEditing && (
              <button 
                onClick={async () => { if(confirm("Are you sure you want to delete this goal?")) { await deleteGoal(reporteeId, editGoal.id); onClose(); } }}
                className="px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors rounded-lg border border-transparent hover:border-red-200"
              >
                Delete goal
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 text-[14px] font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={!title.trim() || isSaving}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-medium rounded-lg shadow-md transition-colors disabled:opacity-50">
              {isSaving ? "Saving..." : isEditing ? "Save changes" : "Create goal"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Main Layout ─── */
export function ProfileLayoutClient({ 
  mockUser, 
  templates, 
  freqId, 
  activeTasks, 
  completedTasks,
  frequencies,
  teamContext
}: { 
  mockUser: Reportee; 
  templates: TemplateConfig[]; 
  freqId: string; 
  activeTasks: Task[]; 
  completedTasks: Task[];
  frequencies: FreqConfig[];
  teamContext?: any[];
}) {
  const router = useRouter();
  const isManagerUser = mockUser.isManager || mockUser.role?.toLowerCase().includes("manager") || mockUser.id === 999;
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editActionTask, setEditActionTask] = useState<any | undefined>(undefined);
  const [editGoal, setEditGoal] = useState<Goal | undefined>(undefined);
  const [initialParentId, setInitialParentId] = useState<number | undefined>(undefined);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [rightTab, setRightTab] = useState<'tasks' | 'goals'>('tasks');
  const [showPrep, setShowPrep] = useState(false);
  const [showPerfReview, setShowPerfReview] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [isProfileAiOpen, setIsProfileAiOpen] = useState(false);
  const [convertedActionTitle, setConvertedActionTitle] = useState<string | undefined>(undefined);
  const [convertedGoalTitle, setConvertedGoalTitle] = useState<string | undefined>(undefined);
  const [notesViewFilter, setNotesViewFilter] = useState<'all' | 'scratchpad' | 'checkin'>('checkin');
  
  // Goals Accordion State
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-emerald-50 text-emerald-700';
      case 'at_risk': return 'bg-amber-50 text-amber-700';
      case 'off_track': return 'bg-red-50 text-red-700';
      case 'achieved': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  // Edit Profile State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: mockUser.name || '',
    role: mockUser.role || '',
    department: mockUser.department || '',
    seniority: mockUser.seniority || '',
    careerTrack: mockUser.careerTrack || '',
    performance: mockUser.performance || ''
  });

  const handleSaveProfile = async () => {
    await updateReporteeProfile(mockUser.id, profileData);
    setShowEditProfile(false);
  };

  // AI Goal Suggestions (outside modal)
  const [showSuggestPanel, setShowSuggestPanel] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<{ title: string; description: string }[]>([]);
  const [selectedGoalIdxs, setSelectedGoalIdxs] = useState<Set<number>>(new Set());
  const [addingGoals, setAddingGoals] = useState(false);

  const fetchSuggestedGoals = async () => {
    setSuggestLoading(true);
    setShowSuggestPanel(true);
    setSelectedGoalIdxs(new Set());
    try {
      const existingGoals = mockUser.goals.filter(g => !g.parentId).map(g => g.title);
      const recentNotes = mockUser.notes.slice(0, 3).map(n => n.content).join("\n");
      
      const res = await fetch("/api/ai-goal-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role: mockUser.role,
          existingGoals: mockUser.goals.map((g: any) => g.title),
          count: 3,
          context: {
            department: mockUser.department,
            seniority: mockUser.seniority,
            careerTrack: mockUser.careerTrack,
            performance: mockUser.performance,
            notes: recentNotes,
            teamContext: teamContext
          }
        }),
      });
      const data = await res.json();
      setSuggestedGoals(data.goals || []);
    } catch { setSuggestedGoals([]); }
    finally { setSuggestLoading(false); }
  };

  const toggleSuggestIdx = (i: number) => {
    setSelectedGoalIdxs(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const addSelectedGoals = async () => {
    if (selectedGoalIdxs.size === 0) return;
    setAddingGoals(true);
    for (const i of selectedGoalIdxs) {
      const g = suggestedGoals[i];
      const fd = new FormData();
      fd.set("title", g.title);
      fd.set("description", g.description);
      fd.set("status", "on_track");
      await addGoal(mockUser.id, fd);
    }
    setAddingGoals(false);
    setShowSuggestPanel(false);
    setSuggestedGoals([]);
    setSelectedGoalIdxs(new Set());
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setEditGoal(undefined);
      setInitialParentId(detail.parentId);
      setShowGoalModal(true);
    };
    window.addEventListener('open-add-subgoal', handler);
    return () => window.removeEventListener('open-add-subgoal', handler);
  }, []);

  const NotesBlock = <NotesEditor reporteeName={mockUser.name} reporteeId={mockUser.id} initialNotes={mockUser.notes} freqId={freqId} templates={templates} />;
  
  const allTasks = [...activeTasks, ...completedTasks];

  return (
    <div className="w-full flex flex-col pb-6 bg-[#fafafa]">
      <div className="max-w-7xl w-full mx-auto px-8 mt-6">
        <PanelGroup orientation="horizontal" className="h-[calc(100vh-60px)] min-h-[500px] border-t border-slate-200">
          
          {/* MAIN COLUMN (Left) - 60% */}
          <Panel defaultSize={60} minSize={40} className="flex flex-col h-full pr-4">
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-3 text-[12px] font-medium">
              <Link href="/team" className="text-slate-500 hover:text-indigo-600 transition-colors">My Team</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800">{mockUser.name}</span>
            </div>

            {/* Identity Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 shrink-0">
               <div className="flex items-center gap-3">
                 <Avatar name={mockUser.name} size="sm" />
                 <button 
                   onClick={() => setShowEditProfile(true)} 
                   className="text-left group transition-colors rounded hover:bg-slate-50 px-2 py-1 -ml-2"
                   title="Edit Profile"
                 >
                   <h2 className="text-lg font-medium text-slate-900 flex items-center gap-1.5 leading-tight flex-wrap">
                     {mockUser.name}
                     <span className="text-slate-400 font-normal">·</span>
                     <span className="text-[13px] text-slate-500 font-normal">{mockUser.role}</span>
                     {mockUser.checkInFreq && (
                       <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-indigo-100 ml-1">
                         🔄 {mockUser.checkInFreq} Check-ins
                       </span>
                     )}
                   </h2>
                 </button>
               </div>
               <div className="flex gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileAiOpen(!isProfileAiOpen)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-[12px] font-semibold transition shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Tools
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </button>

                    {isProfileAiOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileAiOpen(false)} />
                        <div className="absolute top-full mt-2 right-0 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => { setShowPrep(true); setIsProfileAiOpen(false); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                              <span className="text-[14px]">✨</span>
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800">Prep for 1:1</span>
                          </button>
                          <button
                            onClick={() => { setShowPerfReview(true); setIsProfileAiOpen(false); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center shrink-0">
                              <span className="text-[14px]">⭐</span>
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800">Draft Review</span>
                          </button>
                          <button
                            onClick={() => { setShowAgenda(true); setIsProfileAiOpen(false); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                              <span className="text-[14px]">📋</span>
                            </div>
                            <span className="text-[13px] font-semibold text-slate-800">Gen Agenda</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
            </div>

            {/* View Filter Bar for Notes Tab */}
            <div className="flex items-center justify-between bg-slate-100/80 p-1.5 rounded-lg border border-slate-200/60 mb-4 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={() => setNotesViewFilter('all')} className={`px-3 py-1 text-[12px] font-semibold rounded transition ${notesViewFilter === 'all' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                  ✨ All Notes View
                </button>
                <button onClick={() => setNotesViewFilter('scratchpad')} className={`px-3 py-1 text-[12px] font-semibold rounded transition flex items-center gap-1.5 ${notesViewFilter === 'scratchpad' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                  ⚡ Quick Scratchpad Only
                </button>
                <button onClick={() => setNotesViewFilter('checkin')} className={`px-3 py-1 text-[12px] font-semibold rounded transition flex items-center gap-1.5 ${notesViewFilter === 'checkin' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                  💬 Check-in Notes Only
                </button>
              </div>
            </div>

            {/* Quick Notes Scratchpad (Design 2A) */}
            {(notesViewFilter === 'all' || notesViewFilter === 'scratchpad') && (
              <UserQuickScratchpad 
                reporteeId={mockUser.id} 
                reporteeName={mockUser.name}
                onConvertToAction={(text) => { setEditActionTask(undefined); setConvertedActionTitle(text); setShowActionModal(true); }}
                onConvertToGoal={(text) => { setEditGoal(undefined); setConvertedGoalTitle(text); setShowGoalModal(true); }}
              />
            )}

            {/* Notes Section */}
            {(notesViewFilter === 'all' || notesViewFilter === 'checkin') && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex-1 flex flex-col">
                   {NotesBlock}
                </div>
              </div>
            )}

          </Panel>

          {/* Resizable Horizontal Splitter */}
          <PanelResizeHandle className="w-2 relative flex flex-col items-center justify-center group cursor-col-resize">
            <div className="w-px h-full bg-slate-200 group-hover:bg-slate-400 group-active:bg-slate-500 transition-colors" />
            <div className="absolute h-8 w-1 bg-slate-300 rounded-full group-hover:bg-slate-400 group-active:bg-slate-500 transition-colors" />
          </PanelResizeHandle>

          {/* RIGHT RAIL - 40% */}
          <Panel defaultSize={40} minSize={25} className="flex flex-col pl-4 h-full">
            <div className="flex bg-slate-100 p-1 rounded-md mb-4 shrink-0" role="tablist">
              <button 
                role="tab"
                onClick={() => setRightTab('tasks')} 
                className={`flex-1 py-1.5 text-[13px] font-medium rounded-sm transition-all ${rightTab === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Actions
              </button>
              <button 
                role="tab"
                onClick={() => setRightTab('goals')} 
                className={`flex-1 py-1.5 text-[13px] font-medium rounded-sm transition-all ${rightTab === 'goals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Goals
              </button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 pb-4 pr-1">
              
              {/* Goals Section */}
              {rightTab === 'goals' && (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <h3 className="font-semibold text-slate-900 text-[15px]">Goals</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchSuggestedGoals}
                        disabled={suggestLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[12px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-60"
                      >
                        <span className={suggestLoading ? "animate-spin inline-block" : ""}>✨</span>
                        {suggestLoading ? "..." : "Suggest"}
                      </button>
                      <button
                        onClick={() => { setEditGoal(undefined); setShowGoalModal(true); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Goals
                      </button>
                    </div>
                  </div>

                  {/* AI Suggest Panel */}
                  {showSuggestPanel && (
                    <div className="mb-3 border border-indigo-200 bg-indigo-50/40 rounded-lg overflow-hidden shrink-0">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-100">
                        <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">✨ AI Suggestions</span>
                        <div className="flex items-center gap-2">
                          {selectedGoalIdxs.size > 0 && (
                            <button
                              onClick={addSelectedGoals}
                              disabled={addingGoals}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-700 text-white rounded hover:bg-indigo-800 transition-colors disabled:opacity-60"
                            >
                              {addingGoals ? "Adding..." : `Add ${selectedGoalIdxs.size} goal${selectedGoalIdxs.size > 1 ? "s" : ""}`}
                            </button>
                          )}
                          <button onClick={() => { setShowSuggestPanel(false); setSuggestedGoals([]); setSelectedGoalIdxs(new Set()); }} className="text-[11px] text-indigo-400 hover:text-indigo-700">✕</button>
                        </div>
                      </div>
                      {suggestLoading ? (
                        <div className="px-4 py-5 text-center text-[12px] text-indigo-500 animate-pulse">✨ Generating smart goal suggestions...</div>
                      ) : suggestedGoals.length > 0 ? (
                        <div className="divide-y divide-indigo-100 max-h-64 overflow-y-auto">
                          {suggestedGoals.map((g, i) => (
                            <button key={i} type="button" onClick={() => toggleSuggestIdx(i)}
                              className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-2.5 ${selectedGoalIdxs.has(i) ? "bg-indigo-100" : "hover:bg-indigo-50/60"}`}>
                              <span className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selectedGoalIdxs.has(i) ? "bg-indigo-700 border-indigo-700" : "border-indigo-300"}`}>
                                {selectedGoalIdxs.has(i) && <span className="text-white text-[9px] font-bold">✓</span>}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-slate-800">{g.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{g.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-4 text-[12px] text-slate-400 text-center">No suggestions. Check your API key in .env.local</div>
                      )}
                    </div>
                  )}

                 <div className="bg-white border border-slate-200 rounded-md shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                   <div className="overflow-y-auto flex-1 p-5 bg-white">
                     <div className="space-y-4">
                       {mockUser.goals.filter(g => !g.parentId).map((goal: Goal) => {
                         const subgoals = mockUser.goals.filter(sg => sg.parentId === goal.id);
                         const isExpanded = expandedGoals.has(goal.id);
                         const sInfo = STATUS_OPTIONS.find(s => s.value === (goal.status || 'on_track')) || STATUS_OPTIONS[0];

                         return (
                           <div key={goal.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                             {/* Parent Row */}
                             <div className="group flex flex-col p-4 border-b border-slate-100 transition-colors">
                               <div className="flex items-start gap-4">
                                 <button onClick={() => toggleExpand(goal.id)} className="text-slate-400 hover:text-slate-600 mt-2.5 shrink-0">
                                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                                 </button>
                                 
                                 <ProgressRing progress={goal.progress} colorClass={sInfo.color} size={40} />
                                 
                                 <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                   <div className="min-w-0 flex-1">
                                     <span className="text-[15px] font-semibold text-slate-900 truncate block hover:text-indigo-600 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setEditGoal(goal); setShowGoalModal(true); }}>
                                       {goal.title}
                                     </span>
                                     <div className="flex items-center gap-3 mt-1.5">
                                       <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold ${getBadgeClass(goal.status || 'on_track')}`}>
                                         {sInfo.label}
                                       </span>
                                       {(goal.status === 'at_risk' || goal.status === 'off_track') && (
                                         <RiskExplanationPopover goalId={goal.id} reporteeId={mockUser.id} />
                                       )}
                                       <div className="w-32">
                                         <GoalProgressSlider reporteeId={mockUser.id} goal={goal} readOnly={subgoals.length > 0} />
                                       </div>
                                     </div>
                                   </div>
                                   <button onClick={(e) => { e.stopPropagation(); setEditGoal(goal); setShowGoalModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                     <Pencil className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                             </div>
                             
                             {/* Subgoals */}
                             {isExpanded && (
                               <div className="bg-white">
                                 <div className="relative border-l border-slate-200 ml-6 pl-5 py-2">
                                   {subgoals.map(sg => {
                                     const sgInfo = STATUS_OPTIONS.find(s => s.value === (sg.status || 'on_track')) || STATUS_OPTIONS[0];
                                     return (
                                       <div key={sg.id} className="group flex flex-col py-3 pr-4 relative border-b border-slate-50 last:border-0">
                                         <div className="absolute -left-5 top-7 w-4 h-px bg-slate-200" />
                                         <div className="flex items-start gap-4 pl-1">
                                           <ProgressRing progress={sg.progress} colorClass={sgInfo.color} size={32} />
                                           
                                           <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                             <div className="min-w-0 flex-1">
                                               <span className="text-[13.5px] font-medium text-slate-800 truncate block hover:text-indigo-600 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); setEditGoal(sg); setShowGoalModal(true); }}>
                                                 {sg.title}
                                               </span>
                                               <div className="flex items-center gap-3 mt-1.5">
                                                 <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${getBadgeClass(sg.status || 'on_track')}`}>
                                                   {sgInfo.label}
                                                 </span>
                                                 {(sg.status === 'at_risk' || sg.status === 'off_track') && (
                                                   <RiskExplanationPopover goalId={sg.id} reporteeId={mockUser.id} />
                                                 )}
                                                 <div className="w-28">
                                                   <GoalProgressSlider reporteeId={mockUser.id} goal={sg} />
                                                 </div>
                                               </div>
                                             </div>
                                             <button onClick={(e) => { e.stopPropagation(); setEditGoal(sg); setShowGoalModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                               <Pencil className="w-3.5 h-3.5" />
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                     );
                                   })}
                                   
                                   <div className="py-2.5 relative">
                                      <div className="absolute -left-5 top-1/2 w-4 h-px bg-slate-200" />
                                      <button onClick={() => { 
                                        const event = new CustomEvent('open-add-subgoal', { detail: { parentId: goal.id } });
                                        window.dispatchEvent(event);
                                      }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[12px] font-medium text-slate-600 hover:text-slate-900 shadow-sm transition-colors">
                                        <Plus className="w-3 h-3" /> Add subgoal
                                      </button>
                                   </div>
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                       })}
                       {mockUser.goals.length === 0 && <p className="text-[13px] text-slate-400 p-8 text-center">No goals yet.</p>}
                     </div>
                   </div>
                   <div className="border-t border-slate-100 bg-slate-50/30 p-2 flex justify-center shrink-0">
                     <Link href={`/goals?user=${encodeURIComponent(mockUser.name)}`} className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors font-medium">View all →</Link>
                   </div>
                 </div>
              </div>
              )}

              {/* Action Items Section */}
              {rightTab === 'tasks' && (
                <div className="flex flex-col h-full">
                 <div className="flex justify-between items-center mb-3 shrink-0">
                   <h3 className="font-semibold text-slate-900 text-[15px]">Action Items</h3>
                   <button 
                     onClick={() => { setEditActionTask(undefined); setShowActionModal(true); }}
                     className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                   >
                     <Plus className="w-3.5 h-3.5" /> Action
                   </button>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                   <div className="flex-1 overflow-y-auto">
                     <div className="flex flex-col">

                       {allTasks.map((task: Task) => (
                         <TaskItem key={task.id} reporteeId={mockUser.id} task={task} onEdit={(t) => { setEditActionTask(t); setShowActionModal(true); }} />
                       ))}
                       {allTasks.length === 0 && <p className="text-[13px] text-slate-400 py-8 text-center">No action items.</p>}
                     </div>
                   </div>
                   <div className="border-t border-slate-100 bg-slate-50/30 p-2 flex justify-center shrink-0">
                     <Link href={`/actions?user=${encodeURIComponent(mockUser.name)}`} className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors font-medium">View all →</Link>
                   </div>
                 </div>
              </div>
              )}

            </div>
          </Panel>
        </PanelGroup>
      </div>

      {showGoalModal && (
        <GoalModal 
          reporteeId={mockUser.id} 
          allGoals={mockUser.goals} 
          editGoal={editGoal}
          initialParentId={initialParentId}
          initialTitle={convertedGoalTitle}
          teamMembers={[{ id: mockUser.id, name: mockUser.name }]}
          onClose={() => { setShowGoalModal(false); setEditGoal(undefined); setInitialParentId(undefined); setConvertedGoalTitle(undefined); }} 
        />
      )}

      {showActionModal && (
        <ActionModal
          reporteeId={mockUser.id}
          editTask={editActionTask}
          initialTitle={convertedActionTitle}
          onClose={() => { setShowActionModal(false); setEditActionTask(undefined); setConvertedActionTitle(undefined); }}
        />
      )}
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Role Title</label>
                  <input type="text" value={profileData.role} onChange={e => setProfileData({...profileData, role: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Department</label>
                  <select value={profileData.department} onChange={e => setProfileData({...profileData, department: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white">
                    <option value="">Select...</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Seniority Level</label>
                  <select value={profileData.seniority} onChange={e => setProfileData({...profileData, seniority: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white">
                    <option value="">Select...</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Career Track</label>
                  <select value={profileData.careerTrack} onChange={e => setProfileData({...profileData, careerTrack: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white">
                    <option value="">Select...</option>
                    <option value="Individual Contributor">Individual Contributor</option>
                    <option value="Management">Management</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Performance</label>
                  <select value={profileData.performance} onChange={e => setProfileData({...profileData, performance: e.target.value})} className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white">
                    <option value="">Select...</option>
                    <option value="High Performer">High Performer</option>
                    <option value="Steady">Steady</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Sync Frequency</label>
                <div className="w-full">
                  <FreqSelect reporteeId={mockUser.id} initialVal={mockUser.checkInFreq} frequencies={frequencies} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                {!isManagerUser && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${mockUser.name}?`)) {
                        await deleteReportee(mockUser.id);
                        router.push('/team');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete User
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowEditProfile(false)} className="px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                <button onClick={handleSaveProfile} className="px-3 py-1.5 text-[13px] font-medium bg-slate-900 text-white hover:bg-slate-800 rounded">Save Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrep && (
        <PrepBriefPanel
          reporteeId={mockUser.id}
          reporteeName={mockUser.name}
          onClose={() => setShowPrep(false)}
        />
      )}

      {showPerfReview && (
        <PerfReviewPanel
          reporteeId={mockUser.id}
          reporteeName={mockUser.name}
          onClose={() => setShowPerfReview(false)}
        />
      )}

      {showAgenda && (
        <AgendaGenPanel
          reporteeId={mockUser.id}
          reporteeName={mockUser.name}
          onClose={() => setShowAgenda(false)}
        />
      )}
    </div>
  );
}

