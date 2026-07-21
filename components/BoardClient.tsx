"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Plus,
  Calendar,
  Target,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useIndexedDB } from "@/components/IndexedDBProvider";
import { addGoal, addTask } from "@/lib/actions";
import type { Reportee, Task, Goal, Note } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

type BoardItemType = "task" | "goal" | "1on1";

type BoardItemStatus =
  | "done"
  | "pending"
  | "overdue"
  | "watch"
  | "in_progress";

interface BoardItem {
  id: string;
  type: BoardItemType;
  title: string;
  status: BoardItemStatus;
  date: string | null; // ISO date string or null for unscheduled
  priority?: "P0" | "P1" | "P2";
  reporteeName: string;
  reporteeId: number;
  raw: Task | Goal | Note | Record<string, unknown>;
}

type ViewMode = "week" | "month";
type FilterType = "all" | "tasks" | "goals" | "1on1s";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function parseDate(s: string): Date | null {
  if (!s || s === "No Due Date") return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

function isOverdue(dateStr: string | null | undefined, done: boolean): boolean {
  if (done || !dateStr) return false;
  const d = parseDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4);
  const monMonth = MONTH_NAMES[monday.getMonth()];
  const friMonth = MONTH_NAMES[friday.getMonth()];
  if (monMonth === friMonth) {
    return `${monMonth} ${monday.getDate()}–${friday.getDate()}`;
  }
  return `${monMonth} ${monday.getDate()} – ${friMonth} ${friday.getDate()}`;
}

function formatMonthRange(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function daysOverdue(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = parseDate(dateStr);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ─── Data Processing ─────────────────────────────────────────────────────────

function buildBoardItems(team: Reportee[]): BoardItem[] {
  const items: BoardItem[] = [];

  for (const member of team) {
    if (member.isManager) continue;

    // Tasks
    for (const task of member.tasks || []) {
      let status: BoardItemStatus = "pending";
      if (task.status === "resolved" || task.done) {
        status = "done";
      } else if (task.status === "in_progress") {
        status = "in_progress";
      } else if (isOverdue(task.timeframe, task.done)) {
        status = "overdue";
      }

      const date = parseDate(task.timeframe || "");
      items.push({
        id: `task-${member.id}-${task.id}`,
        type: "task",
        title: task.title,
        status,
        date: date ? formatDateISO(date) : null,
        priority: task.priority,
        reporteeName: member.name,
        reporteeId: member.id,
        raw: task,
      });
    }

    // Goals
    for (const goal of member.goals || []) {
      let status: BoardItemStatus = "pending";
      if (goal.status === "achieved" || goal.progress >= (goal.total || 100)) {
        status = "done";
      } else if (goal.status === "at_risk") {
        status = "watch";
      } else if (goal.status === "off_track") {
        status = "overdue";
      } else if (goal.status === "on_track") {
        status = "in_progress";
      }

      const date = parseDate(goal.dueDate || "");
      items.push({
        id: `goal-${member.id}-${goal.id}`,
        type: "goal",
        title: goal.title,
        status,
        date: date ? formatDateISO(date) : null,
        priority: goal.priority,
        reporteeName: member.name,
        reporteeId: member.id,
        raw: goal,
      });
    }

    // 1:1s — generate for current & adjacent weeks based on checkInFreq
    if (member.checkInFreq) {
      const freq = member.checkInFreq;
      const today = new Date();
      const monday = getMondayOfWeek(today);

      // Distribute 1:1s: weekly on Tuesdays, monthly on 1st Tuesday, quarterly on 1st of quarter
      let oneOnOneDates: Date[] = [];

      if (freq === "weekly" || freq === "Weekly Check-in") {
        // Generate for 5 weeks around now
        for (let w = -2; w <= 2; w++) {
          const tue = addDays(addDays(monday, w * 7), 1); // Tuesday of each week
          oneOnOneDates.push(tue);
        }
      } else if (freq === "monthly" || freq === "Monthly Check-in") {
        // 1st Tuesday of the month, for 3 months around now
        for (let m = -1; m <= 1; m++) {
          const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
          while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
          oneOnOneDates.push(new Date(d));
        }
      } else if (
        freq === "quarterly" ||
        freq === "Quarterly Check-in" ||
        freq === "performance" ||
        freq === "Performance Review"
      ) {
        const qMonth = Math.floor(today.getMonth() / 3) * 3;
        const d = new Date(today.getFullYear(), qMonth, 1);
        while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
        oneOnOneDates.push(new Date(d));
      }

      for (const d of oneOnOneDates) {
        const isPast = d < today && !isSameDay(d, today);
        items.push({
          id: `1on1-${member.id}-${formatDateISO(d)}`,
          type: "1on1",
          title: `1:1 with ${member.name}`,
          status: isPast ? "done" : isSameDay(d, today) ? "pending" : "pending",
          date: formatDateISO(d),
          reporteeName: member.name,
          reporteeId: member.id,
          raw: { name: member.name, freq: member.checkInFreq },
        });
      }
    }
  }

  return items;
}

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: BoardItemStatus }) {
  const config = {
    done: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      label: "DONE ✓",
    },
    pending: { bg: "bg-amber-100", text: "text-amber-700", label: "PENDING" },
    overdue: {
      bg: "bg-red-100",
      text: "text-red-700",
      label: "OVERDUE ⚠",
    },
    watch: { bg: "bg-purple-100", text: "text-purple-700", label: "WATCH" },
    in_progress: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "IN PROGRESS",
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// ─── Priority Badge ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority?: "P0" | "P1" | "P2" }) {
  if (!priority) return null;
  const config = {
    P0: "bg-red-100 text-red-700",
    P1: "bg-amber-100 text-amber-700",
    P2: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${config[priority]}`}
    >
      {priority}
    </span>
  );
}

// ─── Type Badge (for detail panel) ───────────────────────────────────────────

function TypeBadge({
  item,
}: {
  item: BoardItem;
}) {
  const typeLabels: Record<BoardItemType, string> = {
    task: "TASK",
    goal: "GOAL",
    "1on1": "1:1",
  };

  const statusLabels: Record<BoardItemStatus, string> = {
    done: "DONE",
    pending: "PENDING",
    overdue: "OVERDUE",
    watch: "AT RISK",
    in_progress: "IN PROGRESS",
  };

  const statusColors: Record<BoardItemStatus, string> = {
    done: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    watch: "bg-purple-100 text-purple-700",
    in_progress: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`text-[11px] font-bold px-2 py-1 rounded-md ${statusColors[item.status]}`}
    >
      {statusLabels[item.status]} {typeLabels[item.type]}
    </span>
  );
}

// ─── Item Card Component ─────────────────────────────────────────────────────

function ItemCard({
  item,
  onClick,
}: {
  item: BoardItem;
  onClick: () => void;
}) {
  const cardBg: Record<BoardItemStatus, string> = {
    done: "bg-emerald-50 border-emerald-200",
    pending: "bg-amber-50 border-amber-200",
    overdue: "bg-red-50 border-red-200",
    watch: "bg-purple-50 border-purple-200",
    in_progress: "bg-white border-slate-200",
  };

  const typeIcons: Record<BoardItemType, React.ReactNode> = {
    task: <CheckCircle2 className="w-3 h-3" />,
    goal: <Target className="w-3 h-3" />,
    "1on1": <Users className="w-3 h-3" />,
  };

  const actionLabel: Record<BoardItemType, string> = {
    task: "Open →",
    goal: "View →",
    "1on1": "Prep →",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-lg p-2.5 transition-all hover:shadow-md cursor-pointer ${cardBg[item.status]}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusBadge status={item.status} />
        {item.priority && <PriorityBadge priority={item.priority} />}
      </div>
      <div className="flex items-start gap-1.5 mb-1.5">
        <span className="mt-0.5 text-slate-400 shrink-0">
          {typeIcons[item.type]}
        </span>
        <span className="text-[13px] font-medium text-slate-800 leading-tight line-clamp-2">
          {item.title}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 truncate">
          {item.reporteeName}
        </span>
        <span className="text-[11px] font-semibold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 shrink-0">
          {actionLabel[item.type]}
        </span>
      </div>
    </button>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({
  item,
  allItems,
  onClose,
  onSnooze,
  onMarkDone,
}: {
  item: BoardItem;
  allItems: BoardItem[];
  onClose: () => void;
  onSnooze: (item: BoardItem) => void;
  onMarkDone: (item: BoardItem) => void;
}) {
  const otherItemsToday = item.date
    ? allItems.filter((i) => i.date === item.date && i.id !== item.id)
    : [];

  const rawTask = item.type === "task" ? (item.raw as Task) : null;
  const rawGoal = item.type === "goal" ? (item.raw as Goal) : null;
  const overdueDays =
    item.status === "overdue" ? daysOverdue(item.date) : 0;

  const primaryBtnClass =
    item.status === "overdue"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-indigo-600 hover:bg-indigo-700";

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-slate-200 shadow-xl z-[60] flex flex-col transform transition-transform duration-300 translate-x-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <TypeBadge item={item} />
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>

        {/* Metadata */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500">Assigned to</span>
            <span className="font-medium text-slate-800">
              {item.reporteeName}
            </span>
          </div>
          {item.priority && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-500">Priority</span>
              <PriorityBadge priority={item.priority} />
            </div>
          )}
          {item.date && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-500">
                {item.status === "overdue" ? "Days overdue" : "Due date"}
              </span>
              <span
                className={`font-medium ${item.status === "overdue" ? "text-red-600" : "text-slate-800"}`}
              >
                {item.status === "overdue"
                  ? `${overdueDays} day${overdueDays !== 1 ? "s" : ""}`
                  : item.date}
              </span>
            </div>
          )}
          {rawGoal && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-500">Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((rawGoal.progress / (rawGoal.total || 100)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="font-medium text-slate-800 text-[12px]">
                  {Math.round(
                    (rawGoal.progress / (rawGoal.total || 100)) * 100
                  )}
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {item.type === "task" && (
            <a
              href={`/person/${item.reporteeId}`}
              className={`flex items-center justify-center gap-2 w-full ${primaryBtnClass} text-white text-[13px] font-semibold rounded-lg py-2.5 transition-colors`}
            >
              Open task <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
          {item.type === "goal" && (
            <a
              href={`/goals`}
              className={`flex items-center justify-center gap-2 w-full ${primaryBtnClass} text-white text-[13px] font-semibold rounded-lg py-2.5 transition-colors`}
            >
              View goal <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
          {item.type === "1on1" && (
            <a
              href={`/person/${item.reporteeId}`}
              className={`flex items-center justify-center gap-2 w-full ${primaryBtnClass} text-white text-[13px] font-semibold rounded-lg py-2.5 transition-colors`}
            >
              Prep 1:1 <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}

          {item.type === "task" && item.status !== "done" && (
            <>
              <button
                onClick={() => onSnooze(item)}
                className="flex items-center justify-center gap-2 w-full border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg py-2.5 hover:bg-slate-50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Snooze 1 day
              </button>
              <button
                onClick={() => onMarkDone(item)}
                className="flex items-center justify-center gap-2 w-full border border-slate-200 text-slate-700 text-[13px] font-semibold rounded-lg py-2.5 hover:bg-slate-50 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark done ✓
              </button>
            </>
          )}
        </div>

        {/* Other items today */}
        {otherItemsToday.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Other items today
            </h3>
            <div className="space-y-1.5">
              {otherItemsToday.slice(0, 8).map((other) => (
                <button
                  key={other.id}
                  onClick={() => {
                    /* parent will handle re-selecting */
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <StatusBadge status={other.status} />
                  <span className="text-[12px] text-slate-700 truncate flex-1">
                    {other.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board Client ───────────────────────────────────────────────────────

export function BoardClient({ team }: { team: Reportee[] }) {
  const router = useRouter();
  const { persistAfterMutation } = useIndexedDB();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getMondayOfWeek(today)
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedItem, setSelectedItem] = useState<BoardItem | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [boardSettings, setBoardSettings] = useState({
    defaultView: "week" as ViewMode,
    defaultFilter: "all" as FilterType,
    showCompleted1on1s: true,
    snoozeDaysDefault: 1,
  });

  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    date: string | null;
    type: "task" | "goal";
  }>({
    isOpen: false,
    date: null,
    type: "task",
  });
  const [newTitle, setNewTitle] = useState("");
  const [newReporteeId, setNewReporteeId] = useState<number>(
    team[0]?.id || 0
  );
  const [newPriority, setNewPriority] = useState<"P0" | "P1" | "P2">("P1");
  const [isCreating, setIsCreating] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newReporteeId) return;
    setIsCreating(true);

    if (quickAddModal.type === "task") {
      const fd = new FormData();
      fd.set("title", newTitle);
      fd.set("status", "pending");
      fd.set("priority", newPriority);
      fd.set("timeframe", quickAddModal.date ? `Due ${quickAddModal.date}` : "This Week");
      fd.set("owner", "reportee");
      await addTask(newReporteeId, fd);
    } else {
      const fd = new FormData();
      fd.set("title", newTitle);
      fd.set("status", "on_track");
      fd.set("priority", newPriority);
      if (quickAddModal.date) fd.set("dueDate", quickAddModal.date);
      fd.set("icon", "🎯");
      await addGoal(newReporteeId, fd);
    }

    await persistAfterMutation();
    setIsCreating(false);
    setQuickAddModal({ isOpen: false, date: null, type: "task" });
    setNewTitle("");
    router.refresh();
    setActionFeedback(
      `Successfully created new ${quickAddModal.type === "task" ? "action item" : "goal"}!`
    );
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Build all board items
  const allItems = useMemo(() => buildBoardItems(team), [team]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterType === "all") return allItems;
    const typeMap: Record<FilterType, BoardItemType | null> = {
      all: null,
      tasks: "task",
      goals: "goal",
      "1on1s": "1on1",
    };
    const target = typeMap[filterType];
    return target ? allItems.filter((i) => i.type === target) : allItems;
  }, [allItems, filterType]);

  // Week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Items grouped by date for the current week
  const weekItems = useMemo(() => {
    const map = new Map<string, BoardItem[]>();
    for (const d of weekDates) {
      map.set(formatDateISO(d), []);
    }
    for (const item of filteredItems) {
      if (item.date && map.has(item.date)) {
        map.get(item.date)!.push(item);
      }
    }
    return map;
  }, [weekDates, filteredItems]);

  // Unscheduled items
  const unscheduledItems = useMemo(
    () => filteredItems.filter((i) => !i.date),
    [filteredItems]
  );

  // Month grid data
  const monthGridDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Monday before or on the 1st
    const startOffset = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay();
    const gridStart = addDays(firstDay, startOffset);

    const dates: Date[] = [];
    let current = new Date(gridStart);
    // Fill 6 weeks (42 days) max
    while (
      dates.length < 42 &&
      (current <= lastDay || dates.length % 7 !== 0)
    ) {
      dates.push(new Date(current));
      current = addDays(current, 1);
    }
    // Pad to full weeks
    while (dates.length % 7 !== 0) {
      dates.push(new Date(current));
      current = addDays(current, 1);
    }
    return dates;
  }, [currentMonth]);

  // Month items map
  const monthItems = useMemo(() => {
    const map = new Map<string, BoardItem[]>();
    for (const d of monthGridDates) {
      const key = formatDateISO(d);
      if (!map.has(key)) map.set(key, []);
    }
    for (const item of filteredItems) {
      if (item.date && map.has(item.date)) {
        map.get(item.date)!.push(item);
      }
    }
    return map;
  }, [monthGridDates, filteredItems]);

  // Navigation
  const navigateWeek = useCallback((dir: number) => {
    setCurrentWeekStart((prev) => addDays(prev, dir * 7));
  }, []);

  const navigateMonth = useCallback((dir: number) => {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, []);

  // Actions
  const handleSnooze = useCallback(
    async (item: BoardItem) => {
      const rawTask = item.raw as Task;
      const tomorrow = addDays(today, 1);
      const tomorrowISO = formatDateISO(tomorrow);
      try {
        await fetch("/api/update-action-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: `manual-${rawTask.id}`,
            reporteeId: item.reporteeId,
            timeframe: tomorrowISO,
          }),
        });
        setActionFeedback("Snoozed to tomorrow");
        setSelectedItem(null);
        setTimeout(() => setActionFeedback(null), 2000);
      } catch {
        setActionFeedback("Failed to snooze");
        setTimeout(() => setActionFeedback(null), 2000);
      }
    },
    [today]
  );

  const handleMarkDone = useCallback(async (item: BoardItem) => {
    const rawTask = item.raw as Task;
    try {
      await fetch("/api/update-action-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: `manual-${rawTask.id}`,
          reporteeId: item.reporteeId,
          status: "resolved",
        }),
      });
      setActionFeedback("Marked as done ✓");
      setSelectedItem(null);
      setTimeout(() => setActionFeedback(null), 2000);
    } catch {
      setActionFeedback("Failed to update");
      setTimeout(() => setActionFeedback(null), 2000);
    }
  }, []);

  // Column summary
  function getColumnSummary(items: BoardItem[]) {
    const done = items.filter((i) => i.status === "done").length;
    const urgent = items.filter(
      (i) => i.status === "overdue" || i.priority === "P0"
    ).length;
    const pending = items.filter((i) => i.status === "pending").length;
    return { done, urgent, pending };
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      {/* Action feedback toast */}
      {actionFeedback && (
        <div className="fixed top-4 right-4 z-[70] bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-lg shadow-lg animate-pulse">
          {actionFeedback}
        </div>
      )}

      {/* ─── Header Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Title */}
          <h1 className="text-xl font-bold text-slate-900">My board</h1>

          {/* Center-left: View toggle */}
          <div className="flex items-center gap-4">
            <div role="tablist" aria-label="Board timeframe view" className="flex items-center bg-slate-200/50 p-0.5 rounded-lg">
              {(["week", "month"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  role="tab"
                  aria-selected={viewMode === mode}
                  aria-controls="board-view-container"
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    viewMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Center: Filter tabs */}
            <div role="tablist" aria-label="Filter board items" className="flex items-center gap-1">
              {(
                [
                  ["all", "All"],
                  ["tasks", "Tasks"],
                  ["goals", "Goals"],
                  ["1on1s", "1:1s"],
                ] as [FilterType, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={filterType === key}
                  aria-controls="board-view-container"
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    filterType === key
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-500 hover:text-slate-700 border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Date navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                viewMode === "week" ? navigateWeek(-1) : navigateMonth(-1)
              }
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold text-slate-700 min-w-[120px] text-center">
              {viewMode === "week"
                ? formatWeekRange(currentWeekStart)
                : formatMonthRange(currentMonth)}
            </span>
            <button
              onClick={() =>
                viewMode === "week" ? navigateWeek(1) : navigateMonth(1)
              }
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQuickAddModal({ isOpen: true, date: formatDateISO(today), type: "task" })}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-1"
              title="Board Settings & Customization"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "week" ? (
          <>
            {/* Week View */}
            <div className="flex gap-3 min-h-[400px]">
              {weekDates.map((date) => {
                const dateKey = formatDateISO(date);
                const dayItems = weekItems.get(dateKey) || [];
                const isToday = isSameDay(date, today);
                const summary = getColumnSummary(dayItems);

                return (
                  <div
                    key={dateKey}
                    className={`flex-1 min-w-[180px] flex flex-col rounded-xl border ${
                      isToday
                        ? "bg-amber-50/30 border-amber-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Column Header */}
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
                          {DAY_NAMES[date.getDay()]}
                        </span>
                        <span className="text-[11px] text-slate-300">·</span>
                        <span className="text-[13px] font-semibold text-slate-700">
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full ml-1">
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {summary.done > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            {summary.done} done
                          </span>
                        )}
                        {summary.urgent > 0 && (
                          <span className="text-[10px] font-semibold text-red-600">
                            {summary.urgent} urgent
                          </span>
                        )}
                        {summary.pending > 0 && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            {summary.pending} pending
                          </span>
                        )}
                        {dayItems.length === 0 && (
                          <span className="text-[10px] text-slate-300">
                            No items
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                      {dayItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onClick={() => setSelectedItem(item)}
                        />
                      ))}
                    </div>

                    {/* Add button */}
                    <div className="p-2 pt-0">
                      <button
                        onClick={() => setQuickAddModal({ isOpen: true, date: dateKey, type: "task" })}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-[12px] text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unscheduled Section */}
            {unscheduledItems.length > 0 && (
              <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <button
                  onClick={() => setShowUnscheduled(!showUnscheduled)}
                  className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Unscheduled</span>
                    <span className="text-slate-400 font-normal">
                      — {unscheduledItems.length} item
                      {unscheduledItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {showUnscheduled ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {showUnscheduled && (
                  <div className="px-4 pb-4 overflow-x-auto">
                    <div className="flex gap-2 flex-wrap">
                      {unscheduledItems.map((item) => (
                        <div key={item.id} className="w-[220px] shrink-0">
                          <ItemCard
                            item={item}
                            onClick={() => setSelectedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ─── Month View ──────────────────────────────────────────────── */
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                (day) => (
                  <div
                    key={day}
                    className="text-center text-[11px] font-bold text-slate-400 tracking-wider py-2"
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7">
              {monthGridDates.map((date, idx) => {
                const dateKey = formatDateISO(date);
                const dayItems = monthItems.get(dateKey) || [];
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();
                const isToday_ = isSameDay(date, today);
                const maxShow = 3;

                return (
                  <div
                    key={dateKey + idx}
                    className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${
                      isToday_
                        ? "bg-amber-50/40"
                        : isCurrentMonth
                          ? "bg-white"
                          : "bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[12px] font-semibold ${
                          isToday_
                            ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                            : isCurrentMonth
                              ? "text-slate-700"
                              : "text-slate-300"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, maxShow).map((item) => {
                        const dotColor: Record<BoardItemStatus, string> = {
                          done: "bg-emerald-400",
                          pending: "bg-amber-400",
                          overdue: "bg-red-400",
                          watch: "bg-purple-400",
                          in_progress: "bg-blue-400",
                        };
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="w-full flex items-center gap-1 px-1 py-0.5 rounded hover:bg-slate-100 transition-colors text-left"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[item.status]}`}
                            />
                            <span
                              className={`text-[10px] truncate ${isCurrentMonth ? "text-slate-600" : "text-slate-400"}`}
                            >
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                      {dayItems.length > maxShow && (
                        <span className="text-[10px] text-indigo-500 font-medium pl-1">
                          +{dayItems.length - maxShow} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Unscheduled under month view */}
            {unscheduledItems.length > 0 && (
              <div className="border-t border-slate-200">
                <button
                  onClick={() => setShowUnscheduled(!showUnscheduled)}
                  className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Unscheduled</span>
                    <span className="text-slate-400 font-normal">
                      — {unscheduledItems.length} item
                      {unscheduledItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {showUnscheduled ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {showUnscheduled && (
                  <div className="px-4 pb-4 overflow-x-auto">
                    <div className="flex gap-2 flex-wrap">
                      {unscheduledItems.map((item) => (
                        <div key={item.id} className="w-[220px] shrink-0">
                          <ItemCard
                            item={item}
                            onClick={() => setSelectedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Detail Panel Overlay ───────────────────────────────────────── */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[55]"
            onClick={() => setSelectedItem(null)}
          />
          <DetailPanel
            item={selectedItem}
            allItems={filteredItems}
            onClose={() => setSelectedItem(null)}
            onSnooze={handleSnooze}
            onMarkDone={handleMarkDone}
          />
        </>
      )}

      {/* ─── Quick Add Modal ────────────────────────────────────────────── */}
      {quickAddModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setQuickAddModal({ isOpen: false, date: null, type: "task" })}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Create New {quickAddModal.type === "task" ? "Action Item" : "Goal"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {quickAddModal.date ? `Scheduled for ${quickAddModal.date}` : "Add to team tracker"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickAddModal({ isOpen: false, date: null, type: "task" })}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-5 space-y-4">
              {/* Type Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickAddModal({ ...quickAddModal, type: "task" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    quickAddModal.type === "task"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Action Item (Task)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAddModal({ ...quickAddModal, type: "goal" })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    quickAddModal.type === "goal"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-amber-600" /> Goal / Objective
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Title / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder={quickAddModal.type === "task" ? "e.g. Review Q3 architecture proposal..." : "e.g. Achieve 95% API test coverage..."}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 shadow-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign To Member
                  </label>
                  <select
                    value={newReporteeId}
                    onChange={(e) => setNewReporteeId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  >
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "P0" | "P1" | "P2")}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                  >
                    <option value="P0">🚨 P0 - Urgent / Critical</option>
                    <option value="P1">⚡ P1 - High Priority</option>
                    <option value="P2">🌱 P2 - Standard / Low</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuickAddModal({ isOpen: false, date: null, type: "task" })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreating ? "Creating..." : `Add ${quickAddModal.type === "task" ? "Task" : "Goal"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Board Settings Modal ───────────────────────────────────────── */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Board Settings & Preferences</h3>
                  <p className="text-[11px] text-slate-400">Customize how tasks, goals, and 1:1s appear on your kanban board</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">What is customized here?</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  These settings control default view layouts, snooze increments, and calendar visibility inside <strong>My Board</strong>. For global check-in frequency and 30/60/90 Onboarding templates, use the main <strong>Portal Settings</strong> tab from the sidebar.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Default Board View</div>
                    <div className="text-[11px] text-slate-500">Choose your startup layout</div>
                  </div>
                  <select
                    value={boardSettings.defaultView}
                    onChange={(e) => {
                      const val = e.target.value as ViewMode;
                      setBoardSettings({ ...boardSettings, defaultView: val });
                      setViewMode(val);
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="week">Week View (7 Days)</option>
                    <option value="month">Month Grid View</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Snooze Action Increment</div>
                    <div className="text-[11px] text-slate-500">How many days items move when snoozed</div>
                  </div>
                  <select
                    value={boardSettings.snoozeDaysDefault}
                    onChange={(e) => setBoardSettings({ ...boardSettings, snoozeDaysDefault: Number(e.target.value) })}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value={1}>+1 Day (Next Day)</option>
                    <option value={2}>+2 Days</option>
                    <option value={7}>+1 Week (7 Days)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Show Unscheduled Items Section</div>
                    <div className="text-[11px] text-slate-500">Display items without explicit due dates at bottom</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showUnscheduled}
                    onChange={(e) => setShowUnscheduled(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
