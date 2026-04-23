import type {
  GeneratedFile,
  GeneratedFontAsset,
  GeneratedProjectArtifacts,
  TransformedNode,
} from "../types";

type GenerateProjectParams = {
  projectName: string;
  fileName: string;
  fileKey: string;
  selectedNodeId: string;
  mode: "live";
  nodeTree: TransformedNode;
  rawSource: unknown;
};

export function generateProjectArtifacts({
  projectName,
  fileName,
  fileKey,
  selectedNodeId,
  mode,
  nodeTree,
  rawSource,
}: GenerateProjectParams): GeneratedProjectArtifacts {
  const generatedAt = new Date().toISOString();
  const fontAssets = collectFontAssets(nodeTree);
  const componentMarkup = toTsxMarkup(nodeTree, 4);
  const previewMarkup = toHtmlMarkup(nodeTree, 4);
  const cssContent = toCss(nodeTree, fontAssets);

  const files: GeneratedFile[] = [
    {
      path: "src/components/generated/generated-layout.tsx",
      language: "tsx",
      content: `import styles from "./generated-layout.module.css";

// Компонент является входной точкой сгенерированного интерфейса.
export function GeneratedLayout() {
  return (
${componentMarkup}
  );
}
`,
    },
    {
      path: "src/components/generated/generated-layout.module.css",
      language: "css",
      content: cssContent,
    },
    {
      path: "src/app/page.tsx",
      language: "tsx",
      content: `import { GeneratedLayout } from "@/components/generated/generated-layout";

export default function Page() {
  return <GeneratedLayout />;
}
`,
    },
    {
      path: "src/generated/figma-source.json",
      language: "json",
      content: JSON.stringify(rawSource, null, 2),
    },
    {
      path: "README.md",
      language: "md",
      content: `# ${projectName}

Сгенерировано из файла \`${fileName}\` (\`${fileKey}\`) для узла \`${selectedNodeId}\`.

- Режим загрузки: ${mode}
- Входной узел: ${nodeTree.name}
- Дата генерации: ${generatedAt}
`,
    },
  ];

  return {
    files,
    previewHtml: `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(projectName)} Preview</title>
    <style>
${indentBlock(cssContent, 6)}
    </style>
  </head>
  <body>
${previewMarkup}
  </body>
</html>`,
    summary: `Pipeline ${mode} -> parser -> transformer -> generator завершён для узла "${nodeTree.name}".`,
    entryFilePath: "src/components/generated/generated-layout.tsx",
    generatedAt,
  };
}

function toTsxMarkup(node: TransformedNode, indent: number): string {
  const spaces = " ".repeat(indent);
  const attrs = [`className={styles["${node.className}"]}`, ...toJsxAttributes(node.attributes)];

  if (node.tag === "button" && !("type" in node.attributes)) {
    attrs.push(`type="button"`);
  }

  if (node.tag === "a" && !("href" in node.attributes)) {
    attrs.push(`href="#"`);
  }

  if (node.tag === "img") {
    const assetUrl = node.styles.__assetUrl;
    attrs.push(`src="${escapeAttribute(assetUrl ?? "")}"`);
    attrs.push(`alt="${escapeAttribute(node.name)}"`);
    return `${spaces}<img ${attrs.join(" ")} />`;
  }

  const children = node.children.map((child) => toTsxMarkup(child, indent + 2)).join("\n");
  const text = node.textContent ? escapeJsx(node.textContent) : "";

  if (!children && !text) {
    return `${spaces}<${node.tag} ${attrs.join(" ")} />`;
  }

  if (!children) {
    return `${spaces}<${node.tag} ${attrs.join(" ")}>${text}</${node.tag}>`;
  }

  return `${spaces}<${node.tag} ${attrs.join(" ")}>\n${text ? `${spaces}  ${text}\n` : ""}${children}\n${spaces}</${node.tag}>`;
}

function toHtmlMarkup(node: TransformedNode, indent: number): string {
  const spaces = " ".repeat(indent);
  const htmlAttributes = { ...node.attributes };

  if (node.tag === "button" && !("type" in htmlAttributes)) {
    htmlAttributes.type = "button";
  }

  if (node.tag === "a" && !("href" in htmlAttributes)) {
    htmlAttributes.href = "#";
  }

  const extraAttrs = toHtmlAttributes(htmlAttributes);

  if (node.tag === "img") {
    const assetUrl = node.styles.__assetUrl;
    return `${spaces}<img class="${node.className}"${extraAttrs ? ` ${extraAttrs}` : ""} src="${escapeAttribute(assetUrl ?? "")}" alt="${escapeAttribute(node.name)}" />`;
  }

  const children = node.children.map((child) => toHtmlMarkup(child, indent + 2)).join("\n");
  const text = node.textContent ? escapeHtml(node.textContent) : "";

  if (!children && !text) {
    return `${spaces}<${node.tag} class="${node.className}"${extraAttrs ? ` ${extraAttrs}` : ""}></${node.tag}>`;
  }

  if (!children) {
    return `${spaces}<${node.tag} class="${node.className}"${extraAttrs ? ` ${extraAttrs}` : ""}>${text}</${node.tag}>`;
  }

  return `${spaces}<${node.tag} class="${node.className}"${extraAttrs ? ` ${extraAttrs}` : ""}>\n${text ? `${spaces}  ${text}\n` : ""}${children}\n${spaces}</${node.tag}>`;
}

function toCss(root: TransformedNode, fontAssets: GeneratedFontAsset[]) {
  const fontImports = fontAssets.map((asset) => `@import url("${asset.importUrl}");`).join("\n");

  const blocks = [
    `${fontImports ? `${fontImports}\n\n` : ""}:root {
  color-scheme: light;
  --app-bg: #fff;
  --surface: rgba(255, 255, 255, 0.88);
  --ink: #142033;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  color: var(--ink);
  background: var(--app-bg);
  font-family: var(--font-sans, "Segoe UI", sans-serif);
  overflow: auto;
}

a {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

a:hover,
a:focus,
a:active,
a:visited {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
}
`,
  ];
  const responsiveTabletBlocks: string[] = [];
  const responsiveMobileBlocks: string[] = [];
  const responsiveCompactBlocks: string[] = [];
  const responsiveTypographyTabletBlocks: string[] = [];
  const responsiveTypographyMobileBlocks: string[] = [];
  const responsiveTypographyCompactBlocks: string[] = [];
  const responsiveSpacingTabletBlocks: string[] = [];
  const responsiveSpacingMobileBlocks: string[] = [];
  const responsiveSpacingCompactBlocks: string[] = [];

  visit(root, (node, depth) => {
    const declarations = Object.entries(node.styles)
      .filter(([property]) => !property.startsWith("__"))
      .map(([property, value]) => `  ${toKebabCase(property)}: ${value};`)
      .join("\n");

    const defaults: string[] = [];

    if (depth === 0) {
      defaults.push("  width: 100%;");
      defaults.push("  min-width: 0;");
      defaults.push("  max-width: none;");
    }

    if (node.role === "layout" && node.tag !== "img" && !("display" in node.styles)) {
      defaults.push("  display: block;");
    }

    if (node.role === "layout" && node.children.length > 0 && node.styles.display === "block") {
      defaults.push("  isolation: isolate;");
    }

    if (node.role === "content") {
      defaults.push("  margin: 0;");
    }

    blocks.push(`.${node.className} {\n${[declarations, ...defaults].filter(Boolean).join("\n") || "  position: relative;"}\n}`);

    const responsiveRules = buildResponsiveRules(node);

    if (responsiveRules.tablet) {
      responsiveTabletBlocks.push(responsiveRules.tablet);
    }

    if (responsiveRules.mobile) {
      responsiveMobileBlocks.push(responsiveRules.mobile);
    }

    if (responsiveRules.compact) {
      responsiveCompactBlocks.push(responsiveRules.compact);
    }

    const typographyRules = buildResponsiveTypographyRules(node);

    if (typographyRules.tablet) {
      responsiveTypographyTabletBlocks.push(typographyRules.tablet);
    }

    if (typographyRules.mobile) {
      responsiveTypographyMobileBlocks.push(typographyRules.mobile);
    }

    if (typographyRules.compact) {
      responsiveTypographyCompactBlocks.push(typographyRules.compact);
    }

    const spacingRules = buildResponsiveSpacingRules(node);

    if (spacingRules.tablet) {
      responsiveSpacingTabletBlocks.push(spacingRules.tablet);
    }

    if (spacingRules.mobile) {
      responsiveSpacingMobileBlocks.push(spacingRules.mobile);
    }

    if (spacingRules.compact) {
      responsiveSpacingCompactBlocks.push(spacingRules.compact);
    }
  });

  const tabletRules = [
    ...responsiveTabletBlocks,
    ...responsiveTypographyTabletBlocks,
    ...responsiveSpacingTabletBlocks,
  ].filter(Boolean);
  const mobileRules = [
    ...responsiveMobileBlocks,
    ...responsiveTypographyMobileBlocks,
    ...responsiveSpacingMobileBlocks,
  ].filter(Boolean);
  const compactRules = [
    ...responsiveCompactBlocks,
    ...responsiveTypographyCompactBlocks,
    ...responsiveSpacingCompactBlocks,
  ].filter(Boolean);

  if (tabletRules.length > 0) {
    blocks.push(`@media (min-width: 768px) and (max-width: 1200px) {\n${indentBlock(tabletRules.join("\n\n"), 2)}\n}`);
  }

  if (mobileRules.length > 0) {
    blocks.push(`@media (max-width: 767px) {\n${indentBlock(mobileRules.join("\n\n"), 2)}\n}`);
  }

  if (compactRules.length > 0) {
    blocks.push(`@media (max-width: 599px) {\n${indentBlock(compactRules.join("\n\n"), 2)}\n}`);
  }

  return blocks.join("\n\n");
}

function collectFontAssets(root: TransformedNode) {
  const familyWeights = new Map<string, Set<number>>();

  visit(root, (node) => {
    const family = node.styles.fontFamily?.match(/"([^"]+)"/)?.[1];
    const weight = Number.parseInt(node.styles.fontWeight ?? "400", 10);

    if (family) {
      if (!familyWeights.has(family)) {
        familyWeights.set(family, new Set<number>());
      }

      familyWeights.get(family)?.add(Number.isFinite(weight) ? normalizeFontWeight(weight) : 400);
    }
  });

  return [...familyWeights.entries()].map(([family, weights]) => ({
    family,
    importUrl: buildGoogleFontsUrl(family, [...weights].sort((left, right) => left - right)),
  }));
}

function buildGoogleFontsUrl(family: string, weights: number[]) {
  const encodedFamily = family.trim().replace(/\s+/g, "+");
  const weightQuery = weights.length > 0 ? weights.join(";") : "400;500;600;700";
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightQuery}&display=swap`;
}

function normalizeFontWeight(weight: number) {
  if (weight <= 100) {
    return 100;
  }

  if (weight >= 900) {
    return 900;
  }

  return Math.round(weight / 100) * 100;
}

function visit(node: TransformedNode, visitor: (node: TransformedNode, depth: number) => void, depth = 0) {
  visitor(node, depth);
  node.children.forEach((child) => visit(child, visitor, depth + 1));
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function escapeJsx(value: string) {
  return value.replaceAll("{", "&#123;").replaceAll("}", "&#125;");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function indentBlock(value: string, indent: number) {
  const spaces = " ".repeat(indent);
  return value
    .split("\n")
    .map((line) => `${spaces}${line}`)
    .join("\n");
}

function toJsxAttributes(attributes: Record<string, string>) {
  return Object.entries(attributes).map(([key, value]) => `${key}="${escapeAttribute(value)}"`);
}

function toHtmlAttributes(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(" ");
}

function buildResponsiveRules(node: TransformedNode) {
  const sectionRules = buildSectionResponsiveRules(node);

  if (sectionRules) {
    return sectionRules;
  }

  if (isFooterLikeContainer(node)) {
    return buildFooterResponsiveRules(node);
  }

  if (isHeaderLikeContainer(node)) {
    return buildHeaderResponsiveRules(node);
  }

  if (!isResponsiveRowCandidate(node)) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = node.children
    .filter((child) => child.styles.position !== "absolute")
    .map((child) => `.${node.className} > .${child.className}`);

  if (childSelectors.length < 2) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const halfGap = gapValue > 0 ? `${Math.round((gapValue / 2) * 100) / 100}px` : "0px";
  const tabletGap = `${Math.min(gapValue || 20, 24)}px`;
  const mobileGap = `${Math.min(gapValue || 16, 18)}px`;
  const compactGap = `${Math.min(gapValue || 12, 14)}px`;
  const childSelectorList = childSelectors.join(",\n");
  const shouldCollapseToTwoColumns = shouldCollapseRowOnTablet(flowChildren, gapValue);
  const mediaTextPair = getMediaTextPair(flowChildren);
  const shouldStackMediaPair = mediaTextPair ? shouldStackMediaTextPairOnTablet(flowChildren, gapValue) : false;
  const isCardGrid = isCardGridCandidate(flowChildren);
  const mixedTriptych = getMixedTriptychPattern(flowChildren);
  const shouldKeepRowOnTablet = mediaTextPair && !shouldStackMediaPair;

  const tablet = shouldKeepRowOnTablet
    ? `.${node.className} {
  flex-wrap: nowrap;
  align-items: center;
  gap: ${tabletGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}

${childSelectors[mediaTextPair.mediaIndex]} {
  flex: 0 1 46%;
  width: auto;
}

${childSelectors[mediaTextPair.textIndex]} {
  flex: 1 1 0;
  width: auto;
}`
    : isCardGrid
      ? `.${node.className} {
  flex-wrap: wrap;
  align-items: stretch;
  gap: ${tabletGap};
}

${childSelectorList} {
  flex: 1 1 calc(50% - ${halfGap});
  width: calc(50% - ${halfGap});
  max-width: calc(50% - ${halfGap});
  min-width: min(280px, 100%);
}`
      : `.${node.className} {
  flex-wrap: wrap;
  align-items: stretch;
  gap: ${tabletGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
${shouldCollapseToTwoColumns ? "\n  flex-basis: auto;\n  width: auto;" : ""}
}`;

  const mobile = mediaTextPair && shouldStackMediaPair
    ? `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`
    : mediaTextPair
    ? `.${node.className} {
  flex-wrap: nowrap;
  align-items: center;
  gap: ${mobileGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}

${childSelectors[mediaTextPair.mediaIndex]} {
  flex: 0 1 42%;
  width: auto;
}

${childSelectors[mediaTextPair.textIndex]} {
  flex: 1 1 0;
  width: auto;
}`
    : isCardGrid
      ? `.${node.className} {
  flex-wrap: wrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  flex: 1 1 calc(50% - ${halfGap});
  width: calc(50% - ${halfGap});
  max-width: calc(50% - ${halfGap});
  min-width: min(280px, 100%);
}`
    : shouldCollapseToTwoColumns
      ? `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`
      : `.${node.className} {
  flex-wrap: wrap;
  gap: ${mobileGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}`;

  const compact = `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}${mixedTriptych ? `

${childSelectors[mixedTriptych.mediaIndex]} {
  order: -1;
}` : ""}`;

  return {
    tablet,
    mobile,
    compact,
  };
}

function buildSectionResponsiveRules(node: TransformedNode) {
  switch (node.sectionPattern) {
    case "header":
      return buildHeaderResponsiveRules(node);
    case "footer":
      return buildFooterResponsiveRules(node);
    case "hero":
    case "split":
    case "testimonial":
      return buildSplitSectionResponsiveRules(node);
    case "card-grid":
      return buildCardGridResponsiveRules(node);
    case "journal-list":
      return buildJournalResponsiveRules(node);
    default:
      return null;
  }
}

function isResponsiveRowCandidate(node: TransformedNode) {
  if (node.styles.display !== "flex" || node.styles.flexDirection !== "row") {
    return false;
  }

  if (isHeaderLikeContainer(node)) {
    return false;
  }

  const lowerName = node.name.toLowerCase();

  if (
    lowerName.includes("tabs") ||
    lowerName.includes("breadcrumb") ||
    lowerName.includes("toolbar") ||
    lowerName.includes("actions")
  ) {
    return false;
  }

  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");

  if (flowChildren.length < 2) {
    return false;
  }

  const controlHeavy = flowChildren.every(
    (child) => child.role === "control" || child.tag === "button" || child.tag === "span" || child.tag === "p",
  );

  if (controlHeavy && flowChildren.length <= 5) {
    return false;
  }

  return true;
}

function isHeaderLikeContainer(node: TransformedNode) {
  if (node.styles.display !== "flex" || node.styles.flexDirection !== "row") {
    return false;
  }

  const lowerName = node.name.toLowerCase();

  return node.tag === "header" || lowerName.includes("header") || lowerName.includes("nav") || lowerName.includes("menu");
}

function buildHeaderResponsiveRules(node: TransformedNode) {
  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = flowChildren.map((child) => `.${node.className} > .${child.className}`);
  const navLinksIndex = flowChildren.findIndex(isLikelyNavLinksGroup);

  if (childSelectors.length < 2) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const tabletGap = `${Math.min(gapValue || 18, 20)}px`;
  const mobileGap = `${Math.min(gapValue || 14, 16)}px`;
  const compactGap = `${Math.min(gapValue || 12, 12)}px`;
  const childSelectorList = childSelectors.join(",\n");
  const navLinksTabletRule =
    navLinksIndex >= 0
      ? `

${childSelectors[navLinksIndex]} {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 8px;
}`
      : "";
  const navLinksPhoneRule =
    navLinksIndex >= 0
      ? `

${childSelectors[navLinksIndex]} {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}`
      : "";

  return {
    tablet: `.${node.className} {
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${tabletGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}${navLinksTabletRule}`,
    mobile: `.${node.className} {
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${mobileGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}${navLinksTabletRule}`,
    compact: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}${navLinksPhoneRule}`,
  };
}

function buildFooterResponsiveRules(node: TransformedNode) {
  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = flowChildren.map((child) => `.${node.className} > .${child.className}`);

  if (childSelectors.length < 2) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const tabletGap = `${Math.min(gapValue || 24, 28)}px`;
  const mobileGap = `${Math.min(gapValue || 20, 24)}px`;
  const compactGap = `${Math.min(gapValue || 18, 20)}px`;
  const childSelectorList = childSelectors.join(",\n");

  return {
    tablet: `.${node.className} {
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tabletGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}`,
    mobile: `.${node.className} {
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-start;
  gap: ${mobileGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}`,
    compact: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: flex-start;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
  };
}

function buildSplitSectionResponsiveRules(node: TransformedNode) {
  if (node.styles.display !== "flex") {
    return null;
  }

  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = flowChildren.map((child) => `.${node.className} > .${child.className}`);
  const mediaChildren = flowChildren.filter((child) => child.semanticKind === "media");
  const nonMediaChildren = flowChildren.filter((child) => child.semanticKind !== "media" && child.semanticKind !== "icon");

  if (childSelectors.length < 2 || flowChildren.length > 3 || mediaChildren.length === 0 || nonMediaChildren.length === 0) {
    return null;
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const tabletGap = `${Math.min(gapValue || 24, 32)}px`;
  const mobileGap = `${Math.min(gapValue || 18, 22)}px`;
  const compactGap = `${Math.min(gapValue || 14, 18)}px`;
  const childSelectorList = childSelectors.join(",\n");

  return {
    tablet: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${tabletGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
    mobile: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
    compact: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
  };
}

function buildCardGridResponsiveRules(node: TransformedNode) {
  if (node.styles.display !== "flex" || node.styles.flexDirection !== "row") {
    return null;
  }

  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = flowChildren.map((child) => `.${node.className} > .${child.className}`);

  if (childSelectors.length < 2) {
    return null;
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const tabletGap = `${Math.min(gapValue || 20, 24)}px`;
  const mobileGap = `${Math.min(gapValue || 16, 18)}px`;
  const compactGap = `${Math.min(gapValue || 12, 14)}px`;
  const tabletHalfGap = `${Math.round((parsePixelValue(tabletGap) / 2) * 100) / 100}px`;
  const mobileHalfGap = `${Math.round((parsePixelValue(mobileGap) / 2) * 100) / 100}px`;
  const childSelectorList = childSelectors.join(",\n");

  return {
    tablet: `.${node.className} {
  flex-wrap: wrap;
  align-items: stretch;
  gap: ${tabletGap};
}

${childSelectorList} {
  flex: 1 1 calc(50% - ${tabletHalfGap});
  width: calc(50% - ${tabletHalfGap});
  max-width: calc(50% - ${tabletHalfGap});
  min-width: min(280px, 100%);
}`,
    mobile: `.${node.className} {
  flex-wrap: wrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  flex: 1 1 calc(50% - ${mobileHalfGap});
  width: calc(50% - ${mobileHalfGap});
  max-width: calc(50% - ${mobileHalfGap});
  min-width: min(240px, 100%);
}`,
    compact: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
  };
}

function buildJournalResponsiveRules(node: TransformedNode) {
  if (node.styles.display !== "flex") {
    return null;
  }

  const flowChildren = node.children.filter((child) => child.styles.position !== "absolute");
  const childSelectors = flowChildren.map((child) => `.${node.className} > .${child.className}`);

  if (childSelectors.length < 2) {
    return null;
  }

  const gapValue = parsePixelValue(node.styles.gap);
  const tabletGap = `${Math.min(gapValue || 16, 20)}px`;
  const mobileGap = `${Math.min(gapValue || 14, 16)}px`;
  const compactGap = `${Math.min(gapValue || 12, 14)}px`;
  const childSelectorList = childSelectors.join(",\n");

  return {
    tablet: `.${node.className} {
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: ${tabletGap};
}

${childSelectorList} {
  min-width: 0;
  max-width: 100%;
}`,
    mobile: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${mobileGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
    compact: `.${node.className} {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${compactGap};
}

${childSelectorList} {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex-basis: auto;
  align-self: stretch;
}`,
  };
}

function parsePixelValue(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractPixelValues(value?: string) {
  if (!value) {
    return [];
  }

  return [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)]
    .map((match) => Number.parseFloat(match[1] ?? ""))
    .filter((number) => Number.isFinite(number));
}

function getPreferredChildWidth(node: TransformedNode) {
  const candidates = [
    ...extractPixelValues(node.styles.width),
    ...extractPixelValues(node.styles.maxWidth),
    ...extractPixelValues(node.styles.minWidth),
    ...extractPixelValues(node.styles.flexBasis),
  ].filter((value) => value > 0);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.max(...candidates);
}

function shouldCollapseRowOnTablet(flowChildren: TransformedNode[], gapValue: number) {
  if (flowChildren.length >= 4) {
    return true;
  }

  if (flowChildren.length !== 3) {
    return false;
  }

  if (isCardGridCandidate(flowChildren)) {
    return true;
  }

  const totalPreferredWidth = flowChildren.reduce((sum, child) => sum + getPreferredChildWidth(child), 0);
  const totalGap = Math.max(0, flowChildren.length - 1) * gapValue;

  return totalPreferredWidth + totalGap > 920;
}

function shouldStackMediaTextPairOnTablet(flowChildren: TransformedNode[], gapValue: number) {
  if (flowChildren.length !== 2) {
    return false;
  }

  const totalPreferredWidth = flowChildren.reduce((sum, child) => sum + getPreferredChildWidth(child), 0);
  const mediaWidth = Math.max(...flowChildren.filter(isMediaLikeChild).map(getPreferredChildWidth), 0);
  const textWidth = Math.max(...flowChildren.filter(isTextLikeChild).map(getPreferredChildWidth), 0);

  return totalPreferredWidth + gapValue > 860 || (mediaWidth >= 420 && textWidth >= 320);
}

function getMixedTriptychPattern(flowChildren: TransformedNode[]) {
  if (flowChildren.length !== 3) {
    return null;
  }

  const mediaIndexes = flowChildren.map((child, index) => (isMediaLikeChild(child) ? index : -1)).filter((index) => index >= 0);
  const textIndexes = flowChildren.map((child, index) => (isTextCardLikeChild(child) ? index : -1)).filter((index) => index >= 0);

  if (mediaIndexes.length !== 1 || textIndexes.length < 2) {
    return null;
  }

  return {
    mediaIndex: mediaIndexes[0],
  };
}

function getMediaTextPair(flowChildren: TransformedNode[]) {
  if (flowChildren.length !== 2) {
    return null;
  }

  const mediaIndex = flowChildren.findIndex(isMediaLikeChild);
  const textIndex = flowChildren.findIndex((child, index) => index !== mediaIndex && isTextLikeChild(child));

  if (mediaIndex === -1 || textIndex === -1) {
    return null;
  }

  return {
    mediaIndex,
    textIndex,
  };
}

function isMediaLikeChild(node: TransformedNode) {
  return Boolean(node.tag === "img" || node.styles.__assetUrl || node.styles.objectFit || node.styles.backgroundImage);
}

function isTextLikeChild(node: TransformedNode) {
  if (node.role === "content") {
    return true;
  }

  return node.children.some((child) => child.role === "content");
}

function isLikelyNavLinksGroup(node: TransformedNode) {
  const lowerName = node.name.toLowerCase();

  if (lowerName.includes("nav items") || lowerName.includes("nav links") || lowerName.includes("footer links")) {
    return true;
  }

  return node.children.length >= 3 && node.children.every((child) => child.role === "content" || child.tag === "a" || child.tag === "p");
}

function isFooterLikeContainer(node: TransformedNode) {
  if (node.styles.display !== "flex" || node.styles.flexDirection !== "row") {
    return false;
  }

  const lowerName = node.name.toLowerCase();

  return lowerName.includes("footer") || lowerName.includes("footer bottom") || lowerName.includes("footer header");
}

function isCardGridCandidate(flowChildren: TransformedNode[]) {
  if (flowChildren.length < 3) {
    return false;
  }

  const visualChildren = flowChildren.filter((child) =>
    Boolean(
      child.styles.backgroundColor ||
        child.styles.backgroundImage ||
        child.styles.border ||
        child.styles.borderTop ||
        child.styles.borderRight ||
        child.styles.borderBottom ||
        child.styles.borderLeft ||
        child.styles.borderRadius ||
        child.styles.boxShadow,
    ),
  );

  if (visualChildren.length !== flowChildren.length) {
    return false;
  }

  return flowChildren.every((child) => {
    const childFlex = child.styles.flex ?? "";
    const childWidth = child.styles.width ?? "";
    return childFlex.includes("1 1") || childFlex.includes("1 0") || childWidth.includes("calc(") || childWidth === "auto";
  });
}

function buildResponsiveTypographyRules(node: TransformedNode) {
  const fontSize = parsePixelValue(node.styles.fontSize);

  if (node.role !== "content" || fontSize < 28) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const tabletFont = `${Math.max(28, Math.round(fontSize * 0.9 * 100) / 100)}px`;
  const mobileFont = `${Math.max(24, Math.round(fontSize * 0.78 * 100) / 100)}px`;
  const compactFont = `${Math.max(20, Math.round(fontSize * 0.64 * 100) / 100)}px`;
  const tabletLineHeight = fontSize >= 40 ? "1.14" : "1.22";
  const mobileLineHeight = fontSize >= 40 ? "1.1" : "1.18";
  const compactLineHeight = fontSize >= 40 ? "1.08" : "1.16";
  const letterSpacing = parsePixelValue(node.styles.letterSpacing);
  const resetLetterSpacing = Math.abs(letterSpacing) > 0.01;

  const tablet = `.${node.className} {
  font-size: min(${tabletFont}, 6vw);
  line-height: ${tabletLineHeight};
${resetLetterSpacing ? "  letter-spacing: 0;" : ""}
}`;

  const mobile = `.${node.className} {
  font-size: min(${mobileFont}, 7vw);
  line-height: ${mobileLineHeight};
${resetLetterSpacing ? "  letter-spacing: 0;" : ""}
}`;

  const compact = `.${node.className} {
  font-size: min(${compactFont}, 8vw);
  line-height: ${compactLineHeight};
${resetLetterSpacing ? "  letter-spacing: 0;" : ""}
}`;

  return {
    tablet,
    mobile,
    compact,
  };
}

function isTextCardLikeChild(node: TransformedNode) {
  const lowerName = node.name.toLowerCase();

  if (lowerName.includes("card") || lowerName.includes("panel") || lowerName.includes("content")) {
    return true;
  }

  return isTextLikeChild(node) && !isMediaLikeChild(node);
}

function buildResponsiveSpacingRules(node: TransformedNode) {
  const minHeight = parsePixelValue(node.styles.minHeight);

  if (node.role === "content" || minHeight < 180) {
    return {
      tablet: "",
      mobile: "",
      compact: "",
    };
  }

  const tabletMinHeight = `${Math.max(0, Math.round(minHeight * 0.86))}px`;
  const mobileMinHeight = `${Math.max(0, Math.round(minHeight * 0.72))}px`;

  return {
    tablet: `.${node.className} {
  min-height: ${tabletMinHeight};
}`,
    mobile: `.${node.className} {
  min-height: ${mobileMinHeight};
}`,
    compact: `.${node.className} {
  min-height: auto;
}`,
  };
}
