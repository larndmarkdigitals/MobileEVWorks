// Mobile EV Works — static site builder (Node 18+, no dependencies)
// Reads data/*.json + src/ and writes plain HTML into dist/.
//   npm run build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "dist");
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const site = readJson("data/site.json");
const catalog = readJson("data/products.json");
const areas = readJson("data/service-areas.json");
const kit = readJson("data/kit.json");
const products = catalog.products;
const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
const VERSION = Date.now().toString(36);
const YEAR = new Date().getFullYear();

// Which product a model card should open when the shop page is filtered (?category=…)
const CATEGORIES = {
  "ambient-lighting": { label: "ambient lighting", "tesla-model-3y": "ambient-lighting-3y", "tesla-model-s-x": "ambient-lighting-sx" },
};

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toFixed(2);
const minPrice = (p) => Math.min(...p.variants.map((v) => parseFloat(v.price)));
const tel = (p) => "tel:" + p.replace(/[^0-9+]/g, "");
const modelsText = (p) => p.compatibleModels.join(" & ");
const write = (rel, html) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
};
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

// ---------- icons (inline SVG, inherit colour) ----------
const svg = (d, vb = "0 0 24 24", extra = "") => `<svg class="ic" viewBox="${vb}" aria-hidden="true" ${extra}>${d}</svg>`;
const stroke = (d) => svg(d, "0 0 24 24", 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="fill:none"');
const ICON = {
  left: stroke('<path d="M15 5l-7 7 7 7"/>'),
  right: stroke('<path d="M9 5l7 7-7 7"/>'),
  close: stroke('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: stroke('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  star: svg('<path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>'),
  phone: stroke('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  instagram: stroke('<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><path d="M17.5 6.5h.01"/>'),
};
const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5 stars" style="--n:${n}"></span>`;
const arrow = `<span class="arrow" aria-hidden="true">→</span>`;

// ---------- shared pieces ----------
const modelCards = () => site.models.map((m) => {
  const cats = Object.entries(CATEGORIES).map(([k, c]) => ` data-cat-${k}="/product-stack-flat/${c[m.collection]}"`).join("");
  return `
      <a class="model-card" href="/cars/${m.collection}"${cats}>
        <img src="${m.image}" alt="Tesla ${esc(m.name)}" width="247" height="139" loading="lazy">
        <h3>${esc(m.name)}</h3>
        <div class="model-links"><span>Learn</span><span>Shop</span></div>
      </a>`;
}).join("");

const header = (current) => {
  const nav = [[kit.url, kit.navLabel], ["/testimonials", "Testimonials"], ["/info-page", "About"], ["/contact", "Contact"]];
  return `
<header class="site-header">
  <div class="header-inner">
    <a class="logo" href="/" aria-label="EV Works home">
      <img class="only-desktop" src="/assets/img/logo.png" alt="EV Works" width="280" height="28">
      <img class="only-mobile" src="/assets/img/logo-mobile.png" alt="EV Works" width="220" height="62">
    </a>
    <nav class="nav" aria-label="Main">
      <div class="nav-products"><button type="button" aria-haspopup="true" aria-expanded="false">Products</button></div>
      ${nav.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ""}>${t}</a>`).join("\n      ")}
    </nav>
    <button class="menu-btn" type="button" aria-label="Open menu">MENU</button>
  </div>
  <div class="mega" aria-label="Products">
    <div class="model-grid">${modelCards()}
    </div>
  </div>
</header>
<div class="mobile-menu" role="dialog" aria-label="Menu">
  <div class="mm-panel" data-panel="main">
    <div class="mm-top">
      <a href="/"><img src="/assets/img/logo.png" alt="EV Works"></a>
      <button class="mm-icon" type="button" data-mm-close aria-label="Close menu">${ICON.close}</button>
    </div>
    <div class="mm-list">
      <button type="button" data-mm-show="products">Products ${ICON.right}</button>
      ${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("\n      ")}
    </div>
  </div>
  <div class="mm-panel" data-panel="products" hidden>
    <div class="mm-top">
      <button class="mm-icon" type="button" data-mm-show="main" aria-label="Back">${ICON.left}</button>
      <button class="mm-icon" type="button" data-mm-close aria-label="Close menu">${ICON.close}</button>
    </div>
    <div class="model-grid">${modelCards()}
    </div>
  </div>
</div>`;
};

const footer = () => `
<footer class="site-footer">
  <div class="wrap">
    <h2 class="footer-title">${esc(site.name)}</h2>
    <div class="footer-grid">
      <div class="footer-col">
        <p><b>Call or text</b>${site.footerPhones.map((p) => `<a href="${tel(p)}">${esc(p)}</a>`).join("<br>")}</p>
        <p><b>Based in</b>${site.address.map(esc).join("<br>")}</p>
      </div>
      <div class="footer-mid">
        <div class="socials">
          <a href="${site.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><img src="/assets/img/icon-instagram.png" alt="" width="36" height="36"></a>
          <a href="${site.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><img src="/assets/img/icon-facebook.png" alt="" width="36" height="36"></a>
        </div>
        <div class="footer-links"><a href="/service-areas">Service areas</a><a href="${esc(site.careersUrl)}" target="_blank" rel="noopener">Careers</a></div>
      </div>
      <div class="footer-col footer-right">
        <p><b>Free mobile installs across LA &amp; SoCal</b>Tesla-only crew. Every install backed by a 6-month workmanship warranty.</p>
      </div>
    </div>
    <p class="footer-legal">${site.copyright.map((l) => esc(l.replace("{year}", YEAR))).join(" ")}</p>
  </div>
</footer>
<a class="call-bubble" href="${site.callBubbleTel.startsWith("+") ? "tel:" + site.callBubbleTel : tel(site.callBubblePhone)}">
  <img src="/assets/img/icon-phone.png" alt="" width="40" height="40">
  <div><strong>Call/Text Us!</strong><span>${esc(site.callBubblePhone)}</span></div>
</a>`;

const layout = ({ title, description, image, canonical, body, head = "", bodyClass = "", extraCss = "", extraJs = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site.url}${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${site.url}${canonical}">
<meta property="og:image" content="${site.url}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${site.url}${image}">
<meta name="robots" content="max-image-preview:large">
<meta name="theme-color" content="${/theme-dark/.test(bodyClass) ? "#0a0a0b" : "#ffffff"}">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${VERSION}">${[].concat(extraCss || []).map((c) => `\n<link rel="stylesheet" href="${c}?v=${VERSION}">`).join("")}
<script>document.documentElement.classList.add("js")</script>
${head}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${header(canonical)}
<main>
${body}
</main>
${footer()}
<script>window.EVW=${JSON.stringify({ formsEndpoint: site.forms.endpoint, bookingKey: site.forms.bookingKey, bookingCc: site.forms.bookingCc })};</script>
<script src="/assets/js/site.js?v=${VERSION}" defer></script>${[].concat(extraJs || []).map((j) => `\n<script src="${j}?v=${VERSION}" defer></script>`).join("")}
</body>
</html>
`;

const pageMeta = (key, canonical) => ({ ...site.pages[key], canonical });
const pageHead = (h1, lead) => `<header class="page-head" data-stagger><h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}</header>`;

// Business info for Google (home + service-area pages)
const businessLd = () => ({
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "@id": site.url + "/#business",
  name: site.name,
  url: site.url,
  telephone: site.phone,
  image: site.url + "/assets/img/ambient-purple-yoke.webp",
  logo: site.url + "/apple-touch-icon.png",
  description: "Mobile Tesla upgrade installs — ambient lighting, yoke steering wheels, rear touchscreens, auto frunk and more — at your home or office across LA & SoCal.",
  address: { "@type": "PostalAddress", streetAddress: site.address[0], addressLocality: "Santa Monica", addressRegion: "CA", postalCode: "90401", addressCountry: "US" },
  areaServed: areas.cities.map((c) => ({ "@type": "City", name: `${c.name}, CA` })),
  sameAs: [site.instagram, site.facebook],
});

// Review strip (home, product, shop, service-area pages)
const reviewStrip = (heading = "What Tesla owners say") => {
  const t = site.testimonials;
  const yelp = t.stats.find((s) => /yelp/i.test(s.label));
  const fb = t.stats.find((s) => /facebook/i.test(s.label));
  const installs = t.stats.find((s) => /install/i.test(s.label));
  return `
<section class="wrap section" aria-labelledby="rs-${heading.length}">
  <div class="sec-head" data-stagger>
    <div>
      <h2 class="h2" id="rs-${heading.length}">${esc(heading)}</h2>
      <p class="rs-score">${stars(5)} <span><b>${yelp.value.toFixed(1)}</b> on Yelp · <b>${fb.value.toFixed(1)}</b> on Facebook · <b>${installs.value}${esc(installs.suffix || "")}</b> installs</span></p>
    </div>
    <a class="text-link" href="/testimonials">See all reviews</a>
  </div>
  <div class="rs-grid" data-stagger>
    ${t.reviews.map((r) => `<figure class="card rs-card">
      <blockquote>“${esc(r.text)}”</blockquote>
      <figcaption><span><b>${esc(r.name)}</b><span>${esc(r.product)}</span></span>${stars(r.rating)}</figcaption>
    </figure>`).join("\n    ")}
  </div>
</section>`;
};

// Recent installs strip (about, contact)
const recentInstalls = () => {
  const pics = site.testimonials.gallery.filter((g) => g.show !== "mobile").slice(0, 4);
  return `
<section class="wrap section" aria-labelledby="installs-title">
  <div class="sec-head" data-stagger><h2 class="h2" id="installs-title">Recent installs</h2><a class="text-link" href="/testimonials#gallery-title">See the gallery</a></div>
  <div class="installs" data-stagger>
    ${pics.map((g) => `<a href="/testimonials#gallery-title" aria-label="${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></a>`).join("\n    ")}
  </div>
</section>`;
};

const statHtml = (s) => `<b data-count="${s.value}" data-decimals="${s.decimals || 0}" data-suffix="${esc(s.suffix || "")}">${Number(s.value).toFixed(s.decimals || 0)}${esc(s.suffix || "")}</b>`;

const tile = (p, line) => `<a class="tile" href="/product-stack-flat/${p.handle}">
      <div class="tile-img"><img src="${p.tileImage}" alt="Tesla ${esc(modelsText(p))} ${esc(p.title)}" loading="lazy"></div>
      <h3>${esc(p.title)}</h3>
      <p>${line}</p>
    </a>`;

// ---------- LIGHT PAGES: shared parts (premium.css + pages.css) ----------
const lightPage = (opts) => layout({
  ...opts,
  bodyClass: `theme-light ${opts.bodyClass || ""}`.trim(),
  extraCss: ["/assets/css/premium.css", "/assets/css/pages.css"],
});
const pHead = (h1, lead) => `<header class="p-head" data-stagger><h1>${esc(h1)}</h1>${lead ? `<p class="k-lead">${esc(lead)}</p>` : ""}</header>`;
const sHead = (id, title, lead = "", right = "") => `<div class="h-head${right ? " h-head-row" : ""}" data-stagger>${right ? "<div>" : ""}<h2 class="k-h2" id="${id}">${esc(title)}</h2>${lead ? `<p class="k-lead">${lead}</p>` : ""}${right ? `</div>${right}` : ""}</div>`;
// A photo in a rounded frame with the words laid over it. With href, the whole frame is a link.
const frame = ({ img, mobile, alt = "", title, tag = "h2", id = "", lead = "", actions = "", href = "", hero = false }) => {
  const el = href ? "a" : "div";
  return `<${el} class="frame${hero ? " frame-hero" : ""}"${href ? ` href="${href}"` : ""}>
    <picture class="frame-photo">${mobile ? `<source media="(max-width: 767.98px)" srcset="${mobile}">` : ""}<img src="${img}" alt="${esc(alt)}"${hero ? ' fetchpriority="high"' : ' loading="lazy"'}></picture>
    <div class="frame-copy" data-stagger>
      <${tag} class="frame-title"${id ? ` id="${id}"` : ""}>${esc(title)}</${tag}>
      ${lead ? `<p class="frame-lead">${esc(lead)}</p>` : ""}
      ${actions ? `<div class="h-actions">${actions}</div>` : ""}
    </div>
  </${el}>`;
};
// Model cards; data-cat-* lets /shop?category=… point each card straight at that category's product.
const hmCards = () => site.models.map((m) => {
  const cats = Object.entries(CATEGORIES).map(([k, c]) => ` data-cat-${k}="/product-stack-flat/${c[m.collection]}"`).join("");
  return `
    <a class="hm-card" href="/cars/${m.collection}"${cats}>
      <img src="${m.image}" alt="Tesla ${esc(m.name)}" width="440" height="248" loading="lazy">
      <span class="hm-name">${esc(m.name)}</span>
      <span class="hm-go">Shop upgrades ${arrow}</span>
    </a>`;
}).join("");
const ptCard = (p) => `<a class="pt-card" href="/product-stack-flat/${p.handle}">
      <div class="pt-photo"><img src="${p.tileImage}" alt="Tesla ${esc(modelsText(p))} ${esc(p.title)}" loading="lazy"></div>
      <div class="pt-body"><h3>${esc(p.title)}</h3><span class="pt-price">From <b>${money(minPrice(p))}</b></span></div>
    </a>`;
const reviewsBlock = (title = "What Tesla owners say.") => {
  const t = site.testimonials;
  const yelp = t.stats.find((s) => /yelp/i.test(s.label));
  const fb = t.stats.find((s) => /facebook/i.test(s.label));
  return `
<section class="wrap k-section h-reviews" aria-labelledby="reviews-title">
  ${sHead("reviews-title", title, "", `<a class="k-link" href="/testimonials">All reviews ${arrow}</a>`).replace("</h2>", `</h2><p class="h-score">${stars(5)} <span><b>${yelp.value.toFixed(1)}</b> on Yelp · <b>${fb.value.toFixed(1)}</b> on Facebook</span></p>`)}
  <div class="hr-grid" data-stagger>
    ${t.reviews.map((r) => `<figure class="hr-card">
      ${stars(r.rating)}
      <blockquote>“${esc(r.text)}”</blockquote>
      <figcaption><b>${esc(r.name)}</b><span>${esc(r.product)}</span></figcaption>
    </figure>`).join("\n    ")}
  </div>
</section>`;
};
const installsBlock = () => {
  const pics = site.testimonials.gallery.filter((g) => g.show !== "mobile").slice(0, 4);
  return `
<section class="wrap k-section" aria-labelledby="installs-title">
  ${sHead("installs-title", "Recent installs.", "", `<a class="k-link" href="/testimonials#gallery-title">See the gallery ${arrow}</a>`)}
  <div class="p-installs" data-stagger>
    ${pics.map((g) => `<a href="/testimonials#gallery-title" aria-label="${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></a>`).join("\n    ")}
  </div>
</section>`;
};
const kitWindow = (title, text) => `
<section class="wrap k-section" aria-labelledby="hkit-title">
  <div class="h-kit theme-dark">
    <div class="glow-photo" aria-hidden="true">
      <img src="/assets/img/hero-ambient-purple.webp" alt="" loading="lazy">
      <span class="tint"></span>
    </div>
    <div class="h-kit-inner" data-stagger>
      <h2 class="k-h2" id="hkit-title">${esc(title)}</h2>
      <p class="k-lead">${esc(text)}</p>
      <div class="h-actions">
        <span class="h-price">$${Number(kit.price).toFixed(0)}</span>
        <a class="kbtn kbtn-primary" href="${kit.url}">Explore the kit ${arrow}</a>
      </div>
    </div>
  </div>
</section>`;
const stepsList = (items, cls = "") => `<ol class="h-steps${cls ? " " + cls : ""}" data-stagger>
    ${items.map((s, i) => `<li><span class="h-num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("\n    ")}
  </ol>`;
const ctaBlock = (title = site.home.ctaTitle, text = site.home.ctaText) => `
<section class="wrap k-section h-cta" aria-labelledby="cta-title" data-stagger>
  <h2 class="k-h2" id="cta-title">${esc(title)}</h2>
  <p class="k-lead">${esc(text)}</p>
  <div class="h-actions">
    <a class="kbtn kbtn-primary" href="/shop">Book an install</a>
    <a class="kbtn kbtn-secondary" href="${tel(site.phone)}">Call or text ${esc(site.phone)}</a>
  </div>
</section>`;

// ---------- HOME ----------
const home = () => {
  const h = site.home;
  const specHtml = (s) => `<div class="k-spec">${s.text ? `<b>${esc(s.text)}</b>` : statHtml(s)}<span>${esc(s.label)}</span><small>${esc(s.note)}</small></div>`;
  const fromLine = (u) => u.soon ? "Coming soon" : `From ${money(Math.min(...u.from.map((x) => minPrice(byHandle[x]))))}`;
  const slides = h.upgrades.map((u, i) => `
      <article class="hu-slide" data-slide>
        <a class="hu-photo" href="${u.link}" tabindex="-1" aria-hidden="true"><img src="${u.image}" alt="" loading="${i < 2 ? "eager" : "lazy"}"></a>
        <div class="hu-copy">
          <div>
            <h3>${esc(u.title)}</h3>
            <p>${esc(u.text)}</p>
          </div>
          <div class="hu-meta">
            <span class="hu-from">${fromLine(u)}</span>
            <a class="k-link" href="${u.link}">${esc(u.linkLabel)} ${arrow}</a>
          </div>
        </div>
      </article>`).join("");
  return lightPage({
    ...pageMeta("index", "/"),
    head: ld(businessLd()),
    bodyClass: "page-home",
    body: `
<section class="wrap h-hero" aria-label="Introduction">
  ${frame({
    hero: true, tag: "h1", id: "home-title", img: h.heroImage, mobile: h.heroImageMobile, alt: h.heroAlt,
    title: h.heroTitle, lead: h.heroSubtitle,
    actions: `<a class="kbtn kbtn-primary" href="/shop">Book an install</a><a class="kbtn kbtn-glass" href="${kit.url}">Shop the Performance Kit</a>`,
  })}
</section>

<section class="wrap k-specs k-specs-4" aria-label="EV Works in numbers" data-stagger>
  ${h.specs.map(specHtml).join("\n  ")}
</section>

<section class="wrap k-section h-models" aria-labelledby="models-title">
  ${sHead("models-title", h.modelsTitle, esc(h.modelsLead))}
  <div class="hm-grid" data-stagger>${hmCards()}
  </div>
</section>

<section class="k-section h-upgrades" data-carousel aria-labelledby="upgrades-title">
  <div class="wrap">${sHead("upgrades-title", h.upgradesTitle, "", `<div class="hu-arrows">
      <button class="hu-arrow" type="button" data-prev aria-label="Previous upgrade">${ICON.left}</button>
      <button class="hu-arrow" type="button" data-next aria-label="Next upgrade">${ICON.right}</button>
    </div>`)}</div>
  <div class="hu-track" data-track>${slides}
  </div>
  <div class="wrap hu-dots">${h.upgrades.map((u) => `<button type="button" data-dot aria-label="${esc(u.title)}"></button>`).join("")}</div>
</section>
${kitWindow(h.kitTitle, h.kitText)}

<section class="wrap k-section h-how" aria-labelledby="how-title">
  ${sHead("how-title", h.howTitle, esc(h.howLead))}
  ${stepsList(h.how)}
</section>

<section class="wrap k-section" aria-labelledby="story-title">
  <div class="h-story theme-dark">
    <img src="/assets/img/ev-works-building.webp" alt="The EV Works building" loading="lazy">
    <div class="h-story-inner" data-stagger>
      <h2 class="k-h2" id="story-title">${esc(h.aboutTitle)}</h2>
      <p class="k-lead">${esc(h.aboutText)}</p>
      <a class="k-link" href="/info-page">About EV Works ${arrow}</a>
    </div>
  </div>
</section>
${reviewsBlock(h.reviewsTitle)}
${ctaBlock()}`,
  });
};

// ---------- SHOP (pick your model) ----------
const shop = () => lightPage({
  ...pageMeta("shop", "/shop"),
  body: `
<section class="wrap directory" data-categories='${esc(JSON.stringify(Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, c.label]))))}'>
  ${pHead("Shop for your Tesla", site.shopLead)}
  <div class="hm-grid" data-stagger>${hmCards()}
  </div>
</section>
<section class="wrap k-section" aria-label="Start with ambient lighting" data-shop-banner>
  ${frame({
    href: "/shop?category=ambient-lighting", img: "/assets/img/hero-ambient-purple.webp", alt: "Tesla interior glowing with purple ambient lighting",
    title: "Not sure where to start?", lead: "Ambient lighting is our most popular upgrade. Pick your Tesla above, or start here.",
    actions: `<span class="kbtn kbtn-primary">Shop ambient lighting ${arrow}</span>`,
  })}
</section>
${reviewsBlock()}
${ctaBlock()}`,
});

// ---------- COLLECTION (all upgrades for one pair of models) ----------
const collection = (c) => {
  const f = c.feature;
  const isKitCar = /3y/.test(c.handle);
  return lightPage({
    title: c.seoTitle, description: c.seoDescription, image: f.image, canonical: `/cars/${c.handle}`,
    body: `
<section class="wrap collection">
  ${pHead(c.title, c.lead)}
  ${frame({
    href: `/product-stack-flat/${f.product}`, img: f.image, alt: f.title,
    title: f.title, lead: f.text,
    actions: `<span class="kbtn kbtn-primary">Shop ${arrow}</span><span class="frame-from">From ${money(minPrice(byHandle[f.product]))}</span>`,
  })}
</section>
<section class="wrap k-section" aria-labelledby="tiles-title">
  ${sHead("tiles-title", c.tilesTitle + ".", "Every upgrade includes free mobile installation and a 6-month workmanship warranty.")}
  <div class="pt-grid${c.products.length % 4 === 0 ? " pt-grid-4" : ""}" data-stagger>
    ${c.products.map((h) => ptCard(byHandle[h])).join("\n    ")}
  </div>
</section>
${isKitCar ? kitWindow(site.home.kitTitle, site.home.kitText) : ""}
${reviewsBlock()}
${ctaBlock()}`,
  });
};

// ---------- PRODUCT ----------
const product = (p) => {
  const v = p.variants[0];
  const addons = (catalog.bookingAddons || []).filter((a) => !(a.key === "puddleLights" && p.handle.startsWith("puddle-lights")));
  const clientData = { handle: p.handle, title: p.title, models: p.compatibleModels, variants: p.variants, includedFallback: p.includedFallback, addon: p.addon, bookingAddons: addons };
  const acc = (key, title, body) => `
        <div class="acc-item" data-acc="${key}">
          <button class="acc-btn" type="button" aria-expanded="false"><span>${esc(title)}</span><span class="plus" aria-hidden="true"></span></button>
          <div class="acc-panel" inert><div><div class="acc-body">${esc(body)}</div></div></div>
        </div>`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: `Tesla ${p.compatibleModels.join(" / ")} ${p.title}`, description: v.details,
    image: p.variants.flatMap((x) => x.images).map((s) => site.url + s),
    brand: { "@type": "Brand", name: site.name },
    offers: p.variants.map((x) => ({ "@type": "Offer", name: x.title, price: x.price, priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${site.url}/product-stack-flat/${p.handle}` })),
  };
  return layout({
    title: p.seo.title, description: p.seo.description, image: v.images[0] || p.tileImage, canonical: `/product-stack-flat/${p.handle}`,
    head: ld(jsonLd),
    bodyClass: "page-product",
    body: `
<section class="wrap product">
  <div class="pc-gallery rv">
  <div class="pc-media">
    ${v.images.length ? `<img src="${v.images[0]}" alt="${esc(v.title)} photo 1">` : `<div class="pc-empty">No photos for this version yet</div>`}
    <button class="pc-arrow prev" type="button" aria-label="Previous photo">${ICON.left}</button>
    <button class="pc-arrow next" type="button" aria-label="Next photo">${ICON.right}</button>
    <div class="pc-dots"></div>
  </div>
  <div class="pc-thumbs" aria-label="Photos"></div>
  </div>
  <div class="pc-panel" data-stagger>
    <h1>${esc(p.title)}</h1>
    <p class="lead pc-sub">For Tesla ${esc(modelsText(p))}, installed free at your home or office.</p>
    <div class="pc-badges">
      ${["6 Month Warranty", "Free Mobile Installation", "Available Within 24 Hours"].map((b) => `<div class="pc-badge"><span class="check-dot">${ICON.check}</span>${b}</div>`).join("\n      ")}
    </div>
    <p class="pc-label">${p.variants.length > 1 ? "Choose your version" : "Your upgrade"}</p>
    <div class="pc-variants">
      ${p.variants.map((x, i) => `<button class="choice pc-variant${i === 0 ? " active" : ""}" type="button" aria-pressed="${i === 0}"><span class="c-name">${esc(x.title)}</span><span class="c-price">${money(x.price)}</span></button>`).join("\n      ")}
    </div>
    ${p.addon?.enabled ? `<button class="choice check-choice pc-warranty" type="button" aria-pressed="false"><span class="box"></span><span class="c-name">${esc(p.addon.title)}</span><span class="c-price">+${money(p.addon.price)}</span></button>` : ""}
    <div class="accordion">${acc("details", "Product details", v.details)}${acc("included", "What's included", v.included || p.includedFallback)}${acc("install", "Installation info", p.installInfo)}${acc("warranty", "Warranty", p.warranty)}
    </div>
    <button class="btn btn-blue pc-book" type="button">Book ${esc(v.title)} ${arrow}</button>
  </div>
</section>
${reviewStrip("Loved by Tesla owners across SoCal")}
${recentInstalls()}

<div class="sticky-book" aria-hidden="true">
  <div><b class="sb-name">${esc(v.title)}</b><span class="sb-price">${money(v.price)}</span></div>
  <button type="button" class="btn btn-blue sb-btn" tabindex="-1">Book ${arrow}</button>
</div>

<div class="modal" id="booking-modal" hidden role="dialog" aria-modal="true" aria-labelledby="booking-title">
  <div class="modal-card">
    <button class="modal-close" type="button" aria-label="Close">${ICON.close}</button>
    <div class="m-form">
      <form>
        <h2 class="m-title" id="booking-title"></h2>
        <div class="modal-summary m-sum"></div>
        <div class="field"><label for="b-name">Name<span class="req"> *</span></label><input id="b-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="b-phone">Phone<span class="req"> *</span></label><input id="b-phone" name="phone" type="tel" required autocomplete="tel"></div>
        <div class="field"><label for="b-zip">Zip code<span class="req"> *</span></label><input id="b-zip" name="zip" required autocomplete="postal-code" inputmode="numeric"></div>
        <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off">
        <div class="field">
          <span class="label">Add-on purchases (optional)</span>
          <div class="m-addons"></div>
        </div>
        <p class="form-error" hidden>Couldn't send. Please try again, or call/text us at ${esc(site.callBubblePhone)}.</p>
        <button class="btn btn-blue submit-btn" type="submit">Send request</button>
      </form>
    </div>
    <div class="m-success success" hidden>
      <div class="success-icon">${ICON.check}</div>
      <h2>Request sent</h2>
      <p>${esc(site.forms.bookingSuccess)}</p>
    </div>
  </div>
</div>
<script type="application/json" id="product-data">${JSON.stringify(clientData).replace(/</g, "\\u003c")}</script>`,
  });
};

// ---------- TESTIMONIALS ----------
const testimonials = () => {
  const t = site.testimonials;
  const card = (r) => {
    const first = r.media[0];
    const poster = first.includes("review-jordan") ? "/assets/img/poster-review-jordan.webp" : "/assets/img/poster-review-michael.webp";
    const mediaEl = /\.mp4$/i.test(first)
      ? `<video src="${first}" poster="${poster}" muted loop autoplay playsinline preload="metadata"></video>`
      : `<img src="${first}" alt="${esc(r.name)} install photo" loading="lazy">`;
    return `
      <article class="card review-card" data-slide data-media='${esc(JSON.stringify(r.media))}' data-name="${esc(r.name)}" data-product="${esc(r.product)}">
        <div class="rc-media">
          ${mediaEl}
          ${r.media.length > 1 ? `<button class="rc-arrow prev" type="button" aria-label="Previous photo">${ICON.left}</button><button class="rc-arrow next" type="button" aria-label="Next photo">${ICON.right}</button>
          <div class="rc-dots">${r.media.map((_, i) => `<button type="button"${i === 0 ? ' class="active"' : ""} aria-label="Show item ${i + 1}"></button>`).join("")}</div>` : ""}
        </div>
        <div class="rc-body">
          ${stars(r.rating)}
          <div class="rc-quote"><div class="clamp">“${esc(r.text)}”</div><button class="rc-more" type="button">Read more</button></div>
          <div class="rc-author">
            <div class="avatar" aria-hidden="true">${esc(r.initials)}</div>
            <div class="rc-who"><b>${esc(r.name)}</b><span>${r.verified ? '<span class="verified">Verified</span> · ' : ""}${esc(r.when)} · ${esc(r.product)}</span></div>
          </div>
        </div>
      </article>`;
  };
  const notes = { installs: "Across SoCal since 2023", facebook: "Facebook reviews", yelp: "Yelp reviews" };
  const noteFor = (s) => /install/i.test(s.label) ? notes.installs : /facebook/i.test(s.label) ? notes.facebook : notes.yelp;
  return lightPage({
    ...pageMeta("testimonials", "/testimonials"),
    body: `
<section class="wrap reviews-page">
  ${pHead(t.title, t.subtitle)}
</section>
<section class="wrap k-specs" aria-label="Ratings" data-stagger>
  ${t.stats.map((s) => `<div class="k-spec">${statHtml(s)}<span>${esc(s.label)}</span><small>${esc(noteFor(s))}</small></div>`).join("\n  ")}
</section>
<section class="wrap k-section" aria-labelledby="rv-title">
  ${sHead("rv-title", "In their words.", "Swipe through reviews from Tesla owners we've installed for. Tap a photo or video to see it full size.")}
  <div class="review-carousel" data-carousel="center">
    <div class="review-track" data-track data-stagger>${t.reviews.map(card).join("")}
    </div>
  </div>
</section>
<section class="wrap k-section" aria-labelledby="gallery-title">
  ${sHead("gallery-title", t.galleryTitle + ".", esc(t.gallerySubtitle) + ".")}
  <div class="gallery" data-stagger>
    ${t.gallery.map((g) => `<button type="button" class="${g.show === "desktop" ? "g-desktop" : g.show === "mobile" ? "g-mobile" : "g-both"}" aria-label="View photo: ${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></button>`).join("\n    ")}
  </div>
</section>
${ctaBlock()}
<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo viewer">
  <button class="lb-close" type="button" aria-label="Close">${ICON.close}</button>
  <button class="lb-nav prev" type="button" aria-label="Previous">${ICON.left}</button>
  <div class="lb-stage"></div>
  <p class="lb-caption"></p>
  <button class="lb-nav next" type="button" aria-label="Next">${ICON.right}</button>
</div>`,
  });
};

// ---------- ABOUT ----------
const about = () => {
  const a = site.about;
  return lightPage({
    ...pageMeta("info-page", "/info-page"),
    body: `
<section class="wrap h-hero" aria-label="About EV Works">
  ${frame({ tag: "h1", img: a.image, alt: "Tesla interior with blue ambient lighting", title: a.title })}
</section>
<section class="wrap k-section" aria-label="Our story">
  <p class="p-statement rv">${esc(a.intro)}</p>
</section>
<section class="wrap k-section" aria-label="Our work">
  <div class="photo-row" data-stagger>
    <img src="/assets/img/ev-works-building.webp" alt="The EV Works building" loading="lazy">
    <video src="/assets/video/quality-install.mp4" poster="/assets/img/poster-quality-install.webp" autoplay muted loop playsinline preload="metadata" aria-label="Ambient lighting install video"></video>
    <img src="/assets/img/gallery-07.webp" alt="Tesla Model Y center console with ambient lighting trim" loading="lazy">
  </div>
</section>
<section class="wrap k-section" aria-labelledby="apart-title">
  ${sHead("apart-title", a.apartTitle + ".")}
  <div class="p-cards" data-stagger>
    ${a.apart.map((x) => `<div class="p-card"><span class="p-ico"><img src="${x.icon}" alt=""></span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("\n    ")}
  </div>
</section>
<section class="wrap k-section" aria-labelledby="how-title">
  ${sHead("how-title", a.howTitle + ".")}
  ${stepsList(a.how, "h-steps-4")}
</section>
<section class="wrap k-specs" aria-label="Mobile EV Works in numbers" data-stagger>
  ${a.stats.map((s) => `<div class="k-spec"><b>${esc(s.value.replace("★", ""))}</b><span>${esc(s.label.charAt(0) + s.label.slice(1).toLowerCase())}</span><small>${esc(s.note)}</small></div>`).join("\n  ")}
</section>
<section class="wrap k-section" aria-labelledby="area-title">
  ${sHead("area-title", a.areaTitle + ".", esc(a.areaText))}
  <div class="p-cities" data-stagger>
    ${areas.cities.map((c) => `<a href="/service-areas/${c.slug}"><b>${esc(c.name)}</b><span>Free mobile install</span></a>`).join("\n    ")}
    <a class="p-all" href="/service-areas"><b>All service areas</b><span>${arrow}</span></a>
  </div>
</section>
${installsBlock()}
${ctaBlock()}`,
  });
};

// ---------- CONTACT ----------
const contact = () => {
  const c = site.contact;
  return lightPage({
    ...pageMeta("contact", "/contact"),
    body: `
<section class="wrap contact">
  ${pHead(c.title, c.subtitle)}
  ${frame({ img: "/assets/img/about-blue-cabin.webp", alt: "Tesla interior with blue ambient lighting", title: "We come to you anywhere in LA & SoCal.", lead: "Driveway, office lot or parking garage. Most installs take under 3 hours." })}
  <div class="contact-cards section-sm" data-stagger>
    <a class="card contact-card" href="${tel(c.phoneValue)}"><span class="ci">${ICON.phone}</span><span><small>${esc(c.phoneLabel)}</small><strong>${esc(c.phoneValue)}</strong></span></a>
    <a class="card contact-card" href="${site.instagram}" target="_blank" rel="noopener"><span class="ci">${ICON.instagram}</span><span><small>${esc(c.socialLabel)}</small><strong>${esc(c.socialValue)}</strong></span></a>
  </div>
  <div class="contact-grid">
    <div class="card contact-form rv">
      <form id="contact-form" data-key="${esc(site.forms.contactKey)}" data-cc="${esc(site.forms.contactCc)}">
        <h2 class="h2">Send us a message</h2>
        <div class="field"><label for="c-name">Name<span class="req"> *</span></label><input id="c-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="c-email">Email<span class="req"> *</span></label><input id="c-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="c-phone">Phone (optional)</label><input id="c-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="field"><label for="c-topic">What's this about?</label>
          <select id="c-topic" name="topic"><option value="">Pick a topic</option>${c.topics.map((t) => `<option>${esc(t)}</option>`).join("")}</select></div>
        <div class="field"><label for="c-msg">Message<span class="req"> *</span></label><textarea id="c-msg" name="message" rows="4" required></textarea></div>
        <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off">
        <p class="form-error" hidden>Couldn't send. Please try again, or call/text us at ${esc(site.callBubblePhone)}.</p>
        <button class="btn btn-ink send" type="submit">Send message</button>
      </form>
      <div class="contact-success success" hidden>
        <div class="success-icon">${ICON.check}</div>
        <h3>Message sent</h3>
        <p>${esc(site.forms.contactSuccess)}</p>
      </div>
    </div>
    <div class="contact-side" data-stagger>
      ${c.info.map((i) => `<div class="card side-card"><small>${esc(i.title)}</small><strong>${esc(i.value)}</strong><span>${esc(i.note)}</span></div>`).join("\n      ")}
      <div class="side-photo"><img src="/assets/img/gallery-04.webp" alt="A Tesla with ambient lighting, installed on site" loading="lazy"></div>
    </div>
  </div>
</section>
<section class="wrap k-section p-faq" aria-labelledby="faq-title">
  <div data-stagger><h2 class="k-h2" id="faq-title">Common questions.</h2><p class="k-lead">${esc(c.faqLead)}</p></div>
  <div class="faq-list" data-stagger>${c.faq.map((f) => `
    <div class="acc-item">
      <button class="acc-btn" type="button" aria-expanded="false"><span>${esc(f.q)}</span><span class="plus" aria-hidden="true"></span></button>
      <div class="acc-panel" inert><div><div class="acc-body">${esc(f.a)}</div></div></div>
    </div>`).join("")}
  </div>
</section>
${installsBlock()}`,
  });
};

// ---------- SERVICE AREAS ----------
const AREA_IMAGES = ["/assets/img/hero-ambient-purple.webp", "/assets/img/ambient-purple-yoke.webp", "/assets/img/carousel-ambient.webp", "/assets/img/about-blue-cabin.webp", "/assets/img/carousel-yoke.webp"];
const featuredCards = () => areas.featured.map((h) => byHandle[h]).filter(Boolean).map(ptCard).join("\n    ");
const AREA_HOW = site.about.how.slice(0, 3).concat([{ title: "Enjoy your upgrade", text: "Every install comes with a 6-month workmanship warranty and lifetime EV Works support. If anything we did fails, we come back and fix it." }]);

const serviceHub = () => lightPage({
  title: areas.hub.title, description: areas.hub.description, image: "/assets/img/hero-ambient-purple.webp", canonical: "/service-areas",
  head: ld(businessLd()),
  body: `
<section class="wrap">
  ${pHead(areas.hub.heading, areas.hub.intro)}
  <div class="p-cities p-after" data-stagger>
    ${areas.cities.map((c) => `<a href="/service-areas/${c.slug}"><b>${esc(c.name)}</b><span>Free mobile install ${arrow}</span></a>`).join("\n    ")}
  </div>
</section>
<section class="wrap k-section" aria-label="Book a mobile install">
  ${frame({
    href: "/shop", img: "/assets/img/carousel-ambient.webp", mobile: "/assets/img/carousel-ambient-mobile.webp", alt: "Tesla interior with red ambient lighting",
    title: "Free mobile installs across LA & SoCal.", lead: "Pick your Tesla, choose your upgrade and send a booking request. We'll call to confirm a time.",
    actions: `<span class="kbtn kbtn-primary">Shop by model ${arrow}</span>`,
  })}
</section>
<section class="wrap k-section" aria-labelledby="pop-title">
  ${sHead("pop-title", "Popular upgrades.", "", `<a class="k-link" href="/shop">Shop by model ${arrow}</a>`)}
  <div class="pt-grid" data-stagger>
    ${featuredCards()}
  </div>
</section>
${reviewsBlock()}
${ctaBlock()}`,
});

const cityPage = (c, i) => {
  const bySlug = Object.fromEntries(areas.cities.map((x) => [x.slug, x]));
  const title = `Tesla Ambient Lighting & Upgrades in ${c.name}, CA — Free Mobile Install | Mobile EV Works`;
  const description = `Mobile Tesla upgrades in ${c.name}: ambient lighting, yoke steering wheels, rear touchscreens, puddle lights and more — installed at your home or office. 6-month warranty, 4.9★ rated. Call or text ${site.phone}.`;
  const serviceLd = {
    "@context": "https://schema.org", "@type": "Service",
    name: `Tesla mobile upgrade installation in ${c.name}`,
    serviceType: "Tesla accessory installation",
    provider: { "@id": site.url + "/#business" },
    areaServed: { "@type": "City", name: `${c.name}, CA` },
    url: `${site.url}/service-areas/${c.slug}`,
  };
  const img = AREA_IMAGES[i % AREA_IMAGES.length];
  const nearby = c.nearby.map((s) => bySlug[s]).filter(Boolean).map((n) => `<a href="/service-areas/${n.slug}">${esc(n.name)}</a>`).join(", ");
  return lightPage({
    title, description, image: img, canonical: `/service-areas/${c.slug}`,
    head: ld(businessLd()) + "\n" + ld(serviceLd),
    body: `
<section class="wrap">
  ${pHead(`Tesla Upgrades in ${c.name}`, `Free mobile install. We come to you anywhere in ${c.name}.`)}
  ${frame({
    href: "/shop", img, alt: "Tesla interior with ambient lighting installed by Mobile EV Works",
    title: `Free mobile installs in ${c.name}.`, lead: "Ambient lighting, yoke steering wheels and more, installed where your Tesla is parked.",
    actions: `<span class="kbtn kbtn-primary">Shop by model ${arrow}</span>`,
  })}
</section>
<section class="wrap k-section p-two">
  <div data-stagger><h2 class="k-h2">Mobile install in ${esc(c.name)}.</h2><p>${esc(c.intro)}</p></div>
  <div data-stagger><h2 class="k-h2">Where we install.</h2><p>${esc(c.where)}</p></div>
</section>
<section class="wrap k-section" aria-labelledby="pop-title">
  ${sHead("pop-title", `Popular upgrades in ${c.name}.`, "", `<a class="k-link" href="/shop">Shop by model ${arrow}</a>`)}
  <div class="pt-grid" data-stagger>
    ${featuredCards()}
  </div>
</section>
<section class="wrap k-section" aria-labelledby="how-title">
  ${sHead("how-title", "How it works.")}
  ${stepsList(AREA_HOW, "h-steps-4")}
</section>
${reviewsBlock()}
<section class="wrap k-section h-cta" aria-labelledby="cta-title" data-stagger>
  <h2 class="k-h2" id="cta-title">Book in ${esc(c.name)}.</h2>
  <p class="k-lead">No payment needed. We'll call you to confirm a time, usually within 24 hours.</p>
  <div class="h-actions">
    <a class="kbtn kbtn-primary" href="/shop">Shop by model</a>
    <a class="kbtn kbtn-secondary" href="/contact">Ask a question</a>
  </div>
  <p class="k-note">Also serving ${nearby} and <a href="/service-areas">the rest of SoCal</a>.</p>
</section>`,
  });
};


// ---------- PERFORMANCE KIT (DIY product, Shopify) ----------
const kitPage = () => {
  const k = kit;
  const price = `$${Number(k.price).toFixed(0)}`;
  const priceFull = money(k.price);
  const swatches = k.colors.map((c, i) => `<button type="button" class="swatch" data-color="${c.hex}" data-name="${esc(c.name)}" aria-pressed="${i === 0}" style="--c:${c.hex}"><span class="sr-only">${esc(c.name)}</span></button>`).join("");
  const productLd = {
    "@context": "https://schema.org", "@type": "Product", name: k.fullTitle, sku: k.sku,
    description: k.description[0], image: k.gallery.map((g) => site.url + g.src),
    brand: { "@type": "Brand", name: "EV Works" },
    offers: { "@type": "Offer", price: k.price, priceCurrency: k.currency, availability: k.shopify.enabled ? "https://schema.org/InStock" : "https://schema.org/PreOrder", url: site.url + k.url },
  };
  const clientCfg = { name: k.name, price: k.price, shopify: k.shopify, notifyKey: site.forms.bookingKey, notifyCc: site.forms.bookingCc };
  const diagram = `
      <svg class="cabin" viewBox="0 0 520 860" role="img" aria-label="Top view of a Tesla Model 3 or Model Y cabin showing where the ten lights sit">
        <defs><filter id="bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>
        <path class="c-body" d="M260 18C392 18 452 70 462 170L472 690C474 800 400 842 260 842C120 842 46 800 48 690L58 170C68 70 128 18 260 18Z"/>
        <path class="c-glass" d="M118 168C150 128 370 128 402 168L392 214C330 196 190 196 128 214Z"/>
        <rect class="c-seat" x="128" y="300" width="98" height="132" rx="26"/>
        <rect class="c-seat" x="294" y="300" width="98" height="132" rx="26"/>
        <rect class="c-seat" x="118" y="520" width="284" height="124" rx="30"/>
        <rect class="c-console" x="244" y="290" width="32" height="176" rx="12"/>
        <g class="zone" data-zone="dash"><path class="z-bloom" d="M104 252Q260 214 416 252"/><path class="z-line" d="M104 252Q260 214 416 252"/></g>
        <g class="zone" data-zone="doors">
          <path class="z-bloom" d="M74 296V436M74 480V620M446 296V436M446 480V620"/>
          <path class="z-line" d="M74 296V436M74 480V620M446 296V436M446 480V620"/>
        </g>
        <g class="zone" data-zone="console"><path class="z-bloom" d="M260 318V392"/><path class="z-line" d="M260 318V392"/></g>
        <g class="zone" data-zone="feet">
          <g class="z-bloom"><circle cx="178" cy="278" r="12"/><circle cx="342" cy="278" r="12"/><circle cx="178" cy="488" r="12"/><circle cx="342" cy="488" r="12"/></g>
          <g class="z-dot"><circle cx="178" cy="278" r="7"/><circle cx="342" cy="278" r="7"/><circle cx="178" cy="488" r="7"/><circle cx="342" cy="488" r="7"/></g>
        </g>
      </svg>`;
  return layout({
    title: k.seo.title, description: k.seo.description, image: k.gallery[0].src, canonical: k.url,
    head: ld(productLd) + `\n<script>window.EVW_KIT=${JSON.stringify(clientCfg)};</script>`,
    bodyClass: "page-kit theme-dark",
    extraCss: ["/assets/css/premium.css", "/assets/css/kit.css"],
    extraJs: "/assets/js/kit.js",
    body: `
<section class="kit-hero" aria-labelledby="kit-title">
  <div class="glow-photo" aria-hidden="true">
    <img src="/assets/img/hero-ambient-purple.webp" alt="" fetchpriority="high">
    <span class="tint"></span>
  </div>
  <div class="wrap kit-hero-inner">
    <div class="kit-hero-copy" data-stagger>
      <h1 id="kit-title">${esc(k.name)}</h1>
      <p class="k-lead">${esc(k.shortLine)}</p>
      <div class="kit-hero-buy">
        <span class="k-price">${price}</span>
        <a class="kbtn kbtn-primary" href="#buy">Shop the kit</a>
      </div>
    </div>
    <div class="kit-picker" data-stagger>
      <p class="picker-label">Light color <b class="picker-name">${esc(k.colors[0].name)}</b></p>
      <div class="swatches" role="group" aria-label="Preview a light color">${swatches}</div>
    </div>
  </div>
</section>

<section class="wrap k-specs" aria-label="Key facts" data-stagger>
  ${k.specs.map((s) => `<div class="k-spec"><b>${esc(s.value)}</b><span>${esc(s.label)}</span><small>${esc(s.note)}</small></div>`).join("\n  ")}
</section>

<section class="wrap kit-buy" id="buy" aria-labelledby="buy-title">
  <div class="kit-gallery" data-stagger>
    ${k.gallery.map((g, i) => `<figure class="kg-item${i === 0 ? " kg-wide" : ""}"><img src="${g.src}" alt="${esc(g.alt)}" loading="${i < 2 ? "eager" : "lazy"}"></figure>`).join("\n    ")}
  </div>
  <div class="kit-panel">
    <div class="kp-inner" data-stagger>
      <h2 id="buy-title">EV Works ${esc(k.name)}</h2>
      <p class="kp-sub">10-in-1 RGB LED lights for the dashboard, all four doors, center console and four footwells. App and remote control.</p>
      <p class="kp-price">${priceFull} <span>${esc(k.currency)}</span></p>
      <div class="kp-row">
        <div class="qty" aria-label="Quantity">
          <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
          <output class="qty-n" aria-live="polite">1</output>
          <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="kbtn kbtn-primary kp-buy" data-buy disabled>Coming soon</button>
      </div>
      <form class="notify" data-notify>
        <label for="notify-email">Get an email the day it's available</label>
        <div class="notify-row"><input id="notify-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"><button class="kbtn kbtn-secondary" type="submit">Notify me</button></div>
        <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off">
        <p class="notify-msg" role="status" hidden></p>
      </form>
      <ul class="kp-assure">
        ${k.assurances.map((a) => `<li>${ICON.check}<span>${esc(a)}</span></li>`).join("\n        ")}
      </ul>
      <div class="k-acc">
        <div class="acc-item"><button class="acc-btn" type="button" aria-expanded="false"><span>Description</span><span class="plus" aria-hidden="true"></span></button>
          <div class="acc-panel" inert><div><div class="acc-body k-desc">${k.description.map((p) => `<p>${esc(p)}</p>`).join("")}</div></div></div></div>
        <div class="acc-item"><button class="acc-btn" type="button" aria-expanded="false"><span>What's in the box</span><span class="plus" aria-hidden="true"></span></button>
          <div class="acc-panel" inert><div><div class="acc-body">${k.inTheBox.map((x) => `${esc(x.qty)} × ${esc(x.item)}`).join("\n")}</div></div></div></div>
      </div>
      <a class="kp-install" href="/product-stack-flat/ambient-lighting-3y">Prefer a professional fit? We offer mobile installation across LA &amp; SoCal ${arrow}</a>
    </div>
  </div>
</section>

<section class="wrap kit-section kit-zones" aria-labelledby="zones-title">
  <div class="kz-copy" data-stagger>
    <h2 id="zones-title" class="k-h2">Ten lights. Every corner of the cabin.</h2>
    <p class="k-lead">Six RGB strips and four footwell lights, coordinated as one.</p>
    <ul class="kz-list">
      ${k.zones.map((z) => `<li><button type="button" class="kz-btn" data-zone="${z.id}"><b>${esc(z.name)}</b><span>${esc(z.detail)}</span></button></li>`).join("\n      ")}
    </ul>
    <p class="k-note">${esc(k.measureNote)}</p>
  </div>
  <div class="kz-figure rv">${diagram}
  </div>
</section>

<section class="kit-section kit-app" aria-labelledby="app-title">
  <div class="wrap ka-grid">
    <figure class="ka-photo rv"><img src="/assets/img/review-grace-3.webp" alt="Choosing a lighting color in the app" loading="lazy"></figure>
    <div class="ka-copy" data-stagger>
      <h2 id="app-title" class="k-h2">Your color. Your cabin.</h2>
      <p class="k-lead">Choose lighting colors and effects from the compatible mobile app, or reach for the included remote.</p>
      <div class="ka-try">
        <p class="picker-label">Try it on the car above <b class="picker-name">${esc(k.colors[0].name)}</b></p>
        <div class="swatches" role="group" aria-label="Preview a light color">${swatches}</div>
      </div>
    </div>
  </div>
</section>

<section class="wrap kit-section kit-box" aria-labelledby="box-title">
  <div class="kb-head" data-stagger>
    <h2 id="box-title" class="k-h2">In the box</h2>
    <p class="k-lead">Everything for the full cabin, ready to test before you fit a single strip.</p>
  </div>
  <ul class="kb-list" data-stagger>
    ${k.inTheBox.map((x) => `<li><b>${esc(x.qty)}</b><span>${esc(x.item)}</span></li>`).join("\n    ")}
  </ul>
</section>

<section class="wrap kit-section kit-install" aria-labelledby="install-title">
  <figure class="ki-photo rv"><img src="/assets/img/tile-ambient-3y.webp" alt="Footwell and dashboard lighting in a Tesla Model 3" loading="lazy"></figure>
  <div class="ki-copy" data-stagger>
    <h2 id="install-title" class="k-h2">${esc(k.install.title)}</h2>
    <p class="k-lead">${esc(k.install.text)}</p>
    <ol class="ki-steps">
      ${k.install.steps.map((s) => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span></li>`).join("\n      ")}
    </ol>
    <p class="k-note">${esc(k.install.note)} <a href="/product-stack-flat/ambient-lighting-3y">Book a mobile install ${arrow}</a></p>
  </div>
</section>

<section class="kit-section kit-story" aria-labelledby="story-title">
  <img src="/assets/img/ev-works-building.webp" alt="The EV Works building in California" loading="lazy">
  <div class="wrap ks-copy" data-stagger>
    <h2 id="story-title" class="k-h2">${esc(k.story.title)}</h2>
    <p class="k-lead">${esc(k.story.text)}</p>
  </div>
</section>

<section class="wrap kit-section kit-details" aria-labelledby="details-title">
  <div class="kd-head" data-stagger><h2 id="details-title" class="k-h2">Details</h2><p class="k-lead">${esc(k.detailsLead)} <a href="${tel(site.phone)}">${esc(site.phone)}</a></p></div>
  <div class="k-acc" data-stagger>${k.details.map((d) => `
    <div class="acc-item"><button class="acc-btn" type="button" aria-expanded="false"><span>${esc(d.q)}</span><span class="plus" aria-hidden="true"></span></button>
      <div class="acc-panel" inert><div><div class="acc-body">${esc(d.a)}</div></div></div></div>`).join("")}
  </div>
</section>
<p class="wrap k-disclaimer">${esc(k.disclaimer)}</p>

<div class="kit-bar" aria-hidden="true">
  <div class="wrap kit-bar-inner">
    <span class="kb-name">${esc(k.name)}</span>
    <span class="kb-price">${price}</span>
    <button type="button" class="kbtn kbtn-primary kb-buy" data-buy-bar tabindex="-1">Get notified</button>
  </div>
</div>`,
  });
};

// ---------- 404 ----------
const notFound = () => lightPage({
  title: "Page not found | Mobile EV Works", description: "This page doesn't exist.", image: "/assets/img/ambient-purple-yoke.webp", canonical: "/404",
  body: `<section class="wrap">${pHead("Page not found", "That page doesn't exist. Pick your Tesla below to find your upgrade.")}<div class="hm-grid">${hmCards()}</div></section>`,
});

// ---------- write everything ----------
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, "public"), OUT);
fs.mkdirSync(path.join(OUT, "assets/css"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets/js"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "src/css/site.css"), path.join(OUT, "assets/css/site.css"));
fs.copyFileSync(path.join(ROOT, "src/js/site.js"), path.join(OUT, "assets/js/site.js"));
for (const f of ["css/premium.css", "css/kit.css", "css/pages.css", "js/kit.js"]) fs.copyFileSync(path.join(ROOT, "src", f), path.join(OUT, "assets", f));

const pages = [];
const add = (rel, html, url) => { write(rel, html); pages.push(url); };
add("index.html", home(), "/");
add("testimonials/index.html", testimonials(), "/testimonials");
add("info-page/index.html", about(), "/info-page");
add("contact/index.html", contact(), "/contact");
add("shop/index.html", shop(), "/shop");
add(`${kit.handle}/index.html`, kitPage(), kit.url);
for (const c of site.collections) add(`cars/${c.handle}/index.html`, collection(c), `/cars/${c.handle}`);
for (const p of products) add(`product-stack-flat/${p.handle}/index.html`, product(p), `/product-stack-flat/${p.handle}`);
add("service-areas/index.html", serviceHub(), "/service-areas");
areas.cities.forEach((c, i) => add(`service-areas/${c.slug}/index.html`, cityPage(c, i), `/service-areas/${c.slug}`));
write("404.html", notFound());

// Old Framer URLs → new ones (Netlify reads this file). Keeps Google rankings and old links working.
const redirects = [
  ["/testamonials", "/testimonials"],
  ["/shopdirectorygeneric", "/shop"],
  ["/shopdirectoryambientlighting", "/shop?category=ambient-lighting"],
  ["/product-stack-flat/vehicle-maintenace", "/product-stack-flat/vehicle-maintenance"],
  ["/product-stack-flat/vehicle-maintenace-sx", "/product-stack-flat/vehicle-maintenance-sx"],
];
write("_redirects", redirects.map(([a, b]) => `${a}  ${b}  301\n${a}/  ${b}  301`).join("\n") + "\n");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `<url><loc>${site.url}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages into dist/`);
