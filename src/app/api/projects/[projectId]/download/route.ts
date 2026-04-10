import JSZip from "jszip";
import { findProject } from "@/server/services/project-service";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const archive = new JSZip();

  project.files.forEach((file) => {
    archive.file(file.path, file.content);
  });

  const body = await archive.generateAsync({ type: "arraybuffer" });
  const downloadName = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generated-site"}.zip`;

  return new Response(body, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${downloadName}"`,
      "cache-control": "no-store",
    },
  });
}
