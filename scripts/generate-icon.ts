import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Renders assets/icon.svg to assets/icon.png, the base icon plasmo
// resizes into the manifest's 16/32/48/64/128 icons at build time.
const root = path.resolve(import.meta.dirname, "..");
const svg = await readFile(path.join(root, "assets/icon.svg"));

const png = await sharp(svg)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(path.join(root, "assets/icon.png"), png);
console.log(`assets/icon.png generated (${Math.round(png.length / 1024)} kB)`);
