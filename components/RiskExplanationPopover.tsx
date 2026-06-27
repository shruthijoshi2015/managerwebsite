"use client";
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, AlertTriangle, ArrowRight, Loader2, Info } from "lucide-react";

export function RiskExplanationPopover({ goalId, reporteeId }: { goalId: number; reporteeId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ explanation?: string; recommendation?: string; error?: string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    
    if (!data && !isOpen) {
      setLoading(true);
      try {
        const res = await fetch("/api/ai-risk-explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId, reporteeId })
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        setData({ error: "Failed to load explanation." });
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button 
        onClick={handleOpen}
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm transition-colors"
        title="Why is this goal at risk?"
      >
        <Sparkles className="w-3 h-3" /> Why?
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h4 className="text-[13px] font-bold text-slate-800">AI Risk Analysis</h4>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <p className="text-[12px] text-slate-500">Analyzing goal context...</p>
            </div>
          ) : data?.error ? (
            <div className="text-[12px] text-red-500 p-2 bg-red-50 rounded-lg">{data.error}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[12px] text-slate-700 leading-relaxed">
                  {data?.explanation}
                </p>
              </div>
              
              {data?.recommendation && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Recommendation</span>
                  </div>
                  <p className="text-[12px] text-amber-900 leading-relaxed font-medium">
                    {data.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
