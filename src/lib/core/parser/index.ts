import type { FigmaAssetUrls, FigmaRawColor, FigmaRawNode } from "@/lib/figma/types";
import type { ParsedNode } from "../types";

export function parseFigmaNode(
  node: FigmaRawNode,
  assetUrls?: FigmaAssetUrls,
  parentOrigin?: {
    x: number;
    y: number;
  },
): ParsedNode | null {
  // Parser переводит сырой узел Figma в компактную внутреннюю модель.
  if (node.visible === false) {
    return null;
  }

  const absoluteX = node.absoluteBoundingBox?.x ?? null;
  const absoluteY = node.absoluteBoundingBox?.y ?? null;
  const relativeX = absoluteX !== null ? absoluteX - (parentOrigin?.x ?? absoluteX) : null;
  const relativeY = absoluteY !== null ? absoluteY - (parentOrigin?.y ?? absoluteY) : null;

  const parsedChildren =
    node.children
      ?.map((child) =>
        parseFigmaNode(child, assetUrls, {
          x: absoluteX ?? 0,
          y: absoluteY ?? 0,
        }),
      )
      .filter((child): child is ParsedNode => child !== null) ?? [];

  return {
    id: node.id ?? crypto.randomUUID(),
    name: node.name ?? "Без названия",
    type: node.type ?? "UNKNOWN",
    textContent: node.characters ?? "",
    x: relativeX,
    y: relativeY,
    width: node.absoluteBoundingBox?.width ?? null,
    height: node.absoluteBoundingBox?.height ?? null,
    fontFamily: node.style?.fontFamily ?? null,
    fontSize: node.style?.fontSize ?? null,
    fontWeight: node.style?.fontWeight ?? null,
    lineHeight: node.style?.lineHeightPx ?? null,
    letterSpacing: node.style?.letterSpacing ?? null,
    textTransform: mapTextCase(node.style?.textCase),
    textDecoration: mapTextDecoration(node.style?.textDecoration),
    textAlign: mapTextAlign(node.style?.textAlignHorizontal),
    textColor: extractTextColor(node),
    cornerRadius: node.cornerRadius ?? null,
    backgroundColor: extractBackgroundColor(node),
    borderColor: extractBorderColor(node),
    borderWidth: node.strokeWeight ?? null,
    borderSides: extractBorderSides(node),
    backgroundImageUrl: extractBackgroundImageUrl(node, assetUrls),
    backgroundSize: extractBackgroundSize(node),
    assetUrl: extractAssetUrl(node, assetUrls),
    opacity: node.opacity ?? null,
    layoutGrow: node.layoutGrow ?? 0,
    layoutAlign: mapLayoutAlign(node.layoutAlign),
    layoutPositioning: mapLayoutPositioning(node.layoutPositioning),
    layout: {
      mode: mapLayoutMode(node.layoutMode),
      wrap: mapLayoutWrap(node.layoutWrap),
      gap: node.itemSpacing ?? 0,
      padding: [node.paddingTop ?? 0, node.paddingRight ?? 0, node.paddingBottom ?? 0, node.paddingLeft ?? 0],
      primaryAxisAlign: mapPrimaryAxisAlign(node.primaryAxisAlignItems),
      counterAxisAlign: mapCounterAxisAlign(node.counterAxisAlignItems),
      primaryAxisSizing: mapSizingMode(node.primaryAxisSizingMode),
      counterAxisSizing: mapSizingMode(node.counterAxisSizingMode),
    },
    effectsCount: node.effects?.length ?? 0,
    children: parsedChildren,
  };
}

function mapLayoutMode(value: FigmaRawNode["layoutMode"]): ParsedNode["layout"]["mode"] {
  if (value === "HORIZONTAL") {
    return "row";
  }

  if (value === "VERTICAL") {
    return "column";
  }

  return "none";
}

function mapLayoutWrap(value: FigmaRawNode["layoutWrap"]): ParsedNode["layout"]["wrap"] {
  return value === "WRAP" ? "wrap" : "nowrap";
}

function mapPrimaryAxisAlign(value?: string | null): ParsedNode["layout"]["primaryAxisAlign"] {
  switch (value) {
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "SPACE_BETWEEN":
      return "space-between";
    default:
      return "start";
  }
}

function mapCounterAxisAlign(value?: string | null): ParsedNode["layout"]["counterAxisAlign"] {
  switch (value) {
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "STRETCH":
    case "BASELINE":
      return "stretch";
    default:
      return "start";
  }
}

function mapSizingMode(value?: "FIXED" | "AUTO" | null): ParsedNode["layout"]["primaryAxisSizing"] {
  return value === "AUTO" ? "auto" : "fixed";
}

function mapLayoutAlign(value?: string | null): ParsedNode["layoutAlign"] {
  switch (value) {
    case "MIN":
      return "start";
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "STRETCH":
      return "stretch";
    case "INHERIT":
      return "inherit";
    default:
      return null;
  }
}

function mapLayoutPositioning(value?: "AUTO" | "ABSOLUTE" | null): ParsedNode["layoutPositioning"] {
  return value === "ABSOLUTE" ? "absolute" : "auto";
}

function extractBackgroundColor(node: FigmaRawNode) {
  if (node.type === "TEXT") {
    return null;
  }

  const fill = node.fills?.find((item) => item.type === "SOLID" && item.visible !== false);
  const fillColor = fill?.color ?? node.backgroundColor;

  return fillColor ? toCssColor(fillColor, fill?.opacity) : null;
}

function extractTextColor(node: FigmaRawNode) {
  const fillColor = node.fills?.find((fill) => fill.type === "SOLID" && fill.visible !== false)?.color;
  return fillColor ? toCssColor(fillColor) : null;
}

function extractBorderColor(node: FigmaRawNode) {
  const stroke = node.strokes?.find((item) => item.type === "SOLID" && item.visible !== false);
  return stroke?.color ? toCssColor(stroke.color, stroke.opacity) : null;
}

function extractBorderSides(node: FigmaRawNode): ParsedNode["borderSides"] {
  const weights = node.individualStrokeWeights;

  if (!weights) {
    return null;
  }

  return {
    top: weights.top ?? 0,
    right: weights.right ?? 0,
    bottom: weights.bottom ?? 0,
    left: weights.left ?? 0,
  };
}

function extractAssetUrl(node: FigmaRawNode, assetUrls?: FigmaAssetUrls) {
  const imageRef = node.fills?.find((fill) => fill.type === "IMAGE" && fill.imageRef)?.imageRef;

  if (imageRef && assetUrls?.imageFills[imageRef]) {
    return assetUrls.imageFills[imageRef];
  }

  if (node.id && assetUrls?.renderedNodes[node.id]) {
    return assetUrls.renderedNodes[node.id];
  }

  return null;
}

function extractBackgroundImageUrl(node: FigmaRawNode, assetUrls?: FigmaAssetUrls) {
  const imageRef = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false && fill.imageRef)?.imageRef;

  if (!imageRef) {
    return null;
  }

  return assetUrls?.imageFills[imageRef] ?? null;
}

function extractBackgroundSize(node: FigmaRawNode): ParsedNode["backgroundSize"] {
  const imageFill = node.fills?.find((fill) => fill.type === "IMAGE" && fill.visible !== false);

  switch (imageFill?.scaleMode) {
    case "FIT":
      return "contain";
    case "STRETCH":
      return "100% 100%";
    case "FILL":
    default:
      return imageFill ? "cover" : null;
  }
}

function toCssColor(color: FigmaRawColor, opacityMultiplier = 1) {
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = (color.a ?? 1) * opacityMultiplier;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mapTextCase(value?: string | null) {
  switch (value) {
    case "UPPER":
      return "uppercase";
    case "LOWER":
      return "lowercase";
    case "TITLE":
      return "capitalize";
    case "SMALL_CAPS":
    case "SMALL_CAPS_FORCED":
      return "small-caps";
    default:
      return null;
  }
}

function mapTextDecoration(value?: string | null) {
  switch (value) {
    case "UNDERLINE":
      return "underline";
    case "STRIKETHROUGH":
      return "line-through";
    default:
      return null;
  }
}

function mapTextAlign(value?: string | null) {
  switch (value) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFIED":
      return "justify";
    default:
      return null;
  }
}
