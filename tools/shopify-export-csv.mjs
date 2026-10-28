// Export data/products.json as a Shopify product-import CSV.
//   SITE_URL=https://your-live-site.netlify.app npm run shopify:export
// Then in Shopify admin: Products → Import → choose shopify-products.csv.
// Image URLs must be publicly reachable, so deploy the site first and point
// SITE_URL at it (defaults to the "url" in data/site.json).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "data/site.json"), "utf8"));
const { products } = JSON.parse(fs.readFileSync(path.join(ROOT, "data/products.json"), "utf8"));
const BASE = (process.env.SITE_URL || site.url).replace(/\/$/, "");

const cols = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Variant SKU", "Variant Grams", "Variant Inventory Tracker",
  "Variant Inventory Policy", "Variant Fulfillment Service", "Variant Price", "Variant Requires Shipping",
  "Variant Taxable", "Image Src", "Image Position", "Image Alt Text", "Variant Image", "SEO Title", "SEO Description", "Status",
];
const q = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const html = (t) => (t || "").split(/\n+/).map((l) => `<p>${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("");

const rows = [];
for (const p of products) {
  const images = [];
  for (const v of p.variants) for (const src of v.images) if (!images.includes(src)) images.push(src);
  const total = Math.max(p.variants.length, images.length);
  for (let i = 0; i < total; i++) {
    const v = p.variants[i];
    const img = images[i];
    const row = Object.fromEntries(cols.map((c) => [c, ""]));
    row["Handle"] = p.handle;
    if (i === 0) {
      Object.assign(row, {
        "Title": p.title,
        "Body (HTML)": html(p.variants[0].details),
        "Vendor": p.vendor,
        "Type": p.productType,
        "Tags": p.tags.join(", "),
        "Published": "TRUE",
        "Option1 Name": p.variants.length > 1 ? "Package" : "Title",
        "SEO Title": p.seo.title,
        "SEO Description": p.seo.description,
        "Status": "active",
      });
    }
    if (v) {
      Object.assign(row, {
        "Option1 Value": p.variants.length > 1 ? v.title : "Default Title",
        "Variant SKU": v.sku,
        "Variant Grams": "0",
        "Variant Inventory Policy": "continue",
        "Variant Fulfillment Service": "manual",
        "Variant Price": v.price,
        "Variant Requires Shipping": "FALSE",
        "Variant Taxable": "TRUE",
        "Variant Image": v.images[0] ? BASE + v.images[0] : "",
      });
    }
    if (img) Object.assign(row, { "Image Src": BASE + img, "Image Position": String(i + 1), "Image Alt Text": `${p.title}` });
    rows.push(row);
  }
}
const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\n");
fs.writeFileSync(path.join(ROOT, "shopify-products.csv"), csv);
console.log(`Wrote shopify-products.csv — ${products.length} products, ${rows.length} rows (images from ${BASE})`);
