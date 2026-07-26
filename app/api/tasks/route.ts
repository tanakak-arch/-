import { NextRequest, NextResponse } from "next/server";
import { Assignee, createTask, listTasks } from "@/lib/db";

const VALID_ASSIGNEES = ["田中", "乗松"];

function parseAssignee(value: unknown): Assignee {
  return typeof value === "string" && VALID_ASSIGNEES.includes(value)
    ? (value as Assignee)
    : null;
}

export async function GET() {
  const tasks = await listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
  const assignee = parseAssignee(body.assignee);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const task = await createTask(name, dueDate, assignee);
  return NextResponse.json({ task }, { status: 201 });
}
