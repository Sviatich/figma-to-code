import type { ParsedNode, TransformedNode } from "../types";

export function transformNode(node: ParsedNode, parentLayoutMode: ParsedNode["layout"]["mode"] | "root" = "root"): TransformedNode {
  // Transformer назначает более честный HTML-тег и переносит веб-стили.
  const role = inferRole(node);
  const tag = inferTag(node, role);

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    tag,
    className: buildClassName(node.id, node.name, role),
    textContent: node.textContent,
    role,
    isComponentCandidate: ["COMPONENT", "INSTANCE"].includes(node.type),
    styles: buildStyles(node, role, parentLayoutMode),
    children: node.children.map((child) => transformNode(child, node.layout.mode)),
  };
}

function inferRole(node: ParsedNode): TransformedNode["role"] {
  if (node.type === "TEXT") {
    return "content";
  }

  if (looksLikeButton(node)) {
    return "control";
  }

  return "layout";
}

function inferTag(node: ParsedNode, role: TransformedNode["role"]) {
  const lowerName = node.name.toLowerCase();

  if (node.assetUrl && (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION" || node.type === "STAR" || node.type === "LINE")) {
    return "img";
  }

  if (node.assetUrl && node.children.length === 0 && node.type !== "TEXT") {
    return "img";
  }

  if (role === "control") {
    return "button";
  }

  if (node.type === "TEXT") {
    if (node.fontSize && node.fontSize >= 40) {
      return "h1";
    }

    if (node.fontSize && node.fontSize >= 28) {
      return "h2";
    }

    if (lowerName.includes("caption") || lowerName.includes("label")) {
      return "span";
    }

    return "p";
  }

  if (lowerName.includes("header") || lowerName.includes("nav")) {
    return "header";
  }

  if (lowerName.includes("footer")) {
    return "footer";
  }

  if (lowerName.includes("hero") || lowerName.includes("section")) {
    return "section";
  }

  if (lowerName.includes("main")) {
    return "main";
  }

  return "div";
}

function buildClassName(id: string, name: string, role: TransformedNode["role"]) {
  const base = name
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  const safeId = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return `${role}-${base || "node"}-${safeId || "id"}`;
}

function buildStyles(node: ParsedNode, role: TransformedNode["role"], parentLayoutMode: ParsedNode["layout"]["mode"] | "root") {
  const styles: Record<string, string> = {
    position: "relative",
    margin: "0",
  };

  if (node.layout.mode !== "none") {
    styles.display = "flex";
    styles.flexDirection = node.layout.mode === "row" ? "row" : "column";
  } else if (node.children.length > 0) {
    styles.display = "block";
  }

  if (node.layout.gap > 0) {
    styles.gap = `${node.layout.gap}px`;
  }

  if (node.layout.padding.some((value) => value > 0)) {
    styles.padding = node.layout.padding.map((value) => `${value}px`).join(" ");
  }

  if (node.backgroundColor) {
    styles.background = node.backgroundColor;
  }

  if (node.textColor && role === "content") {
    styles.color = node.textColor;
  }

  if (node.cornerRadius) {
    styles.borderRadius = `${node.cornerRadius}px`;
    styles.overflow = "hidden";
  }

  if (node.opacity !== null && node.opacity < 1) {
    styles.opacity = `${node.opacity}`;
  }

  if (node.width) {
    styles.width = `${Math.round(node.width)}px`;
    styles.maxWidth = "100%";
  }

  if (node.height && role !== "content") {
    styles.minHeight = `${Math.round(node.height)}px`;
  }

  if (node.fontSize && role === "content") {
    styles.fontSize = `${node.fontSize}px`;
  }

  if (node.fontFamily && role === "content") {
    styles.fontFamily = `"${node.fontFamily}", var(--font-sans, "Segoe UI"), sans-serif`;
  }

  if (node.lineHeight && role === "content") {
    styles.lineHeight = `${node.lineHeight}px`;
  }

  if (node.letterSpacing !== null && role === "content") {
    styles.letterSpacing = `${node.letterSpacing}px`;
  }

  if (node.fontWeight && role === "content") {
    styles.fontWeight = `${node.fontWeight}`;
  }

  if (node.textTransform && role === "content") {
    if (node.textTransform === "small-caps") {
      styles.fontVariantCaps = "small-caps";
    } else {
      styles.textTransform = node.textTransform;
    }
  }

  if (node.textDecoration && role === "content") {
    styles.textDecoration = node.textDecoration;
  }

  if (node.textAlign && role === "content") {
    styles.textAlign = node.textAlign;
  }

  if (node.assetUrl) {
    styles.__assetUrl = node.assetUrl;
    styles.objectFit = "cover";
    styles.display = "block";
  }

  if (parentLayoutMode === "none" && node.x !== null && node.y !== null) {
    styles.position = "absolute";
    styles.left = `${Math.round(node.x)}px`;
    styles.top = `${Math.round(node.y)}px`;
  }

  if (node.layout.mode === "none" && node.children.length > 0) {
    styles.position = "relative";
  }

  if (role === "content") {
    styles.whiteSpace = "pre-wrap";
  }

  if (role === "control") {
    styles.border = "none";
    styles.cursor = "pointer";
    styles.width = "fit-content";
  }

  return styles;
}

function looksLikeButton(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();
  return lowerName.includes("button") || lowerName.includes("cta") || lowerName.includes("action");
}
