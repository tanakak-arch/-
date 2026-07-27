import { NextRequest, NextResponse } from "next/server";
import { Assignee, deleteTask, updateTask } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const VALID_ASSIGNEES = ["田中", "乗松"];

function parseAssignee(value: unknown): Assignee | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" && VALID_ASSIGNEES.includes(value)
    ? (value as Assignee)
    : null;
}

function parseRecurWeekdays(value: unknown): number[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const weekdays = value.filter(
    (v): v is number => typeof v === "number" && v >= 0 && v <= 6
  );
  return weekdays.length > 0 ? weekdays : null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const task = await updateTask(Number(id), {
    completed: typeof body.completed === "boolean" ? body.completed : undefined,
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
    assignee: parseAssignee(body.assignee),
    notes: typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
    recurWeekdays: parseRecurWeekdays(body.recurWeekdays),
  });

  if (!task) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteTask(Number(id));
  return NextResponse.json({ ok: true });
}
