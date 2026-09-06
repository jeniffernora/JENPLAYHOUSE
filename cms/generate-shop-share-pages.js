"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const BASE_URL = "https://jeniffernora.github.io/vinyl-from-jen";
const OUT_ROOT = path.join(ROOT, "shop", "share");

function slugify(value) {
  return String(value || "")
    .trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function absoluteImage(v) {
  const x = String(v || "").trim();
  if (!x) return `${BASE_URL}/assets/images/jeniffer.jpg`;
  if (/^https?:\/\//i.test(x)) return x;
  return `${BASE_URL}/${x.replace(/^\/+/, "")}`;
}
function loadCMS() {
  const code = fs.readFileSync(path.join(ROOT, "js", "cms-data.js"), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.JEN_CMS_DATA || {};
}
function visible(r) {
  return !["hidden", "draft", "archived"].includes(String(r.Status || "").trim().toLowerCase());
}
function build(row) {
  const name = row["Product Name"] || "Jeniffer Nora Shop";
  const slug = row.Slug || slugify(name);
  const shareURL = `${BASE_URL}/shop/share/${slug}/`;
  const destination = `${BASE_URL}/?product=${encodeURIComponent(slug)}#shop`;
  const image = absoluteImage(row["Image URL or Path"]);
  const price = Number(row.Price || 0).toLocaleString("id-ID");
  const desc = row.Description ? String(row.Description).replace(/\s+/g, " ").trim() : "Fictional product for roleplay purposes only.";
  const description = `Rp${price} · ${desc}`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} | Jeniffer Nora Shop</title>
<meta property="og:type" content="product">
<meta property="og:site_name" content="Vinyl From Jen">
<meta property="og:title" content="${esc(name)} — Jeniffer Nora Shop">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(shareURL)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(name)} — Jeniffer Nora Shop">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(destination)}">
</head><body><p>Opening ${esc(name)} on Jeniffer Nora Shop...</p></body></html>`;
}

const cms = loadCMS();
const products = (cms.Shop || []).filter(r => r["Product Name"] && visible(r));
fs.mkdirSync(OUT_ROOT, { recursive: true });
for (const row of products) {
  const slug = row.Slug || slugify(row["Product Name"]);
  const folder = path.join(OUT_ROOT, slug);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, "index.html"), build(row), "utf8");
  console.log("✓", row["Product Name"], "→", `shop/share/${slug}/`);
}
console.log(`DONE — generated ${products.length} shop share pages.`);
