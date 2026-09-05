"use client";

import { useEffect, useRef, useState } from "react";

export type GroceryItem = {
  id: string;
  name: string;
  checked: boolean;
};

const STORAGE_KEY = "chore-kanban-grocery-list";

function loadItems(): GroceryItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useGroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const hasHydrated = useRef(false);

  useEffect(() => {
    setItems(loadItems());
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Merges by name (case-insensitive) instead of duplicating an ingredient
  // that's already on the list from a different recipe.
  function addItems(names: string[]) {
    setItems((prev) => {
      const existing = new Set(prev.map((i) => i.name.toLowerCase()));
      const additions = names
        .filter((name) => name.trim())
        .filter((name) => !existing.has(name.toLowerCase()))
        .filter((name, idx, arr) => arr.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === idx)
        .map((name) => ({ id: crypto.randomUUID(), name: name.trim(), checked: false }));
      return [...prev, ...additions];
    });
  }

  function toggleItem(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked));
  }

  return { items, addItems, toggleItem, removeItem, clearChecked };
}
