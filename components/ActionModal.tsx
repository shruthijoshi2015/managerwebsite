"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { Task } from "@/lib/db";

export function ActionModal({ 
  reporteeId, 
  team,
  onClose, 
  editTask 
}: { 
  reporteeId?: number; 
  team?: any[];
  onClose: () => void; 
  editTask?: Task;
}) {
  const [title, setTitle] = useState(editTask?.title || "");
  const [status, setStatus] = useState<'pending'|'in_progress'|'resolved'>(editTask?.status || "pending");
  const [priority, setPriority] = useState<'P0'|'P1'|'P2'>(editTask?.priority || "P2");
  const [timeframe, setTimeframe] = useState(editTask?.timeframe || "");
  const [owner, setOwner] = useState<'manager'|'reportee'>(editTask?.owner || "reportee");
  const [selectedUserId, setSelectedUserId] = useState<string>(reporteeId?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    // Determine the actual reporteeId
    const finalReporteeId = reporteeId || parseInt(selectedUserId);
    if (!finalReporteeId) return;

    setIsSaving(true);
    
    if (editTask) {
      await fetch("/api/update-action-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: typeof editTask.id === 'string' ? editTask.id : 'manual-' + editTask.id,
          reporteeId: finalReporteeId,
          title,
          status,
          priority,
          timeframe,
          newReporteeId: finalReporteeId
        })
      });
    } else {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("status", status);
      fd.set("priority", priority);
      fd.set("timeframe", timeframe);
      fd.set("owner", owner);

      const { addTask } = await import("@/lib/actions");
      await addTask(finalReporteeId, fd);
    }
    
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#f9f9f9] rounded-xl shadow-2xl border border-slate-200 w-full max-w-[500px] mx-4 relative flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 bg-white rounded-t-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">{editTask ? 'Edit Action Item' : 'New Action Item'}</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {!reporteeId && team && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-2">Team Member</label>
              <select 
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)} 
                className="w-full px-3 py-2 text-[14px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 shadow-sm"
              >
                <option value="" disabled>Select a team member...</option>
                {team.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2">Description</label>
            <textarea
              autoFocus
              rows={2}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Review the codebase for Q4..."
              className="w-full px-3 py-2 text-[14px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as any)} 
                className="w-full px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 shadow-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-2">Priority</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as any)} 
                className="w-full px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 shadow-sm"
              >
                <option value="P0">High (P0)</option>
                <option value="P1">Medium (P1)</option>
                <option value="P2">Low (P2)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-2">Due Date / Timeframe</label>
              <input 
                type="text" 
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                placeholder="e.g., Oct 28"
                className="w-full px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-2">Assignee</label>
              <select 
                value={owner} 
                onChange={e => setOwner(e.target.value as any)} 
                className="w-full px-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 shadow-sm"
              >
                <option value="reportee">Reportee</option>
                <option value="manager">Me (Manager)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSaving || !title.trim() || (!reporteeId && !selectedUserId)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[13px] font-bold rounded-lg transition-colors shadow-sm">
            {isSaving ? "Saving..." : "Save Action"}
          </button>
        </div>
      </div>
    </div>
  );
}
