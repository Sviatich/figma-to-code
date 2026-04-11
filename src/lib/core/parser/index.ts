import type { FigmaAssetUrls, FigmaRawColor, FigmaRawNode } from "@/lib/figma/types";
import type { ParsedNode } from "../types";

export function parseFigmaNode(
  node: FigmaRawNode,
  assetUrls?: FigmaAssetUrls,
  parentOrigin?: {
    x: number;
    y: number;
  },
): ParsedNode {
  // Parser переводит сырой узел Figma в компактную внутреннюю модель.
  const absoluteX = node.absoluteBoundingBox?.x ?? null;
  const absoluteY = node.absoluteBoundingBox?.y ?? null;
  const relativeX = absoluteX !== null ? absoluteX - (parentOrigin?.x ?? absoluteX) : null;
  const relativeY = absoluteY !== null ? absoluteY - (parentOrigin?.y ?? absoluteY) : null;

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
    assetUrl: extractAssetUrl(node, assetUrls),
    opacity: node.opacity ?? null,
    layout: {
      mode: mapLayoutMode(node.layoutMode),
      gap: node.itemSpacing ?? 0,
      padding: [node.paddingTop ?? 0, node.paddingRight ?? 0, node.paddingBottom ?? 0, node.paddingLeft ?? 0],
    },
    effectsCount: node.effects?.length ?? 0,
    children:
      node.children?.map((child) =>
        parseFigmaNode(child, assetUrls, {
          x: absoluteX ?? 0,
          y: absoluteY ?? 0,
        }),
      ) ?? [],
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

function extractBackgroundColor(node: FigmaRawNode) {
  if (node.type === "TEXT") {
    return null;
  }

  const fillColor = node.fills?.find((fill) => fill.type === "SOLID" && fill.visible !== false)?.color ?? node.backgroundColor;
  return fillColor ? toCssColor(fillColor) : null;
}

function extractTextColor(node: FigmaRawNode) {
  const fillColor = node.fills?.find((fill) => fill.type === "SOLID" && fill.visible !== false)?.color;
  return fillColor ? toCssColor(fillColor) : null;
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

function toCssColor(color: FigmaRawColor) {
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = color.a ?? 1;

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
