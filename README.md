# Mobile EV Works — website

A plain HTML/CSS/JS rebuild of mobileevworks.com (previously Framer). It uses the same layout, photos, copy and URLs as the Framer site.

- **Booking** works the same as before. The customer picks a product and version, clicks **Book**, and fills in name, phone and zip, plus optional add-ons. The request is emailed to you through Web3Forms with the same key the Framer site used. **There is no checkout and no payment.**
- **Products live in one file** (`data/products.json`). It's structured like Shopify products: handle, title, type, tags, and variants with title, price and SKU. That means you can import the catalog into Shopify now and sync prices from Shopify later.
- **URLs are unchanged** (`/testamonials`, `/cars/tesla-model-3y`, `/product-stack-flat/...`), so Google rankings and old links keep working.

## Folders

```
data/site.json        phone numbers, links, page text, reviews, gallery, model pages, form keys
data/products.json    the 11 install products: variants, prices, photos, descriptions
data/kit.json         the Performance Ambient Lighting Kit (the DIY product page)
src/css/site.css      all styles (desktop ≥1200px, phone layout below)
src/css/premium.css   the premium layer (light and dark color sets)
src/css/pages.css     shared parts of the light pages (home, shop, model pages, reviews, about, contact, service areas)
src/css/kit.css       kit page layout
src/js/site.js        menus, carousels, product picker, booking popup, forms
src/js/kit.js         kit page: color preview, cabin diagram, notify-me, checkout
public/assets/        images (webp), videos, fonts, brand files
build.mjs             turns the above into plain HTML in dist/
dist/                 the finished website: upload this folder
tools/                Shopify import/sync scripts
```

## Design system

Every page is built from the same small set of parts, set at the top of `src/css/site.css`:

- **Type:** one font (Inter), five sizes: page title, section heading, card title, intro sentence, body text (16px) and small notes. Review quotes use Noto Serif.
- **Colors:**
  - white page;
  - near-black text;
  - light grey (`#f4f4f4`) for every card and choice box;
  - one blue (`#2e66eb`) for main buttons and selected options.
- **Corners:** 4px on buttons and choice boxes, 10px on cards and photos.
- **Spacing:** one page margin and one gap between sections, so every page lines up the same.
- **Page openings:**
  - inner pages open with a title and one sentence that says what the page is;
  - every section has a heading;
  - choices (versions, add-ons, your Tesla, FAQs) all look and behave the same.
- **Motion:**
  - each section's parts fade up one after another as you scroll;
  - buttons, cards and photos respond on hover;
  - all of it switches off for visitors who turn off motion on their device.

Change a value in `:root` (for example `--blue`) and it updates everywhere.

### Premium layer

`src/css/premium.css` adds larger headlines, a strip of key numbers (`.k-specs`) and the `.kbtn` buttons. It comes in two color sets, chosen by a body class:

- **`theme-light`**: white page, light grey panels and blue booking buttons. Used by the home, shop, model, reviews, about, contact and service-area pages.
- **`theme-dark`**: near-black page with off-white buttons. Used only by the Performance Kit page, so it feels like a different room. Dark panels on light pages (the kit promo, the home page story) use it too.

The light pages are built from shared parts in `src/css/pages.css`:

- a big left-aligned page title;
- photos in rounded frames with the words laid over them;
- model cards and product cards;
- step cards and review cards;
- recent installs;
- a closing "Book your install" block.

In `build.mjs` these are small helpers (`lightPage`, `pHead`, `frame`, `ptCard`, `reviewsBlock`, `ctaBlock`…), so a new page is mostly a list of them.

**Product booking pages** (`/product-stack-flat/…`) keep their original layout from `site.css`.

### Home page

Everything on the home page is in `data/site.json` → `home`, top to bottom:

- hero photo and headline;
- the four numbers;
- the model cards (photos from `models`);
- **Popular upgrades:** each slide has a photo, text, a link and the products whose lowest price is shown as "From $…";
- the kit band;
- How it works;
- the story;
- reviews (from `testimonials`);
- the closing call to book.

## Everyday use

**To look at the site:** open `preview/index.html` (double-click it). No server or install needed.

```bash
npm run build      # regenerate dist/ (and preview/) after editing anything in data/ or src/
npm run dev        # optional: serve dist/ at http://localhost:3000 (leave Terminal open while you browse)
```

`dist/` is the folder you upload. `preview/` is a copy with links rewritten so it works straight from your hard drive. Don't upload `preview/`.

Node 18+ is required. There are no npm dependencies to install.

- **Change a price, a product description or a photo:** edit `data/products.json`, then build.
- **Change phone numbers, reviews or page text:** edit `data/site.json`, then build.
- **Add a product:** add an entry to `products.json`, put its photos in `public/assets/img/products/`, and add its handle to a model page's `products` list in `site.json`.

## Service-area pages (local search)

`data/service-areas.json` holds one entry per city. Each gets a page at `/service-areas/<city>`, and `/service-areas` lists them all. To add a city, copy an entry and change the name and text. To remove one, delete its entry. Then build. The home page and the city pages also tell Google the business name, address, phone and the cities you serve.

## Old URLs

The rebuild fixed some spelling in page addresses. `dist/_redirects` (generated by the build) sends the old Framer addresses to the new ones, so links and rankings carry over:

| Old | New |
|---|---|
| /testamonials | /testimonials |
| /shopdirectorygeneric | /shop |
| /shopdirectoryambientlighting | /shop?category=ambient-lighting |
| /product-stack-flat/vehicle-maintenace(-sx) | /product-stack-flat/vehicle-maintenance(-sx) |

## Booking emails

Each booking request email includes:

- the **Tesla model** pair for that product: "Model 3 / Model Y" or "Model S / Model X". Installs are identical within each pair, so customers aren't asked to choose;
- the **kit**;
- price, add-ons, name, phone, zip and the page the request came from.

The subject line reads `New booking request: <Product> — <Kit> — Model 3/Model Y`.

## Deploy (Netlify)

`netlify.toml` is included. Connect the repo and Netlify runs `node build.mjs` and publishes `dist/`. You can also drag the `dist/` folder into Netlify's deploy page. Once it looks right, point the mobileevworks.com DNS away from Framer to Netlify.

## Booking and contact emails (Web3Forms)

Keys and CC addresses are in `data/site.json` → `forms`, carried over from the Framer site:

- Booking requests: key `adcf8fb7…`, CC art.thelen01@gmail.com
- Contact form: key `419ce1cc…`, CC sebastianherger1001@gmail.com

Each booking email includes the product, version, price, name, phone, zip, add-ons, estimated total and the page it came from.

## Shopify

Right now Shopify holds the catalog; the website doesn't sell anything. Two scripts connect them:

1. **Load the catalog into Shopify (one time)**
   ```bash
   SITE_URL=https://<your-netlify-site>.netlify.app npm run shopify:export
   ```
   This writes `shopify-products.csv`. Import it in Shopify admin → Products → Import. Image links point at your deployed site, so deploy first.

2. **Keep prices in sync from Shopify (optional)**
   - In Shopify admin, install the **Headless** sales channel, create a storefront, and copy its public Storefront API token.
   - Publish the products to that channel.
   - Then run:
   ```bash
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com SHOPIFY_STOREFRONT_TOKEN=xxxx npm run shopify:pull && npm run build
   ```
   Shopify controls titles, prices and availability. Photos and descriptions stay as set in `products.json`. Products are matched by handle and variants by SKU.

## Performance Kit page (the product you sell)

`/performance-ambient-lighting-kit` sells the DIY kit. Everything on it (name, price, photos, colors, box contents, FAQs) comes from `data/kit.json`. It's linked as **Performance Kit** in the menu on every page.

**Right now checkout is switched off.** The button says "Coming soon" and visitors can leave their email to hear when it's available. Those emails arrive through Web3Forms with the subject "Notify me: Performance Ambient Lighting Kit".

**To start selling:**

1. In Shopify admin, add the kit as a product at $165 and publish it to the **Headless** sales channel (the same one used for price sync above).
2. Copy the product's variant ID. In the product page in Shopify admin, open the variant; the number at the end of the address is the ID. Write it as `gid://shopify/ProductVariant/<that number>`.
3. In `data/kit.json` → `shopify`, fill in:
   - `"enabled": true`
   - `"storeDomain": "your-store.myshopify.com"`
   - `"storefrontToken": "<public Storefront API token>"`
   - `"variantId": "gid://shopify/ProductVariant/…"`
4. `npm run build` and deploy.

The button then reads **Buy now**, the email sign-up disappears, and buying sends the customer straight to Shopify's own checkout with the quantity they picked. Payments, tax, shipping and order emails are all handled by Shopify.

The Storefront token is designed to be public (it can only read products and create carts), so it's safe in the page.

**Swapping photos:** replace the entries in `gallery` with product photos when you have them. The first photo is shown large. The hero photo is shown in black and white and tinted to whichever light color the visitor picks, so any dark interior shot with visible strips works there.
