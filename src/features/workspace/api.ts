import {
  createProjectSchema,
  projectSchema,
  type CreateProjectInput,
  type ProjectRecord,
} from "@/shared/schemas/project";
import { z } from "zod";

const projectListSchema = z.object({
  items: z.array(projectSchema),
});

export async function createProjectRequest(input: CreateProjectInput): Promise<ProjectRecord> {
  const validatedInput = createProjectSchema.parse(input);
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(validatedInput),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Failed to create project");
  }

  return projectSchema.parse(payload);
}

export async function getProjectsRequest(): Promise<ProjectRecord[]> {
  const response = await fetch("/api/projects", { cache: "no-store" });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Failed to load projects");
  }

  return projectListSchema.parse(payload).items;
}
