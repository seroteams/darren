import fs from "node:fs";
import path from "node:path";

function writeJson(filePath: string, obj: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function sessionFile(session: { dir: string }, name: string): string {
  return path.join(session.dir, name);
}

function isSkip(input: string | null | undefined): boolean {
  const s = (input || "").trim().toLowerCase();
  return s === "" || s === "skip" || s === "pass" || s === "-";
}

export { writeJson, sessionFile, isSkip };
