const WEEKDAYS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDueDate(dueDate: string): Date {
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 現在の期日より後で、指定した曜日(0=日〜6=土)に最初に該当する日付を返す
export function nextOccurrence(currentDueDate: string, weekdays: number[]): string {
  const base = parseDueDate(currentDueDate);
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    if (weekdays.includes(candidate.getDay())) {
      return formatDate(candidate);
    }
  }
  return currentDueDate;
}

export type DueDateInfo = {
  label: string;
  colorClass: string;
};

export function formatDueDate(dueDate: string | null, completed: boolean): DueDateInfo {
  if (!dueDate) {
    return { label: "", colorClass: "text-zinc-500" };
  }

  const today = startOfDay(new Date());
  const target = startOfDay(parseDueDate(dueDate));
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (!completed && diffDays < 0) {
    return { label: `${target.getMonth() + 1}月${target.getDate()}日`, colorClass: "text-red-400" };
  }
  if (diffDays === 0) {
    return { label: "今日", colorClass: "text-emerald-400" };
  }
  if (diffDays === 1) {
    return { label: "明日", colorClass: "text-emerald-400" };
  }
  if (diffDays > 1 && diffDays < 7) {
    return { label: WEEKDAYS[target.getDay()], colorClass: "text-zinc-200" };
  }
  return {
    label: `${target.getMonth() + 1}月${target.getDate()}日`,
    colorClass: "text-zinc-200",
  };
}
