"use client";

import { useEffect, useState } from "react";
import { useChoreTasks, getUpcomingTasks } from "../hooks/useChoreTasks";
import { useGroceryList } from "../hooks/useGroceryList";
import { fetchRandomRecipes, fetchRecipesByCuisine, CUISINES, Recipe } from "../lib/recipes";

const RECIPE_COUNT = 6;
const SURPRISE_ME = "";

function formatDueDate(timestamp: number): string {
  const isOverdue = timestamp < Date.now();
  const label = new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return isOverdue ? `Overdue since ${label}` : `Due ${label}`;
}

/** Sends every unchecked grocery item as one newline-joined input, so the
 * "AddGroceryItem" Shortcut can split on newlines and add each as its own
 * reminder (Split Text -> Repeat with Each -> Add New Reminder). */
function sendGroceryListToReminders(itemNames: string[]) {
  const encoded = encodeURIComponent(itemNames.join("\n"));
  window.location.href = `shortcuts://run-shortcut?name=AddGroceryItem&input=${encoded}`;
}

export default function RecipesBoard() {
  const { tasks, moveTask } = useChoreTasks();
  const { items, addItems, toggleItem, removeItem, clearChecked } = useGroceryList();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState(SURPRISE_ME);

  const upcomingChores = getUpcomingTasks(tasks, 5);

  async function loadRecipes(cuisine: string) {
    setLoading(true);
    setError(null);
    try {
      const result =
        cuisine === SURPRISE_ME
          ? await fetchRandomRecipes(RECIPE_COUNT)
          : await fetchRecipesByCuisine(cuisine, RECIPE_COUNT);
      setRecipes(result);
    } catch {
      setError("Couldn't load recipes — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes(SURPRISE_ME);
  }, []);

  function handleSelectCuisine(cuisine: string) {
    setSelectedCuisine(cuisine);
    loadRecipes(cuisine);
  }

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.length - uncheckedCount;

  return (
    <>
      <div className="max-w-[620px] mb-8 sm:mb-10">
        <h1
          className="m-0 mb-3 text-[28px] sm:text-[38px] font-extrabold tracking-[-0.015em]"
          style={{ color: "var(--text-primary)" }}
        >
          Recipes &amp; Recommendations
        </h1>
        <p
          className="m-0 text-[14px] sm:text-[15.5px] leading-[1.6] font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Chores that need attention, recipe ideas to shuffle through, and a
          grocery list you can send straight to Apple Reminders.
        </p>
      </div>

      {/* Chore recommendations */}
      <section className="mb-8 sm:mb-10">
        <div className="flex items-center gap-2.5 mb-3 px-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: "var(--dot-todo)" }} />
          <h2
            className="text-[12.5px] font-extrabold tracking-[0.08em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Due &amp; Overdue Chores
          </h2>
        </div>

        {upcomingChores.length === 0 ? (
          <div
            className="rounded-[14px] border border-dashed py-8 px-3 text-center text-[13.5px] font-semibold"
            style={{ borderColor: "var(--dashed-border)", color: "var(--text-muted)" }}
          >
            Nothing due — you&apos;re all caught up.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {upcomingChores.map((task) => (
              <div
                key={task.id}
                className="rounded-[14px] border p-3.5 flex items-center justify-between gap-3"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <div className="min-w-0">
                  <p className="m-0 text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                    {task.title}
                  </p>
                  <p
                    className="m-0 text-[11.5px] font-semibold"
                    style={{
                      color: task.nextDueAt! < Date.now() ? "var(--done-forward-text)" : "var(--text-muted)",
                    }}
                  >
                    {formatDueDate(task.nextDueAt!)}
                  </p>
                </div>
                <button
                  onClick={() => moveTask(task.id, "todo")}
                  className="shrink-0 border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  To Do →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recipe ideas */}
      <section className="mb-8 sm:mb-10">
        <div className="flex items-center gap-2.5 mb-3 px-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: "var(--dot-done)" }} />
          <h2
            className="text-[12.5px] font-extrabold tracking-[0.08em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Recipe Ideas
          </h2>
          <button
            onClick={() => loadRecipes(selectedCuisine)}
            disabled={loading}
            className="ml-auto border-none rounded-full px-3 py-1 text-[11.5px] font-bold cursor-pointer disabled:opacity-50"
            style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
          >
            {loading ? "Shuffling…" : "🔀 Shuffle"}
          </button>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 px-2 -mx-2">
          <button
            onClick={() => handleSelectCuisine(SURPRISE_ME)}
            className="shrink-0 border-none rounded-full px-3 py-1.5 text-[11.5px] font-bold cursor-pointer whitespace-nowrap"
            style={
              selectedCuisine === SURPRISE_ME
                ? { background: "var(--accent)", color: "var(--accent-text)" }
                : { background: "var(--pill-bg)", color: "var(--pill-text)" }
            }
          >
            Surprise Me
          </button>
          {CUISINES.map((cuisine) => (
            <button
              key={cuisine}
              onClick={() => handleSelectCuisine(cuisine)}
              className="shrink-0 border-none rounded-full px-3 py-1.5 text-[11.5px] font-bold cursor-pointer whitespace-nowrap"
              style={
                selectedCuisine === cuisine
                  ? { background: "var(--accent)", color: "var(--accent-text)" }
                  : { background: "var(--pill-bg)", color: "var(--pill-text)" }
              }
            >
              {cuisine}
            </button>
          ))}
        </div>

        {error ? (
          <div
            className="rounded-[14px] border border-dashed py-8 px-3 text-center text-[13.5px] font-semibold"
            style={{ borderColor: "var(--dashed-border)", color: "var(--text-muted)" }}
          >
            {error}
          </div>
        ) : !loading && recipes.length === 0 ? (
          <div
            className="rounded-[14px] border border-dashed py-8 px-3 text-center text-[13.5px] font-semibold"
            style={{ borderColor: "var(--dashed-border)", color: "var(--text-muted)" }}
          >
            {selectedCuisine === SURPRISE_ME
              ? "No recipes found — try shuffling again."
              : `No ${selectedCuisine} recipes available right now — try another cuisine or Surprise Me.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(loading ? Array.from({ length: RECIPE_COUNT }) : recipes).map((recipe, idx) => {
              if (!recipe) {
                return (
                  <div
                    key={idx}
                    className="rounded-[14px] border h-[220px] animate-pulse"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  />
                );
              }
              const r = recipe as Recipe;
              const isExpanded = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className="rounded-[14px] border overflow-hidden flex flex-col"
                  style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumbnail} alt={r.name} className="w-full h-[140px] object-cover" />
                  <div className="p-3.5 flex flex-col flex-1">
                    <p className="m-0 mb-1 text-[14.5px] font-bold" style={{ color: "var(--text-primary)" }}>
                      {r.name}
                    </p>
                    <p className="m-0 mb-2.5 text-[11.5px] font-semibold" style={{ color: "var(--text-muted)" }}>
                      {r.category} · {r.area}
                    </p>

                    {isExpanded && (
                      <div className="mb-2.5 text-[12.5px] leading-[1.5]" style={{ color: "var(--text-secondary)" }}>
                        <p className="m-0 mb-1 font-bold uppercase text-[10.5px] tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>
                          Ingredients
                        </p>
                        <ul className="m-0 mb-3 pl-4 list-disc">
                          {r.ingredients.map((ing) => (
                            <li key={ing.name}>
                              {ing.measure} {ing.name}
                            </li>
                          ))}
                        </ul>
                        <p className="m-0 mb-1 font-bold uppercase text-[10.5px] tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>
                          How to Make It
                        </p>
                        <ol className="m-0 pl-4 list-decimal flex flex-col gap-1.5">
                          {r.instructions
                            .split(/\r?\n+/)
                            .map((step) => step.trim())
                            .filter(Boolean)
                            .map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                        </ol>
                      </div>
                    )}

                    <div className="mt-auto flex gap-1.5">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="flex-1 border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer"
                        style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
                      >
                        {isExpanded ? "Hide" : "How to Make"}
                      </button>
                      <button
                        onClick={() => addItems(r.ingredients.map((ing) => ing.name))}
                        className="flex-1 border-none rounded-lg px-3 py-2 text-[12px] font-bold cursor-pointer"
                        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                      >
                        + Grocery List
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Grocery list */}
      <section>
        <div className="flex items-center gap-2.5 mb-3 px-2">
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: "var(--dot-backlog)" }} />
          <h2
            className="text-[12.5px] font-extrabold tracking-[0.08em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Grocery List
          </h2>
          <span
            className="text-[11.5px] font-bold rounded-full px-[9px] py-0.5"
            style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
          >
            {items.length}
          </span>
        </div>

        <div
          className="rounded-[18px] border p-[18px]"
          style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
        >
          {items.length === 0 ? (
            <div
              className="rounded-[14px] border border-dashed py-8 px-3 text-center text-[13.5px] font-semibold"
              style={{ borderColor: "var(--dashed-border)", color: "var(--text-muted)" }}
            >
              Add ingredients from a recipe above to start a list.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[10px] border flex items-center gap-2.5 px-3 py-2"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      className="shrink-0 w-4 h-4 cursor-pointer"
                    />
                    <span
                      className="flex-1 text-[13.5px] font-medium"
                      style={{
                        color: item.checked ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: item.checked ? "line-through" : "none",
                      }}
                    >
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 bg-transparent border-none text-[12px] font-semibold cursor-pointer px-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearChecked}
                  disabled={checkedCount === 0}
                  className="border-none rounded-lg px-3.5 py-2.5 text-[12.5px] font-bold cursor-pointer disabled:opacity-40"
                  style={{ background: "var(--badge-bg)", color: "var(--text-secondary)" }}
                >
                  Clear Checked ({checkedCount})
                </button>
                <button
                  onClick={() =>
                    sendGroceryListToReminders(
                      items.filter((i) => !i.checked).map((i) => i.name)
                    )
                  }
                  disabled={uncheckedCount === 0}
                  className="flex-1 border-none rounded-lg px-3.5 py-2.5 text-[12.5px] font-bold cursor-pointer disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  🍎 Send List to Apple Reminders
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
