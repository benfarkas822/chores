"use client";

import { useState } from "react";
import { useChoreTasks, FREQUENCIES, ColumnId } from "./hooks/useChoreTasks";

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "done", title: "Done" },
];

function formatDueDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sendToAppleReminders(title: string) {
  const encoded = encodeURIComponent(title);
  const url = `shortcuts://run-shortcut?name=AddKanbanChore&input=${encoded}`;
  window.location.href = url;
}

export default function Home() {
  const { tasks, addTask, deleteTask, moveTask, cycleFrequency } = useChoreTasks();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [activeTab, setActiveTab] = useState<ColumnId>("backlog");

  function handleAdd() {
    addTask(newTaskTitle);
    setNewTaskTitle("");
  }

  // Native HTML5 drag-and-drop — works with a mouse, but iOS Safari does not
  // fire these touch events, so the tap-based move buttons below are the
  // primary way to move cards on a phone.
  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) setDragOverColumn(columnId);
  }

  function handleDragLeave(columnId: ColumnId) {
    setDragOverColumn((prev) => (prev === columnId ? null : prev));
  }

  function handleDrop(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) moveTask(taskId, columnId);
    setDragOverColumn(null);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Household Chores
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Move a chore to{" "}
            <span className="text-gray-200 font-medium">To Do</span> to push
            it to Apple Reminders on your iPhone. Completed recurring chores
            reappear automatically when they&apos;re next due.
          </p>
        </header>

        <div className="flex gap-2 mb-5 sm:mb-8">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a new chore..."
            className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-base sm:text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors text-white font-medium px-5 py-3 rounded-lg text-sm shrink-0"
          >
            Add
          </button>
        </div>

        {/* Mobile tab switcher — replaces stacked columns below sm breakpoint */}
        <div className="flex sm:hidden gap-2 mb-4">
          {COLUMNS.map((column) => {
            const count = tasks.filter((t) => t.column === column.id).length;
            const isActive = activeTab === column.id;
            return (
              <button
                key={column.id}
                onClick={() => setActiveTab(column.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-900 text-gray-400 border border-gray-800"
                }`}
              >
                {column.title}
                <span
                  className={`text-xs rounded-full px-1.5 ${
                    isActive ? "bg-indigo-500" : "bg-gray-800"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {COLUMNS.map((column, columnIndex) => {
            const columnTasks = tasks.filter((t) => t.column === column.id);
            const isDragOver = dragOverColumn === column.id;
            const prevColumn = COLUMNS[columnIndex - 1];
            const nextColumn = COLUMNS[columnIndex + 1];

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={() => handleDragLeave(column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`${
                  activeTab === column.id ? "block" : "hidden"
                } sm:block rounded-xl border p-3 sm:p-4 min-h-[60vh] sm:min-h-[420px] transition-colors ${
                  isDragOver
                    ? "border-indigo-500 bg-indigo-950/20"
                    : "border-gray-800 bg-gray-900/50"
                }`}
              >
                <div className="hidden sm:flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-300">
                    {column.title}
                  </h2>
                  <span className="text-xs bg-gray-800 text-gray-400 rounded-full px-2 py-0.5">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnTasks.map((task) => {
                    const freq = FREQUENCIES.find((f) => f.id === task.frequency)!;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className="group bg-gray-800 border border-gray-700 rounded-lg p-3.5 sm:p-3 cursor-grab active:cursor-grabbing shadow-sm hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-gray-100">{task.title}</p>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-500 hover:text-red-400 active:text-red-400 text-sm sm:text-xs sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 leading-none p-1 -m-1"
                            aria-label="Delete chore"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => cycleFrequency(task.id)}
                            className="text-[11px] font-medium text-gray-400 bg-gray-950 border border-gray-700 rounded-full px-2 py-0.5 hover:text-gray-200 hover:border-gray-600 transition-colors"
                            title="Click to change how often this chore repeats"
                          >
                            🔁 {freq.label}
                          </button>
                          {task.nextDueAt !== null && task.column !== "todo" && (
                            <span className="text-[11px] text-gray-500">
                              Due {formatDueDate(task.nextDueAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 mt-3">
                          {prevColumn && (
                            <button
                              onClick={() => moveTask(task.id, prevColumn.id)}
                              className="flex-1 bg-gray-950 hover:bg-black active:bg-black border border-gray-700 text-gray-300 text-xs font-medium py-2 rounded-md transition-colors"
                            >
                              ← {prevColumn.title}
                            </button>
                          )}
                          {nextColumn && (
                            <button
                              onClick={() => moveTask(task.id, nextColumn.id)}
                              className="flex-1 bg-gray-950 hover:bg-black active:bg-black border border-gray-700 text-gray-300 text-xs font-medium py-2 rounded-md transition-colors"
                            >
                              {nextColumn.title} →
                            </button>
                          )}
                        </div>

                        {task.column === "todo" && (
                          <button
                            onClick={() => sendToAppleReminders(task.title)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-gray-950 hover:bg-black active:bg-black border border-gray-700 text-gray-200 text-xs font-medium py-2.5 rounded-md transition-colors"
                          >
                            🍎 Send to Apple Reminders
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-600 border border-dashed border-gray-800 rounded-lg py-8">
                      No chores here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
