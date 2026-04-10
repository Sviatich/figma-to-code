type FigmaNodeDocument = {
  id?: string;
  name?: string;
  type?: string;
  children?: FigmaNodeDocument[];
};

type FigmaNodeResponse = {
  name?: string;
  nodes?: Record<
    string,
    | {
        document?: FigmaNodeDocument;
      }
    | null
  >;
};

export type FigmaSourceSnapshot = {
  mode: "live" | "mock";
  fileName: string;
  nodeName: string;
  nodeType: string;
  raw: unknown;
};

type FetchFigmaNodeParams = {
  accessToken?: string;
  figmaFileKey: string;
  nodeId: string;
};

export async function fetchFigmaNode({
  accessToken,
  figmaFileKey,
  nodeId,
}: FetchFigmaNodeParams): Promise<FigmaSourceSnapshot> {
  if (!accessToken) {
    return buildMockSnapshot(figmaFileKey, nodeId);
  }

  const url = new URL(`https://api.figma.com/v1/files/${figmaFileKey}/nodes`);
  url.searchParams.set("ids", nodeId);
  url.searchParams.set("depth", "2");

  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": accessToken,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as FigmaNodeResponse;
  const entry = payload.nodes?.[nodeId];
  const document = entry?.document;

  if (!document) {
    throw new Error("Figma node not found in API response");
  }

  return {
    mode: "live",
    fileName: payload.name ?? "Untitled Figma File",
    nodeName: document.name ?? "Unnamed node",
    nodeType: document.type ?? "UNKNOWN",
    raw: payload,
  };
}

function buildMockSnapshot(figmaFileKey: string, nodeId: string): FigmaSourceSnapshot {
  return {
    mode: "mock",
    fileName: `Demo file ${figmaFileKey}`,
    nodeName: `Imported node ${nodeId}`,
    nodeType: "FRAME",
    raw: {
      name: `Demo file ${figmaFileKey}`,
      nodes: {
        [nodeId]: {
          document: {
            id: nodeId,
            name: `Imported node ${nodeId}`,
            type: "FRAME",
            children: [
              { id: "hero", name: "Hero section", type: "FRAME" },
              { id: "cta", name: "CTA", type: "TEXT" },
            ],
          },
        },
      },
    },
  };
}
