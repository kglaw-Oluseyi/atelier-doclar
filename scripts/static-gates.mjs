import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const banned = [
  /^\s*it\.skip\(/m,
  /^\s*describe\.skip\(/m,
  /^\s*test\.skip\(/m,
  /\.only\(/,
  /\bTODO\b/,
  /\bFIXME\b/,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "dist", "coverage"].includes(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) files.push(path);
  }
  return files;
}

let failed = false;
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  for (const pattern of banned) {
    if (pattern.test(text)) {
      console.error(`${file} matches ${pattern}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("static gates passed");
