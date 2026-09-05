"use client";

import { useState } from "react";
import { useTheme } from "./hooks/useTheme";
import ChoresBoard from "./components/ChoresBoard";
import RecipesBoard from "./components/RecipesBoard";

type TopTab = "chores" | "recipes";

const TOP_TABS: { id: TopTab; label: string }[] = [
  { id: "chores", label: "Chores" },
  { id: "recipes", label: "Recipes & Recommendations" },
];

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [topTab, setTopTab] = useState<TopTab>("chores");

  return (
    <main
      className="min-h-screen relative transition-colors duration-200"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-[72px] pt-8 sm:pt-16 pb-24 sm:pb-24">
        <div className="flex items-center justify-between gap-4 mb-8 sm:mb-10">
          <div
            className="flex gap-0.5 rounded-[10px] p-[3px]"
            style={{ background: "var(--toggle-track)" }}
          >
            {TOP_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTopTab(tab.id)}
                className="border-none rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  background: topTab === tab.id ? "var(--accent)" : "transparent",
                  color: topTab === tab.id ? "var(--accent-text)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="flex gap-0.5 rounded-[10px] p-[3px] shrink-0"
            style={{ background: "var(--toggle-track)" }}
          >
            <button
              onClick={() => setTheme("light")}
              className="border-none rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold cursor-pointer transition-colors"
              style={{
                background: theme === "light" ? "var(--light-btn-bg)" : "transparent",
                color: theme === "light" ? "var(--light-btn-text)" : "var(--text-secondary)",
              }}
            >
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className="border-none rounded-lg px-3.5 py-1.5 text-[12.5px] font-bold cursor-pointer transition-colors"
              style={{
                background: theme === "dark" ? "var(--dark-btn-bg)" : "transparent",
                color: theme === "dark" ? "var(--dark-btn-text)" : "var(--text-secondary)",
              }}
            >
              Dark
            </button>
          </div>
        </div>

        {topTab === "chores" ? <ChoresBoard /> : <RecipesBoard />}
      </div>
    </main>
  );
}
