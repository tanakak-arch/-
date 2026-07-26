"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDueDate } from "@/lib/dueDate";

type Assignee = "田中" | "乗松" | null;

type Project = {
  id: number;
  name: string;
  createdAt: string;
};

type Task = {
  id: number;
  projectId: number;
  name: string;
  dueDate: string | null;
  assignee: Assignee;
  notes: string | null;
  completed: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 10000;
const ASSIGNEES: Assignee[] = ["田中", "乗松"];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignee, setNewAssignee] = useState<Assignee>(null);
  const [editingNameId, setEditingNameId] = useState<number | null>(null);
  const [editingDueDateId, setEditingDueDateId] = useState<number | null>(null);
  const [openNotesId, setOpenNotesId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const projRes = await fetch("/api/projects", { cache: "no-store", signal: controller.signal });
        const projData = await projRes.json();
        setProjects(projData.projects);
        setProjectsLoaded(true);

        let activeId: number | null = selectedProjectId;
        if (activeId === null && projData.projects.length > 0) {
          activeId = projData.projects[0].id;
          setSelectedProjectId(activeId);
        }

        if (activeId) {
          const taskRes = await fetch(`/api/tasks?projectId=${activeId}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const taskData = await taskRes.json();
          setTasks(taskData.tasks);
        } else {
          setTasks([]);
        }
        setLoaded(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    window.addEventListener("focus", load);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, [selectedProjectId]);

  const patchTask = async (id: number, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !selectedProjectId) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
        name: newName.trim(),
        dueDate: newDueDate || null,
        assignee: newAssignee,
      }),
    });
    const data = await res.json();
    setTasks((prev) => [...prev, data.task]);
    setNewName("");
    setNewDueDate("");
    setNewAssignee(null);
  };

  const removeTask = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
  };

  const addProject = async (rawName: string) => {
    const name = rawName.trim();
    setIsAddingProject(false);
    if (!name) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setProjects((prev) => [...prev, data.project]);
    setSelectedProjectId(data.project.id);
  };

  const removeProject = async (project: Project) => {
    if (!window.confirm(`「${project.name}」を削除しますか？中のタスクもすべて削除されます。`)) {
      return;
    }
    const next = projects.filter((p) => p.id !== project.id);
    setProjects(next);
    if (selectedProjectId === project.id) {
      setSelectedProjectId(next[0]?.id ?? null);
    }
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className="min-h-screen bg-[#191919] text-zinc-100 font-sans flex">
      <aside className="w-56 shrink-0 border-r border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-zinc-500">プロジェクト</span>
          <button
            onClick={() => setIsAddingProject(true)}
            className="text-zinc-400 hover:text-zinc-100 text-sm leading-none w-5 h-5 flex items-center justify-center"
            aria-label="プロジェクトを追加"
          >
            +
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`group flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer ${
                project.id === selectedProjectId
                  ? "bg-[#2a2a2a] text-zinc-100"
                  : "text-zinc-400 hover:bg-[#202020]"
              }`}
            >
              <span className="truncate">{project.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(project);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 shrink-0 ml-2"
                aria-label="プロジェクトを削除"
              >
                ×
              </button>
            </div>
          ))}

          {isAddingProject && (
            <input
              autoFocus
              type="text"
              placeholder="プロジェクト名"
              onBlur={(e) => addProject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setIsAddingProject(false);
              }}
              className="rounded bg-[#2a2a2a] border border-zinc-600 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}

          {projectsLoaded && projects.length === 0 && !isAddingProject && (
            <p className="text-xs text-zinc-600 px-1 py-2">
              「+」からプロジェクトを追加してください
            </p>
          )}
        </div>
      </aside>

      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {!selectedProject ? (
            <p className="text-sm text-zinc-500">
              左のサイドバーからプロジェクトを選択、または新規作成してください。
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-semibold">{selectedProject.name}</h1>
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
                <select
                  value={newAssignee ?? ""}
                  onChange={(e) => setNewAssignee((e.target.value || null) as Assignee)}
                  className="rounded-md bg-[#2a2a2a] border border-zinc-700 px-2 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">担当者</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a ?? ""}>
                      {a}
                    </option>
                  ))}
                </select>
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
                <div className="grid grid-cols-[1fr_84px_96px_44px_28px] gap-2 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800 bg-[#202020]">
                  <span>名前</span>
                  <span>担当者</span>
                  <span>期日</span>
                  <span></span>
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
                  const isEditingName = editingNameId === task.id;
                  const isEditingDueDate = editingDueDateId === task.id;
                  const notesOpen = openNotesId === task.id;
                  const hasNotes = !!task.notes && task.notes.trim().length > 0;

                  return (
                    <div key={task.id} className="border-b border-zinc-800 last:border-b-0">
                      <div className="group grid grid-cols-[1fr_84px_96px_44px_28px] gap-2 items-center px-4 py-2.5 hover:bg-[#202020]">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => patchTask(task.id, { completed: !task.completed })}
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
                          {isEditingName ? (
                            <input
                              autoFocus
                              type="text"
                              defaultValue={task.name}
                              onBlur={(e) => {
                                const value = e.target.value.trim();
                                if (value) patchTask(task.id, { name: value });
                                setEditingNameId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                if (e.key === "Escape") setEditingNameId(null);
                              }}
                              className="min-w-0 flex-1 rounded bg-[#2a2a2a] border border-zinc-600 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingNameId(task.id)}
                              className={`truncate text-sm cursor-text ${
                                task.completed ? "line-through text-zinc-500" : "text-zinc-100"
                              }`}
                            >
                              {task.name}
                            </span>
                          )}
                        </div>

                        <select
                          value={task.assignee ?? ""}
                          onChange={(e) =>
                            patchTask(task.id, { assignee: (e.target.value || null) as Assignee })
                          }
                          className="rounded bg-transparent border border-transparent hover:border-zinc-700 px-1 py-1 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">未定</option>
                          {ASSIGNEES.map((a) => (
                            <option key={a} value={a ?? ""}>
                              {a}
                            </option>
                          ))}
                        </select>

                        {isEditingDueDate ? (
                          <input
                            autoFocus
                            type="date"
                            defaultValue={task.dueDate ?? ""}
                            onChange={(e) => {
                              patchTask(task.id, { dueDate: e.target.value || null });
                              setEditingDueDateId(null);
                            }}
                            onBlur={() => setEditingDueDateId(null)}
                            className="rounded bg-[#2a2a2a] border border-zinc-600 px-1 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingDueDateId(task.id)}
                            className={`text-sm cursor-pointer ${due.colorClass} ${!due.label && "text-zinc-600"}`}
                          >
                            {due.label || "設定"}
                          </span>
                        )}

                        <button
                          onClick={() => setOpenNotesId(notesOpen ? null : task.id)}
                          className={`text-xs rounded px-1.5 py-1 border ${
                            hasNotes
                              ? "border-zinc-500 text-zinc-200"
                              : "border-transparent text-zinc-600 opacity-0 group-hover:opacity-100"
                          } hover:border-zinc-400 hover:text-zinc-100 transition-opacity`}
                          aria-label="メモ"
                        >
                          メモ
                        </button>

                        <button
                          onClick={() => removeTask(task)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 text-sm transition-opacity"
                          aria-label="削除"
                        >
                          ×
                        </button>
                      </div>

                      {notesOpen && (
                        <div className="px-4 pb-3 pl-11">
                          <textarea
                            defaultValue={task.notes ?? ""}
                            placeholder="メモを入力"
                            rows={3}
                            onBlur={(e) => patchTask(task.id, { notes: e.target.value || null })}
                            className="w-full rounded-md bg-[#2a2a2a] border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
