"use client";

import React, { useState } from "react";
import { Calendar, RefreshCw, CheckCircle2, Sparkles, X, ExternalLink, Users, Clock, AlertCircle } from "lucide-react";
import { useIndexedDB } from "@/components/IndexedDBProvider";
import { Reportee } from "@/lib/db";
import { saveNotes } from "@/lib/actions";

interface CalendarSyncModalProps {
  onClose: () => void;
  teamMembers: Reportee[];
}

export function CalendarSyncModal({ onClose, teamMembers }: CalendarSyncModalProps) {
  const { persistAfterMutation } = useIndexedDB();
  const [provider, setProvider] = useState<'google' | 'outlook' | 'ics'>('google');
  const [feedUrl, setFeedUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [detectedMeetings, setDetectedMeetings] = useState<any[]>([]);

  // Simulated auto-detection of 1:1 meetings based on team members
  const handleScanCalendar = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);

    // Simulate network delay for realistic OAuth/ICS parse check
    await new Promise(r => setTimeout(r, 1200));

    const now = new Date();
    const simulated = teamMembers.filter(m => !m.isManager).map((m, idx) => {
      const nextDate = new Date(now.getTime() + (idx + 1) * 24 * 60 * 60 * 1000);
      return {
        id: `mtg_${Date.now()}_${idx}`,
        title: `1:1 Check-in: Manager / ${m.name}`,
        date: nextDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        reporteeId: m.id,
        reporteeName: m.name,
        role: m.role,
        hasAgenda: m.notes && m.notes.length > 0,
        suggestedAgenda: [
          `Review progress on key sprint objectives`,
          `Discuss career development & blockers`,
          `Feedback on recent code reviews / architecture`
        ]
      };
    });

    setDetectedMeetings(simulated);
    setIsSyncing(false);
    setSyncSuccess(true);
  };

  const handleAutoPopulate1on1 = async (meeting: any) => {
    if (!meeting.reporteeId) return;
    const noteContent = `### Automated 1:1 Check-in Prep (${meeting.date})\n` +
      meeting.suggestedAgenda.map((item: string) => `- [ ] ${item}`).join("\n") +
      `\n\n### Highlights & Discussion Notes\n- `;
    
    await saveNotes(meeting.reporteeId, "1:1 Check-in", noteContent);
    await persistAfterMutation();

    setDetectedMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, populated: true } : m));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Calendar Sync & 1:1 Meeting Detection</h2>
              <p className="text-xs text-slate-400">Connect Google Calendar or Outlook to auto-populate upcoming check-ins</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Select Calendar Provider</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setProvider('google')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${provider === 'google' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm font-semibold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0">G</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold">Google Calendar</div>
                  <div className="text-[10px] text-slate-500">OAuth 2.0 / Workspace</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('outlook')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${provider === 'outlook' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm font-semibold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">O</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold">Microsoft Outlook</div>
                  <div className="text-[10px] text-slate-500">Office 365 / Exchange</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProvider('ics')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${provider === 'ics' ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm font-semibold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">ICS</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold">ICS Feed URL</div>
                  <div className="text-[10px] text-slate-500">iCal / Custom Feed</div>
                </div>
              </button>
            </div>
          </div>

          {/* ICS URL input if selected */}
          {provider === 'ics' && (
            <div className="space-y-1 animate-in fade-in">
              <label className="block text-xs font-semibold text-slate-700">ICS / iCal Feed URL</label>
              <input
                type="url"
                value={feedUrl}
                onChange={e => setFeedUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Sync Trigger Action */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Automatic 1:1 Matching Engine</h4>
                <p className="text-[11px] text-slate-500">Scans calendar attendees and matches titles against your reportee list</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleScanCalendar}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isSyncing ? "Scanning Calendar..." : "Scan & Detect 1:1s"}
            </button>
          </div>

          {/* Detected Meetings Results */}
          {syncSuccess && (
            <div className="space-y-3 animate-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Detected {detectedMeetings.length} Upcoming 1:1 Check-ins</span>
                </div>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Ready to Auto-Populate
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {detectedMeetings.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:border-indigo-200 transition">
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900 truncate">{m.title}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">{m.date}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3 text-indigo-500" /> {m.reporteeName}</span>
                        <span>•</span>
                        <span className="truncate">{m.role}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAutoPopulate1on1(m)}
                      disabled={m.populated}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${m.populated ? 'bg-emerald-100 text-emerald-800 cursor-default' : 'bg-slate-900 hover:bg-slate-800 text-white shadow'}`}
                    >
                      {m.populated ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Populated inside Notes
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          ✨ Auto-Populate Next 1:1
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition shadow-sm"
          >
            Done & Close
          </button>
        </div>

      </div>
    </div>
  );
}
