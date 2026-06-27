"use client";
import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Zap, Loader2, CalendarHeart, AlertTriangle } from "lucide-react";

type DigestData = {
  digestText: string;
  actionRecommendation: string;
  criticalAlert?: string | null;
  hasMeaningfulUpdates: boolean;
  isWeeklyWrapUp: boolean;
};

export function DailyDigestBanner() {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDigest() {
      try {
        const res = await fetch("/api/ai-daily-digest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Send isFriday true 1/5th of the time for demo purposes or base it on actual date
          body: JSON.stringify({ isFriday: new Date().getDay() === 5 }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load daily digest", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDigest();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl p-5 border border-indigo-100 bg-white shadow-sm mb-6 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-300" />
          <div className="h-4 bg-indigo-50 w-48 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-50 w-full rounded"></div>
          <div className="h-3 bg-slate-50 w-5/6 rounded"></div>
          <div className="h-3 bg-slate-50 w-4/6 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.hasMeaningfulUpdates) {
    return null; // Don't show if nothing happened
  }

  return (
    <div className="rounded-xl p-6 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #faf5ff, #f3e8ff)" }}>
      {/* Decorative element */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-fuchsia-200/40 rounded-full blur-2xl"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-fuchsia-100 text-fuchsia-600">
          {data.isWeeklyWrapUp ? <CalendarHeart className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-[13px] font-bold tracking-[0.05em] uppercase text-fuchsia-800">
              {data.isWeeklyWrapUp ? "Weekly Wrap-up" : "What's Changed"}
            </h2>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-fuchsia-200 bg-white/60 text-fuchsia-600">AI Summary</span>
          </div>
          
          <p className="text-[14px] leading-relaxed text-slate-800 mb-4 font-medium">
            {data.digestText}
          </p>

          <div className="bg-white/60 border border-fuchsia-100 rounded-lg p-3 flex items-start gap-3 shadow-sm mb-3">
            <div className="mt-0.5 shrink-0">
              <Zap className="w-4 h-4 text-fuchsia-500" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">One Action to Take</div>
              <div className="text-[13px] font-semibold text-slate-800">{data.actionRecommendation}</div>
            </div>
          </div>

          {data.criticalAlert && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="mt-0.5 shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-red-800 uppercase mb-0.5 tracking-wider">Proactive Alert</div>
                <div className="text-[13px] font-medium text-red-900 leading-relaxed">{data.criticalAlert}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
