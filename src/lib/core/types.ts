export type ParsedLayout = {
  mode: "none" | "row" | "column";
  wrap: "nowrap" | "wrap";
  gap: number;
  padding: [number, number, number, number];
  primaryAxisAlign: "start" | "center" | "end" | "space-between";
  counterAxisAlign: "start" | "center" | "end" | "stretch";
  primaryAxisSizing: "fixed" | "auto";
  counterAxisSizing: "fixed" | "auto";
};

export type ParsedNode = {
  id: string;
  name: string;
  type: string;
  textContent: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
  textTransform: string | null;
  textDecoration: string | null;
  textAlign: string | null;
  textColor: string | null;
  cornerRadius: number | null;
  backgroundColor: string | null;
  borderColor: string | null;
  borderWidth: number | null;
  borderSides: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } | null;
  backgroundImageUrl: string | null;
  backgroundSize: "cover" | "contain" | "100% 100%" | null;
  assetUrl: string | null;
  assetFit: "cover" | "contain" | "fill" | null;
  opacity: number | null;
  layoutGrow: number;
  layoutAlign: "inherit" | "stretch" | "center" | "end" | "start" | null;
  layoutPositioning: "auto" | "absolute";
  layout: ParsedLayout;
  effectsCount: number;
  children: ParsedNode[];
};

export type TransformedNode = {
  id: string;
  name: string;
  type: string;
  tag: string;
  className: string;
  textContent: string;
  role: "layout" | "content" | "control";
  isComponentCandidate: boolean;
  styles: Record<string, string>;
  children: TransformedNode[];
};

export type GeneratedFontAsset = {
  family: string;
  importUrl: string;
};

export type GeneratedFile = {
  path: string;
  language: "tsx" | "ts" | "css" | "json" | "md";
  content: string;
};

export type GeneratedProjectArtifacts = {
  files: GeneratedFile[];
  previewHtml: string;
  summary: string;
  entryFilePath: string;
  generatedAt: string;
};
