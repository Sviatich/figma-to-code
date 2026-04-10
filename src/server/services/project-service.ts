import { randomUUID } from "node:crypto";
import type { CreateProjectInput, ProjectRecord } from "@/shared/schemas/project";
import { getProject, listProjects, saveProject } from "../store/project-store";
import { fetchFigmaNode } from "./figma";
import { generateProjectArtifacts } from "./generator";

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const source = await fetchFigmaNode({
    accessToken: input.accessToken || process.env.FIGMA_ACCESS_TOKEN,
    figmaFileKey: input.figmaFileKey,
    nodeId: input.nodeId,
  });

  const projectName = input.name?.trim() || source.nodeName || "Untitled Project";
  const generated = generateProjectArtifacts({
    name: projectName,
    figmaFileKey: input.figmaFileKey,
    nodeId: input.nodeId,
    source,
  });

  return saveProject({
    id: randomUUID(),
    name: projectName,
    status: "ready",
    createdAt: new Date().toISOString(),
    figmaFileKey: input.figmaFileKey,
    nodeId: input.nodeId,
    summary: generated.summary,
    previewHtml: generated.previewHtml,
    files: generated.files,
    source,
  });
}

export function findProject(projectId: string) {
  return getProject(projectId);
}

export function findProjects() {
  return listProjects();
}
