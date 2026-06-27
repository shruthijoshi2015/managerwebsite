"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { addTask, addGoal, toggleTask, updateCheckInFreq, updateGoalProgress, toggleTaskOwner } from "@/lib/actions";

import { Reportee, Task } from "@/lib/db";

export function TaskItem({ reporteeId, task, readOnly = false, onEdit }: { reporteeId: number, task: any, readOnly?: boolean, onEdit?: (task: any) => void }) {
  const getPriorityColor = (p: string) => {
    if (p === 'P0') return "bg-rose-100 text-rose-700 border-rose-200";
    if (p === 'P1') return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };
  
  return (
    <div key={task.id} tabIndex={0} className={`flex flex-col gap-2 py-3 px-3 border-b last:border-0 border-slate-100 transition-all focus-within:ring-1 focus-within:ring-slate-200 focus-visible:outline-none ${task.owner === 'manager' ? 'bg-slate-50/50' : 'bg-white'}`}>
      <label className="flex items-start gap-3 w-full cursor-pointer group">
        <div className="relative flex items-start pt-0.5 shrink-0">
          <input 
            type="checkbox" 
            aria-label={`Mark task ${task.title} as ${task.done ? "incomplete" : "complete"}`}
            className={`w-4 h-4 rounded-sm border-slate-300 focus:ring-1 mt-0.5 cursor-pointer text-slate-800 focus:ring-slate-800 accent-slate-800`} 
            checked={task.done} 
            disabled={readOnly}
            onChange={(e) => toggleTask(reporteeId, task.id, e.target.checked)} 
          />
        </div>
        <div className="flex flex-col flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] font-medium leading-snug ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {task.title}
            </span>
            {task.owner === 'manager' && <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 rounded-sm shrink-0 whitespace-nowrap">My Action</span>}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getPriorityColor(task.priority || 'P2')}`}>
              {task.priority === 'P0' ? 'High' : task.priority === 'P1' ? 'Medium' : 'Low'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {task.timeframe || 'No Due Date'}
            </span>
            {task.done && task.completedAt && (
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">
                Completed
              </span>
            )}
          </div>
        </div>
      </label>
      {!readOnly && (
        <div className="flex justify-end gap-2 mt-1">
          {onEdit && (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); onEdit(task); }}
              className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded shadow-sm transition-all focus-visible:outline-none opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1"
            >
              ✏️ Edit
            </button>
          )}
          <button 
            type="button"
            aria-label={`Transfer ownership of task ${task.title}`}
            onClick={(e) => { e.preventDefault(); toggleTaskOwner(reporteeId, task.id); }}
            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded shadow-sm transition-all focus-visible:outline-none opacity-0 group-hover:opacity-100 focus-within:opacity-100"
            title="Toggle Ownership"
          >Transfer to {task.owner === 'manager' ? 'Reportee' : 'Me'}</button>
        </div>
      )}
    </div>
  );
}

export function TaskForm({ reporteeId, mockUser, teamContext, onSuccess }: { reporteeId: number; mockUser?: Reportee; teamContext?: any[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [isManagerAction, setIsManagerAction] = useState(false);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (val: string) => {
    if (val.trim().length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const activeTasks = mockUser?.tasks.filter(t => !t.done).map(t => t.title).join(", ");
      const recentNotes = mockUser?.notes.slice(0, 3).map(n => n.content).join("\n");

      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input: val,
          context: {
            role: mockUser?.role,
            department: mockUser?.department,
            seniority: mockUser?.seniority,
            careerTrack: mockUser?.careerTrack,
            performance: mockUser?.performance,
            notes: recentNotes,
            activeTasks: activeTasks,
            teamContext: teamContext
          }
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500);
  };

  const applySuggestion = (s: string) => {
    setInputValue(s);
    setSuggestions([]);
    setSelectedIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Tab") { e.preventDefault(); applySuggestion(suggestions[selectedIdx >= 0 ? selectedIdx : 0]); }
    else if (e.key === "Escape") { setSuggestions([]); }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || saving) return;
    setSaving(true);
    setSuggestions([]);
    try {
      await fetch("/api/add-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteeId, title: inputValue.trim(), owner: isManagerAction ? "manager" : undefined }),
      });
      // Trigger Next.js router refresh to update server components with new data
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to add task:", err);
    }
    setInputValue("");
    setIsManagerAction(false);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border border-slate-200 p-2 rounded-md bg-slate-50/30">
      <div className="flex border-b border-slate-200 mb-2">
        <button type="button" onClick={() => setActiveTab("write")} className={`px-4 py-1.5 text-[12px] font-medium border-b-2 transition-colors ${activeTab === "write" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>Write</button>
        <button type="button" onClick={() => setActiveTab("preview")} className={`px-4 py-1.5 text-[12px] font-medium border-b-2 transition-colors ${activeTab === "preview" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>Preview</button>
      </div>
      <div className="flex gap-2 items-start">
        <div className="relative flex-1">
          {activeTab === "write" ? (
            <textarea
              value={inputValue}
              onChange={(e: any) => handleChange(e)}
              onKeyDown={handleKeyDown}
              aria-label="New task description"
              placeholder="Describe the action item (Supports markdown: ![alt text](image_url))"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded outline-none focus:border-slate-400 bg-white min-h-[80px] resize-y"
              autoComplete="off"
            />
          ) : (
            <div className="w-full px-3 py-2 text-[13px] border border-transparent rounded bg-white min-h-[80px] text-slate-800"
                 dangerouslySetInnerHTML={{ __html: inputValue ? inputValue.replace(/\n/g, '<br/>').replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded mt-2 max-h-48" />') : '<span class="text-slate-400 italic">Nothing to preview.</span>' }}
            />
          )}
          
          {/* AI status indicator */}
          {activeTab === "write" && <span className={`absolute right-2.5 top-2.5 text-[11px] transition-opacity ${inputValue.length >= 3 ? "opacity-100" : "opacity-0"} ${loading ? "animate-pulse" : "text-slate-300"}`} title="AI powered">✨</span>}

          {/* Suggestions dropdown */}
          {activeTab === "write" && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">✨ AI Suggestions</span>
                <span className="text-[9px] text-slate-300 ml-auto">↑↓ navigate · Tab accept · Esc dismiss</span>
              </div>
              {suggestions.map((s, i) => (
                <button key={i} type="button" onMouseDown={e => { e.preventDefault(); applySuggestion(s); }}
                  className={`w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center gap-2 ${selectedIdx === i ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}>
                  <span className="text-slate-300 text-[10px] w-3 shrink-0">{i + 1}</span>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={!inputValue.trim() || saving}
          aria-label="Add new task"
          className="px-3 py-1.5 bg-slate-800 text-white font-medium text-[12px] rounded hover:bg-slate-700 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
          {saving ? "..." : "Add"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 cursor-pointer w-fit pl-1 hover:text-slate-700">
        <input type="checkbox" checked={isManagerAction} onChange={e => setIsManagerAction(e.target.checked)}
          aria-label="Mark task as personal action item"
          className="rounded-sm text-slate-800 border-slate-300 focus:ring-slate-800 cursor-pointer w-3.5 h-3.5" />
        Mark as my personal action item
      </label>
    </form>
  );
}



export function GoalForm({ reporteeId }: { reporteeId: number }) {
  const boundAddGoal = addGoal.bind(null, reporteeId);
  return (
    <form action={boundAddGoal} className="flex gap-2 flex-1 max-w-sm">
      <input type="text" name="title" aria-label="New goal title" placeholder="New goal..." className="flex-1 px-2.5 py-1.5 text-[13px] border border-slate-200 rounded outline-none focus:border-slate-400 bg-white shadow-sm" required />
      <button type="submit" aria-label="Add new goal" className="px-3 py-1.5 bg-slate-800 text-white font-medium text-[12px] rounded hover:bg-slate-700 shadow-sm">Add</button>
    </form>
  );
}

export function GoalProgressSlider({ reporteeId, goal, readOnly }: { reporteeId: number, goal: {id: number, title?: string, progress: number, total: number}, readOnly?: boolean }) {
  const [val, setVal] = useState(goal.progress);

  const handleChange = (e: any) => {
    const newVal = parseInt(e.target.value);
    setVal(newVal);
    updateGoalProgress(reporteeId, goal.id, newVal);
    
    if (newVal === goal.total && goal.progress !== goal.total) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(val / goal.total) * 100}%` }} />
        </div>
        <span className="text-[11px] text-slate-400 shrink-0 w-6 text-right">{val}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input 
        type="range" 
        min="0" 
        max={goal.total} 
        value={val} 
        aria-label={`Update progress for goal`}
        aria-valuenow={val}
        aria-valuemin={0}
        aria-valuemax={goal.total}
        onPointerUp={handleChange}
        onChange={(e) => setVal(parseInt(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none bg-slate-200"
        style={{ 
          background: `linear-gradient(to right, rgb(30 41 59) ${(val / goal.total) * 100}%, transparent ${(val / goal.total) * 100}%)`,
          WebkitAppearance: "none"
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #1e293b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        input[type=range]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #1e293b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

export function FreqSelect({ reporteeId, initialVal, frequencies = [] }: { reporteeId: number, initialVal: string, frequencies?: {id: string, label: string}[] }) {
  return (
    <select 
      defaultValue={initialVal} 
      aria-label="Select check-in frequency"
      onChange={(e) => updateCheckInFreq(reporteeId, e.target.value as "weekly" | "bi-weekly" | "monthly")}
      className="text-[12px] font-medium border border-transparent hover:border-slate-200 bg-transparent hover:bg-slate-50 transition-colors rounded px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer"
    >
      {(frequencies || []).map((f: {id: string, label: string}) => (
        <option key={f.id} value={f.id}>{f.label}</option>
      ))}
    </select>
  );
}
