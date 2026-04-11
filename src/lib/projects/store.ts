import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectRecord } from "./schema";

const dataDirectory = path.join(process.cwd(), ".transfig-data", "projects");

async function ensureDataDirectory() {
  await mkdir(dataDirectory, { recursive: true });
}

function getProjectFilePath(projectId: string) {
  return path.join(dataDirectory, `${projectId}.json`);
}

export async function saveProject(project: ProjectRecord) {
  await ensureDataDirectory();
  await writeFile(getProjectFilePath(project.id), JSON.stringify(project, null, 2), "utf8");
  return project;
}

export async function getProject(projectId: string) {
  try {
    await ensureDataDirectory();
    const raw = await readFile(getProjectFilePath(projectId), "utf8");
    return JSON.parse(raw) as ProjectRecord;
  } catch {
    return undefined;
  }
}

export async function listProjects() {
  await ensureDataDirectory();
  const entries = await readdir(dataDirectory, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const raw = await readFile(path.join(dataDirectory, entry.name), "utf8");
        return JSON.parse(raw) as ProjectRecord;
      }),
  );

  return projects.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
