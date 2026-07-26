import { NextRequest, NextResponse } from "next/server";
import { Assignee, createTask, listTasks } from "@/lib/db";

const VALID_ASSIGNEES = ["田中", "乗松"];

function parseAssignee(value: unknown): Assignee {
  return typeof value === "string" && VALID_ASSIGNEES.includes(value)
    ? (value as Assignee)
    : null;
}

export async function GET(request: NextRequest) {
  const projectId = Number(request.nextUrl.searchParams.get("projectId"));
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const tasks = await listTasks(projectId);
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = Number(body.projectId);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
  const assignee = parseAssignee(body.assignee);

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const task = await createTask(projectId, name, dueDate, assignee);
  return NextResponse.json({ task }, { status: 201 });
}
