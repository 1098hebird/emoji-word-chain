import fs from "node:fs";
import path from "node:path";

const src = path.join("src", "data", "emojiData.json");
const destDir = path.join("dist", "data");
const dest = path.join(destDir, "emojiData.json");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`[copy-assets] ${src} -> ${dest}`);
