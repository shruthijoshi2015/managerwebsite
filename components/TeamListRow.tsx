"use client";

import React from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export type TeamListRowProps = {
  member: {
    id: number;
    name: string;
    role: string;
    department: string;
    activeTasksCount: number;
    activeGoalsCount: number;
    goalsProgressAvg: number;
    overdueTasksCount?: number;
    checkInCount?: number;
  };
  config: {
    showProgressTrend?: boolean;
    showWorkload?: boolean;
    showQuickStats?: boolean;
    showMeetingDates?: boolean;
    showGoalProgress?: boolean;
    showDepartment?: boolean;
    fieldOrder?: string[];
  };
  onPrep?: (id: number, name: string) => void;
};

function getStatusInfo(progress: number, overdue: number) {
  if (overdue > 0) {
    return {
      borderColor: '#f59e0b',
      avatarBg: '#fef3c7',
      avatarText: '#92400e',
      label: `${overdue} overdue`,
      isOverdue: true,
    };
  }
  if (progress >= 80) {
    return {
      borderColor: '#10b981',
      avatarBg: '#d1fae5',
      avatarText: '#065f46',
      label: 'On track',
      isOverdue: false,
    };
  }
  if (progress >= 40) {
    return {
      borderColor: '#f59e0b',
      avatarBg: '#fef3c7',
      avatarText: '#92400e',
      label: 'On track',
      isOverdue: false,
    };
  }
  return {
    borderColor: '#ef4444',
    avatarBg: '#fee2e2',
    avatarText: '#991b1b',
    label: 'On track',
    isOverdue: false,
  };
}

function getWorkloadLevel(activeTasksCount: number) {
  if (activeTasksCount > 12) return { level: 'High', filled: 4, color: '#f59e0b', emptyColor: '#fde68a' };
  if (activeTasksCount > 6)  return { level: 'Medium', filled: 3, color: '#3b82f6', emptyColor: '#bfdbfe' };
  return { level: 'Light', filled: 2, color: '#10b981', emptyColor: '#a7f3d0' };
}

function getTrendText(id: number, activeGoalsCount: number, activeTasksCount: number) {
  const patterns = ['trending up', 'trending down', 'all complete', `${activeTasksCount} tasks overdue`, 'stable'];
  return patterns[id % patterns.length];
}

export function TeamListRow({ member, config, onPrep }: TeamListRowProps) {
  const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const overdue = member.overdueTasksCount ?? (member.id % 3 === 0 ? 2 : 0);
  const statusInfo = getStatusInfo(member.goalsProgressAvg, overdue);
  const workload = getWorkloadLevel(member.activeTasksCount);
  const trendText = getTrendText(member.id, member.activeGoalsCount, member.activeTasksCount);

  const isOverdueReview = member.id % 2 === 0;
  const nextDate = isOverdueReview ? 'Overdue' : 'Jun 15';
  const sinceText = isOverdueReview ? '14d since last' : '2d since last';

  const defaultFieldOrder = ['showGoalProgress', 'showProgressTrend', 'showWorkload', 'showMeetingDates', 'showQuickStats'];
  let fieldOrder = config.fieldOrder || defaultFieldOrder;
  fieldOrder = fieldOrder.map(k => !k.startsWith('show') ? 'show' + k.charAt(0).toUpperCase() + k.slice(1) : k);

  const renderColumn = (key: string) => {
    switch (key) {
      case 'showDepartment':
        if (config.showDepartment === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 140 }}>
             <div className="text-[11.5px] text-slate-500 font-medium mb-0.5">Department</div>
             <div className="text-[13px] text-slate-800 truncate">{member.department}</div>
          </div>
        );
      case 'showGoalProgress':
        if (config.showGoalProgress === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 120 }}>
            <div className="text-[15px] font-bold text-slate-800">{member.goalsProgressAvg}%</div>
            <div className="text-[11.5px] text-slate-500 leading-tight truncate">
              {member.activeGoalsCount} {member.activeGoalsCount === 1 ? 'goal' : 'goals'}
            </div>
          </div>
        );
      case 'showProgressTrend':
        if (config.showProgressTrend === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 120 }}>
             <div className="text-[11.5px] text-slate-500 leading-tight pt-1">
               {trendText}
             </div>
          </div>
        );
      case 'showWorkload':
        if (config.showWorkload === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 140 }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="h-2 w-3.5 rounded-sm"
                  style={{ backgroundColor: i <= workload.filled ? workload.color : workload.emptyColor }}
                />
              ))}
            </div>
            <div className="text-[11.5px] font-medium" style={{ color: workload.color }}>
              {workload.level}
            </div>
          </div>
        );
      case 'showMeetingDates':
        if (config.showMeetingDates === false) return null;
        return (
          <div key={key} className="px-4 shrink-0 flex items-center justify-between gap-2" style={{ width: 120 }}>
            <div>
              <div className={`text-[13.5px] font-semibold ${isOverdueReview ? 'text-rose-600' : 'text-slate-800'}`}>
                {nextDate}
              </div>
              <div className="text-[11.5px] text-slate-500">{sinceText}</div>
            </div>
            {onPrep && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrep(member.id, member.name); }}
                className="px-2.5 py-1.5 border border-indigo-200 rounded-lg text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 shrink-0"
              >
                <span className="text-[10px]">✨</span>
              </button>
            )}
          </div>
        );
      case 'showQuickStats':
        if (config.showQuickStats === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 140 }}>
            <div className="flex gap-4">
              <div>
                <div className="text-[13px] font-bold text-slate-800 leading-none">{member.activeTasksCount}</div>
                <div className="text-[10px] text-slate-500">Tasks</div>
              </div>
              <div>
                <div className="text-[13px] font-bold text-slate-800 leading-none">{member.checkInCount || 0}</div>
                <div className="text-[10px] text-slate-500">Check-ins</div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Link
      href={`/team/${member.id}`}
      className="group flex items-center border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors bg-white relative"
      style={{ minHeight: 64 }}
    >
      {/* Left color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm"
        style={{ backgroundColor: statusInfo.borderColor }}
      />

      {/* MEMBER column */}
      <div className="flex items-center gap-3 pl-5 pr-4 min-w-0" style={{ width: 260 }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
          style={{ backgroundColor: statusInfo.avatarBg, color: statusInfo.avatarText }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-slate-900 leading-tight truncate">{member.name}</div>
          <div className="text-[12px] text-slate-500 leading-tight truncate">
            {member.role}
          </div>
        </div>
      </div>

      {/* STATUS column */}
      <div className="px-4 shrink-0" style={{ width: 110 }}>
        {statusInfo.isOverdue ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-red-50 text-red-600 border border-red-100">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {statusInfo.label}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            {statusInfo.label}
          </span>
        )}
      </div>

      {fieldOrder.map(renderColumn)}

      {/* Spacer to absorb remaining width if any */}
      <div className="flex-1" />
    </Link>
  );
}
