// Pull titles, prices and availability from Shopify into data/products.json.
//   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com \
//   SHOPIFY_STOREFRONT_TOKEN=xxxx npm run shopify:pull && npm run build
//
// Shopify is the source of truth for: product title, variant titles, prices,
// SKUs and whether a variant is available. Everything else in products.json
// (photos, descriptions, "What's included", page order) stays as you set it,
// so you can manage the look of the site here and the catalog in Shopify.
//
// Products are matched by handle, variants by SKU (then by title).
// Get the token from Shopify admin → Sales channels → Headless → your storefront
// (public Storefront API token). Products must be published to that channel.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "data/products.json");
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";
if (!domain || !token) {
  console.error("Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN first (see README).");
  process.exit(1);
}

const QUERY = `query Products($cursor: String) {
  products(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle title productType tags
      variants(first: 50) { nodes { title sku availableForSale price { amount } } }
    }
  }
}`;

async function fetchAll() {
  const out = [];
  let cursor = null;
  do {
    const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { cursor } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const page = json.data.products;
    out.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

const catalog = JSON.parse(fs.readFileSync(FILE, "utf8"));
const remote = Object.fromEntries((await fetchAll()).map((p) => [p.handle, p]));
let changed = 0;
const missing = [];
for (const p of catalog.products) {
  const r = remote[p.handle];
  if (!r) { missing.push(p.handle); continue; }
  p.title = r.title;
  if (r.productType) p.productType = r.productType;
  if (r.tags?.length) p.tags = r.tags;
  const remoteVariants = r.variants.nodes;
  for (const v of p.variants) {
    const rv = remoteVariants.find((x) => x.sku && x.sku === v.sku) || remoteVariants.find((x) => x.title === v.title);
    if (!rv) continue;
    const price = Number(rv.price.amount).toFixed(2);
    if (price !== v.price || rv.title !== v.title || v.available !== rv.availableForSale) changed++;
    v.price = price;
    if (rv.title !== "Default Title") v.title = rv.title;
    v.available = rv.availableForSale;
  }
}
fs.writeFileSync(FILE, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Synced from ${domain}: ${changed} variant change(s).`);
if (missing.length) console.log(`Not found in Shopify (left as-is): ${missing.join(", ")}`);
