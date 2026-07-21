"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Trash2, ArrowRight, CheckCircle2, Target } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";

interface ScratchpadItem {
  id: string;
  text: string;
  converted?: 'action' | 'goal';
}

export function UserQuickScratchpad({ 
  reporteeId, 
  reporteeName,
  onConvertToAction,
  onConvertToGoal,
  onCountChange
}: { 
  reporteeId: number; 
  reporteeName: string;
  onConvertToAction: (text: string) => void;
  onConvertToGoal: (text: string) => void;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<ScratchpadItem[]>([]);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items, onCountChange]);

  useEffect(() => {
    const storageKey = `user_scratchpad_${reporteeId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItems(parsed);
      } catch (e) {
        seedDefaults();
      }
    } else {
      seedDefaults();
    }
  }, [reporteeId]);

  const seedDefaults = () => {
    const defaults: ScratchpadItem[] = [
      { id: "s1", text: "Excited to take on leadership of the redesign frontend initiative" },
      { id: "s2", text: "Needs support with DevOps pipelines for staging deployment" },
      { id: "s3", text: "Discuss mentorship goals for Q3 during next sync" }
    ];
    setItems(defaults);
    localStorage.setItem(`user_scratchpad_${reporteeId}`, JSON.stringify(defaults));
  };

  const saveItems = (updated: ScratchpadItem[]) => {
    setItems(updated);
    localStorage.setItem(`user_scratchpad_${reporteeId}`, JSON.stringify(updated));
  };

  const handleAddItem = () => {
    if (!newText.trim()) return;
    const newItem: ScratchpadItem = { id: "s_" + Date.now(), text: newText.trim() };
    saveItems([newItem, ...items]);
    setNewText("");
  };

  const handleDelete = (id: string) => {
    saveItems(items.filter(i => i.id !== id));
  };

  const handleConvert = (item: ScratchpadItem, type: 'action' | 'goal') => {
    const updated = items.map(i => i.id === item.id ? { ...i, converted: type } : i);
    saveItems(updated);
    if (type === 'action') {
      onConvertToAction(item.text);
    } else {
      onConvertToGoal(item.text);
    }
  };

  return (
    <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden mb-6">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Sparkles className="w-4 h-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-[14px]">Quick Notes Scratchpad</h3>
            <p className="text-[11px] text-slate-500">Jot thoughts on {reporteeName} & convert directly to actions or goals</p>
          </div>
        </div>
      </div>

      {/* Add Item Bar */}
      <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-lg border border-slate-200/80 focus-within:border-indigo-400 focus-within:bg-white transition-all">
        <input 
          type="text" 
          placeholder="Quick note or observation..." 
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddItem()}
          className="flex-1 bg-transparent px-2 py-1 text-[13px] outline-none text-slate-800 placeholder:text-slate-400"
        />
        <VoiceInputButton onResult={(speech) => setNewText(prev => (prev ? prev + ' ' : '') + speech)} />
        <button 
          onClick={handleAddItem}
          disabled={!newText.trim()}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[12px] rounded-md transition disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Scratchpad Items List */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-[12px] italic">Scratchpad is empty. Add quick notes above!</div>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-[13px] transition-all group ${
                item.converted ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span className={`truncate ${item.converted ? "line-through text-slate-500" : "text-slate-700 font-medium"}`}>
                  {item.text}
                </span>
                {item.converted === 'action' && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Converted to Action</span>}
                {item.converted === 'goal' && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Converted to Goal</span>}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!item.converted && (
                  <>
                    <button 
                      onClick={() => handleConvert(item, 'action')}
                      title="Convert to Action Item"
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-[11px] rounded flex items-center gap-1 transition shadow-2xs"
                    >
                      <CheckCircle2 className="w-3 h-3" /> → Action
                    </button>
                    <button 
                      onClick={() => handleConvert(item, 'goal')}
                      title="Convert to Goal"
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-[11px] rounded flex items-center gap-1 transition shadow-2xs"
                    >
                      <Target className="w-3 h-3" /> → Goal
                    </button>
                  </>
                )}
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-slate-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
