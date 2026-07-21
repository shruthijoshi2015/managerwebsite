"use client";

import React, { useState } from "react";
import { Rocket, CheckCircle2, Sparkles, X, Calendar, ArrowRight, ShieldCheck, Target, CheckSquare } from "lucide-react";
import { useIndexedDB } from "@/components/IndexedDBProvider";
import { addGoal, addTask } from "@/lib/actions";

interface OnboardingModalProps {
  reporteeId: number;
  reporteeName: string;
  reporteeRole: string;
  onClose: () => void;
}

export const ONBOARDING_TEMPLATES = {
  frontend: {
    label: "Senior Frontend Engineer",
    phase30: {
      goalTitle: "Days 1-30: Architecture Setup & UI System Mastery",
      description: "Onboarding Phase 1: Familiarize with design tokens, React/Next.js architecture, and setup complete local dev environment.",
      tasks: [
        { title: "Complete local environment setup & verify Turbopack build", timeframe: "Week 1" },
        { title: "Review component design tokens & UI library architecture", timeframe: "Week 2" },
        { title: "Pair program on first bugfix PR and ship to staging", timeframe: "Week 3" },
        { title: "Complete 30-Day Check-in & feedback loop with engineering lead", timeframe: "Week 4" }
      ]
    },
    phase60: {
      goalTitle: "Days 31-60: First Feature Delivery & Ownership",
      description: "Onboarding Phase 2: Take ownership of a standalone frontend feature module and participate in code reviews.",
      tasks: [
        { title: "Lead technical design for assigned UI feature sprint", timeframe: "Week 6" },
        { title: "Review at least 5 PRs from peer engineers with constructive feedback", timeframe: "Week 7" },
        { title: "Complete 60-Day Check-in & assess velocity targets", timeframe: "Week 8" }
      ]
    },
    phase90: {
      goalTitle: "Days 61-90: Autonomous Execution & Strategic Contribution",
      description: "Onboarding Phase 3: Fully autonomous execution, performance optimizations, and mentoring junior teammates.",
      tasks: [
        { title: "Deliver quarterly frontend epic on schedule", timeframe: "Week 11" },
        { title: "Complete 90-Day Graduation Review & career trajectory alignment", timeframe: "Week 12" }
      ]
    }
  },
  backend: {
    label: "Backend & Systems Engineer",
    phase30: {
      goalTitle: "Days 1-30: API Services & Data Model Onboarding",
      description: "Onboarding Phase 1: Understand database schema, authentication pipelines, and microservice topologies.",
      tasks: [
        { title: "Setup local Postgres/Redis containers and run test suite", timeframe: "Week 1" },
        { title: "Trace authentication flow across API gateway and service boundaries", timeframe: "Week 2" },
        { title: "Ship first backend API endpoint improvement to production", timeframe: "Week 3" }
      ]
    },
    phase60: {
      goalTitle: "Days 31-60: Core Service Module Delivery",
      description: "Onboarding Phase 2: Design and implement core data pipelines with comprehensive unit/integration test coverage.",
      tasks: [
        { title: "Write RFC / Architecture Spec for assigned data pipeline module", timeframe: "Week 6" },
        { title: "Achieve 90%+ test coverage on newly developed API services", timeframe: "Week 7" }
      ]
    },
    phase90: {
      goalTitle: "Days 61-90: Production Scale & System Reliability",
      description: "Onboarding Phase 3: Participate in on-call rotation, lead incident reviews, and drive performance tuning.",
      tasks: [
        { title: "Complete shadow on-call rotation and handle live alerts", timeframe: "Week 10" },
        { title: "Complete 90-Day Review and finalize long-term domain ownership", timeframe: "Week 12" }
      ]
    }
  },
  general: {
    label: "General Engineering Onboarding",
    phase30: {
      goalTitle: "Days 1-30: Core Systems, Tools & Team Workflow",
      description: "Master engineering rituals, codebase layout, and successfully complete starter tasks.",
      tasks: [
        { title: "Complete onboarding security & compliance training checklist", timeframe: "Week 1" },
        { title: "Setup 1:1 sync schedules with cross-functional partners and PMs", timeframe: "Week 2" },
        { title: "Deliver first production code contribution", timeframe: "Week 3" }
      ]
    },
    phase60: {
      goalTitle: "Days 31-60: Feature Delivery & Collaboration",
      description: "Consistently deliver sprint commitments and contribute to team architecture discussions.",
      tasks: [
        { title: "Independently deliver sprint action items without blocker escalation", timeframe: "Week 6" },
        { title: "Present one technical demo during sprint review", timeframe: "Week 8" }
      ]
    },
    phase90: {
      goalTitle: "Days 61-90: Full Autonomy & Future Roadmap",
      description: "Graduate from onboarding plan with full domain confidence and self-directed execution.",
      tasks: [
        { title: "Lead end-to-end delivery of medium-complexity project", timeframe: "Week 11" },
        { title: "Complete 90-Day Onboarding Graduation & OKR goal setting", timeframe: "Week 12" }
      ]
    }
  }
};

export function OnboardingModal({ reporteeId, reporteeName, reporteeRole, onClose }: OnboardingModalProps) {
  const { persistAfterMutation } = useIndexedDB();
  const [selectedRole, setSelectedRole] = useState<'frontend' | 'backend' | 'general'>('frontend');
  const [selectedPhases, setSelectedPhases] = useState<{ p30: boolean; p60: boolean; p90: boolean }>({
    p30: true,
    p60: true,
    p90: true
  });
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [activeTemplates, setActiveTemplates] = useState<any>(ONBOARDING_TEMPLATES);

  React.useEffect(() => {
    import("@/lib/storageProvider").then(mod => {
      mod.getIndexedDBData().then((data: any) => {
        if (data?.config?.onboardingTemplates) {
          setActiveTemplates(data.config.onboardingTemplates);
        }
      });
    });
  }, []);

  // Auto-select template based on role string if possible on initial load
  React.useEffect(() => {
    const roleLower = reporteeRole.toLowerCase();
    if (roleLower.includes('front') || roleLower.includes('ui') || roleLower.includes('web')) {
      setSelectedRole('frontend');
    } else if (roleLower.includes('back') || roleLower.includes('data') || roleLower.includes('sys') || roleLower.includes('cloud')) {
      setSelectedRole('backend');
    } else {
      setSelectedRole('general');
    }
  }, [reporteeRole]);

  const template = activeTemplates[selectedRole] || ONBOARDING_TEMPLATES[selectedRole] || ONBOARDING_TEMPLATES.general;

  const handleApplyPlan = async () => {
    setIsApplying(true);

    const phasesToApply = [
      selectedPhases.p30 && { phaseKey: '30' as const, data: template.phase30 },
      selectedPhases.p60 && { phaseKey: '60' as const, data: template.phase60 },
      selectedPhases.p90 && { phaseKey: '90' as const, data: template.phase90 }
    ].filter(Boolean);

    for (const phaseItem of phasesToApply) {
      if (!phaseItem) continue;
      // Create Phase Goal
      const fdGoal = new FormData();
      fdGoal.set("title", phaseItem.data.goalTitle);
      fdGoal.set("description", phaseItem.data.description);
      fdGoal.set("status", "on_track");
      fdGoal.set("icon", "🚀");
      fdGoal.set("priority", "P0");
      fdGoal.set("tags", JSON.stringify(["Onboarding", `Phase-${phaseItem.phaseKey}`]));
      await addGoal(reporteeId, fdGoal);

      // Create Tasks for this phase
      for (const t of phaseItem.data.tasks) {
        const fdTask = new FormData();
        fdTask.set("title", `[Onboarding Day ${phaseItem.phaseKey}] ${t.title}`);
        fdTask.set("status", "pending");
        fdTask.set("priority", "P1");
        fdTask.set("timeframe", t.timeframe);
        fdTask.set("owner", "reportee");
        await addTask(reporteeId, fdTask);
      }
    }

    await persistAfterMutation();
    setIsApplying(false);
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">30 / 60 / 90 Day Onboarding Plan</h2>
              <p className="text-xs text-slate-400">Structured goals & milestones for <span className="text-white font-semibold">{reporteeName}</span> ({reporteeRole})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Role Template Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Select Role Onboarding Template</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(ONBOARDING_TEMPLATES) as Array<'frontend' | 'backend' | 'general'>).map(roleKey => {
                const isSelected = selectedRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => setSelectedRole(roleKey)}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${isSelected ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm font-semibold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
                  >
                    <Target className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold capitalize">{roleKey === 'frontend' ? 'Senior Frontend' : roleKey === 'backend' ? 'Backend & Systems' : 'General Engineering'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phases Preview & Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Plan Phases & Milestones</label>
              <span className="text-[11px] text-slate-500">Uncheck any phase you wish to skip</span>
            </div>

            {/* 30 Day Phase */}
            <div className={`border rounded-xl p-4 transition ${selectedPhases.p30 ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhases.p30}
                    onChange={e => setSelectedPhases({ ...selectedPhases, p30: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">Phase 1 (Days 1-30)</span>
                  <span className="text-xs font-bold text-slate-800">{template.phase30.goalTitle.split(': ')[1]}</span>
                </div>
                <span className="text-[10px] text-slate-400">{template.phase30.tasks.length} Tasks</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 pl-6">{template.phase30.description}</p>
              <div className="pl-6 grid grid-cols-2 gap-2">
                {template.phase30.tasks.map((t: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 60 Day Phase */}
            <div className={`border rounded-xl p-4 transition ${selectedPhases.p60 ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhases.p60}
                    onChange={e => setSelectedPhases({ ...selectedPhases, p60: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">Phase 2 (Days 31-60)</span>
                  <span className="text-xs font-bold text-slate-800">{template.phase60.goalTitle.split(': ')[1]}</span>
                </div>
                <span className="text-[10px] text-slate-400">{template.phase60.tasks.length} Tasks</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 pl-6">{template.phase60.description}</p>
              <div className="pl-6 grid grid-cols-2 gap-2">
                {template.phase60.tasks.map((t: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 90 Day Phase */}
            <div className={`border rounded-xl p-4 transition ${selectedPhases.p90 ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhases.p90}
                    onChange={e => setSelectedPhases({ ...selectedPhases, p90: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">Phase 3 (Days 61-90)</span>
                  <span className="text-xs font-bold text-slate-800">{template.phase90.goalTitle.split(': ')[1]}</span>
                </div>
                <span className="text-[10px] text-slate-400">{template.phase90.tasks.length} Tasks</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 pl-6">{template.phase90.description}</p>
              <div className="pl-6 grid grid-cols-2 gap-2">
                {template.phase90.tasks.map((t: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Auto-creates Goals & Tasks inside {reporteeName}'s Tracker
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying || appliedSuccess}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyPlan}
              disabled={isApplying || appliedSuccess || (!selectedPhases.p30 && !selectedPhases.p60 && !selectedPhases.p90)}
              className={`px-5 py-2 rounded-xl text-white font-semibold text-xs transition shadow-md flex items-center gap-2 ${appliedSuccess ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Plan Successfully Applied!
                </>
              ) : isApplying ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Applying Plan...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  🚀 Start 30/60/90 Onboarding Plan
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
