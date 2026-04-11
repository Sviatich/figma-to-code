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
  scaleMode?: "FILL" | "FIT" | "TILE" | "STRETCH";
};

export type FigmaRawNode = {
  id?: string;
  name?: string;
  type?: string;
  visible?: boolean;
  characters?: string;
  children?: FigmaRawNode[];
  fills?: FigmaRawFill[];
  strokes?: FigmaRawFill[];
  strokeWeight?: number;
  individualStrokeWeights?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  backgroundColor?: FigmaRawColor;
  absoluteBoundingBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  opacity?: number;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  layoutWrap?: "NO_WRAP" | "WRAP";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  itemSpacing?: number;
  layoutGrow?: number;
  layoutAlign?: string;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
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
