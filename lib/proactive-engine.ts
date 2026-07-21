import { Database, Task, Goal, Reportee } from './db';

export type ProactiveNotification = {
  id: string;
  type: 'prep' | 'overdue' | 'risk' | 'onboarding' | 'calendar';
  title: string;
  message: string;
  date: string;
  reporteeId?: number;
  reporteeName?: string;
  targetUrl?: string;
  actionLabel?: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
};

/**
 * Evaluates whether a Task is past its due date / timeframe
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.done || task.status === 'resolved') return false;
  
  const dateStr = task.dueDate || task.timeframe;
  if (!dateStr || dateStr.toLowerCase().includes('no due') || dateStr.toLowerCase().includes('timeframe')) {
    return false;
  }

  // Try parsing ISO date or standard date string
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) {
    // Check if it matches YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
  }

  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}

/**
 * Returns number of days overdue for display
 */
export function getDaysOverdue(task: Task): number {
  if (!isTaskOverdue(task)) return 0;
  const dateStr = task.dueDate || task.timeframe;
  if (!dateStr) return 0;
  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(today.getTime() - dueDate.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Computes all proactive notifications across the team
 */
export function computeProactiveNotifications(db: Database): ProactiveNotification[] {
  const notifications: ProactiveNotification[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Load read notifications from localStorage if running on client
  let readIds: Set<string> = new Set();
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('antigravity_read_notifications');
      if (stored) {
        readIds = new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load read notifications', e);
    }
  }

  // 1. Scan tasks for Overdue items
  db.team.forEach(member => {
    if (!member.tasks) return;
    member.tasks.forEach(task => {
      if (isTaskOverdue(task)) {
        const days = getDaysOverdue(task);
        const id = `overdue_task_${task.id}_${days}`;
        notifications.push({
          id,
          type: 'overdue',
          title: '🚨 Action Item Overdue',
          message: `"${task.title}" assigned to ${member.name} was due ${days} day${days > 1 ? 's' : ''} ago (${task.timeframe || task.dueDate}).`,
          date: todayStr,
          reporteeId: member.id,
          reporteeName: member.name,
          targetUrl: `/team/${encodeURIComponent(member.name)}?tab=actions`,
          actionLabel: 'View Action →',
          read: readIds.has(id),
          priority: 'high'
        });
      }
    });
  });

  // 2. Scan goals for At Risk / Off Track
  db.team.forEach(member => {
    if (!member.goals) return;
    member.goals.forEach(goal => {
      if (!goal.parentId && (goal.status === 'at_risk' || goal.status === 'off_track')) {
        const id = `risk_goal_${goal.id}_${goal.status}`;
        notifications.push({
          id,
          type: 'risk',
          title: goal.status === 'off_track' ? '🚨 Goal Off Track' : '⚠️ Goal At Risk',
          message: `"${goal.title}" for ${member.name} is currently at ${goal.progress}% progress. Check in or update blockers.`,
          date: todayStr,
          reporteeId: member.id,
          reporteeName: member.name,
          targetUrl: `/team/${encodeURIComponent(member.name)}?tab=goals`,
          actionLabel: 'Check Goal →',
          read: readIds.has(id),
          priority: goal.status === 'off_track' ? 'high' : 'medium'
        });
      }
    });
  });

  // 3. Scan check-in schedules & 1:1 prep reminders
  db.team.forEach(member => {
    if (member.isManager) return;
    // If weekly check-in frequency or high performer without recent notes
    const hasNotesToday = member.notes && member.notes.some(n => n.date === todayStr);
    if (!hasNotesToday && (member.checkInFreq === 'Weekly Check-in' || member.checkInFreq === 'weekly')) {
      const id = `prep_1on1_${member.id}_${todayStr}`;
      notifications.push({
        id,
        type: 'prep',
        title: '⚠️ 1:1 Prep Reminder',
        message: `Your weekly check-in with ${member.name} requires preparation. Draft agenda points before meeting.`,
        date: todayStr,
        reporteeId: member.id,
        reporteeName: member.name,
        targetUrl: `/team/${encodeURIComponent(member.name)}`,
        actionLabel: '✨ Prep 1:1 Now →',
        read: readIds.has(id),
        priority: 'high'
      });
    }
  });

  // 4. Scan Onboarding Plans
  db.team.forEach(member => {
    if (member.onboardingPlan) {
      const id = `onboarding_${member.id}_${member.onboardingPlan.phase}`;
      notifications.push({
        id,
        type: 'onboarding',
        title: `🚀 Onboarding Milestone (${member.onboardingPlan.phase}-Day)`,
        message: `${member.name} is in their ${member.onboardingPlan.phase}-day onboarding window. Review checklist progress.`,
        date: todayStr,
        reporteeId: member.id,
        reporteeName: member.name,
        targetUrl: `/team/${encodeURIComponent(member.name)}`,
        actionLabel: 'Review Onboarding →',
        read: readIds.has(id),
        priority: 'medium'
      });
    }
  });

  // 5. Scan Synced Calendar Meetings
  if (db.config.syncedMeetings && db.config.syncedMeetings.length > 0) {
    db.config.syncedMeetings.forEach(mtg => {
      if (!mtg.hasAgenda) {
        const id = `calendar_mtg_${mtg.id}`;
        notifications.push({
          id,
          type: 'calendar',
          title: '📅 Upcoming 1:1 Detected',
          message: `${mtg.title} (${mtg.date}) synced from ${db.config.calendarProvider || 'calendar'}. No agenda linked yet.`,
          date: mtg.date,
          reporteeId: mtg.reporteeId,
          targetUrl: mtg.reporteeId ? `/team/${mtg.reporteeId}` : `/team`,
          actionLabel: 'Link Agenda →',
          read: readIds.has(id),
          priority: 'medium'
        });
      }
    });
  }

  // Sort: unread first, high priority first
  return notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const prioOrder = { high: 0, medium: 1, low: 2 };
    return prioOrder[a.priority] - prioOrder[b.priority];
  });
}

export function markNotificationRead(notifId: string) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('antigravity_read_notifications');
    const readIds: string[] = stored ? JSON.parse(stored) : [];
    if (!readIds.includes(notifId)) {
      readIds.push(notifId);
      localStorage.setItem('antigravity_read_notifications', JSON.stringify(readIds));
    }
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch (e) {
    console.error('Failed to mark read', e);
  }
}

export function markAllNotificationsRead(notifIds: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('antigravity_read_notifications');
    const readIds: string[] = stored ? JSON.parse(stored) : [];
    notifIds.forEach(id => {
      if (!readIds.includes(id)) readIds.push(id);
    });
    localStorage.setItem('antigravity_read_notifications', JSON.stringify(readIds));
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  } catch (e) {
    console.error('Failed to mark all read', e);
  }
}
