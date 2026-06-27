"use client";
import React, { useState, useEffect } from "react";
import { X, Sparkles, Loader2, RefreshCw, Copy, Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

type Props = {
  reporteeId: number;
  reporteeName: string;
  onClose: () => void;
};

export function PerfReviewPanel({ reporteeId, reporteeName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [overallRating, setOverallRating] = useState("");
  const [keyStrengths, setKeyStrengths] = useState<string[]>([]);
  const [growthAreas, setGrowthAreas] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-perf-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteeId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setReviewText(data.reviewText);
      setOverallRating(data.overallRating);
      setKeyStrengths(data.keyStrengths || []);
      setGrowthAreas(data.growthAreas || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, [reporteeId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reviewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratingColor = overallRating === "Exceeds Expectations" ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : overallRating === "Needs Improvement" ? "text-red-700 bg-red-50 border-red-200"
    : "text-blue-700 bg-blue-50 border-blue-200";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Performance Review Draft</h2>
              <p className="text-[13px] text-slate-500">AI-generated review for {reporteeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
              <p className="text-[14px] font-medium">Drafting performance review...</p>
              <p className="text-[12px]">Analyzing goals, tasks, and meeting notes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to generate review</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button onClick={generate} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Rating Badge */}
              <div className="flex items-center justify-between">
                <span className={`px-4 py-2 rounded-full text-[13px] font-bold border ${ratingColor}`}>
                  {overallRating}
                </span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  {copied ? <span className="text-emerald-600">Copied!</span> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>

              {/* Strengths & Growth */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-[12px] font-bold text-emerald-700 uppercase tracking-wider">Strengths</span>
                  </div>
                  {keyStrengths.map((s, i) => (
                    <div key={i} className="text-[13px] text-emerald-800 mb-1.5 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    <span className="text-[12px] font-bold text-amber-700 uppercase tracking-wider">Growth Areas</span>
                  </div>
                  {growthAreas.map((a, i) => (
                    <div key={i} className="text-[13px] text-amber-800 mb-1.5 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-[13px] leading-relaxed">
                  {reviewText}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
