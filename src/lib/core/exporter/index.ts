import JSZip from "jszip";
import type { GeneratedFile } from "../types";

export async function buildProjectArchive(files: GeneratedFile[]) {
  const archive = new JSZip();
  files.forEach((file) => archive.file(file.path, file.content));
  return archive.generateAsync({ type: "arraybuffer" });
}
