import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const project = await createProject(name);
  return NextResponse.json({ project }, { status: 201 });
}
