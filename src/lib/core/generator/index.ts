import type { GeneratedFile, GeneratedFontAsset, GeneratedProjectArtifacts, TransformedNode } from "../types";

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
  const attrs = [`className={styles["${node.className}"]}`];

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

  if (node.tag === "img") {
    const assetUrl = node.styles.__assetUrl;
    return `${spaces}<img class="${node.className}" src="${escapeAttribute(assetUrl ?? "")}" alt="${escapeAttribute(node.name)}" />`;
  }

  const children = node.children.map((child) => toHtmlMarkup(child, indent + 2)).join("\n");
  const text = node.textContent ? escapeHtml(node.textContent) : "";

  if (!children && !text) {
    return `${spaces}<${node.tag} class="${node.className}"></${node.tag}>`;
  }

  if (!children) {
    return `${spaces}<${node.tag} class="${node.className}">${text}</${node.tag}>`;
  }

  return `${spaces}<${node.tag} class="${node.className}">\n${text ? `${spaces}  ${text}\n` : ""}${children}\n${spaces}</${node.tag}>`;
}

function toCss(root: TransformedNode, fontAssets: GeneratedFontAsset[]) {
  const fontImports = fontAssets.map((asset) => `@import url("${asset.importUrl}");`).join("\n");

  const blocks = [
    `${fontImports ? `${fontImports}\n\n` : ""}:root {
  color-scheme: light;
  --app-bg: #eff2f8;
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
  background:
    radial-gradient(circle at top, rgba(164, 196, 255, 0.24), transparent 26%),
    linear-gradient(180deg, #fbfcff 0%, var(--app-bg) 100%);
  font-family: var(--font-sans, "Segoe UI", sans-serif);
  overflow: auto;
}

img {
  display: block;
}
`,
  ];

  visit(root, (node, depth) => {
    const declarations = Object.entries(node.styles)
      .filter(([property]) => !property.startsWith("__"))
      .map(([property, value]) => `  ${toKebabCase(property)}: ${value};`)
      .join("\n");

    const defaults: string[] = [];

    if (depth === 0) {
      defaults.push("  margin: 32px auto;");
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
  });

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
