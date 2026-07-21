"use client";

import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, Search, Plus, X, Loader2, SlidersHorizontal, ArrowUpDown, CheckCircle, CheckSquare } from 'lucide-react';
import { addReportee, addGoal, addTask } from '@/lib/actions';
import { TeamCard } from './TeamCard';
import { TeamListRow } from './TeamListRow';
import { useCardConfig } from '@/lib/CardConfigContext';
import { useRouter } from 'next/navigation';
import { useIndexedDB } from './IndexedDBProvider';
import { PrepBriefPanel } from './PrepBriefPanel';
import { BulkActionBar } from './BulkActionBar';
import { formatDate } from '@/lib/formatDate';

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
  const size = cardConfig?.cardSize || 'compact';
  let headerFields = (cardConfig?.fieldOrder || ['showGoalProgress', 'showProgressTrend', 'showWorkload', 'showMeetingDates', 'showQuickStats']).map(k => !k.startsWith('show') ? 'show' + k.charAt(0).toUpperCase() + k.slice(1) : k);
  if (size === 'mini') {
    headerFields = [];
  } else if (size === 'compact') {
    headerFields = headerFields.filter(k => k === 'showMeetingDates' || k === 'showQuickStats');
  }
  const [view, setView] = useState<'grid' | 'list'>('list');
  
  useEffect(() => {
    const saved = localStorage.getItem('manager_pref_team_view');
    if (saved === 'grid' || saved === 'list') {
      setView(saved);
    }
  }, []);

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
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [batchGoalTitle, setBatchGoalTitle] = useState('');
  const [batchGoalDesc, setBatchGoalDesc] = useState('');
  const [batchGoalPriority, setBatchGoalPriority] = useState('P1');
  const [batchGoalDueDate, setBatchGoalDueDate] = useState('');
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState(false);

  const [showBatchTaskModal, setShowBatchTaskModal] = useState(false);
  const [batchTaskTitle, setBatchTaskTitle] = useState('');
  const [batchTaskPriority, setBatchTaskPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
  const [batchTaskTimeframe, setBatchTaskTimeframe] = useState('');
  const [isBatchTaskAssigning, setIsBatchTaskAssigning] = useState(false);
  const [batchTaskSuccessMsg, setBatchTaskSuccessMsg] = useState(false);

  const handleBatchTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTaskTitle.trim() || selectedMemberIds.length === 0) return;
    setIsBatchTaskAssigning(true);
    for (const mId of selectedMemberIds) {
      const fd = new FormData();
      fd.set("title", batchTaskTitle);
      fd.set("priority", batchTaskPriority);
      if (batchTaskTimeframe) fd.set("timeframe", batchTaskTimeframe);
      fd.set("owner", "reportee");
      await addTask(mId, fd);
    }
    await persistAfterMutation();
    setIsBatchTaskAssigning(false);
    setBatchTaskSuccessMsg(true);
    setTimeout(() => {
      setBatchTaskSuccessMsg(false);
      setShowBatchTaskModal(false);
      setSelectedMemberIds([]);
      setBatchTaskTitle('');
      setBatchTaskTimeframe('');
      router.refresh();
    }, 1200);
  };

  const handleBatchAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchGoalTitle.trim() || selectedMemberIds.length === 0) return;
    setIsBatchAssigning(true);
    for (const mId of selectedMemberIds) {
      const fd = new FormData();
      fd.set("title", batchGoalTitle);
      fd.set("description", batchGoalDesc);
      fd.set("status", "on_track");
      fd.set("icon", "🎯");
      fd.set("priority", batchGoalPriority);
      if (batchGoalDueDate) fd.set("dueDate", batchGoalDueDate);
      fd.set("tags", JSON.stringify(["Assigned-by-Manager"]));
      await addGoal(mId, fd);
    }
    await persistAfterMutation();
    setIsBatchAssigning(false);
    setBatchSuccessMsg(true);
    setTimeout(() => {
      setBatchSuccessMsg(false);
      setShowBatchAssignModal(false);
      setSelectedMemberIds([]);
      setBatchGoalTitle('');
      setBatchGoalDesc('');
      router.refresh();
    }, 1200);
  };

  const handleToggleSelectAllMembers = () => {
    if (selectedMemberIds.length === sortedMembers.length && sortedMembers.length > 0) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(sortedMembers.map(m => m.id));
    }
  };

  const handleToggleSelectMember = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkExportMembersCsv = () => {
    const selected = sortedMembers.filter(m => selectedMemberIds.includes(m.id));
    const csvRows = [
      ['Name', 'Role', 'Department', 'Active Tasks', 'Active Goals', 'Goals Avg Progress (%)'],
      ...selected.map(m => [
        `"${m.name}"`,
        `"${m.role}"`,
        `"${m.department}"`,
        m.activeTasksCount,
        m.activeGoalsCount,
        Math.round(m.goalsProgressAvg)
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `team-members-${formatDate(new Date().toISOString())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <div key={member.id} className="relative group">
              <div className="absolute top-3 right-3 z-10" onClick={e => handleToggleSelectMember(member.id, e)}>
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(member.id)}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm bg-white"
                />
              </div>
              <TeamCard member={member} config={cardConfig} onPrep={(id, name) => setPrepTarget({ id, name })} />
            </div>
          ))}
        </div>
      ) : (
        <div role="grid" aria-label="Team Members Overview" aria-rowcount={sortedMembers.length + 1} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div role="row" className="flex items-center border-b border-slate-200 bg-slate-50/80 px-0">
            <div role="columnheader" className="px-4 py-3 shrink-0">
              <input
                type="checkbox"
                aria-label="Select all team members"
                checked={sortedMembers.length > 0 && selectedMemberIds.length === sortedMembers.length}
                onChange={handleToggleSelectAllMembers}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            {/* Left bar spacer */}
            <div role="presentation" className="w-[3px] self-stretch" />

            {/* MEMBER */}
            <div role="columnheader" aria-sort={sortKey === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase pl-5 pr-4 py-3 hover:text-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500"
                style={{ width: 260 }}
              >
                MEMBER <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>

            {/* STATUS */}
            <div
              role="columnheader"
              aria-sort="none"
              className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0"
              style={{ width: 150 }}
            >
              STATUS <ArrowUpDown className="w-3 h-3 inline ml-1" aria-hidden="true" />
            </div>

            {/* DYNAMIC COLUMNS */}
            {headerFields.map(key => {
              switch (key) {
                case 'showDepartment':
                  if (cardConfig.showDepartment === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort="none" className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 140 }}>
                      DEPARTMENT
                    </div>
                  );
                case 'showGoalProgress':
                  if (cardConfig.showGoalProgress === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort={sortKey === 'progress' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button onClick={() => handleSort('progress')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-500" style={{ width: 120 }}>
                        PROGRESS <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                case 'showProgressTrend':
                  if (cardConfig.showProgressTrend === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort="none" className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 120 }}>
                      TREND
                    </div>
                  );
                case 'showWorkload':
                  if (cardConfig.showWorkload === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort={sortKey === 'workload' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button onClick={() => handleSort('workload')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-500" style={{ width: 140 }}>
                        WORKLOAD <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                case 'showMeetingDates':
                  if (cardConfig.showMeetingDates === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort={sortKey === 'next1on1' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button onClick={() => handleSort('next1on1')} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 hover:text-slate-700 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-indigo-500" style={{ width: 170 }}>
                        NEXT 1:1 <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                case 'showQuickStats':
                  if (cardConfig.showQuickStats === false) return null;
                  return (
                    <div key={key} role="columnheader" aria-sort="none" className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase px-4 py-3 shrink-0" style={{ width: 140 }}>
                      QUICK STATS
                    </div>
                  );
                default:
                  return null;
              }
            })}
            
            {/* Spacer */}
            <div role="presentation" className="flex-1" />
          </div>

          {/* Rows */}
          <div role="rowgroup">
            {sortedMembers.map((member, idx) => (
              <div key={member.id} role="row" aria-rowindex={idx + 2} className="flex items-center hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 relative">
                <div className="px-4 py-4 shrink-0 z-10" onClick={e => handleToggleSelectMember(member.id, e)}>
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <TeamListRow member={member} config={cardConfig} onPrep={(id, name) => setPrepTarget({ id, name })} />
                </div>
              </div>
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

      <BulkActionBar
        selectedCount={selectedMemberIds.length}
        itemType="members"
        onAssignGoal={() => setShowBatchAssignModal(true)}
        onAssignTask={() => setShowBatchTaskModal(true)}
        onExportCsv={handleBulkExportMembersCsv}
        onClear={() => setSelectedMemberIds([])}
      />

      {showBatchAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Bulk Operation</span>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  🎯 Assign Goal to {selectedMemberIds.length} {selectedMemberIds.length === 1 ? 'Member' : 'Members'}
                </h2>
              </div>
              <button onClick={() => setShowBatchAssignModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchSuccessMsg ? (
              <div className="py-8 text-center animate-in fade-in">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">✨</div>
                <h3 className="text-base font-bold text-slate-900">Goal Assigned Successfully!</h3>
                <p className="text-[13px] text-slate-500 mt-1">Applied to {selectedMemberIds.length} selected team members.</p>
              </div>
            ) : (
              <form onSubmit={handleBatchAssignSubmit} className="space-y-4">
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-[13px] text-indigo-900 flex items-start gap-2">
                  <span className="text-base shrink-0">👥</span>
                  <div>
                    <span className="font-semibold">Recipients: </span>
                    {teamMembers.filter(m => selectedMemberIds.includes(m.id)).map(m => m.name).join(", ")}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={batchGoalTitle}
                    onChange={e => setBatchGoalTitle(e.target.value)}
                    placeholder="e.g. Complete Q3 OKR Review & Architecture Sync"
                    className="w-full px-3.5 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">Description / Key Results</label>
                  <textarea
                    rows={3}
                    value={batchGoalDesc}
                    onChange={e => setBatchGoalDesc(e.target.value)}
                    placeholder="Define success criteria, deliverables, or target metrics..."
                    className="w-full px-3.5 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={batchGoalPriority}
                      onChange={e => setBatchGoalPriority(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-medium"
                    >
                      <option value="P0">P0 - Urgent & Critical</option>
                      <option value="P1">P1 - High Priority</option>
                      <option value="P2">P2 - Normal / Standard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Target Due Date</label>
                    <input
                      type="date"
                      value={batchGoalDueDate}
                      onChange={e => setBatchGoalDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchAssignModal(false)}
                    className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBatchAssigning || !batchGoalTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {isBatchAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
                    Assign Goal to {selectedMemberIds.length} {selectedMemberIds.length === 1 ? 'Member' : 'Members'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showBatchTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-slate-900">Assign Action Task</h3>
                  <p className="text-xs text-slate-500">Bulk create a task for {selectedMemberIds.length} team members</p>
                </div>
              </div>
              <button onClick={() => setShowBatchTaskModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchTaskSuccessMsg ? (
              <div className="py-8 text-center animate-in fade-in">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">✨</div>
                <h3 className="text-base font-bold text-slate-900">Task Assigned Successfully!</h3>
                <p className="text-[13px] text-slate-500 mt-1">Applied to {selectedMemberIds.length} selected team members.</p>
              </div>
            ) : (
              <form onSubmit={handleBatchTaskSubmit} className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-[13px] text-emerald-900 flex items-start gap-2">
                  <span className="text-base shrink-0">👥</span>
                  <div>
                    <span className="font-semibold">Recipients: </span>
                    {teamMembers.filter(m => selectedMemberIds.includes(m.id)).map(m => m.name).join(", ")}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={batchTaskTitle}
                    onChange={e => setBatchTaskTitle(e.target.value)}
                    placeholder="e.g. Submit mid-quarter self-appraisal"
                    className="w-full px-3.5 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={batchTaskPriority}
                      onChange={e => setBatchTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-emerald-500 bg-white font-medium"
                    >
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Normal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">Timeframe / Due Date</label>
                    <input
                      type="text"
                      value={batchTaskTimeframe}
                      onChange={e => setBatchTaskTimeframe(e.target.value)}
                      placeholder="e.g. By Friday or 2026-07-20"
                      className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-emerald-500 bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchTaskModal(false)}
                    className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBatchTaskAssigning || !batchTaskTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {isBatchTaskAssigning && <Loader2 className="w-4 h-4 animate-spin" />}
                    Assign Task to {selectedMemberIds.length} {selectedMemberIds.length === 1 ? 'Member' : 'Members'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
