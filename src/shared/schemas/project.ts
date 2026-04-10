import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Введите название проекта").max(80).optional().or(z.literal("")),
  figmaFileKey: z.string().trim().min(1, "Укажи file key"),
  nodeId: z.string().trim().min(1, "Укажи node id"),
  accessToken: z.string().trim().optional().or(z.literal("")),
});

export const generatedFileSchema = z.object({
  path: z.string(),
  language: z.enum(["tsx", "ts", "css", "json", "html", "md"]),
  content: z.string(),
});

export const sourceSnapshotSchema = z.object({
  mode: z.enum(["live", "mock"]),
  fileName: z.string(),
  nodeName: z.string(),
  nodeType: z.string(),
  raw: z.unknown(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ready"]),
  createdAt: z.string(),
  figmaFileKey: z.string(),
  nodeId: z.string(),
  summary: z.string(),
  previewHtml: z.string(),
  files: z.array(generatedFileSchema),
  source: sourceSnapshotSchema,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type GeneratedFile = z.infer<typeof generatedFileSchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
