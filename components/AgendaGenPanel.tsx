"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, Calendar, AlertTriangle, MessageSquare, Target, Award } from "lucide-react";

type AgendaItem = {
  title: string;
  talkingPoint: string;
  priority: "high" | "medium" | "low";
  category: "follow-up" | "blocker" | "career" | "goal" | "kudos";
};

type Props = {
  reporteeId: number;
  reporteeName: string;
  onClose: () => void;
};

export function AgendaGenPanel({ reporteeId, reporteeName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [meetingSummary, setMeetingSummary] = useState("");

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-agenda-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteeId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setAgendaItems(data.agendaItems || []);
      setEstimatedDuration(data.estimatedDuration || "30 min");
      setMeetingSummary(data.meetingSummary || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, [reporteeId]);

  const priorityStyles: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "follow-up": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "blocker": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "career": return <Award className="w-4 h-4 text-violet-500" />;
      case "goal": return <Target className="w-4 h-4 text-emerald-500" />;
      case "kudos": return <Award className="w-4 h-4 text-amber-500" />;
      default: return <Calendar className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Smart 1:1 Agenda</h2>
              <p className="text-[13px] text-slate-500">AI-generated agenda for {reporteeName}</p>
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
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p className="text-[14px] font-medium">Generating smart agenda...</p>
              <p className="text-[12px]">Analyzing goals, tasks, and previous notes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to generate agenda</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button onClick={generate} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Summary Banner */}
              <div className="rounded-xl p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-blue-700 uppercase tracking-wider">Meeting Focus</span>
                  <span className="text-[12px] font-medium text-blue-600 bg-white px-2.5 py-1 rounded-full border border-blue-200">{estimatedDuration}</span>
                </div>
                <p className="text-[14px] text-slate-700 leading-relaxed">{meetingSummary}</p>
              </div>

              {/* Agenda Items */}
              <div className="space-y-3">
                {agendaItems.map((item, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{categoryIcon(item.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[14px] font-semibold text-slate-900">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityStyles[item.priority] || priorityStyles.low}`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed">{item.talkingPoint}</p>
                      </div>
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
