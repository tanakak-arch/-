import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

export type Assignee = "田中" | "乗松" | null;

export type Task = {
  id: number;
  name: string;
  dueDate: string | null;
  assignee: Assignee;
  notes: string | null;
  completed: boolean;
  createdAt: string;
};

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!sql) return Promise.resolve();
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          due_date DATE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee TEXT`;
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT`;
    })();
  }
  return tableReady;
}

type Row = {
  id: number;
  name: string;
  due_date: string | Date | null;
  assignee: string | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
};

// PostgresのDATE型はドライバーによってDateオブジェクトで返ってくることがあるため、
// "YYYY-MM-DD" 形式の文字列に正規化する（フルのタイムスタンプ文字列で返っても先頭10文字でよい）。
function normalizeDate(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return value.slice(0, 10);
}

function toTask(row: Row): Task {
  return {
    id: row.id,
    name: row.name,
    dueDate: row.due_date ? normalizeDate(row.due_date) : null,
    assignee: (row.assignee as Assignee) ?? null,
    notes: row.notes ?? null,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

// DATABASE_URL が未設定のローカル開発時は、.data/tasks.local.json への永続化で代用する
// （メモリ配列だとNext.jsの再コンパイルでモジュールが再読込され消えてしまうため）。
// Vercel Postgres 接続後は自動的に本物のDBへ切り替わる。
const LOCAL_DB_PATH = path.join(process.cwd(), ".data", "tasks.local.json");

type LocalState = { nextId: number; tasks: Task[] };

function readLocalState(): LocalState {
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    const state = JSON.parse(raw) as LocalState;
    state.tasks.forEach((t) => {
      if (t.assignee === undefined) t.assignee = null;
      if (t.notes === undefined) t.notes = null;
    });
    return state;
  } catch {
    return { nextId: 1, tasks: [] };
  }
}

function writeLocalState(state: LocalState): void {
  fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(state, null, 2));
}

export async function listTasks(): Promise<Task[]> {
  if (!sql) {
    return readLocalState().tasks;
  }
  await ensureTable();
  const rows = (await sql`SELECT * FROM tasks ORDER BY created_at ASC`) as Row[];
  return rows.map(toTask);
}

export async function createTask(
  name: string,
  dueDate: string | null,
  assignee: Assignee
): Promise<Task> {
  if (!sql) {
    const state = readLocalState();
    const task: Task = {
      id: state.nextId++,
      name,
      dueDate,
      assignee,
      notes: null,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    state.tasks.push(task);
    writeLocalState(state);
    return task;
  }
  await ensureTable();
  const rows = (await sql`
    INSERT INTO tasks (name, due_date, assignee, completed)
    VALUES (${name}, ${dueDate}, ${assignee}, false)
    RETURNING *
  `) as Row[];
  return toTask(rows[0]);
}

export type TaskUpdates = {
  completed?: boolean;
  name?: string;
  dueDate?: string | null;
  assignee?: Assignee;
  notes?: string | null;
};

export async function updateTask(id: number, updates: TaskUpdates): Promise<Task | null> {
  if (!sql) {
    const state = readLocalState();
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return null;
    if (updates.completed !== undefined) task.completed = updates.completed;
    if (updates.name !== undefined) task.name = updates.name;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.assignee !== undefined) task.assignee = updates.assignee;
    if (updates.notes !== undefined) task.notes = updates.notes;
    writeLocalState(state);
    return task;
  }
  await ensureTable();
  const rows = (await sql`
    UPDATE tasks SET
      completed = COALESCE(${updates.completed ?? null}, completed),
      name = COALESCE(${updates.name ?? null}, name),
      due_date = CASE WHEN ${updates.dueDate !== undefined} THEN ${updates.dueDate ?? null} ELSE due_date END,
      assignee = CASE WHEN ${updates.assignee !== undefined} THEN ${updates.assignee ?? null} ELSE assignee END,
      notes = CASE WHEN ${updates.notes !== undefined} THEN ${updates.notes ?? null} ELSE notes END
    WHERE id = ${id}
    RETURNING *
  `) as Row[];
  return rows[0] ? toTask(rows[0]) : null;
}

export async function deleteTask(id: number): Promise<void> {
  if (!sql) {
    const state = readLocalState();
    state.tasks = state.tasks.filter((t) => t.id !== id);
    writeLocalState(state);
    return;
  }
  await ensureTable();
  await sql`DELETE FROM tasks WHERE id = ${id}`;
}
