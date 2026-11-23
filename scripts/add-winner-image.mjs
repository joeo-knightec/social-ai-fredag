import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!["--name", "--date", "--image"].includes(key) || !args[i + 1] || args[i + 1].startsWith("--")) {
      throw new Error("Usage: npm run add-winner-image -- --name \"Winner Name\" --date YYYY-MM-DD --image /path/to/image");
    }
    if (options[key]) throw new Error(`Duplicate option: ${key}`);
    options[key] = args[i + 1];
  }
  if (!options["--name"] || !options["--date"] || !options["--image"]) {
    throw new Error("Required options: --name, --date, and --image.");
  }
  return { name: options["--name"], date: options["--date"], imagePath: path.resolve(options["--image"]) };
}

export async function addWinnerImage({ name, date, imagePath }, root = projectRoot) {
  if (!name || !imagePath || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error("Provide a name, image path and valid date in YYYY-MM-DD format.");
  }
  const publicDir = path.join(root, "public");
  const csv = await fs.readFile(path.join(publicDir, "Social_AI_Fredag.csv"), "utf8");
  const parsed = Papa.parse(csv, { header: true, delimiter: ";", skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(`Invalid winner CSV: ${parsed.errors[0].message}`);
  const matches = parsed.data.filter((row) => row.Namn === name && row.Datum === date);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one CSV winner matching "${name}" on ${date}; found ${matches.length}.`);
  }
  const metadata = await sharp(imagePath, { animated: true }).metadata();
  if ((metadata.pages ?? 1) > 1) throw new Error("Animated or multi-page images are not supported.");
  const image = await sharp(imagePath).rotate().resize(960, 960, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

  const manifestPath = path.join(publicDir, "winner-gallery.json");
  const imageDir = path.join(publicDir, "winner-images");
  const lockPath = `${manifestPath}.lock`;
  const lock = await fs.open(lockPath, "wx");
  let createdImage = null;
  let tempManifest = null;
  let saved = false;
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (!Array.isArray(manifest) || manifest.some((entry) =>
      !entry || typeof entry.date !== "string" || typeof entry.name !== "string" || typeof entry.image !== "string")) {
      throw new Error("Invalid winner gallery manifest.");
    }
    if (manifest.some((entry) => entry.date === date && entry.name === name)) {
      throw new Error(`Gallery already contains "${name}" on ${date}; no image was changed.`);
    }
    await fs.mkdir(imageDir, { recursive: true });
    const imageName = `winner-${date}-${randomUUID()}.webp`;
    const imageFilePath = path.join(imageDir, imageName);
    const imageFile = await fs.open(imageFilePath, "wx");
    createdImage = imageFilePath;
    try {
      await imageFile.writeFile(image);
    } finally {
      await imageFile.close();
    }
    manifest.push({ date, name, image: imageName });
    const tempPath = `${manifestPath}.${randomUUID()}.tmp`;
    const tempFile = await fs.open(tempPath, "wx");
    tempManifest = tempPath;
    try {
      await tempFile.writeFile(`${JSON.stringify(manifest, null, 2)}\n`);
    } finally {
      await tempFile.close();
    }
    await fs.rename(tempManifest, manifestPath);
    tempManifest = null;
    saved = true;
    return { image: imageName, name, date };
  } finally {
    if (tempManifest) await fs.rm(tempManifest, { force: true });
    if (!saved && createdImage) await fs.rm(createdImage, { force: true });
    await lock.close();
    await fs.unlink(lockPath);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await addWinnerImage(parseArgs(process.argv.slice(2)));
    console.log(`Added ${result.name} (${result.date}): public/winner-images/${result.image}`);
    console.log("Review the image before publishing; run npm run build && npm run deploy to publish.");
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
