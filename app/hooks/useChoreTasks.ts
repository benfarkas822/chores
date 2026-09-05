"use client";

import { useEffect, useRef, useState } from "react";

export type ColumnId = "backlog" | "todo" | "done";
export type Frequency = "daily" | "weekly" | "monthly" | "none";

export type Task = {
  id: string;
  title: string;
  column: ColumnId;
  frequency: Frequency;
  /** Timestamp (ms) when this chore should automatically reappear in To Do. */
  nextDueAt: number | null;
};

const STORAGE_KEY = "chore-kanban-tasks";

export const FREQUENCIES: { id: Frequency; label: string; ms: number }[] = [
  { id: "daily", label: "Daily", ms: 24 * 60 * 60 * 1000 },
  { id: "weekly", label: "Weekly", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "monthly", label: "Monthly", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "none", label: "One-off", ms: 0 },
];

function frequencyMs(frequency: Frequency): number {
  return FREQUENCIES.find((f) => f.id === frequency)?.ms ?? 0;
}

function nextFrequency(frequency: Frequency): Frequency {
  const idx = FREQUENCIES.findIndex((f) => f.id === frequency);
  return FREQUENCIES[(idx + 1) % FREQUENCIES.length].id;
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
    nextDueAt: null,
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
    nextDueAt: typeof raw.nextDueAt === "number" ? raw.nextDueAt : null,
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
export function useChoreTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const hasHydrated = useRef(false);

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
        nextDueAt: null,
      },
    ]);
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function moveTask(id: string, column: ColumnId) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        // Completing a recurring chore schedules its next reappearance.
        const nextDueAt =
          column === "done" && t.frequency !== "none"
            ? Date.now() + frequencyMs(t.frequency)
            : t.nextDueAt;
        return { ...t, column, nextDueAt };
      })
    );
  }

  function cycleFrequency(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const frequency = nextFrequency(t.frequency);
        const nextDueAt =
          t.column === "done"
            ? frequency === "none"
              ? null
              : Date.now() + frequencyMs(frequency)
            : t.nextDueAt;
        return { ...t, frequency, nextDueAt };
      })
    );
  }

  return { tasks, addTask, deleteTask, moveTask, cycleFrequency };
}
