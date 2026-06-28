"use client";
import React, { useState } from "react";
import {
  Database,
  HardDrive,
  Download,
  Upload,
  Link2,
  Unlink,
  Check,
  X,
  RefreshCw,
  Cloud,
  CircleDot,
  Loader2
} from "lucide-react";
import { useIndexedDB } from "./IndexedDBProvider";

export function SyncStatusIndicator() {
  const { isReady, isFileSynced, stats, lastSync } = useIndexedDB();
  const [showModal, setShowModal] = useState(false);

  if (!isReady) return null;

  const totalItems = stats.teamCount + stats.goalCount + stats.taskCount + stats.noteCount;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-[12px] font-medium text-slate-600 group"
        title="Data Storage Status"
      >
        <div className="relative">
          <Database className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${isFileSynced ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
        </div>
        <span className="hidden sm:inline">
          {isFileSynced ? 'OneDrive Synced' : 'IndexedDB'}
        </span>
        {totalItems > 0 && (
          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {totalItems}
          </span>
        )}
      </button>

      {showModal && <OneDriveSyncModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function OneDriveSyncModal({ onClose }: { onClose: () => void }) {
  const {
    isReady,
    lastSync,
    stats,
    isFileSynced,
    connectFile,
    disconnectFile,
    restoreFile,
    exportData,
    refreshStats,
  } = useIndexedDB();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    await connectFile();
    setIsConnecting(false);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await restoreFile();
    setIsRestoring(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    await exportData();
    setIsExporting(false);
  };

  const handleRefresh = async () => {
    await refreshStats();
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 2000);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm">
                <Database className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Data Storage</h2>
                <p className="text-indigo-300/80 text-[11px]">IndexedDB + OneDrive Live Sync</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="p-5 space-y-4">
          {/* IndexedDB Status */}
          <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-indigo-600" />
                <span className="text-[13px] font-bold text-slate-900">IndexedDB Status</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[11px] font-semibold text-emerald-700">{isReady ? 'Active' : 'Initializing...'}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Members', value: stats.teamCount, color: 'text-indigo-600' },
                { label: 'Goals', value: stats.goalCount, color: 'text-emerald-600' },
                { label: 'Tasks', value: stats.taskCount, color: 'text-amber-600' },
                { label: 'Notes', value: stats.noteCount, color: 'text-violet-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-lg p-2.5 text-center border border-white shadow-sm">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100/50">
              <span className="text-[11px] text-slate-500">
                Last synced: <strong className="text-slate-700">{formatTime(lastSync)}</strong>
              </span>
              <button onClick={handleRefresh} className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                {justRefreshed ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                {justRefreshed ? 'Refreshed!' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* OneDrive Live Sync */}
          <div className={`border rounded-xl p-4 transition-all ${isFileSynced ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span className="text-[13px] font-bold text-slate-900">OneDrive Live Sync</span>
              </div>
              {isFileSynced && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed mb-3">
              {isFileSynced
                ? 'Your data is being auto-synced to the connected OneDrive file every 5 seconds.'
                : 'Connect a .json file inside your OneDrive folder to enable automatic cloud syncing across devices.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {!isFileSynced ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  {isConnecting ? 'Opening picker...' : 'Connect OneDrive File'}
                </button>
              ) : (
                <button
                  onClick={disconnectFile}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Manual Backup Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-bold text-slate-900">Manual Backup</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded-lg transition-colors"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export Snapshot
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[12px] font-medium rounded-lg transition-colors"
              >
                {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Restore from File
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Data stored in browser IndexedDB: <strong className="text-slate-600">ManagerOS_DB</strong>
          </span>
          <button onClick={onClose} className="px-4 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
