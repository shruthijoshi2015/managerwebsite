"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, Users, AlertTriangle, Lightbulb } from "lucide-react";

type Skill = {
  name: string;
  level: number;
  evidence: string;
};

type MemberSkill = {
  id: number;
  name: string;
  skills: Skill[];
  bestFitFor: string[];
  currentWorkload: "light" | "moderate" | "heavy";
};

type Props = {
  onClose: () => void;
};

export function SkillMatrixPanel({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberSkill[]>([]);
  const [teamGaps, setTeamGaps] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-skill-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setMembers(data.members || []);
      setTeamGaps(data.teamGaps || []);
      setRecommendations(data.recommendations || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

  const workloadColor = (w: string) => w === "light" ? "text-emerald-600 bg-emerald-50" : w === "heavy" ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50";
  const skillBar = (level: number) => {
    const colors = ["", "bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-600"];
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`w-5 h-2 rounded-sm ${i <= level ? colors[level] : "bg-slate-200"}`} />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Team Skill Matrix</h2>
              <p className="text-[13px] text-slate-500">AI-inferred skills & resource recommendations</p>
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
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
              <p className="text-[14px] font-medium">Building skill profiles...</p>
              <p className="text-[12px]">Analyzing task patterns and goal completions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to generate skill matrix</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button onClick={generate} className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Team Gaps */}
              {teamGaps.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-[12px] font-bold text-amber-700 uppercase tracking-wider">Team Skill Gaps</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamGaps.map((gap, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-100 text-amber-800 text-[12px] font-medium rounded-full border border-amber-200">{gap}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-violet-600" />
                    <span className="text-[12px] font-bold text-violet-700 uppercase tracking-wider">AI Recommendations</span>
                  </div>
                  {recommendations.map((rec, i) => (
                    <div key={i} className="text-[13px] text-violet-800 mb-1.5 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              )}

              {/* Member Cards */}
              <div className="space-y-4">
                {members.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[15px] font-bold text-slate-900">{m.name}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${workloadColor(m.currentWorkload)}`}>
                        {m.currentWorkload} workload
                      </span>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2 mb-4">
                      {m.skills.map((skill, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[12px] text-slate-600 w-36 truncate shrink-0">{skill.name}</span>
                          {skillBar(skill.level)}
                          <span className="text-[11px] text-slate-400 truncate">{skill.evidence}</span>
                        </div>
                      ))}
                    </div>

                    {/* Best Fit */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-slate-500 mr-1">Best for:</span>
                      {m.bestFitFor.map((fit, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full border border-indigo-100">{fit}</span>
                      ))}
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
