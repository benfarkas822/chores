"use client";

import { useEffect, useRef, useState } from "react";
import {
  useChoreTasks,
  FREQUENCIES,
  ASSIGNEES,
  ColumnId,
  Frequency,
} from "../hooks/useChoreTasks";

const COLUMNS: { id: ColumnId; title: string; dotVar: string }[] = [
  { id: "backlog", title: "Backlog", dotVar: "--dot-backlog" },
  { id: "todo", title: "To Do", dotVar: "--dot-todo" },
  { id: "done", title: "Done", dotVar: "--dot-done" },
];

const SYNC_TOAST_MS = 2400;

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

export default function ChoresBoard() {
  const {
    tasks,
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
  } = useChoreTasks();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ColumnId>("backlog");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [syncToastVisible, setSyncToastVisible] = useState(false);
  const syncToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (syncToastTimeoutRef.current) clearTimeout(syncToastTimeoutRef.current);
    };
  }, []);

  function handleAdd() {
    addTask(newTaskTitle);
    setNewTaskTitle("");
  }

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setEditDraft(title);
  }

  function commitEdit() {
    if (editingId) renameTask(editingId, editDraft);
    setEditingId(null);
    setEditDraft("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function handleSendToReminders(title: string) {
    sendToAppleReminders(title);
    setSyncToastVisible(true);
    if (syncToastTimeoutRef.current) clearTimeout(syncToastTimeoutRef.current);
    syncToastTimeoutRef.current = setTimeout(() => setSyncToastVisible(false), SYNC_TOAST_MS);
  }

  // Native HTML5 drag-and-drop — works with a mouse, but iOS Safari does not
  // fire these touch events, so the tap-based move buttons are the primary
  // way to move cards on a phone.
  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleColumnDragOver(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) setDragOverColumn(columnId);
  }

  function handleColumnDragLeave(columnId: ColumnId) {
    setDragOverColumn((prev) => (prev === columnId ? null : prev));
  }

  function handleColumnDrop(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) moveTask(taskId, columnId);
    setDragOverColumn(null);
  }

  function handleCardDragOver(e: React.DragEvent, taskId: string) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTaskId !== taskId) setDragOverTaskId(taskId);
  }

  function handleCardDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId) reorderTask(draggedId, targetId);
    setDragOverColumn(null);
    setDragOverTaskId(null);
  }

  return (
    <>
      <div className="max-w-[620px] mb-8 sm:mb-10">
        <h1
          className="m-0 mb-3 text-[28px] sm:text-[38px] font-extrabold tracking-[-0.015em]"
          style={{ color: "var(--text-primary)" }}
        >
          Household Chores
        </h1>
        <p
          className="m-0 text-[14px] sm:text-[15.5px] leading-[1.6] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Move a chore to{" "}
          <span className="font-bold" style={{ color: "var(--text-emphasis)" }}>
            To&nbsp;Do
          </span>{" "}
          to push it to Apple Reminders on your iPhone. Completed recurring
          chores reappear automatically when they&apos;re next due.
        </p>
      </div>

      <div className="flex gap-2.5 mb-8 sm:mb-11 max-w-[720px]">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a new chore..."
          className="flex-1 min-w-0 rounded-xl px-[18px] py-3.5 text-[14.5px] font-medium outline-none border"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--input-border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={handleAdd}
          className="rounded-xl px-7 text-[14.5px] font-bold cursor-pointer border-none shrink-0"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          Add
        </button>
      </div>

      {/* Mobile tab switcher — the design's grid is fixed 3-column with no
          mobile breakpoint, which doesn't fit an iPhone screen. Below sm we
          show one column at a time via tabs; at sm+ it's the literal grid. */}
      <div className="flex sm:hidden gap-2 mb-4">
        {COLUMNS.map((column) => {
          const count = tasks.filter((t) => t.column === column.id).length;
          const isActive = activeTab === column.id;
          return (
            <button
              key={column.id}
              onClick={() => setActiveTab(column.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold border transition-colors"
              style={
                isActive
                  ? { background: "var(--accent)", color: "var(--accent-text)", borderColor: "var(--accent)" }
                  : { background: "var(--panel-bg)", color: "var(--text-secondary)", borderColor: "var(--panel-border)" }
              }
            >
              {column.title}
              <span
                className="text-xs rounded-full px-1.5"
                style={{ background: isActive ? "rgba(255,255,255,0.25)" : "var(--badge-bg)" }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-[22px] items-start">
        {COLUMNS.map((column, columnIndex) => {
          const columnTasks = tasks.filter((t) => t.column === column.id);
          const isDragOver = dragOverColumn === column.id;
          const prevColumn = COLUMNS[columnIndex - 1];
          const nextColumn = COLUMNS[columnIndex + 1];

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleColumnDragOver(e, column.id)}
              onDragLeave={() => handleColumnDragLeave(column.id)}
              onDrop={(e) => handleColumnDrop(e, column.id)}
              className={`${
                activeTab === column.id ? "block" : "hidden"
              } sm:block rounded-[18px] border p-[18px] min-h-[60vh] sm:min-h-[420px] transition-colors`}
              style={{
                background: "var(--panel-bg)",
                borderColor: isDragOver ? "var(--accent)" : "var(--panel-border)",
              }}
            >
              <div className="hidden sm:flex items-center gap-2.5 px-2 pb-[18px]">
                <span
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ background: `var(${column.dotVar})` }}
                />
                <span
                  className="text-[12.5px] font-extrabold tracking-[0.08em] uppercase"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {column.title}
                </span>
                <span
                  className="ml-auto text-[11.5px] font-bold rounded-full px-[9px] py-0.5"
                  style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
                >
                  {columnTasks.length}
                </span>
              </div>

              {columnTasks.length === 0 && (
                <div
                  className="rounded-[14px] border border-dashed py-10 px-3 text-center text-[13.5px] font-semibold"
                  style={{ borderColor: "var(--dashed-border)", color: "var(--text-muted)" }}
                >
                  No chores here
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {columnTasks.map((task) => {
                  const assignee = ASSIGNEES.find((a) => a.id === task.assignee)!;
                  const isEditing = editingId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={(e) => handleCardDragOver(e, task.id)}
                      onDrop={(e) => handleCardDrop(e, task.id)}
                      className="rounded-[14px] border cursor-grab active:cursor-grabbing pt-4 px-4 pb-3.5 transition-colors"
                      style={{
                        background: "var(--card-bg)",
                        borderColor: dragOverTaskId === task.id ? "var(--accent)" : "var(--card-border)",
                      }}
                    >
                      <div className="flex items-start gap-2 mb-[11px]">
                        <button
                          onClick={() => cycleAssignee(task.id)}
                          title={`Assigned to: ${assignee.label} (click to change)`}
                          className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                          style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
                        >
                          {assignee.initial}
                        </button>

                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-[15.5px] font-bold outline-none"
                            style={{
                              background: "var(--input-bg)",
                              border: "1.5px solid var(--accent)",
                              color: "var(--text-primary)",
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => startEdit(task.id, task.title)}
                            className="flex-1 min-w-0 text-[15.5px] font-bold cursor-text tracking-[-0.005em] break-words"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {task.title}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-[13px]">
                        <select
                          value={task.frequency}
                          onChange={(e) => setFrequency(task.id, e.target.value as Frequency)}
                          className="appearance-none border-none rounded-[7px] px-[9px] py-1 text-[11.5px] font-bold cursor-pointer"
                          style={{ background: "var(--pill-bg)", color: "var(--pill-text)" }}
                        >
                          {FREQUENCIES.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>

                        {task.frequency === "custom" && (
                          <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            <button
                              onClick={() => setCustomDays(task.id, task.customDays - 1)}
                              className="w-5 h-5 rounded"
                              style={{ background: "var(--badge-bg)" }}
                              aria-label="Decrease days"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={task.customDays}
                              onChange={(e) => setCustomDays(task.id, Number(e.target.value))}
                              className="w-10 rounded text-center py-0.5 outline-none"
                              style={{ background: "var(--badge-bg)" }}
                            />
                            <button
                              onClick={() => setCustomDays(task.id, task.customDays + 1)}
                              className="w-5 h-5 rounded"
                              style={{ background: "var(--badge-bg)" }}
                              aria-label="Increase days"
                            >
                              +
                            </button>
                            <span>days</span>
                          </div>
                        )}

                        {task.nextDueAt !== null && task.column !== "todo" && (
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                            Due {formatDueDate(task.nextDueAt)}
                          </span>
                        )}

                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Delete"
                          className="ml-auto bg-transparent border-none text-[12px] font-semibold cursor-pointer px-1 py-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="flex gap-1.5 mb-2">
                        {prevColumn && (
                          <button
                            onClick={() => moveTask(task.id, prevColumn.id)}
                            className="border-none rounded-lg px-3 py-2 text-[12.5px] font-bold cursor-pointer"
                            style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
                            aria-label={`Move back to ${prevColumn.title}`}
                          >
                            ←
                          </button>
                        )}
                        {nextColumn && (
                          <button
                            onClick={() => moveTask(task.id, nextColumn.id)}
                            className="flex-1 border-none rounded-lg px-3 py-2 text-[12.5px] font-bold cursor-pointer"
                            style={
                              column.id === "backlog"
                                ? { background: "var(--accent)", color: "var(--accent-text)" }
                                : { background: "var(--done-forward-bg)", color: "var(--done-forward-text)" }
                            }
                          >
                            {nextColumn.title} →
                          </button>
                        )}
                      </div>

                      {task.column === "todo" && (
                        <button
                          onClick={() => handleSendToReminders(task.title)}
                          className="w-full flex items-center justify-center gap-1.5 border-none rounded-lg py-2.5 text-xs font-bold cursor-pointer"
                          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                        >
                          🍎 Send to Apple Reminders
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {syncToastVisible && (
        <div
          className="fixed left-1/2 bottom-9 -translate-x-1/2 rounded-full px-[22px] py-3 text-[13.5px] font-bold shadow-2xl animate-toast-in border"
          style={{ background: "var(--toast-bg)", borderColor: "var(--toast-border)", color: "var(--text-primary)" }}
        >
          Synced to Apple Reminders
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed left-1/2 bottom-9 -translate-x-1/2 flex items-center gap-3 rounded-full px-[22px] py-3 text-[13.5px] font-bold shadow-2xl animate-toast-in border"
          style={{ background: "var(--toast-bg)", borderColor: "var(--toast-border)", color: "var(--text-primary)" }}
        >
          <span>Deleted &quot;{pendingDelete.title}&quot;</span>
          <button
            onClick={undoDelete}
            className="border-none bg-transparent cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}
