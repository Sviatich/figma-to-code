import type { GeneratedFile } from "@/shared/schemas/project";
import type { FigmaSourceSnapshot } from "./figma";

type GenerateResultParams = {
  name: string;
  figmaFileKey: string;
  nodeId: string;
  source: FigmaSourceSnapshot;
};

export function generateProjectArtifacts({
  name,
  figmaFileKey,
  nodeId,
  source,
}: GenerateResultParams): {
  files: GeneratedFile[];
  previewHtml: string;
  summary: string;
} {
  const appName = sanitizeName(name);
  const previewHtml = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(name)} Preview</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #fff7eb;
        --card: rgba(255, 255, 255, 0.84);
        --ink: #1f1d1a;
        --soft: #625c54;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
        font-family: "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(255, 146, 85, 0.28), transparent 30%),
          linear-gradient(180deg, #fffaf4 0%, var(--bg) 100%);
      }
      .shell {
        width: min(960px, 100%);
        border: 1px solid rgba(31, 29, 26, 0.1);
        border-radius: 28px;
        background: var(--card);
        box-shadow: 0 20px 50px rgba(85, 57, 37, 0.16);
        overflow: hidden;
      }
      .bar {
        display: flex;
        gap: 8px;
        padding: 18px 22px;
        border-bottom: 1px solid rgba(31, 29, 26, 0.08);
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: rgba(31, 29, 26, 0.16);
      }
      .content {
        display: grid;
        gap: 24px;
        padding: 32px;
      }
      .label {
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255, 107, 44, 0.12);
        color: #b13d09;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      h1 {
        max-width: 12ch;
        font-size: clamp(36px, 7vw, 74px);
        line-height: 0.95;
        letter-spacing: -0.06em;
      }
      p {
        max-width: 54ch;
        color: var(--soft);
        font-size: 18px;
        line-height: 1.7;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }
      .card {
        padding: 18px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(31, 29, 26, 0.08);
      }
      .card strong {
        display: block;
        margin-bottom: 8px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      <section class="content">
        <span class="label">${source.mode === "live" ? "Live Figma" : "Mock Figma"}</span>
        <h1>${escapeHtml(source.nodeName)}</h1>
        <p>${escapeHtml(
          source.mode === "live"
            ? "Данные пришли из реального ответа Figma API."
            : "Сейчас используется безопасный mock-режим без токена и без БД.",
        )}</p>
        <div class="grid">
          <article class="card"><strong>Project</strong><span>${escapeHtml(name)}</span></article>
          <article class="card"><strong>File key</strong><span>${escapeHtml(figmaFileKey)}</span></article>
          <article class="card"><strong>Node ID</strong><span>${escapeHtml(nodeId)}</span></article>
          <article class="card"><strong>Node type</strong><span>${escapeHtml(source.nodeType)}</span></article>
        </div>
      </section>
    </div>
  </body>
</html>`;

  const files: GeneratedFile[] = [
    {
      path: "src/app/page.tsx",
      language: "tsx",
      content: `import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.badge}>Generated from Figma</span>
        <h1>${source.nodeName}</h1>
        <p>${source.mode === "live" ? "Данные пришли из реального ответа Figma API." : "Использован mock-режим генератора."}</p>
      </section>

      <section className={styles.metaGrid}>
        <article className={styles.metaCard}>
          <strong>Project</strong>
          <span>${name}</span>
        </article>
        <article className={styles.metaCard}>
          <strong>Figma file</strong>
          <span>${figmaFileKey}</span>
        </article>
        <article className={styles.metaCard}>
          <strong>Node ID</strong>
          <span>${nodeId}</span>
        </article>
        <article className={styles.metaCard}>
          <strong>Node type</strong>
          <span>${source.nodeType}</span>
        </article>
      </section>
    </main>
  );
}
`,
    },
    {
      path: "src/app/page.module.css",
      language: "css",
      content: `.page {
  min-height: 100vh;
  padding: 48px 24px 72px;
  color: #1f1d1a;
  background:
    radial-gradient(circle at top left, rgba(255, 146, 85, 0.24), transparent 30%),
    linear-gradient(180deg, #fffaf4 0%, #f5efe4 100%);
}

.hero {
  display: grid;
  gap: 16px;
  width: min(960px, 100%);
  margin: 0 auto 24px;
}

.badge {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 107, 44, 0.12);
  color: #b13d09;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1 {
  max-width: 12ch;
  font-size: clamp(42px, 8vw, 84px);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.hero p {
  max-width: 54ch;
  color: #625c54;
  font-size: 18px;
  line-height: 1.7;
}

.metaGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  width: min(960px, 100%);
  margin: 0 auto;
}

.metaCard {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(255, 255, 255, 0.82);
}

.metaCard strong {
  display: block;
  margin-bottom: 10px;
}
`,
    },
    {
      path: "src/generated/source.json",
      language: "json",
      content: JSON.stringify(source.raw, null, 2),
    },
    {
      path: "README.md",
      language: "md",
      content: `# ${appName}

Generated from Figma node \`${nodeId}\` in file \`${figmaFileKey}\`.

- Generator mode: ${source.mode}
- Original node: ${source.nodeName}
- Original type: ${source.nodeType}
`,
    },
  ];

  return {
    files,
    previewHtml,
    summary: `${source.mode === "live" ? "Live" : "Mock"} import for "${source.nodeName}" with ${files.length} generated files.`,
  };
}

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "Generated App";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
