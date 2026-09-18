import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const patterns = [
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/,
  /postgres:\/\/[^:]+:[^@]+@/,
  /AKIA[0-9A-Z]{16}/,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "dist"].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (!name.endsWith(".png")) files.push(path);
  }
  return files;
}

let failed = false;
for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      console.error(`secret pattern in ${file}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("secret scan passed");
