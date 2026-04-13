import { randomUUID } from "node:crypto";
import { resolveFigmaFile } from "@/lib/figma/client";
import { collectFrameOptions } from "@/lib/figma/mapper";
import type { FigmaSourceInput } from "@/lib/figma/types";
import { runTransformationPipeline } from "@/lib/core/pipeline";
import type { ProjectRecord, TransformProjectRequest } from "./schema";
import { getProject, listProjects, saveProject } from "./store";

export async function loadFigmaFrames(source: FigmaSourceInput) {
  const file = await resolveFigmaFile(source);
  return {
    fileKey: file.fileKey,
    fileName: file.fileName,
    mode: file.mode,
    suggestedNodeId: file.suggestedNodeId,
    frames: collectFrameOptions(file.document),
  };
}

export async function createProject(request: TransformProjectRequest): Promise<ProjectRecord> {
  const pipeline = await runTransformationPipeline({
    source: request.source,
    selectedNodeId: request.selectedNodeId,
  });

  const now = new Date().toISOString();

  return saveProject({
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: pipeline.resolvedFile.fileName,
    status: "ready",
    sourceMode: "live",
    fileKey: pipeline.resolvedFile.fileKey,
    fileName: pipeline.resolvedFile.fileName,
    selectedNodeId: request.selectedNodeId,
    selectedNodeName: pipeline.transformedNode.name,
    summary: pipeline.generatedArtifacts.summary,
    previewHtml: pipeline.generatedArtifacts.previewHtml,
    generatedAt: pipeline.generatedArtifacts.generatedAt,
    entryFilePath: pipeline.generatedArtifacts.entryFilePath,
    files: pipeline.generatedArtifacts.files,
    availableFrames: collectFrameOptions(pipeline.resolvedFile.document),
  });
}

export async function findProject(projectId: string) {
  return getProject(projectId);
}

export async function findProjects() {
  return listProjects();
}
