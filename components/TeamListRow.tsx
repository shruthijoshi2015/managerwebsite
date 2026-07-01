"use client";

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Crown } from 'lucide-react';

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
    isManager?: boolean;
    checkInFreq?: string;
  };
  config: {
    showProgressTrend?: boolean;
    showWorkload?: boolean;
    showQuickStats?: boolean;
    showMeetingDates?: boolean;
    showGoalProgress?: boolean;
    showDepartment?: boolean;
    fieldOrder?: string[];
    size?: string;
    cardSize?: string;
  };
  onPrep?: (id: number, name: string) => void;
};

function getStatusInfo(progress: number, overdue: number) {
  if (overdue > 0) {
    return {
      label: `${overdue} overdue`,
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: '#ef4444',
      avatarBg: '#fee2e2',
      avatarText: '#991b1b',
      isOverdue: true,
    };
  }
  if (progress >= 80) {
    return {
      label: 'On Track',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: '#10b981',
      avatarBg: '#d1fae5',
      avatarText: '#065f46',
      isOverdue: false,
    };
  }
  if (progress >= 50) {
    return {
      label: 'In Progress',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: '#f59e0b',
      avatarBg: '#fef3c7',
      avatarText: '#92400e',
      isOverdue: false,
    };
  }
  return {
    label: 'At Risk',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: '#f97316',
    avatarBg: '#ffedd5',
    avatarText: '#9a3412',
    isOverdue: false,
  };
}

function getWorkloadLevel(tasksCount: number) {
  if (tasksCount >= 8) return { level: 'Heavy', color: '#dc2626', emptyColor: '#fee2e2' };
  if (tasksCount >= 4) return { level: 'Moderate', color: '#d97706', emptyColor: '#fef3c7' };
  return { level: 'Light', color: '#16a34a', emptyColor: '#dcfce7' };
}

function getTrendText(id: number, goalsCount: number, tasksCount: number) {
  const trends = ['Steady', 'Up ↑', 'Fast ↑', 'Stable', 'Peak ↑', 'Focus ↓', 'Active'];
  return trends[id % trends.length];
}

export const TeamListRow: React.FC<TeamListRowProps> = ({ member, config, onPrep }) => {
  const overdue = member.overdueTasksCount || 0;
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const isManagerMember = member.isManager || member.role.toLowerCase().includes('manager') || member.role.toLowerCase().includes('lead') || member.role.toLowerCase().includes('director');

  const statusInfo = getStatusInfo(member.goalsProgressAvg, overdue);
  const workload = getWorkloadLevel(member.activeTasksCount);
  const trendText = getTrendText(member.id, member.activeGoalsCount, member.activeTasksCount);

  const isOverdueReview = member.id % 2 === 0;
  const nextDate = isOverdueReview ? 'Overdue' : 'Jun 15';
  const sinceText = isOverdueReview ? '14d since last' : '2d since last';

  const size = config.size || config.cardSize || 'default';
  const minHeight = size === 'mini' ? 38 : size === 'compact' ? 56 : size === 'large' ? 84 : 64;
  const pyClass = size === 'mini' ? 'py-1.5' : size === 'compact' ? 'py-3' : size === 'large' ? 'py-5' : 'py-3.5';
  const avatarSize = size === 'mini' ? 'w-6 h-6 text-[11px]' : size === 'compact' ? 'w-8 h-8 text-xs' : size === 'large' ? 'w-11 h-11 text-base font-bold' : 'w-9 h-9 text-sm';
  const nameSize = size === 'mini' ? 'text-[12.5px]' : size === 'compact' ? 'text-[14px]' : size === 'large' ? 'text-[16px]' : 'text-[13.5px]';

  const defaultFieldOrder = ['showGoalProgress', 'showProgressTrend', 'showWorkload', 'showMeetingDates', 'showQuickStats'];
  let fieldOrder = config.fieldOrder || defaultFieldOrder;
  fieldOrder = fieldOrder.map(k => !k.startsWith('show') ? 'show' + k.charAt(0).toUpperCase() + k.slice(1) : k);
  if (size === 'mini') {
    fieldOrder = [];
  } else if (size === 'compact') {
    fieldOrder = fieldOrder.filter(k => k === 'showMeetingDates' || k === 'showQuickStats');
  }

  const renderColumn = (key: string) => {
    switch (key) {
      case 'showDepartment':
        if (config.showDepartment === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 140 }}>
            {size !== 'mini' && <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Department</div>}
            <div className={`${size === 'large' ? 'text-[14.5px] font-semibold' : size === 'mini' ? 'text-[12.5px] text-slate-700 font-medium' : 'text-[13px] text-slate-800'} truncate`}>{member.department}</div>
          </div>
        );
      case 'showGoalProgress':
        if (config.showGoalProgress === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 120 }}>
            <div className={`${size === 'large' ? 'text-[17px]' : size === 'mini' ? 'text-[13px]' : 'text-[15px]'} font-bold text-slate-800 flex items-baseline gap-1`}>
              {member.goalsProgressAvg}%
              {size === 'mini' && <span className="text-[11px] font-normal text-slate-500">({member.activeGoalsCount}g)</span>}
            </div>
            {size !== 'mini' && (
              <div className={`${size === 'large' ? 'text-[12.5px] mt-0.5' : 'text-[11.5px]'} text-slate-500 leading-tight truncate`}>
                {member.activeGoalsCount} {member.activeGoalsCount === 1 ? 'goal' : 'goals'}
              </div>
            )}
          </div>
        );
      case 'showProgressTrend':
        if (config.showProgressTrend === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 120 }}>
             <div className="text-[11.5px] text-slate-500 leading-tight">
                <span className={`${size === 'large' ? 'text-[13.5px]' : size === 'mini' ? 'text-[12px]' : 'text-[12.5px]'} font-semibold text-slate-700 block`}>{trendText}</span>
             </div>
          </div>
        );
      case 'showWorkload':
        if (config.showWorkload === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 120 }}>
            <span className={`inline-block px-2.5 py-0.5 rounded ${size === 'large' ? 'text-[12px] py-1' : size === 'mini' ? 'text-[10.5px] px-2' : 'text-[11px]'} font-semibold`} style={{ backgroundColor: workload.emptyColor, color: workload.color }}>
              {workload.level}
            </span>
          </div>
        );
      case 'showMeetingDates':
        if (config.showMeetingDates === false) return null;
        return (
          <div key={key} className="px-4 shrink-0" style={{ width: 160 }}>
             <div className={`${size === 'large' ? 'text-[13.5px]' : size === 'mini' ? 'text-[12px]' : 'text-[12.5px]'} font-semibold ${isOverdueReview ? 'text-red-600' : 'text-slate-800'}`}>Next: {nextDate}</div>
             {size !== 'mini' && <div className={`${size === 'large' ? 'text-[12px] mt-0.5' : 'text-[11px]'} text-slate-400`}>{sinceText}</div>}
          </div>
        );
      case 'showQuickStats':
        if (config.showQuickStats === false || size === 'mini') return null;
        return (
          <div key={key} className="px-4 shrink-0 flex items-center gap-4" style={{ width: 160 }}>
            <div className="flex gap-3 text-center">
              <div>
                <div className={`${size === 'large' ? 'text-[15px]' : 'text-[13px]'} font-bold text-slate-800 leading-none`}>{member.activeTasksCount || 0}</div>
                <div className={`${size === 'large' ? 'text-[11px] mt-1' : 'text-[10px]'} text-slate-500`}>Tasks</div>
              </div>
              <div>
                <div className={`${size === 'large' ? 'text-[15px]' : 'text-[13px]'} font-bold text-slate-800 leading-none`}>{member.checkInCount || 0}</div>
                <div className={`${size === 'large' ? 'text-[11px] mt-1' : 'text-[10px]'} text-slate-500`}>Check-ins</div>
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
      className={`group flex items-center border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-all duration-150 bg-white relative ${pyClass}`}
      style={{ minHeight }}
    >
      {/* Left color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm"
        style={{ backgroundColor: statusInfo.borderColor }}
      />

      {/* MEMBER column */}
      <div className="flex items-center gap-3 pl-5 pr-4 min-w-0" style={{ width: 260 }}>
        <div
          className={`${avatarSize} rounded-full flex items-center justify-center font-semibold shrink-0 shadow-sm transition-all`}
          style={{ backgroundColor: statusInfo.avatarBg, color: statusInfo.avatarText }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`${nameSize} font-semibold text-slate-900 leading-tight truncate`}>{member.name}</span>
            {size === 'mini' && <span className="text-[11.5px] text-slate-400 font-normal truncate"> • {member.role}</span>}
            {isManagerMember && size !== 'mini' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider border border-purple-200 shrink-0">
                <Crown className="w-3 h-3" /> Manager
              </span>
            )}
          </div>
          {size !== 'mini' && (
            <div className={`flex items-center gap-2 ${size === 'large' ? 'text-[13px] mt-1' : 'text-[12px] mt-0.5'} text-slate-500 leading-tight truncate`}>
              <span>{member.role}</span>
              {member.checkInFreq && (
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-100 shrink-0">
                  🔄 {member.checkInFreq}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS column */}
      <div className="px-4 shrink-0" style={{ width: 150 }}>
        {statusInfo.isOverdue ? (
          <span className={`inline-flex items-center gap-1.5 ${size === 'large' ? 'px-3 py-1.5 text-[12.5px]' : size === 'mini' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[11.5px]'} rounded-full font-medium bg-red-50 text-red-600 border border-red-100`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {statusInfo.label}
          </span>
        ) : (
          <span className={`inline-flex items-center ${size === 'large' ? 'px-3 py-1.5 text-[12.5px]' : size === 'mini' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[11.5px]'} rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-100`}>
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
