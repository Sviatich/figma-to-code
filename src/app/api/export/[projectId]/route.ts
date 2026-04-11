import { buildProjectArchive } from "@/lib/core/exporter";
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
    return new Response("Project not found", { status: 404 });
  }

  const body = await buildProjectArchive(project.files);
  const downloadName = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generated-project"}.zip`;

  return new Response(body, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${downloadName}"`,
      "cache-control": "no-store",
    },
  });
}
