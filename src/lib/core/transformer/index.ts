import type { ParsedNode, TransformedNode } from "../types";

export function transformNode(
  node: ParsedNode,
  parentLayoutMode: ParsedNode["layout"]["mode"] | "root" = "root",
): TransformedNode {
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
    children: sortChildrenForLayout(node).map((child) => transformNode(child, node.layout.mode)),
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

  if (node.backgroundImageUrl) {
    if (lowerName.includes("header") || lowerName.includes("hero") || lowerName.includes("banner")) {
      return "section";
    }

    return "div";
  }

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
  const isRenderedAssetImage = Boolean(node.assetUrl && !node.backgroundImageUrl);
  const isFlexChild = parentLayoutMode !== "none" && parentLayoutMode !== "root";
  const isAutoLayoutNode = node.layout.mode !== "none";
  const isAbsolutelyPositioned = node.layoutPositioning === "absolute";

  if (node.layout.mode !== "none") {
    styles.display = "flex";
    styles.flexDirection = node.layout.mode === "row" ? "row" : "column";
    styles.flexWrap = node.layout.wrap;
    styles.justifyContent = mapJustifyContent(node.layout.primaryAxisAlign);
    styles.alignItems = mapAlignItems(node.layout.counterAxisAlign);
  } else if (node.children.length > 0) {
    styles.display = "block";
  }

  if (node.layout.gap > 0) {
    styles.gap = `${node.layout.gap}px`;
  }

  if (node.layout.padding.some((value) => value > 0)) {
    styles.padding = node.layout.padding.map((value) => `${value}px`).join(" ");
  }

  if (node.backgroundColor && !isRenderedAssetImage) {
    styles.backgroundColor = node.backgroundColor;
  }

  if (node.borderColor && !isRenderedAssetImage) {
    if (node.borderSides) {
      if (node.borderSides.top > 0) {
        styles.borderTop = `${node.borderSides.top}px solid ${node.borderColor}`;
      }

      if (node.borderSides.right > 0) {
        styles.borderRight = `${node.borderSides.right}px solid ${node.borderColor}`;
      }

      if (node.borderSides.bottom > 0) {
        styles.borderBottom = `${node.borderSides.bottom}px solid ${node.borderColor}`;
      }

      if (node.borderSides.left > 0) {
        styles.borderLeft = `${node.borderSides.left}px solid ${node.borderColor}`;
      }
    } else if (node.borderWidth && node.borderWidth > 0) {
      styles.border = `${node.borderWidth}px solid ${node.borderColor}`;
    }
  }

  if (node.backgroundImageUrl) {
    styles.backgroundImage = `url("${node.backgroundImageUrl}")`;
    styles.backgroundRepeat = "no-repeat";
    styles.backgroundPosition = "center";
    styles.backgroundSize = node.backgroundSize ?? "cover";
    styles.overflow = "hidden";
  }

  if (node.backgroundColor && node.backgroundImageUrl) {
    styles.backgroundImage = `linear-gradient(${node.backgroundColor}, ${node.backgroundColor}), url("${node.backgroundImageUrl}")`;
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
    const roundedWidth = `${Math.round(node.width)}px`;

    if (isFlexChild && node.layoutGrow > 0) {
      styles.width = "auto";
      styles.flexBasis = "0";
      styles.flexGrow = `${node.layoutGrow}`;
      styles.flexShrink = "1";
      styles.minWidth = "0";
    } else if (!isAbsolutelyPositioned && parentLayoutMode === "root" && isAutoLayoutNode) {
      styles.width = "100%";
      styles.maxWidth = "100%";
      styles.minWidth = "0";
    } else if (!isAbsolutelyPositioned && isFlexChild) {
      styles.minWidth = "0";

      if (parentLayoutMode === "column") {
        styles.width = "100%";
        styles.maxWidth = roundedWidth;
      } else {
        styles.width = `min(100%, ${roundedWidth})`;
        styles.maxWidth = "100%";
      }
    } else {
      styles.width = roundedWidth;
      styles.maxWidth = "100%";
    }
  }

  if (node.height && role !== "content") {
    if (!(parentLayoutMode !== "none" && node.layout.counterAxisSizing === "auto")) {
      styles.minHeight = `${Math.round(node.height)}px`;
    }
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

  if (node.assetUrl && !node.backgroundImageUrl) {
    styles.__assetUrl = node.assetUrl;
    styles.display = "block";

    if (node.assetFit) {
      styles.objectFit = node.assetFit;
    }
  }

  if ((parentLayoutMode === "none" || node.layoutPositioning === "absolute") && node.x !== null && node.y !== null) {
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
    styles.maxWidth = "100%";
  }

  if (parentLayoutMode !== "none") {
    if (node.layoutAlign === "center") {
      styles.alignSelf = "center";
    }

    if (node.layoutAlign === "end") {
      styles.alignSelf = "flex-end";
    }

    if (node.layoutAlign === "start") {
      styles.alignSelf = "flex-start";
    }
  }

  return styles;
}

function looksLikeButton(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();
  const looksLikeActionName =
    lowerName.includes("button") ||
    lowerName === "cta" ||
    lowerName.endsWith("-button") ||
    lowerName.includes("btn");

  const hasChildren = node.children.length > 0;
  const hasOwnText = Boolean(node.textContent.trim());
  const isLeafLikeControl = !hasChildren || (hasChildren && node.children.every((child) => child.type === "TEXT"));
  const hasCompactHeight = node.height !== null && node.height <= 96;

  if (!looksLikeActionName) {
    return false;
  }

  return isLeafLikeControl && (hasOwnText || hasChildren) && hasCompactHeight;
}

function mapJustifyContent(value: ParsedNode["layout"]["primaryAxisAlign"]) {
  switch (value) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "space-between":
      return "space-between";
    default:
      return "flex-start";
  }
}

function mapAlignItems(value: ParsedNode["layout"]["counterAxisAlign"]) {
  switch (value) {
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "stretch":
      return "stretch";
    default:
      return "flex-start";
  }
}

function sortChildrenForLayout(node: ParsedNode) {
  if (node.layout.mode === "none") {
    return node.children;
  }

  const hasAbsoluteChildren = node.children.some((child) => child.layoutPositioning === "absolute");

  // Если внутри flex-контейнера есть абсолютные слои, сохраняем исходный z-order Figma.
  if (hasAbsoluteChildren) {
    return node.children;
  }

  return [...node.children].sort((left, right) => {
    if (node.layout.mode === "row") {
      const deltaX = (left.x ?? 0) - (right.x ?? 0);

      if (Math.abs(deltaX) > 1) {
        return deltaX;
      }

      return (left.y ?? 0) - (right.y ?? 0);
    }

    const deltaY = (left.y ?? 0) - (right.y ?? 0);

    if (Math.abs(deltaY) > 1) {
      return deltaY;
    }

    return (left.x ?? 0) - (right.x ?? 0);
  });
}
