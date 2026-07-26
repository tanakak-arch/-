import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const task = await updateTask(Number(id), {
    completed: typeof body.completed === "boolean" ? body.completed : undefined,
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
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
