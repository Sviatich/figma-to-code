import { findProject } from "@/lib/projects/service";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = await findProject(projectId);

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const url = new URL(request.url);
  const layout = url.searchParams.get("layout");
  const previewHtml =
    layout === "full-width"
      ? injectFullWidthPreviewOverride(project.previewHtml, project.selectedNodeWidth ?? null)
      : project.previewHtml;

  return new Response(previewHtml, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function injectFullWidthPreviewOverride(html: string, frameWidth: number | null) {
  const processedHtml = frameWidth ? replaceFrameWidthCssValues(html, frameWidth) : html;
  const override = `
    <style>
      html,
      body {
        width: 100%;
        max-width: none;
        overflow-x: auto;
      }

      body > *:first-child {
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
    </style>
  `;

  if (processedHtml.includes("</head>")) {
    return processedHtml.replace("</head>", `${override}\n  </head>`);
  }

  return `${override}\n${processedHtml}`;
}

function replaceFrameWidthCssValues(html: string, frameWidth: number) {
  const roundedFrameWidth = Math.round(frameWidth);
  const frameWidthToken = `${roundedFrameWidth}px`;

  return html.replace(/<style>([\s\S]*?)<\/style>/, (_match, css: string) => {
    let nextCss = css;

    nextCss = nextCss.replaceAll(`width: ${frameWidthToken};`, "width: 100%;");
    nextCss = nextCss.replaceAll(`max-width: ${frameWidthToken};`, "max-width: none;");
    nextCss = nextCss.replaceAll(`min-width: ${frameWidthToken};`, "min-width: 0;");
    nextCss = nextCss.replaceAll(`width: min(100%, ${frameWidthToken});`, "width: 100%;");
    nextCss = nextCss.replaceAll(`width: min(100%, ${frameWidthToken})`, "width: 100%");

    return `<style>${nextCss}</style>`;
  });
}
