// Apply wording changes sent from /copy-editor.
//   node tools/apply-copy.mjs edits.json          → apply, then run `npm run build`
//   node tools/apply-copy.mjs edits.json --check  → only report where each text was found
//   node tools/apply-copy.mjs --audit             → check every text on the editor page can be found
// edits.json is the "changes" field of a copy-edits submission: [{ page, original, edited }].
// Each original is looked up in data/*.json (as JSON text), build.mjs and src/js/*.js and replaced
// everywhere it appears. Anything not found, or only found as part of a longer sentence, is listed
// so it can be done by hand.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ...fs.readdirSync(path.join(ROOT, "data")).filter((f) => f.endsWith(".json")).map((f) => `data/${f}`),
  "build.mjs",
  ...fs.readdirSync(path.join(ROOT, "src/js")).filter((f) => f.endsWith(".js")).map((f) => `src/js/${f}`),
].filter((f) => f !== "data/photo-review.json");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const src = Object.fromEntries(files.map((f) => [f, read(f)]));

// how a piece of text looks inside each kind of file
const YEAR = String(new Date().getFullYear());
const variants = (t) => {
  const v = [t];
  const add = (x) => { if (!v.includes(x)) v.push(x); };
  add(t.replace(/^[“"]([\s\S]*)[”"]$/, "$1"));       // review quotes are wrapped in curly quotes
  if (/[.]$/.test(t)) add(t.slice(0, -1));            // headings get a full stop added
  if (t.includes(YEAR)) add(t.split(YEAR).join("{year}"));
  if (t.includes("[city]")) { add(t.split("[city]").join("${esc(c.name)}")); add(t.split("[city]").join("${c.name}")); }
  return v;
};
// same transforms, applied to the edited text so it lands in the same shape
const variantsLike = (orig, edited) => {
  const v = [edited];
  if (/^[“"][\s\S]*[”"]$/.test(orig)) v.push(edited.replace(/^[“"]([\s\S]*)[”"]$/, "$1"));
  if (/[.]$/.test(orig)) v.push(edited.replace(/[.]$/, ""));
  if (orig.includes(YEAR)) v.push(edited.split(YEAR).join("{year}"));
  if (orig.includes("[city]")) { v.push(edited.split("[city]").join("${esc(c.name)}")); v.push(edited.split("[city]").join("${c.name}")); }
  return v;
};
const shapes = (x) => [x, JSON.stringify(x).slice(1, -1), x.replace(/&/g, "&amp;"), x.replace(/'/g, "\\'")];
const forms = (t, f) => {
  const set = new Set();
  for (const x of variants(t)) {
    set.add(x);
    if (f.endsWith(".json")) set.add(JSON.stringify(x).slice(1, -1));
    set.add(x.replace(/&/g, "&amp;"));
    set.add(x.replace(/'/g, "\\'"));
  }
  return [...set];
};
const locate = (t) => {
  const hits = [];
  for (const f of files) for (const form of forms(t, f)) {
    const n = src[f].split(form).length - 1;
    if (n) { hits.push({ file: f, form, n }); break; }
  }
  return hits;
};

const args = process.argv.slice(2);
if (args.includes("--audit")) {
  const html = fs.readFileSync(path.join(ROOT, "dist/copy-editor/index.html"), "utf8");
  const dec = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const all = [...html.matchAll(/data-original="([^"]*)"/g)].map((m) => dec(m[1]));
  const missing = all.filter((t) => !locate(t).length);
  console.log(`${all.length - missing.length} of ${all.length} texts found in the source files.`);
  if (missing.length) console.log("Not found as-is (built from pieces; edit by hand):\n" + missing.map((t) => "  - " + t).join("\n"));
  process.exit(0);
}

const edits = JSON.parse(fs.readFileSync(args[0], "utf8"));
const check = args.includes("--check");
const manual = [];
for (const e of edits) {
  if (!e.original || e.edited === undefined || e.original === e.edited) continue;
  const hits = locate(e.original);
  if (!hits.length) { manual.push(e); continue; }
  for (const h of hits) {
    let to = e.edited;
    const vo = variants(e.original), ve = variantsLike(e.original, e.edited);
    outer: for (let i = 0; i < vo.length; i++) {
      const so = shapes(vo[i]), se = shapes(ve[i] ?? e.edited);
      for (let j = 0; j < so.length; j++) if (h.form === so[j]) { to = se[j]; break outer; }
    }
    console.log(`${check ? "found" : "changed"} ${h.n}× in ${h.file}: "${e.original.slice(0, 60)}${e.original.length > 60 ? "…" : ""}"`);
    if (!check) src[h.file] = src[h.file].split(h.form).join(to);
  }
}
if (!check) for (const f of files) if (src[f] !== read(f)) fs.writeFileSync(path.join(ROOT, f), src[f]);
if (manual.length) console.log(`\n${manual.length} not found automatically, do by hand:\n` + manual.map((e) => `  [${e.page}] "${e.original}"\n     → "${e.edited}"`).join("\n"));
