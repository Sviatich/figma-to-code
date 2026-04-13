import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SaveFigmaSnapshotParams = {
  fileKey: string;
  fileName: string;
  sourceUrl: string;
  suggestedNodeId?: string;
  payload: unknown;
};

const snapshotDirectory = path.join(process.cwd(), ".transfig-data", "figma-snapshots");

async function ensureSnapshotDirectory() {
  await mkdir(snapshotDirectory, { recursive: true });
}

function sanitizeFileNameSegment(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildSnapshotId(fileName: string) {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const safeName = sanitizeFileNameSegment(fileName) || "figma-file";
  return `${timestamp}--${safeName}`;
}

function getSnapshotPath(snapshotId: string) {
  return path.join(snapshotDirectory, `${snapshotId}.json`);
}

export async function saveFigmaSnapshot({
  fileKey,
  fileName,
  sourceUrl,
  suggestedNodeId,
  payload,
}: SaveFigmaSnapshotParams) {
  await ensureSnapshotDirectory();

  const snapshotId = buildSnapshotId(fileName);
  const snapshotPath = getSnapshotPath(snapshotId);
  const snapshot = {
    createdAt: new Date().toISOString(),
    fileKey,
    fileName,
    sourceUrl,
    suggestedNodeId,
    payload,
  };

  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");

  return {
    snapshotId,
    snapshotPath,
  };
}

export async function readFigmaSnapshot(snapshotId: string) {
  await ensureSnapshotDirectory();
  const snapshotPath = getSnapshotPath(snapshotId);
  const content = await readFile(snapshotPath, "utf8");

  return {
    snapshotPath,
    content,
  };
}
