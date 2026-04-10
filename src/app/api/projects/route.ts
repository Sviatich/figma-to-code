import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProjectSchema } from "@/shared/schemas/project";
import { createProject, findProjects } from "@/server/services/project-service";

export async function GET() {
  return NextResponse.json({ items: findProjects() });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = createProjectSchema.parse(json);
    const project = await createProject(input);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Validation failed",
          fieldErrors: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
