"use client";

import { useEffect, useRef, useState } from "react";

export type ColumnId = "backlog" | "todo" | "done";
export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom"
  | "none";
export type Assignee = "unassigned" | "me" | "roommate";

export type Task = {
  id: string;
  title: string;
  column: ColumnId;
  frequency: Frequency;
  /** Only meaningful when frequency === "custom". */
  customDays: number;
  /** Timestamp (ms) when this chore should automatically reappear in To Do. */
  nextDueAt: number | null;
  assignee: Assignee;
};

const STORAGE_KEY = "chore-kanban-tasks";
const DELETE_UNDO_MS = 5000;
const DEFAULT_CUSTOM_DAYS = 3;

export const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
  { id: "none", label: "One-time" },
];

export const ASSIGNEES: { id: Assignee; label: string; initial: string }[] = [
  { id: "unassigned", label: "Unassigned", initial: "?" },
  { id: "me", label: "Me", initial: "B" },
  { id: "roommate", label: "Roommate", initial: "P" },
];

const PRESET_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function frequencyMs(task: Pick<Task, "frequency" | "customDays">): number {
  if (task.frequency === "custom") return task.customDays * 24 * 60 * 60 * 1000;
  return PRESET_MS[task.frequency] ?? 0;
}

/** Recomputes nextDueAt when a chore enters Done or its recurrence changes. */
function withColumn(task: Task, column: ColumnId): Task {
  const enteringDone = column === "done" && task.column !== "done";
  const nextDueAt =
    enteringDone && task.frequency !== "none"
      ? Date.now() + frequencyMs(task)
      : task.nextDueAt;
  return { ...task, column, nextDueAt };
}

const SEED_CHORES: { title: string; frequency: Frequency }[] = [
  { title: "Wash Dishes", frequency: "daily" },
  { title: "Dry & Put Away Dishes", frequency: "daily" },
  { title: "Wipe Counters", frequency: "daily" },
  { title: "Clean Bathroom", frequency: "weekly" },
  { title: "Clean Toilet", frequency: "weekly" },
  { title: "Take Out Trash", frequency: "weekly" },
  { title: "Take Out Recycling", frequency: "weekly" },
  { title: "Vacuum Living Room", frequency: "weekly" },
  { title: "Mop Kitchen Floor", frequency: "weekly" },
  { title: "Dust Shelves & Surfaces", frequency: "monthly" },
  { title: "Change Bed Sheets", frequency: "weekly" },
  { title: "Do Laundry", frequency: "weekly" },
  { title: "Hang Laundry to Dry", frequency: "weekly" },
  { title: "Water Houseplants", frequency: "weekly" },
  { title: "Wipe Down Stove", frequency: "weekly" },
  { title: "Clean Fridge Inside", frequency: "monthly" },
  { title: "Clean Windows", frequency: "monthly" },
  { title: "Descale Kettle", frequency: "monthly" },
];

function makeDefaultTasks(): Task[] {
  return SEED_CHORES.map(({ title, frequency }) => ({
    id: crypto.randomUUID(),
    title,
    column: "backlog",
    frequency,
    customDays: DEFAULT_CUSTOM_DAYS,
    nextDueAt: null,
    assignee: "unassigned",
  }));
}

function normalizeTask(raw: Partial<Task> & Record<string, unknown>): Task {
  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === "string" ? raw.title : "",
    column: raw.column === "todo" || raw.column === "done" ? raw.column : "backlog",
    frequency: FREQUENCIES.some((f) => f.id === raw.frequency)
      ? (raw.frequency as Frequency)
      : "weekly",
    customDays:
      typeof raw.customDays === "number" && raw.customDays > 0
        ? raw.customDays
        : DEFAULT_CUSTOM_DAYS,
    nextDueAt: typeof raw.nextDueAt === "number" ? raw.nextDueAt : null,
    assignee: ASSIGNEES.some((a) => a.id === raw.assignee)
      ? (raw.assignee as Assignee)
      : "unassigned",
  };
}

function loadTasks(): Task[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultTasks();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeTask);
    }
    return makeDefaultTasks();
  } catch {
    return makeDefaultTasks();
  }
}

/**
 * Chores carry an absolute `nextDueAt` timestamp rather than a countdown, so
 * "how much time passed while the app was closed" never needs tracking
 * separately — comparing against `Date.now()` at read time is always
 * correct regardless of how long the gap was.
 */
function promoteDueTasks(tasks: Task[]): Task[] {
  const now = Date.now();
  return tasks.map((t) =>
    t.column !== "todo" && t.nextDueAt !== null && now >= t.nextDueAt
      ? { ...t, column: "todo", nextDueAt: null }
      : t
  );
}

/**
 * Owns chore state: hydrates from localStorage, re-syncs on every change,
 * and promotes recurring chores into To Do based on elapsed real time —
 * both on first load and whenever the tab regains focus (e.g. coming back
 * from the Shortcuts app on iOS).
 */

/** Chores sorted by how soon (or how overdue) their next occurrence is. */
export function getUpcomingTasks(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((t) => t.column !== "todo" && t.nextDueAt !== null)
    .sort((a, b) => (a.nextDueAt ?? 0) - (b.nextDueAt ?? 0))
    .slice(0, limit);
}

export function useChoreTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const hasHydrated = useRef(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(promoteDueTasks(loadTasks()));
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    function handleFocus() {
      setTasks((prev) => promoteDueTasks(prev));
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  function addTask(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: trimmed,
        column: "backlog",
        frequency: "weekly",
        customDays: DEFAULT_CUSTOM_DAYS,
        nextDueAt: null,
        assignee: "unassigned",
      },
    ]);
  }

  function renameTask(id: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)));
  }

  // Deleting stages the task for removal instead of dropping it immediately,
  // so the UI can offer a few seconds of "Undo" before it's actually gone.
  function deleteTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      setTasks((prev) => prev.filter((t) => t.id !== pendingDelete?.id));
    }

    setPendingDelete({ id, title: task.title });
    deleteTimeoutRef.current = setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setPendingDelete(null);
      deleteTimeoutRef.current = null;
    }, DELETE_UNDO_MS);
  }

  function undoDelete() {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    setPendingDelete(null);
  }

  function moveTask(id: string, column: ColumnId) {
    setTasks((prev) => prev.map((t) => (t.id === id ? withColumn(t, column) : t)));
  }

  // Moves a dragged card next to a target card, reordering within (or
  // across) columns. Desktop drag-and-drop only — see the mobile move
  // buttons for the touch equivalent.
  function reorderTask(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setTasks((prev) => {
      const dragged = prev.find((t) => t.id === draggedId);
      const target = prev.find((t) => t.id === targetId);
      if (!dragged || !target) return prev;

      const updatedDragged = withColumn(dragged, target.column);
      const withoutDragged = prev.filter((t) => t.id !== draggedId);
      const targetIndex = withoutDragged.findIndex((t) => t.id === targetId);
      const next = [...withoutDragged];
      next.splice(targetIndex, 0, updatedDragged);
      return next;
    });
  }

  function setFrequency(id: string, frequency: Frequency) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, frequency };
        if (t.column !== "done") return updated;
        return {
          ...updated,
          nextDueAt: frequency === "none" ? null : Date.now() + frequencyMs(updated),
        };
      })
    );
  }

  function setCustomDays(id: string, days: number) {
    const clamped = Math.max(1, Math.min(365, Math.round(days) || 1));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, customDays: clamped };
        if (t.column !== "done" || t.frequency !== "custom") return updated;
        return { ...updated, nextDueAt: Date.now() + frequencyMs(updated) };
      })
    );
  }

  function cycleAssignee(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const order = ASSIGNEES.map((a) => a.id);
        const idx = order.indexOf(t.assignee);
        return { ...t, assignee: order[(idx + 1) % order.length] };
      })
    );
  }

  const visibleTasks = tasks.filter((t) => t.id !== pendingDelete?.id);

  return {
    tasks: visibleTasks,
    pendingDelete,
    undoDelete,
    addTask,
    renameTask,
    deleteTask,
    moveTask,
    reorderTask,
    setFrequency,
    setCustomDays,
    cycleAssignee,
  };
}
