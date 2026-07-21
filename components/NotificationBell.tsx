'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database } from '@/lib/db';
import { 
  ProactiveNotification, 
  computeProactiveNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '@/lib/proactive-engine';

interface NotificationBellProps {
  db: Database;
}

export function NotificationBell({ db }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ProactiveNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'high'>('all');

  const refreshNotifications = () => {
    if (!db) return;
    const computed = computeProactiveNotifications(db);
    setNotifications(computed);
  };

  useEffect(() => {
    refreshNotifications();
    const handleUpdate = () => refreshNotifications();
    window.addEventListener('notifications-updated', handleUpdate);
    return () => window.removeEventListener('notifications-updated', handleUpdate);
  }, [db]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'high') return n.priority === 'high';
    return true;
  });

  const handleItemClick = (notif: ProactiveNotification) => {
    markNotificationRead(notif.id);
    refreshNotifications();
    setIsOpen(false);
  };

  const handleMarkAll = () => {
    markAllNotificationsRead(notifications.map(n => n.id));
    refreshNotifications();
  };

  const getPriorityBadge = (priority: string, type: string) => {
    if (type === 'overdue') {
      return <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px] uppercase">Overdue</span>;
    }
    if (type === 'prep') {
      return <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px] uppercase">1:1 Prep</span>;
    }
    if (type === 'risk') {
      return <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 font-bold rounded text-[10px] uppercase">At Risk</span>;
    }
    if (type === 'onboarding') {
      return <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded text-[10px] uppercase">Onboarding</span>;
    }
    return <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px] uppercase">Calendar</span>;
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Proactive Reminders & Notifications"
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold flex items-center gap-1.5">
                  🔔 Proactive Reminders
                </span>
                {unreadCount > 0 && (
                  <span className="bg-indigo-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-indigo-300 hover:text-white underline font-medium transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${activeFilter === 'all' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:bg-slate-100'}`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition ${activeFilter === 'unread' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:bg-slate-100'}`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveFilter('high')}
                className={`px-2.5 py-1 rounded-lg transition ${activeFilter === 'high' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:bg-slate-100'}`}
              >
                High Priority ({notifications.filter(n => n.priority === 'high').length})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400">
                  <div className="text-2xl mb-1">🎉</div>
                  <p className="text-sm font-semibold text-slate-600">You&apos;re all caught up!</p>
                  <p className="text-xs text-slate-400 mt-0.5">No active alerts or overdue items found.</p>
                </div>
              ) : (
                filtered.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors hover:bg-slate-50/80 flex flex-col gap-1.5 ${!notif.read ? 'bg-indigo-50/30 border-l-3 border-l-indigo-500' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(notif.priority, notif.type)}
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                          {notif.reporteeName ? `· ${notif.reporteeName}` : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {notif.date}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {notif.message}
                    </p>

                    {notif.targetUrl && (
                      <div className="mt-1 flex items-center justify-end">
                        <Link
                          href={notif.targetUrl}
                          onClick={() => handleItemClick(notif)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition shadow-2xs"
                        >
                          {notif.actionLabel || 'Take Action →'}
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Popover Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] font-medium">Updated just now</span>
              <Link
                href="/actions"
                onClick={() => setIsOpen(false)}
                className="font-semibold text-indigo-600 hover:underline"
              >
                View all actions →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
