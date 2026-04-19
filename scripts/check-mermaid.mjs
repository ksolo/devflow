#!/usr/bin/env node
// Parse every ```mermaid fenced block found in .md files under the repo, using
// mermaid.parse() directly. No Chromium — but mermaid 10's parse path
// transitively loads dompurify, which needs a DOM to initialize properly.
// We provide one via jsdom so feature detection picks the real dompurify
// implementation (complete with `addHook`) instead of the no-DOM shim.
//
// Usage:
//   node scripts/check-mermaid.mjs            # walks the repo root
//   node scripts/check-mermaid.mjs docs       # walks a specific path
//
// Exits non-zero if any block fails to parse.

import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const key of [
  "window",
  "document",
  "navigator",
  "Element",
  "HTMLElement",
  "Node",
  "DocumentFragment",
  "SVGElement",
  "DOMParser",
]) {
  if (!(key in globalThis) && key in dom.window) {
    globalThis[key] = dom.window[key];
  }
}

const { default: mermaid } = await import("mermaid");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".turbo",
  "tmp",
]);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield full;
    }
  }
}

const root = resolve(process.argv[2] ?? ".");
const fenceRe = /```mermaid\s*\n([\s\S]*?)```/g;

let checked = 0;
let failed = 0;

for await (const file of walk(root)) {
  const text = await readFile(file, "utf8");
  const rel = relative(root, file) || file;
  let match;
  let blockIdx = 0;
  while ((match = fenceRe.exec(text)) !== null) {
    blockIdx++;
    const body = match[1];
    const startLine = text.slice(0, match.index).split("\n").length;
    try {
      await mermaid.parse(body);
      checked++;
    } catch (err) {
      failed++;
      const firstLine = (err?.message ?? String(err)).split("\n")[0];
      console.error(
        `FAIL ${rel}:${startLine} (mermaid block #${blockIdx}) — ${firstLine}`,
      );
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} mermaid block(s) failed to parse (${checked} passed).`);
  process.exit(1);
}

console.log(`OK: ${checked} mermaid block(s) parsed successfully.`);
