const WEEKDAYS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDueDate(dueDate: string): Date {
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d);
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
