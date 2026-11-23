import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { addWinnerImage } from "../scripts/add-winner-image.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "winner-image-test-"));
  const publicDir = path.join(root, "public");
  await fs.mkdir(publicDir);
  const csv = "Namn;Röster;Runda;Datum;Kontor\nSofia Börjesson;16;149;2026-01-16;West\n";
  await fs.writeFile(path.join(publicDir, "Social_AI_Fredag.csv"), csv);
  await fs.writeFile(path.join(publicDir, "winner-gallery.json"), "[]\n");
  const imagePath = path.join(root, "source.png");
  await sharp({ create: { width: 1200, height: 600, channels: 3, background: "red" } }).png().toFile(imagePath);
  return { root, publicDir, imagePath };
}

test("adds an optimized image and matching manifest entry without modifying the source", async () => {
  const { root, publicDir, imagePath } = await fixture();
  try {
    const source = await fs.readFile(imagePath);
    const result = await addWinnerImage({ name: "Sofia Börjesson", date: "2026-01-16", imagePath }, root);
    const entries = JSON.parse(await fs.readFile(path.join(publicDir, "winner-gallery.json"), "utf8"));
    assert.deepEqual(entries, [{ date: "2026-01-16", name: "Sofia Börjesson", image: result.image }]);
    const output = path.join(publicDir, "winner-images", result.image);
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 960);
    assert.equal(metadata.height, 480);
    assert.deepEqual(await fs.readFile(imagePath), source);
    await assert.rejects(addWinnerImage({ name: "Sofia Börjesson", date: "2026-01-16", imagePath }, root), /already contains/);
    assert.equal((await fs.readdir(path.join(publicDir, "winner-images"))).length, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(publicDir, "winner-gallery.json"), "utf8")), entries);
    assert(!(await fs.readdir(publicDir)).some((name) => name.endsWith(".lock") || name.endsWith(".tmp")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid dates, unknown or ambiguous winners, and invalid images without writing", async () => {
  const { root, publicDir, imagePath } = await fixture();
  try {
    const manifestPath = path.join(publicDir, "winner-gallery.json");
    const initial = await fs.readFile(manifestPath, "utf8");
    await assert.rejects(addWinnerImage({ name: "Sofia Börjesson", date: "2026-02-30", imagePath }, root), /valid date/);
    await assert.rejects(addWinnerImage({ name: "Other", date: "2026-01-16", imagePath }, root), /found 0/);
    await fs.appendFile(path.join(publicDir, "Social_AI_Fredag.csv"), "Sofia Börjesson;16;149;2026-01-16;West\n");
    await assert.rejects(addWinnerImage({ name: "Sofia Börjesson", date: "2026-01-16", imagePath }, root), /found 2/);
    await fs.writeFile(path.join(publicDir, "Social_AI_Fredag.csv"), "Namn;Röster;Runda;Datum;Kontor\nSofia Börjesson;16;149;2026-01-16;West\n");
    await fs.writeFile(imagePath, "not an image");
    await assert.rejects(addWinnerImage({ name: "Sofia Börjesson", date: "2026-01-16", imagePath }, root));
    assert.equal(await fs.readFile(manifestPath, "utf8"), initial);
    assert.deepEqual((await fs.readdir(publicDir)).sort(), ["Social_AI_Fredag.csv", "winner-gallery.json"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("CLI rejects incomplete arguments with a nonzero exit", () => {
  const result = spawnSync(process.execPath, ["scripts/add-winner-image.mjs", "--name", "Sofia Börjesson"], {
    cwd: projectRoot, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Required options/);
});

test("cleans up the lock if the gallery manifest is invalid", async () => {
  const { root, publicDir, imagePath } = await fixture();
  try {
    const manifestPath = path.join(publicDir, "winner-gallery.json");
    await fs.writeFile(manifestPath, "not json");
    await assert.rejects(addWinnerImage({ name: "Sofia Börjesson", date: "2026-01-16", imagePath }, root));
    assert.equal(await fs.readFile(manifestPath, "utf8"), "not json");
    assert.deepEqual((await fs.readdir(publicDir)).sort(), ["Social_AI_Fredag.csv", "winner-gallery.json"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("CLI accepts an image path relative to the invocation directory", async () => {
  const { root, publicDir } = await fixture();
  try {
    await fs.mkdir(path.join(root, "scripts"));
    await fs.copyFile(path.join(projectRoot, "scripts/add-winner-image.mjs"), path.join(root, "scripts/add-winner-image.mjs"));
    await fs.symlink(path.join(projectRoot, "node_modules"), path.join(root, "node_modules"), "dir");
    const result = spawnSync(process.execPath, [
      path.join(root, "scripts/add-winner-image.mjs"),
      "--name", "Sofia Börjesson", "--date", "2026-01-16", "--image", "source.png",
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Added Sofia Börjesson/);
    const entries = JSON.parse(await fs.readFile(path.join(publicDir, "winner-gallery.json"), "utf8"));
    assert.equal(entries.length, 1);
    assert.equal((await sharp(path.join(publicDir, "winner-images", entries[0].image)).metadata()).format, "webp");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
