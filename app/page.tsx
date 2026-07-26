"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDueDate } from "@/lib/dueDate";

type Task = {
  id: number;
  name: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 10000;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const res = await fetch("/api/tasks", { cache: "no-store", signal: controller.signal });
      const data = await res.json();
      setTasks(data.tasks);
      setLoaded(true);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    window.addEventListener("focus", load);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), dueDate: newDueDate || null }),
    });
    const data = await res.json();
    setTasks((prev) => [...prev, data.task]);
    setNewName("");
    setNewDueDate("");
  };

  const toggleCompleted = async (task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
  };

  const removeTask = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
  };

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [tasks, search]);

  return (
    <div className="min-h-screen bg-[#191919] text-zinc-100 font-sans">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">タスクリスト</h1>
          <input
            type="text"
            placeholder="検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md bg-[#2a2a2a] border border-zinc-700 px-3 py-1.5 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <form onSubmit={addTask} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="タスクを追加"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-md bg-[#2a2a2a] border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="rounded-md bg-[#2a2a2a] border border-zinc-700 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            + タスクを追加
          </button>
        </form>

        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800 bg-[#202020]">
            <span>名前</span>
            <span>期日</span>
            <span></span>
          </div>

          {!loaded && (
            <div className="px-4 py-6 text-sm text-zinc-500">読み込み中...</div>
          )}

          {loaded && visibleTasks.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-500">タスクがありません</div>
          )}

          {visibleTasks.map((task) => {
            const due = formatDueDate(task.dueDate, task.completed);
            return (
              <div
                key={task.id}
                className="group grid grid-cols-[1fr_120px_32px] gap-2 items-center px-4 py-2.5 border-b border-zinc-800 last:border-b-0 hover:bg-[#202020]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleCompleted(task)}
                    className={`shrink-0 h-4 w-4 rounded-full border flex items-center justify-center ${
                      task.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-zinc-600"
                    }`}
                    aria-label="完了トグル"
                  >
                    {task.completed && (
                      <span className="text-[10px] leading-none text-[#191919]">✓</span>
                    )}
                  </button>
                  <span
                    className={`truncate text-sm ${
                      task.completed ? "line-through text-zinc-500" : "text-zinc-100"
                    }`}
                  >
                    {task.name}
                  </span>
                </div>
                <span className={`text-sm ${due.colorClass}`}>{due.label}</span>
                <button
                  onClick={() => removeTask(task)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-sm transition-opacity"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
