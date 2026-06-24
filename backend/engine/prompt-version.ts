import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "./paths.mts";

export function promptVersionFor(promptPath: string): string {
  const full = path.isAbsolute(promptPath) ? promptPath : path.join(CONTENT_DIR, promptPath);
  const text = fs.readFileSync(full, "utf8");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

export function withPromptVersion(
  inputs: Record<string, unknown>,
  promptPath: string | null | undefined
): Record<string, unknown> {
  if (!promptPath) return inputs;
  return { ...inputs, prompt_version: promptVersionFor(promptPath) };
}
