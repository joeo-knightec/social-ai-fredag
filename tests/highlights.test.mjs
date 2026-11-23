import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));

function loadComponent(relativePath, overrides = {}) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (specifier) => specifier in overrides ? overrides[specifier] : require(specifier);
  loaded._compile(javascript, filename);
  return loaded.exports;
}

const insights = loadComponent("src/app/_lib/insights.ts");
const { default: Highlights, downloadRecap } = loadComponent("src/app/_components/highlights.tsx", {
  "../_lib/insights": insights,
  "../page.module.css": { default: new Proxy({}, { get: (_, key) => key }) },
  "next/image": { default: ({ src, alt }) => React.createElement("img", { src, alt }) },
  "../../../public/winner-gallery.json": { default: [
    { date: "2026-01-09", name: "Alex", image: "alex.webp" },
    { date: "2026-01-09", name: "Bea", image: "bea.webp" },
    { date: "2026-01-09", name: "Other", image: "not-a-winner.webp" },
  ] },
});

test("recap and gallery render tied winners, sharing actions and only matched images", () => {
  const data = [
    { Namn: "Alex", Runda: 5, Datum: "2026-01-09", Röster: 20, Kontor: "North" },
    { Namn: "Bea", Runda: 5, Datum: "2026-01-09", Röster: 20, Kontor: "West" },
  ];
  const html = renderToStaticMarkup(React.createElement(Highlights, { data }));
  assert.match(html, /Senaste fredagen/);
  assert.match(html, /Runda 5/);
  assert.match(html, /Ladda ned bild/);
  assert.match(html, /Kopiera text/);
  assert.match(html, /Prestationsmärken/);
  assert.match(html, /20 röster/);
  assert.match(html, /Vinnarbild av Alex från 2026-01-09/);
  assert.match(html, /Vinnarbild av Bea från 2026-01-09/);
  assert.doesNotMatch(html, /not-a-winner\.webp/);
});

test("recap image download draws both winners and saves a PNG", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const lines = [];
  let clicked = false;
  let revoked = false;
  const link = { click: () => { clicked = true; } };
  const context = {
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    fillText: (text) => lines.push(text),
  };
  const canvas = {
    getContext: () => context,
    toBlob: (callback, type) => { assert.equal(type, "image/png"); callback(new Blob(["image"], { type })); },
  };
  try {
    globalThis.document = { createElement: (tag) => tag === "canvas" ? canvas : link };
    globalThis.window = { setTimeout: (callback) => callback() };
    URL.createObjectURL = () => "blob:recap";
    URL.revokeObjectURL = (url) => { assert.equal(url, "blob:recap"); revoked = true; };
    await downloadRecap({
      round: 5, date: "2026-01-09",
      winners: [
        { Namn: "Alex", Röster: 20 },
        { Namn: "Bea", Röster: 20 },
      ],
    });
    assert(lines.includes("Alex"));
    assert(lines.includes("Bea"));
    assert.equal(link.download, "social-ai-fredag-5.png");
    assert.equal(link.href, "blob:recap");
    assert(clicked);
    assert(revoked);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
