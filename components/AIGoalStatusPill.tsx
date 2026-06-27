"use client";
import React, { useState } from "react";
import { Sparkles, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { updateGoal } from "@/lib/actions";

type AIGoalStatusPillProps = {
  goalId: number;
  reporteeId: number;
  currentStatus?: string;
  onStatusUpdated: () => void;
};

const STATUS_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  on_track:  { label: "On track",  dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  at_risk:   { label: "At risk",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200"       },
  off_track: { label: "Off track", dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200"             },
  achieved:  { label: "Achieved",  dot: "bg-slate-700",   badge: "bg-slate-100 text-slate-700 border-slate-200"      },
};

export function AIGoalStatusPill({ goalId, reporteeId, currentStatus, onStatusUpdated }: AIGoalStatusPillProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suggestion) {
      // Already have a suggestion, just toggle popover
      setShowPopover(!showPopover);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai-goal-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, reporteeId }),
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.suggestedStatus) {
        if (!currentStatus || data.suggestedStatus !== currentStatus || data.unrealisticDeadline) {
          setSuggestion(data);
          setShowPopover(true);
        }
      }
    } catch (err) {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  const handleAccept = async () => {
    setSaving(true);
    await updateGoal(reporteeId, goalId, { status: suggestion.suggestedStatus as any });
    setSaving(false);
    setShowPopover(false);
    onStatusUpdated();
  };

  // If we already have a suggestion, show it as a pill
  if (suggestion) {
    const s = STATUS_MAP[suggestion.suggestedStatus];
    return (
      <div className="relative inline-block">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowPopover(!showPopover); }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
        >
          <Sparkles className="w-3 h-3" />
          {currentStatus ? "Status Update?" : `Suggest: ${s.label}`}
          {suggestion.unrealisticDeadline && <AlertTriangle className="w-3 h-3 text-amber-500 ml-0.5" />}
        </button>

        {showPopover && (
          <div 
            onClick={e => e.stopPropagation()}
            className="absolute z-50 top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> AI Status Suggestion
              </div>
              <button onClick={() => setShowPopover(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
            </div>

            <div className="mb-3">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium mb-2 ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
              </span>
              <p className="text-[12px] text-slate-600 leading-relaxed">{suggestion.rationale}</p>
            </div>

            {suggestion.unrealisticDeadline && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed font-medium">
                  {suggestion.deadlineWarning}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={handleAccept}
                disabled={saving}
                className="flex-1 bg-slate-900 text-white text-[11px] font-semibold py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Accept</>}
              </button>
              <button 
                onClick={() => { setSuggestion(null); setShowPopover(false); setDismissed(true); }}
                className="flex-1 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: show a small "Analyze" button that triggers AI only on click
  return (
    <button 
      onClick={handleAnalyze}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
    >
      {loading ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing</>
      ) : (
        <><Sparkles className="w-3 h-3" /> Analyze</>
      )}
    </button>
  );
}

