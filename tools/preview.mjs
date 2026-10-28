// Makes a copy of dist/ that opens by double-clicking — no server needed.
//   npm run preview   →  then open preview/index.html
// (dist/ is what you upload; preview/ is just for looking at it locally.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "preview");
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(DIST, OUT, { recursive: true });

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const file of walk(OUT)) {
  const rel = path.relative(OUT, file);
  const depth = rel.split(path.sep).length - 1;
  const up = "../".repeat(depth);
  if (file.endsWith(".css")) {
    // Browsers block font files opened from disk, so embed them in the CSS.
    const css = fs.readFileSync(file, "utf8").replace(/url\("\/assets\/fonts\/([^"]+)"\)/g, (m, f) =>
      `url("data:font/woff2;base64,${fs.readFileSync(path.join(DIST, "assets/fonts", f)).toString("base64")}")`);
    fs.writeFileSync(file, css.replace(/url\("\/assets\//g, 'url("../'));
    continue;
  }
  if (!file.endsWith(".html")) continue;
  let h = fs.readFileSync(file, "utf8").replace(/<link rel="preload"[^>]*font[^>]*>\n?/g, "");
  // page links: href="/" and href="/some/page" → relative .../index.html
  h = h.replace(/href="\/([^"#?]*)([?#][^"]*)?"/g, (m, p, q = "") => {
    if (p.startsWith("assets/") || /\.[a-z0-9]+$/i.test(p)) return `href="${up}${p}${q}"`;
    const clean = p.replace(/\/$/, "");
    return `href="${up}${clean ? clean + "/" : ""}index.html${q}"`;
  });
  // data-cat-* links on model cards (shop page filter)
  h = h.replace(/(data-cat-[a-z-]+)="\/([^"?]*)([?][^"]*)?"/g, (m, a, p, q = "") => `${a}="${up}${p}/index.html${q}"`);
  // assets anywhere (src, srcset, JSON data, data-media attributes)
  h = h.replace(/(["'=]|&quot;|&#39;)\/assets\//g, `$1${up}assets/`);
  h = h.replace(/src="\/(favicon|apple-touch-icon)/g, `src="${up}$1`);
  fs.writeFileSync(file, h);
}
console.log("Preview ready: open preview/index.html in your browser.");
