"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Smile } from "lucide-react";

type MemberSentiment = {
  id: number;
  name: string;
  sentimentScore: number;
  trend: "improving" | "declining" | "stable";
  needsAttention: boolean;
  insight: string;
};

type Props = {
  onClose: () => void;
};

export function SentimentTrendPanel({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMorale, setTeamMorale] = useState("");
  const [averageScore, setAverageScore] = useState(0);
  const [members, setMembers] = useState<MemberSentiment[]>([]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-sentiment-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setTeamMorale(data.teamMorale);
      setAverageScore(data.averageScore);
      setMembers(data.members || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

  const scoreColor = (s: number) => s >= 7 ? "text-emerald-600" : s >= 5 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 7 ? "bg-emerald-50 border-emerald-200" : s >= 5 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const trendIcon = (t: string) => t === "improving" ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : t === "declining" ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-slate-400" />;

  const avgColor = averageScore >= 7 ? "from-emerald-500 to-green-600" : averageScore >= 5 ? "from-amber-500 to-yellow-600" : "from-red-500 to-orange-600";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Team Sentiment Analysis</h2>
              <p className="text-[13px] text-slate-500">AI-powered morale insights from 1:1 notes</p>
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
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-pink-500" />
              <p className="text-[14px] font-medium">Analyzing team sentiment...</p>
              <p className="text-[12px]">Reading through meeting notes and check-ins...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to analyze sentiment</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button onClick={generate} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Team Overview */}
              <div className={`rounded-xl p-5 bg-gradient-to-r ${avgColor} text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider opacity-80">Team Morale Score</span>
                  <span className="text-[32px] font-black">{averageScore.toFixed(1)}<span className="text-[16px] opacity-60">/10</span></span>
                </div>
                <p className="text-[14px] opacity-90 leading-relaxed">{teamMorale}</p>
              </div>

              {/* Needs Attention */}
              {members.filter(m => m.needsAttention).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Needs Attention</span>
                  </div>
                  {members.filter(m => m.needsAttention).map(m => (
                    <div key={m.id} className="text-[13px] text-red-800 mb-2 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span><strong>{m.name}</strong> — {m.insight}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Individual Cards */}
              <div className="space-y-3">
                {members.map(m => (
                  <div key={m.id} className={`border rounded-xl p-4 flex items-center gap-4 ${scoreBg(m.sentimentScore)}`}>
                    <div className={`text-[28px] font-black ${scoreColor(m.sentimentScore)} w-14 text-center`}>
                      {m.sentimentScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-slate-900">{m.name}</span>
                        <div className="flex items-center gap-1">
                          {trendIcon(m.trend)}
                          <span className="text-[11px] text-slate-500 capitalize">{m.trend}</span>
                        </div>
                        {m.needsAttention && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{m.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
