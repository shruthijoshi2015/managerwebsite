'use client';

import React, { useState } from 'react';
import { Target, CheckCircle, Download, Trash2, X, Plus, Sparkles, ChevronRight } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  itemType: 'members' | 'tasks' | 'goals';
  onAssignGoal?: () => void;
  onAssignTask?: () => void;
  onUpdateStatus?: (status: string) => void;
  onExportCsv?: () => void;
  onDelete?: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  itemType,
  onAssignGoal,
  onAssignTask,
  onUpdateStatus,
  onExportCsv,
  onDelete,
  onClear
}: BulkActionBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl px-5 py-3 shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-5 animate-in fade-in slide-in-from-bottom-6 duration-200 max-w-[95vw] overflow-x-auto whitespace-nowrap scrollbar-none">
      {/* Selection Badge */}
      <div className="flex items-center gap-2 border-r border-slate-700 pr-3 sm:pr-4 shrink-0">
        <span className="bg-indigo-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-inner animate-pulse">
          {selectedCount}
        </span>
        <span className="text-xs font-bold text-slate-200">
          {itemType === 'members' ? 'Members' : itemType === 'tasks' ? 'Tasks' : 'Goals'} Selected
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
        {onAssignGoal && (
          <button
            onClick={onAssignGoal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition shadow-sm"
          >
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            Assign Goal
          </button>
        )}

        {onAssignTask && (
          <button
            onClick={onAssignTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Assign Task
          </button>
        )}

        {onUpdateStatus && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Update Status
            </button>

            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute bottom-full mb-2 left-0 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 overflow-hidden text-xs font-semibold">
                  <button
                    onClick={() => { onUpdateStatus('resolved'); setShowStatusMenu(false); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 text-emerald-400 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Mark Resolved
                  </button>
                  <button
                    onClick={() => { onUpdateStatus('in_progress'); setShowStatusMenu(false); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 text-blue-400 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> Mark In Progress
                  </button>
                  <button
                    onClick={() => { onUpdateStatus('pending'); setShowStatusMenu(false); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-700 text-amber-400 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Mark Pending
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-bold border border-red-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
      </div>

      {/* Close/Clear Button */}
      <button
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-2"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
