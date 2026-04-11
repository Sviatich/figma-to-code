import { NextResponse } from "next/server";
import { findProject } from "@/lib/projects/service";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = await findProject(projectId);

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
