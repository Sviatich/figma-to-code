import type { ParsedNode, TransformedNode } from "../types";

export function transformNode(
  node: ParsedNode,
  parentLayoutMode: ParsedNode["layout"]["mode"] | "root" = "root",
  insideInteractiveAncestor = false,
): TransformedNode {
  // Transformer назначает более честный HTML-тег и переносит веб-стили.
  const role = inferRole(node, insideInteractiveAncestor);
  const tag = inferTag(node, role, insideInteractiveAncestor);
  const semanticKind = inferSemanticKind(node, role, tag, insideInteractiveAncestor);
  const sectionPattern = inferSectionPattern(node, semanticKind);
  const childInsideInteractiveAncestor =
    insideInteractiveAncestor || semanticKind === "link" || semanticKind === "button";

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    tag,
    className: buildClassName(node.id, node.name, role),
    textContent: node.textContent,
    role,
    semanticKind,
    sectionPattern,
    isComponentCandidate: ["COMPONENT", "INSTANCE"].includes(node.type),
    attributes: buildAttributes(node, semanticKind, sectionPattern),
    styles: buildStyles(node, role, parentLayoutMode),
    children: sortChildrenForLayout(node).map((child) =>
      transformNode(child, node.layout.mode, childInsideInteractiveAncestor),
    ),
  };
}

function inferRole(node: ParsedNode, insideInteractiveAncestor: boolean): TransformedNode["role"] {
  if (node.type === "TEXT") {
    return "content";
  }

  if (!insideInteractiveAncestor && looksLikeButton(node)) {
    return "control";
  }

  return "layout";
}

function inferTag(
  node: ParsedNode,
  role: TransformedNode["role"],
  insideInteractiveAncestor: boolean,
) {
  const lowerName = node.name.toLowerCase();

  if (role === "control") {
    return "button";
  }

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

  if (node.type === "TEXT") {
    if (!insideInteractiveAncestor && looksLikeLink(node)) {
      return "a";
    }

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

  if (!insideInteractiveAncestor && looksLikeLink(node)) {
    return "a";
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

function inferSemanticKind(
  node: ParsedNode,
  role: TransformedNode["role"],
  tag: TransformedNode["tag"],
  insideInteractiveAncestor: boolean,
): TransformedNode["semanticKind"] {
  if (role === "control" || tag === "button") {
    return "button";
  }

  if (!insideInteractiveAncestor && (tag === "a" || looksLikeLink(node))) {
    return "link";
  }

  if (looksLikeIcon(node, tag)) {
    return "icon";
  }

  if (looksLikeMedia(node, tag)) {
    return "media";
  }

  if (looksLikeNavGroup(node)) {
    return "nav-group";
  }

  if (looksLikeList(node)) {
    return "list";
  }

  if (looksLikeListItem(node)) {
    return "list-item";
  }

  if (looksLikeCard(node)) {
    return "card";
  }

  if (tag === "section" || tag === "header" || tag === "footer" || tag === "main") {
    return "section";
  }

  return "container";
}

function inferSectionPattern(
  node: ParsedNode,
  semanticKind: TransformedNode["semanticKind"],
): TransformedNode["sectionPattern"] {
  const lowerName = node.name.toLowerCase();
  const flowChildren = node.children.filter((child) => child.layoutPositioning !== "absolute");
  const mediaChildren = flowChildren.filter((child) => looksLikeMedia(child));
  const cardChildren = flowChildren.filter((child) => looksLikeCard(child));
  const listItemChildren = flowChildren.filter((child) => looksLikeListItem(child) || child.name.toLowerCase().includes("item"));

  if (lowerName.includes("hero")) {
    return "hero";
  }

  if (lowerName.includes("header") || lowerName.includes("nav")) {
    return "header";
  }

  if (lowerName.includes("footer")) {
    return "footer";
  }

  if (lowerName.includes("testimonial") || lowerName.includes("quote")) {
    return "testimonial";
  }

  if (lowerName.includes("journal") || lowerName.includes("blog")) {
    return "journal-list";
  }

  if (lowerName.includes("call to action") || lowerName === "cta" || lowerName.includes("cta")) {
    return "cta";
  }

  if (node.layout.mode === "row" && flowChildren.length === 2 && mediaChildren.length >= 1) {
    return "split";
  }

  if (node.layout.mode === "row" && flowChildren.length === 3 && mediaChildren.length === 1 && listItemChildren.length >= 1) {
    return "split";
  }

  if (node.layout.mode === "row" && cardChildren.length >= 3) {
    return "card-grid";
  }

  if (semanticKind === "list" || listItemChildren.length >= 3) {
    return "journal-list";
  }

  if (node.layout.mode === "column" && flowChildren.length >= 3) {
    return "stack";
  }

  return "none";
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

  const resolvedGap = resolveLayoutGap(node);

  if (resolvedGap !== null) {
    styles.gap = `${resolvedGap}px`;
  }

  if (node.layout.padding.some((value) => value > 0)) {
    styles.padding = node.layout.padding.map((value) => `${value}px`).join(" ");
  }

  if (node.backgroundColor && !isRenderedAssetImage) {
    styles.backgroundColor = node.backgroundColor;
  }

  if (node.backgroundGradient && !isRenderedAssetImage) {
    styles.backgroundImage = node.backgroundGradient;
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
    styles.backgroundImage = node.backgroundGradient
      ? `${node.backgroundGradient}, url("${node.backgroundImageUrl}")`
      : `url("${node.backgroundImageUrl}")`;
    styles.backgroundRepeat = node.backgroundRepeat ?? "no-repeat";
    styles.backgroundPosition = node.backgroundPosition ?? "center";
    styles.backgroundSize = node.backgroundSize ?? "cover";
    styles.overflow = "hidden";
  }

  if (node.textColor && role === "content") {
    styles.color = node.textColor;
  }

  if (node.cornerRadii) {
    styles.borderRadius = node.cornerRadii.map((radius) => `${radius}px`).join(" ");
    styles.overflow = "hidden";
  } else if (node.cornerRadius) {
    styles.borderRadius = `${node.cornerRadius}px`;
    styles.overflow = "hidden";
  }

  if (node.opacity !== null && node.opacity < 1) {
    styles.opacity = `${node.opacity}`;
  }

  if (node.boxShadow && role !== "content") {
    styles.boxShadow = node.boxShadow;
  }

  if (node.textShadow && role === "content") {
    styles.textShadow = node.textShadow;
  }

  if (node.layerBlur !== null) {
    styles.filter = `blur(${Math.round(node.layerBlur)}px)`;
  }

  if (node.backgroundBlur !== null) {
    styles.backdropFilter = `blur(${Math.round(node.backgroundBlur)}px)`;
  }

  if (node.rotation !== null && Math.abs(node.rotation) > 0.01) {
    styles.rotate = `${roundCssNumber(node.rotation)}deg`;
  }

  if (node.scaleX !== null || node.scaleY !== null) {
    const scaleX = roundCssNumber(node.scaleX ?? 1);
    const scaleY = roundCssNumber(node.scaleY ?? 1);
    styles.scale = `${scaleX} ${scaleY}`;
  }

  if (node.width) {
    const roundedWidth = `${Math.round(node.width)}px`;

    if (isFlexChild && node.layoutGrow > 0) {
      styles.width = "auto";
      styles.flexBasis = "0";
      styles.flexGrow = `${node.layoutGrow}`;
      styles.flexShrink = "1";
      styles.minWidth = "0";
    } else if (!isAbsolutelyPositioned && parentLayoutMode === "root") {
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

  if (node.height && role !== "content" && shouldApplyMinHeight(node, parentLayoutMode)) {
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

  if (node.paragraphIndent && role === "content") {
    styles.textIndent = `${node.paragraphIndent}px`;
  }

  if (node.paragraphSpacing && role === "content") {
    styles.marginBottom = `${node.paragraphSpacing}px`;
  }

  if (node.listSpacing && role === "content") {
    styles.paddingInlineStart = `${node.listSpacing}px`;
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

  if (role === "content") {
    applyTextSizing(styles, node);
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
    applyAbsoluteConstraints(styles, node);
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

  if (parentLayoutMode !== "none" && parentLayoutMode !== "root") {
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
    lowerName.includes("btn") ||
    node.componentMeta?.componentName?.toLowerCase().includes("button") === true;

  const hasChildren = node.children.length > 0;
  const hasOwnText = Boolean(node.textContent.trim());
  const iconOrTextOnlyChildren =
    hasChildren &&
    node.children.every(
      (child) =>
        child.type === "TEXT" ||
        Boolean(child.assetUrl) ||
        child.type === "VECTOR" ||
        child.type === "BOOLEAN_OPERATION" ||
        child.name.toLowerCase().includes("icon") ||
        child.name.toLowerCase().includes("bullet"),
    );
  const isLeafLikeControl = !hasChildren || iconOrTextOnlyChildren;
  const hasCompactHeight = node.height !== null && node.height <= 96;

  if (!looksLikeActionName) {
    return false;
  }

  return isLeafLikeControl && (hasOwnText || hasChildren) && hasCompactHeight;
}

function looksLikeLink(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();
  const lowerComponentName = node.componentMeta?.componentName?.toLowerCase() ?? "";
  const directTextChildren = node.children.filter((child) => child.type === "TEXT");
  const directVisualChildren = node.children.filter(
    (child) => Boolean(child.assetUrl) || ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE"].includes(child.type),
  );
  const firstTextChild = directTextChildren[0];
  const hasCompactHeight = node.height !== null && node.height <= 64;
  const hasText = Boolean(node.textContent.trim()) || node.children.some((child) => child.type === "TEXT");
  const ownText = node.textContent.trim();
  const hasUnderline =
    node.textDecoration === "underline" || directTextChildren.some((child) => child.textDecoration === "underline");
  const hasVisualChrome = Boolean(
    node.backgroundColor ||
      node.backgroundGradient ||
      node.borderColor ||
      (node.borderWidth && node.borderWidth > 0) ||
      (node.cornerRadius && node.cornerRadius > 0) ||
      (node.cornerRadii && node.cornerRadii.some((radius) => radius > 0)) ||
      node.boxShadow,
  );
  const isHeadingLikeText =
    node.type === "TEXT" &&
    ((node.fontSize ?? 0) >= 24 ||
      lowerName.includes("title") ||
      lowerName.includes("heading") ||
      lowerName.includes("headline") ||
      lowerName.includes("subtitle"));
  const isShortStandaloneTextLink =
    node.type === "TEXT" &&
    ownText.length > 0 &&
    ownText.length <= 24 &&
    ownText.split(/\s+/).length <= 3 &&
    !/[.,:;!?]/.test(ownText) &&
    (node.fontSize ?? 0) <= 18 &&
    !isHeadingLikeText &&
    ((node.fontWeight ?? 400) <= 600 || hasUnderline) &&
    hasCompactHeight;
  const linkishName =
    lowerName.includes("link") ||
    lowerName.includes("nav") ||
    lowerName.includes("menu") ||
    lowerName.includes("menu item") ||
    lowerName.includes("footer link") ||
    lowerName.includes("footer nav") ||
    lowerComponentName.includes("link") ||
    lowerComponentName.includes("nav");
  const simpleInlineContainer =
    node.layout.mode === "row" &&
    node.children.length > 0 &&
    node.children.length <= 2 &&
    directTextChildren.length === 1 &&
    directVisualChildren.length <= 1 &&
    !hasVisualChrome &&
    (firstTextChild?.fontSize ?? 0) <= 18 &&
    node.children.every(
      (child) =>
        child.type === "TEXT" ||
        Boolean(child.assetUrl) ||
        ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE"].includes(child.type),
    );

  if (looksLikeButton(node) || looksLikeNavGroup(node)) {
    return false;
  }

  if (!hasCompactHeight || !hasText || isHeadingLikeText) {
    return false;
  }

  if (linkishName) {
    return true;
  }

  if (node.type === "TEXT") {
    return isShortStandaloneTextLink;
  }

  return simpleInlineContainer && hasUnderline;
}

function looksLikeMedia(node: ParsedNode, tag?: string) {
  return Boolean(
    node.backgroundImageUrl ||
      node.assetUrl ||
      tag === "img" ||
      ["VECTOR", "BOOLEAN_OPERATION", "STAR", "LINE"].includes(node.type),
  );
}

function looksLikeIcon(node: ParsedNode, tag?: string) {
  const lowerName = node.name.toLowerCase();
  const smallSquare =
    node.width !== null &&
    node.height !== null &&
    node.width <= 72 &&
    node.height <= 72 &&
    Math.abs(node.width - node.height) <= 16;

  return Boolean(
    (looksLikeMedia(node, tag) && smallSquare) ||
      lowerName.includes("icon") ||
      lowerName.includes("arrow") ||
      lowerName.includes("bullet"),
  );
}

function looksLikeCard(node: ParsedNode) {
  const hasVisualChrome = Boolean(
    node.backgroundColor ||
      node.backgroundGradient ||
      node.borderColor ||
      (node.borderWidth && node.borderWidth > 0) ||
      (node.cornerRadius && node.cornerRadius > 0) ||
      (node.cornerRadii && node.cornerRadii.some((radius) => radius > 0)) ||
      node.boxShadow,
  );

  return hasVisualChrome && (node.children.length > 0 || Boolean(node.textContent.trim()));
}

function looksLikeList(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();

  if (lowerName.includes("list") || lowerName.includes("items") || lowerName.includes("articles")) {
    return true;
  }

  return node.layout.mode === "column" && node.children.length >= 3;
}

function looksLikeListItem(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();

  if (lowerName.includes("item") || lowerName.includes("article")) {
    return true;
  }

  return node.children.some((child) => child.type === "TEXT") && (node.borderWidth !== null || node.borderColor !== null);
}

function looksLikeNavGroup(node: ParsedNode) {
  const lowerName = node.name.toLowerCase();

  return (
    lowerName.includes("nav items") ||
    lowerName.includes("main nav") ||
    lowerName.includes("footer nav") ||
    (node.layout.mode === "row" &&
      node.children.length >= 3 &&
      node.children.every((child) => looksLikeLink(child) || child.type === "TEXT"))
  );
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

function resolveLayoutGap(node: ParsedNode) {
  if (node.layout.mode === "none" || node.layout.gap <= 0) {
    return null;
  }

  const flowChildren = node.children.filter((child) => child.layoutPositioning !== "absolute");

  if (flowChildren.length < 2) {
    return roundCssNumber(node.layout.gap);
  }

  if (node.layout.primaryAxisAlign === "space-between") {
    return null;
  }

  const axisSize = node.layout.mode === "row" ? node.width : node.height;
  const axisRatioLimit = axisSize
    ? axisSize * (node.layout.mode === "row" ? 0.12 : 0.1)
    : node.layout.mode === "row"
      ? 96
      : 72;
  const perChildLimit = axisSize ? axisSize / (flowChildren.length * 2) : node.layout.mode === "row" ? 72 : 56;
  const maxReasonableGap = Math.max(
    16,
    Math.min(node.layout.mode === "row" ? 120 : 96, axisRatioLimit, perChildLimit),
  );

  return roundCssNumber(Math.min(node.layout.gap, maxReasonableGap));
}

function shouldApplyMinHeight(node: ParsedNode, parentLayoutMode: ParsedNode["layout"]["mode"] | "root") {
  if (node.layoutPositioning === "absolute") {
    return true;
  }

  if (parentLayoutMode !== "none" && parentLayoutMode !== "root" && node.layout.counterAxisSizing === "auto") {
    return false;
  }

  const hasFlowChildren = node.children.some((child) => child.layoutPositioning !== "absolute");
  const hasVisualContainerStyles = Boolean(
    node.backgroundColor ||
      node.backgroundGradient ||
      node.backgroundImageUrl ||
      node.assetUrl ||
      node.borderColor ||
      (node.borderWidth && node.borderWidth > 0) ||
      (node.cornerRadius && node.cornerRadius > 0) ||
      (node.cornerRadii && node.cornerRadii.some((radius) => radius > 0)) ||
      node.boxShadow ||
      node.backgroundBlur !== null ||
      node.layerBlur !== null,
  );
  const hasMeaningfulPadding = node.layout.padding.some((value) => value > 0);

  if (hasFlowChildren) {
    return hasVisualContainerStyles || hasMeaningfulPadding;
  }

  if (hasVisualContainerStyles) {
    return true;
  }

  if (node.layout.mode !== "none") {
    return hasMeaningfulPadding;
  }

  return true;
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

function applyAbsoluteConstraints(styles: Record<string, string>, node: ParsedNode) {
  const transforms: string[] = [];
  const horizontal = node.constraints?.horizontal ?? "start";
  const vertical = node.constraints?.vertical ?? "start";

  switch (horizontal) {
    case "end":
      if (node.right !== null) {
        styles.right = `${Math.round(node.right)}px`;
      } else if (node.x !== null) {
        styles.left = `${Math.round(node.x)}px`;
      }
      break;
    case "center":
      styles.left = "50%";

      if (node.centerOffsetX !== null) {
        styles.marginLeft = `${Math.round(node.centerOffsetX)}px`;
      }

      transforms.push("translateX(-50%)");
      break;
    case "stretch":
      if (node.x !== null) {
        styles.left = `${Math.round(node.x)}px`;
      }

      if (node.right !== null) {
        styles.right = `${Math.round(node.right)}px`;
      }

      delete styles.width;
      delete styles.maxWidth;
      break;
    case "scale":
      if (node.parentWidth && node.x !== null && node.width !== null) {
        styles.left = `${roundPercent((node.x / node.parentWidth) * 100)}%`;
        styles.width = `${roundPercent((node.width / node.parentWidth) * 100)}%`;
        delete styles.maxWidth;
      } else if (node.x !== null) {
        styles.left = `${Math.round(node.x)}px`;
      }
      break;
    case "start":
    default:
      styles.left = `${Math.round(node.x ?? 0)}px`;
      break;
  }

  switch (vertical) {
    case "end":
      if (node.bottom !== null) {
        styles.bottom = `${Math.round(node.bottom)}px`;
      } else if (node.y !== null) {
        styles.top = `${Math.round(node.y)}px`;
      }
      break;
    case "center":
      styles.top = "50%";

      if (node.centerOffsetY !== null) {
        styles.marginTop = `${Math.round(node.centerOffsetY)}px`;
      }

      transforms.push("translateY(-50%)");
      break;
    case "stretch":
      if (node.y !== null) {
        styles.top = `${Math.round(node.y)}px`;
      }

      if (node.bottom !== null) {
        styles.bottom = `${Math.round(node.bottom)}px`;
      }

      delete styles.minHeight;
      if (node.height !== null) {
        styles.height = "auto";
      }
      break;
    case "scale":
      if (node.parentHeight && node.y !== null && node.height !== null) {
        styles.top = `${roundPercent((node.y / node.parentHeight) * 100)}%`;
        styles.height = `${roundPercent((node.height / node.parentHeight) * 100)}%`;
        delete styles.minHeight;
      } else if (node.y !== null) {
        styles.top = `${Math.round(node.y)}px`;
      }
      break;
    case "start":
    default:
      styles.top = `${Math.round(node.y ?? 0)}px`;
      break;
  }

  if (transforms.length > 0) {
    styles.transform = transforms.join(" ");
  }
}

function roundPercent(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundCssNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}

function buildAttributes(
  node: ParsedNode,
  semanticKind: TransformedNode["semanticKind"],
  sectionPattern: TransformedNode["sectionPattern"],
) {
  const attributes: Record<string, string> = {
    "data-figma-node-id": node.id,
    "data-figma-node-type": node.type,
    "data-semantic-kind": semanticKind,
  };

  if (sectionPattern !== "none") {
    attributes["data-section-pattern"] = sectionPattern;
  }

  if (semanticKind === "link") {
    attributes.href = "#";
  }

  if (!node.componentMeta) {
    return attributes;
  }

  attributes["data-figma-component-kind"] = node.componentMeta.kind;

  if (node.componentMeta.componentId) {
    attributes["data-figma-component-id"] = node.componentMeta.componentId;
  }

  if (node.componentMeta.componentKey) {
    attributes["data-figma-component-key"] = node.componentMeta.componentKey;
  }

  if (node.componentMeta.componentName) {
    attributes["data-figma-component-name"] = node.componentMeta.componentName;
  }

  if (node.componentMeta.componentSetId) {
    attributes["data-figma-component-set-id"] = node.componentMeta.componentSetId;
  }

  if (node.componentMeta.propertyKeys.length > 0) {
    attributes["data-figma-component-props"] = node.componentMeta.propertyKeys.join(",");
  }

  return attributes;
}

function applyTextSizing(styles: Record<string, string>, node: ParsedNode) {
  switch (node.textAutoResize) {
    case "width-and-height":
      styles.width = "max-content";
      styles.maxWidth = "100%";
      break;
    case "height":
      delete styles.minHeight;
      break;
    case "truncate":
      if (node.maxLines && node.maxLines > 1) {
        styles.display = "-webkit-box";
        styles.webkitBoxOrient = "vertical";
        styles.webkitLineClamp = `${node.maxLines}`;
        styles.overflow = "hidden";
      } else if (node.textTruncation === "ending") {
        styles.overflow = "hidden";
        styles.textOverflow = "ellipsis";
        styles.whiteSpace = "nowrap";
      }
      break;
    default:
      break;
  }
}
