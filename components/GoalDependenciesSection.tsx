"use client";

import React, { useState } from "react";
import { Link2, Unlink, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { Goal } from "@/lib/db";

interface GoalDependenciesSectionProps {
  currentGoalId?: number;
  availableGoals: Goal[];
  selectedDependencyIds: number[];
  onChange: (ids: number[]) => void;
}

export function GoalDependenciesSection({
  currentGoalId,
  availableGoals,
  selectedDependencyIds = [],
  onChange
}: GoalDependenciesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out current goal to avoid circular dependency
  const eligibleGoals = availableGoals.filter(g => g.id !== currentGoalId);

  const toggleDependency = (id: number) => {
    if (selectedDependencyIds.includes(id)) {
      onChange(selectedDependencyIds.filter(x => x !== id));
    } else {
      onChange([...selectedDependencyIds, id]);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'achieved':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Achieved</span>;
      case 'at_risk':
        return <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> At Risk</span>;
      case 'off_track':
        return <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Off Track</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold">On Track</span>;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600" />
          <span className="text-[13px] font-bold text-slate-800">Goal Dependencies (Prerequisites / Blocked By)</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm"
        >
          {selectedDependencyIds.length > 0 ? `${selectedDependencyIds.length} Linked` : "Link Goals"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <p className="text-[12px] text-slate-500">
        Mark this goal as blocked by other prerequisite goals. If a prerequisite slips off track, this goal will show a dependency warning.
      </p>

      {/* Selected Dependencies List */}
      {selectedDependencyIds.length > 0 && (
        <div className="space-y-2 pt-1">
          {selectedDependencyIds.map(depId => {
            const depGoal = availableGoals.find(g => g.id === depId);
            if (!depGoal) return null;
            return (
              <div key={depId} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{depGoal.icon || "🎯"}</span>
                  <span className="font-semibold text-slate-800 truncate">{depGoal.title}</span>
                  {getStatusBadge(depGoal.status)}
                </div>
                <button
                  type="button"
                  onClick={() => toggleDependency(depId)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition shrink-0"
                  title="Remove Dependency"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown Selector */}
      {isOpen && (
        <div className="mt-2 bg-white border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-md">
          {eligibleGoals.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">No other goals available to link as prerequisites.</div>
          ) : (
            eligibleGoals.map(g => {
              const isLinked = selectedDependencyIds.includes(g.id);
              return (
                <div
                  key={g.id}
                  onClick={() => toggleDependency(g.id)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition text-xs ${isLinked ? 'bg-indigo-50/70 font-semibold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                    />
                    <span className="text-sm">{g.icon || "🎯"}</span>
                    <span className="truncate">{g.title}</span>
                  </div>
                  {getStatusBadge(g.status)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
