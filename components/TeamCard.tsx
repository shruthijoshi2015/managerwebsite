import React from 'react';
import Link from 'next/link';
import { Target, CheckSquare, MessageSquare, Clock, Crown } from 'lucide-react';

export type TeamCardProps = {
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
    last1on1?: string;
    nextReview?: string;
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
    cardSize?: string;
    size?: string;
  };
  onPrep?: (id: number, name: string) => void;
};

function getStatusColor(progress: number) {
  if (progress >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-400' };
  if (progress >= 40) return { text: 'text-amber-500', bg: 'bg-amber-400', lightBg: 'bg-amber-50', border: 'border-amber-300' };
  return { text: 'text-rose-500', bg: 'bg-rose-500', lightBg: 'bg-rose-50', border: 'border-rose-400' };
}

function generateSparkline(seed: number, points: number = 8) {
  let val = 20 + (seed % 30);
  const data = [val];
  for (let i = 1; i < points; i++) {
    val = Math.max(0, Math.min(100, val + (Math.random() * 20 - 5 + (seed % 5))));
    data.push(val);
  }
  return data;
}

export function TeamCard({ member, config, onPrep }: TeamCardProps) {
  const isManagerMember = member.isManager || member.role?.toLowerCase().includes("manager") || member.id === 999;
  const colors = getStatusColor(member.goalsProgressAvg);
  const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const sparklineData = generateSparkline(member.id);
  const maxVal = 100;
  const pathData = sparklineData.map((val, i) => {
    const x = (i / (sparklineData.length - 1)) * 100;
    const y = 100 - (val / maxVal) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  const areaPath = `${pathData} L 100 100 L 0 100 Z`;

  const workload = member.activeTasksCount > 8 ? 'High' : member.activeTasksCount > 15 ? 'Overloaded' : 'Light';
  const overdue = member.overdueTasksCount || (member.id % 3 === 0 ? 2 : 0);
  
  const defaultFieldOrder = ['showGoalProgress', 'showProgressTrend', 'showWorkload', 'showMeetingDates', 'showQuickStats'];
  let fieldOrder = config.fieldOrder || defaultFieldOrder;
  fieldOrder = fieldOrder.map((k: string) => !k.startsWith('show') ? 'show' + k.charAt(0).toUpperCase() + k.slice(1) : k);
  const size = config.cardSize || 'compact';
  const paddingClass = size === 'mini' ? 'p-2' : size === 'large' ? 'p-5' : 'p-3.5';
  const spaceClass = size === 'mini' ? 'space-y-1.5' : size === 'large' ? 'space-y-4' : 'space-y-3';
  const iconSizeClass = size === 'mini' ? 'w-6 h-6 text-[10px]' : size === 'large' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  const renderField = (key: string) => {
    switch (key) {
      case 'showDepartment':
        if (config.showDepartment === false) return null;
        return (
          <div key={key} className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 mb-1">Department</div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              {member.department}
            </span>
          </div>
        );
      case 'showGoalProgress':
        if (config.showGoalProgress === false) return null;
        return (
          <div key={key}>
            <div className="flex justify-between items-end mb-1">
              <span className="text-[11px] font-medium text-slate-500">Goal progress</span>
              <span className={`text-[12px] font-bold ${colors.text}`}>{member.goalsProgressAvg}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors.bg}`} style={{ width: `${member.goalsProgressAvg}%` }} />
            </div>
          </div>
        );
      case 'showProgressTrend':
        if (config.showProgressTrend === false) return null;
        return (
          <div key={key}>
            <p className="text-[11px] font-medium text-slate-500 mb-1">Progress trend (8 weeks)</p>
            <div className="h-8 w-full relative">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <path d={areaPath} className={`${colors.text} opacity-10`} fill="currentColor" />
                <path d={pathData} className={`${colors.text}`} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
        );
      case 'showWorkload':
        if (config.showWorkload === false) return null;
        return (
          <div key={key} className="pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] font-medium text-slate-500">Workload & tasks</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 w-20">
                  {[1, 2, 3, 4, 5].map(i => {
                    const isHigh = workload === 'High' || workload === 'Overloaded';
                    const isOver = workload === 'Overloaded';
                    const fill = isOver ? 'bg-rose-500' : isHigh ? (i <= 4 ? 'bg-amber-500' : 'bg-amber-200') : (i <= 2 ? 'bg-emerald-500' : 'bg-emerald-200');
                    return <div key={i} className={`h-1.5 flex-1 rounded-sm ${fill}`} />
                  })}
                </div>
                <span className={`text-[11px] font-semibold ${workload === 'Overloaded' ? 'text-rose-600' : workload === 'High' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {workload}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <Clock className={`w-3 h-3 ${overdue > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                <span className={`font-medium ${overdue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {overdue > 0 ? `${overdue} overdue` : 'On track'}
                </span>
              </div>
            </div>
          </div>
        );
      case 'showMeetingDates':
        if (config.showMeetingDates === false) return null;
        return (
          <div key={key} className="flex gap-2 pt-2 border-t border-slate-100">
            <div className="flex-1 bg-slate-50 rounded-lg p-2">
              <div className="text-[10px] text-slate-500 mb-0.5">Last 1:1</div>
              <div className={`text-[12px] font-semibold ${(member.id % 2 === 0) ? 'text-rose-600' : 'text-slate-800'}`}>
                {(member.id % 2 === 0) ? '14 days ago' : '2 days ago'}
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-2">
              <div className="text-[10px] text-slate-500 mb-0.5">Next review</div>
              <div className={`text-[12px] font-semibold ${(member.id % 2 === 0) ? 'text-rose-600' : 'text-slate-800'}`}>
                {(member.id % 2 === 0) ? 'Overdue' : 'Jun 1'}
              </div>
            </div>
            {onPrep && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPrep(member.id, member.name); }}
                className="self-center px-2.5 py-1.5 border border-indigo-200 rounded-lg text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 shrink-0"
              >
                <span className="text-[10px]">✨</span> Prep
              </button>
            )}
          </div>
        );
      case 'showQuickStats':
        if (config.showQuickStats === false) return null;
        return (
          <div key={key} className="grid grid-cols-3 gap-1 text-center divide-x divide-slate-100 pt-2 border-t border-slate-100">
            <div>
              <Target className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
              <div className="text-[13px] font-bold text-slate-800 leading-none">{member.activeGoalsCount}</div>
              <div className="text-[10px] text-slate-500">Goals</div>
            </div>
            <div>
              <CheckSquare className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
              <div className="text-[13px] font-bold text-slate-800 leading-none">{member.activeTasksCount}</div>
              <div className="text-[10px] text-slate-500">Tasks</div>
            </div>
            <div>
              <MessageSquare className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
              <div className="text-[13px] font-bold text-slate-800 leading-none">{member.checkInCount || 0}</div>
              <div className="text-[10px] text-slate-500">Check-ins</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Link href={`/team/${member.id}`} className="block w-full">
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative pt-1`}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${colors.bg}`} />
        
        <div className={paddingClass}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2.5">
              <div className={`${iconSizeClass} rounded-full flex items-center justify-center font-bold ${colors.lightBg} ${colors.text} shrink-0`}>
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={`font-semibold text-slate-900 leading-tight ${size === 'large' ? 'text-[16px]' : 'text-[14px]'}`}>{member.name}</h3>
                  {isManagerMember && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider border border-purple-200 shrink-0">
                      <Crown className="w-3 h-3" /> Manager
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className={`text-slate-500 leading-none ${size === 'large' ? 'text-[13px]' : 'text-[12px]'}`}>{member.role}</p>
                  {member.checkInFreq && (
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                      🔄 {member.checkInFreq}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${colors.bg}`} />
          </div>

            {size !== 'mini' && (
              <div className={spaceClass}>
                {size === 'compact'
                  ? fieldOrder.filter((k: string) => k === 'showMeetingDates' || k === 'showQuickStats').map(renderField)
                  : fieldOrder.map(renderField)
                }
              </div>
            )}
          </div>
        </div>
    </Link>
  );
}
