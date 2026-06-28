"use client";

import React, { useState } from 'react';
import { LayoutGrid, List, Search, Plus, X, Loader2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { addReportee } from '@/lib/actions';
import { TeamCard } from './TeamCard';
import { TeamListRow } from './TeamListRow';
import { useCardConfig } from '@/lib/CardConfigContext';
import { useRouter } from 'next/navigation';
import { useIndexedDB } from './IndexedDBProvider';
import { PrepBriefPanel } from './PrepBriefPanel';

type EnhancedMember = {
  id: number;
  name: string;
  role: string;
  department: string;
  activeTasksCount: number;
  activeGoalsCount: number;
  goalsProgressAvg: number;
};

type SortKey = 'name' | 'progress' | 'workload' | 'next1on1';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'MEMBER' },
  { key: 'progress', label: 'PROGRESS' },
  { key: 'workload', label: 'STATUS' },
  { key: 'workload', label: 'WORKLOAD' },
  { key: 'next1on1', label: 'NEXT 1:1' },
];

// Column widths (must match TeamListRow)
const COL_WIDTHS = [260, 200, 150, 160]; // last col is flex-1

export function TeamOverviewClient({ teamMembers }: { teamMembers: EnhancedMember[] }) {
  const router = useRouter();
  const { persistAfterMutation } = useIndexedDB();
  const { cardConfig } = useCardConfig();
  const [view, setView] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_pref_team_view');
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return 'list';
  });
  const handleSetView = (v: 'grid' | 'list') => {
    setView(v);
    if (typeof window !== 'undefined') localStorage.setItem('manager_pref_team_view', v);
  };
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [genericFilter, setGenericFilter] = useState<string>('All');
  const departments = Array.from(new Set(teamMembers.map(m => m.department)));
  const roles = Array.from(new Set(teamMembers.map(m => m.role)));

  const [prepTarget, setPrepTarget] = useState<{ id: number; name: string } | null>(null);

  const filteredMembers = teamMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase()) || m.department.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = genericFilter === 'All' || m.department === genericFilter || m.role === genericFilter;
    return matchesSearch && matchesFilter;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'progress') cmp = a.goalsProgressAvg - b.goalsProgressAvg;
    else if (sortKey === 'workload') cmp = a.activeTasksCount - b.activeTasksCount;
    else if (sortKey === 'next1on1') cmp = (a.id % 2) - (b.id % 2);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  return (
    <div className="flex-1 h-full flex flex-col relative">
      {/* Header */}
      <div className="px-6 lg:px-8 py-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Team</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search */}
          <div className="relative min-w-[120px] max-w-[200px] sm:max-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search team..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white shadow-sm w-full"
            />
          </div>

          {/* Filter button */}
          <div className="relative shrink-0">
            <select 
              value={genericFilter} 
              onChange={e => setGenericFilter(e.target.value)}
              className="flex items-center gap-2 px-3.5 py-1.5 pl-8 pr-7 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors appearance-none outline-none focus:border-indigo-400 max-w-[140px] sm:max-w-[180px]"
            >
              <option value="All">All Members</option>
              <optgroup label="Departments">
                {departments.filter(Boolean).map((d, i) => <option key={`dept-${i}`} value={d}>{d}</option>)}
              </optgroup>
              <optgroup label="Roles">
                {roles.filter(Boolean).map((r, i) => <option key={`role-${i}`} value={r}>{r}</option>)}
              </optgroup>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm shrink-0">
            <button
              onClick={() => handleSetView('grid')}
              title="Grid view"
              className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSetView('list')}
              title="List view"
              className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* New Member */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-[13px] font-semibold shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Member
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 pt-6 pb-4 max-w-7xl mx-auto w-full">
        {/* Content */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          {sortedMembers.map(member => (
            <TeamCard key={member.id} member={member} config={cardConfig} onPrep={(id, name) => setPrepTarget({ id, name })} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-0">
            {/* Left bar spacer */}
            <div className="w-[3px] self-stretch" />

            {/* MEMBER */}
            <button
              onClick={() => handleSort('name')}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase pl-5 pr-4 py-3 hover:text-slate-700 transition-colors"
              style={{ width: 260 }}
            >
              MEMBER <ArrowUpDown className="w-3 h-3" />
            </button>

            {/* STATUS */}
            <div
              className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0"
              style={{ width: 150 }}
            >
              STATUS <ArrowUpDown className="w-3 h-3 inline ml-1" />
            </div>

            {/* DYNAMIC COLUMNS */}
            {(cardConfig?.fieldOrder || ['showGoalProgress', 'showProgressTrend', 'showWorkload', 'showMeetingDates', 'showQuickStats']).map(key => {
              switch (key) {
                case 'showDepartment':
                  if (cardConfig.showDepartment === false) return null;
                  return (
                    <div key={key} className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 140 }}>
                      DEPARTMENT
                    </div>
                  );
                case 'showGoalProgress':
                  if (cardConfig.showGoalProgress === false) return null;
                  return (
                    <button key={key} onClick={() => handleSort('progress')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0" style={{ width: 120 }}>
                      PROGRESS <ArrowUpDown className="w-3 h-3" />
                    </button>
                  );
                case 'showProgressTrend':
                  if (cardConfig.showProgressTrend === false) return null;
                  return (
                    <div key={key} className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 120 }}>
                      TREND
                    </div>
                  );
                case 'showWorkload':
                  if (cardConfig.showWorkload === false) return null;
                  return (
                    <button key={key} onClick={() => handleSort('workload')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0" style={{ width: 140 }}>
                      WORKLOAD <ArrowUpDown className="w-3 h-3" />
                    </button>
                  );
                case 'showMeetingDates':
                  if (cardConfig.showMeetingDates === false) return null;
                  return (
                    <button key={key} onClick={() => handleSort('next1on1')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0" style={{ width: 170 }}>
                      NEXT 1:1 <ArrowUpDown className="w-3 h-3" />
                    </button>
                  );
                case 'showQuickStats':
                  if (cardConfig.showQuickStats === false) return null;
                  return (
                    <div key={key} className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 140 }}>
                      QUICK STATS
                    </div>
                  );
                default:
                  return null;
              }
            })}
            
            {/* Spacer */}
            <div className="flex-1" />
          </div>

          {/* Rows */}
          <div>
            {sortedMembers.map(member => (
              <TeamListRow key={member.id} member={member} config={cardConfig} onPrep={(id, name) => setPrepTarget({ id, name })} />
            ))}
            {sortedMembers.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-[13px]">No team members match your search.</div>
            )}
          </div>
        </div>
      )}
      </div>

      {prepTarget && (
        <PrepBriefPanel
          reporteeId={prepTarget.id}
          reporteeName={prepTarget.name}
          onClose={() => setPrepTarget(null)}
        />
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Add Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              action={async (formData) => {
                setIsSubmitting(true);
                await addReportee(formData);
                await persistAfterMutation();
                setShowAddModal(false);
                setIsSubmitting(false);
                router.refresh();
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Job Role</label>
                <input type="text" name="role" required className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Product Designer" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email" required className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. jane@company.com" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1">Department</label>
                <select name="department" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white">
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70">
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
