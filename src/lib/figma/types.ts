export type FigmaSourceInput = {
  kind: "figma-link";
  url: string;
  accessToken?: string;
};

export type FigmaRawColor = {
  r?: number;
  g?: number;
  b?: number;
  a?: number;
};

export type FigmaRawFill = {
  type?: string;
  visible?: boolean;
  color?: FigmaRawColor;
  opacity?: number;
  imageRef?: string;
};

export type FigmaRawNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  children?: FigmaRawNode[];
  fills?: FigmaRawFill[];
  backgroundColor?: FigmaRawColor;
  absoluteBoundingBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  opacity?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  cornerRadius?: number;
  effects?: unknown[];
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
    textCase?: string;
    textDecoration?: string;
  };
};

export type FigmaAssetUrls = {
  imageFills: Record<string, string>;
  renderedNodes: Record<string, string>;
};

export type FigmaRawFile = {
  name?: string;
  document?: FigmaRawNode;
};

export type FigmaFrameOption = {
  id: string;
  name: string;
  type: string;
  depth: number;
};

export type FigmaResolvedFile = {
  fileKey: string;
  fileName: string;
  mode: "live";
  suggestedNodeId?: string;
  document: FigmaRawNode;
  raw: unknown;
  accessToken?: string;
};
