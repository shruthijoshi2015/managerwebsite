"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, AlertTriangle, Send, Activity, Plane, ShieldAlert, Users } from "lucide-react";

type RiskItem = {
  memberId: number;
  memberName: string;
  category: "burnout" | "flight_risk" | "silo" | "execution_risk";
  severity: "high" | "medium";
  reason: string;
  nudgeText: string;
};

type Props = {
  onClose: () => void;
};

export function RiskRadarPanel({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [summary, setSummary] = useState("");

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-risk-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to detect risks");
      
      setRisks(data.risks || []);
      setSummary(data.teamHealthSummary || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case "burnout": return { icon: <Activity className="w-4 h-4" />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", label: "Burnout Risk" };
      case "flight_risk": return { icon: <Plane className="w-4 h-4" />, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Flight Risk" };
      case "silo": return { icon: <Users className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Silo Detected" };
      default: return { icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Execution Risk" };
    }
  };

  const handleCopyNudge = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Nudge copied to clipboard!");
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Team Risk Radar</h2>
              <p className="text-[13px] text-slate-500">AI analysis of burnout, flight risks, and silos</p>
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
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-rose-500" />
              <p className="text-[14px] font-medium">Scanning team data...</p>
              <p className="text-[12px]">Analyzing workloads, check-ins, and goal progress...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to run Risk Radar</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button onClick={generate} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {summary && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-[14px] text-slate-700 font-medium">
                  {summary}
                </div>
              )}

              {risks.length === 0 ? (
                <div className="text-center py-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-1">No major risks detected</h3>
                  <p className="text-[13px] text-slate-500">The team appears to be healthy and on track.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {risks.map((risk, idx) => {
                    const config = getCategoryConfig(risk.category);
                    return (
                      <div key={idx} className={`bg-white border ${config.border} rounded-xl shadow-sm overflow-hidden`}>
                        {/* Header */}
                        <div className={`${config.bg} px-4 py-3 flex items-center justify-between border-b ${config.border}`}>
                          <div className="flex items-center gap-2">
                            <span className={config.color}>{config.icon}</span>
                            <span className={`text-[13px] font-bold ${config.color} uppercase tracking-wider`}>
                              {config.label}
                            </span>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            risk.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {risk.severity} severity
                          </span>
                        </div>
                        
                        {/* Body */}
                        <div className="p-4">
                          <div className="mb-4">
                            <h4 className="text-[15px] font-bold text-slate-900 mb-1">{risk.memberName}</h4>
                            <p className="text-[13px] text-slate-600">{risk.reason}</p>
                          </div>
                          
                          {/* Nudge */}
                          {risk.nudgeText && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Send className="w-3 h-3" /> Auto-Generated Nudge
                              </p>
                              <div className="text-[13px] text-slate-700 italic mb-3">"{risk.nudgeText}"</div>
                              <button 
                                onClick={() => handleCopyNudge(risk.nudgeText)}
                                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                              >
                                Copy to clipboard
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
