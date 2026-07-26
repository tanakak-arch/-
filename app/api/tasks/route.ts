import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/db";

export async function GET() {
  const tasks = await listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const task = await createTask(name, dueDate);
  return NextResponse.json({ task }, { status: 201 });
}
