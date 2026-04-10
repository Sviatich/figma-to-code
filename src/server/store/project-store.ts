import type { ProjectRecord } from "@/shared/schemas/project";

declare global {
  var __transfigStore__: Map<string, ProjectRecord> | undefined;
}

const projectStore = globalThis.__transfigStore__ ?? new Map<string, ProjectRecord>();

if (!globalThis.__transfigStore__) {
  globalThis.__transfigStore__ = projectStore;
}

export function saveProject(project: ProjectRecord) {
  projectStore.set(project.id, project);
  return project;
}

export function getProject(projectId: string) {
  return projectStore.get(projectId);
}

export function listProjects() {
  return Array.from(projectStore.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
