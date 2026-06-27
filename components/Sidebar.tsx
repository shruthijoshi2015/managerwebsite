"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Bell, Target, Activity, Sparkles, Smile, ShieldAlert, CheckCircle2, FileText } from "lucide-react";

type TeamMember = { id: number; name: string; role: string };

export function Sidebar({ teamMembers = [] }: { teamMembers?: TeamMember[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [teamOpen, setTeamOpen] = useState(true);
  const pathname = usePathname();

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(w => w.length > 0);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0]?.substring(0, 2) || "??";
  };

  const linkClass = "flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md transition-colors";
  const activeClass = "bg-slate-100 text-slate-900";
  const inactiveClass = "text-slate-500 hover:bg-slate-50 hover:text-slate-800";

  return (
    <div className={`${isExpanded ? 'w-36' : 'w-14'} shrink-0 h-screen transition-all duration-300 relative z-50 bg-white border-r border-slate-200 flex flex-col`}>
      <div className="p-4 h-16 flex items-center shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className={`font-semibold text-sm text-slate-900 tracking-tight transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>Tracker</span>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden overflow-y-auto">
        <Link href="/" className={`${linkClass} ${pathname === '/' ? activeClass : inactiveClass}`}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>Dashboard</span>
        </Link>
        <Link href="/team" className={`${linkClass} ${pathname === '/team' ? activeClass : inactiveClass}`}>
          <Users className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>My Team</span>
        </Link>
        <Link href="/goals" className={`${linkClass} ${pathname === '/goals' ? activeClass : inactiveClass}`}>
          <Target className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>Goals</span>
        </Link>
        <Link href="/notes" className={`${linkClass} ${pathname === '/notes' ? activeClass : inactiveClass}`}>
          <FileText className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>Notes</span>
        </Link>
        <Link href="/actions" className={`${linkClass} ${pathname === '/actions' ? activeClass : inactiveClass}`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>All Actions</span>
        </Link>
        <Link href="/settings" className={`${linkClass} ${inactiveClass}`}>
          <Settings className="w-4 h-4 shrink-0" />
          <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>Settings</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto shrink-0 relative">
         <button 
           onClick={() => setIsExpanded(!isExpanded)} 
           className="absolute -right-3 top-[-14px] bg-white border border-slate-200 shadow-sm rounded-full p-1 text-slate-400 hover:text-slate-600 transition-all z-50"
         >
           {isExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
         </button>

        <div className={`flex items-center justify-center px-2 py-1`}>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            <span className="text-[11px] font-bold text-slate-500">AS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
