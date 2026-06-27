"use client";
import React, { useState, useEffect } from "react";
import { X, Sparkles, Copy, Mail, Loader2, RefreshCw } from "lucide-react";
import ReactMarkdown from 'react-markdown';

type Format = "slack" | "email" | "exec";

type Props = {
  onClose: () => void;
};

export function WeeklyReviewPanel({ onClose }: Props) {
  const [format, setFormat] = useState<Format>("slack");
  const [reportText, setReportText] = useState<string>("");
  const [subjectLine, setSubjectLine] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateReport = async (selectedFormat: Format) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: selectedFormat }),
      });
      
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate weekly review");
      }
      
      setReportText(data.report.reportText);
      setSubjectLine(data.report.subjectLine);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport(format);
  }, []);

  const handleFormatChange = (newFormat: Format) => {
    setFormat(newFormat);
    generateReport(newFormat);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(reportText)}`;
    window.open(mailto, '_blank');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-2xl bg-[#f8f9fb] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">Weekly Review Drafter</h2>
              <p className="text-[13px] text-slate-500">AI-generated status report based on team activity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-600 mr-2">Tone & Format:</span>
          <button 
            onClick={() => handleFormatChange("slack")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${format === 'slack' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Slack Update
          </button>
          <button 
            onClick={() => handleFormatChange("email")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${format === 'email' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Formal Email
          </button>
          <button 
            onClick={() => handleFormatChange("exec")}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors ${format === 'exec' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Exec Summary
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p className="text-[14px] font-medium">Drafting your report...</p>
              <p className="text-[12px]">Analyzing tasks, goals, and finding blockers...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700">
              <p className="font-semibold mb-1">Failed to generate report</p>
              <p className="text-[13px] text-red-600">{error}</p>
              <button 
                onClick={() => generateReport(format)}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="text-[13px] font-medium text-slate-700 truncate mr-4">
                  <span className="text-slate-400 mr-2">Subject:</span>
                  {subjectLine}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {copied ? <span className="text-emerald-600 flex items-center gap-1.5">Copied!</span> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                  <button 
                    onClick={handleEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" /> Draft Email
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto prose prose-sm prose-slate max-w-none flex-1">
                <ReactMarkdown>{reportText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
