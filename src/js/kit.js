/* Performance Kit page: colour preview, cabin diagram, quantity, notify-me,
   sticky buy bar and Shopify checkout (switched off until configured). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = window.EVW_KIT || {};
  var page = document.body;

  /* ---------- Light colour preview ---------- */
  var setColor = function (hex, name) {
    page.style.setProperty("--glow", hex);
    // white light: show the neutral photo without a colour wash
    page.style.setProperty("--tint", hex.toLowerCase() === "#ffffff" ? "transparent" : hex);
    $$(".swatch").forEach(function (s) { s.setAttribute("aria-pressed", s.dataset.color === hex ? "true" : "false"); });
    $$(".picker-name").forEach(function (n) { n.textContent = name; });
  };
  $$(".swatch").forEach(function (s) {
    s.addEventListener("click", function () { setColor(s.dataset.color, s.dataset.name); });
  });

  /* ---------- Cabin diagram: show one zone at a time ---------- */
  var cabin = $(".cabin");
  var zoneBtns = $$(".kz-btn");
  var showZone = function (id) {
    if (!cabin) return;
    cabin.classList.toggle("focus", !!id);
    $$(".zone", cabin).forEach(function (z) { z.classList.toggle("on", z.dataset.zone === id); });
    zoneBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.zone === id); });
  };
  zoneBtns.forEach(function (b) {
    b.addEventListener("mouseenter", function () { showZone(b.dataset.zone); });
    b.addEventListener("focus", function () { showZone(b.dataset.zone); });
    b.addEventListener("click", function () { showZone(b.classList.contains("active") && matchMedia("(hover: none)").matches ? null : b.dataset.zone); });
  });
  var list = $(".kz-list");
  if (list) {
    list.addEventListener("mouseleave", function () { showZone(null); });
    list.addEventListener("focusout", function (e) { if (!list.contains(e.relatedTarget)) showZone(null); });
  }

  /* ---------- Quantity ---------- */
  var qty = 1, qtyOut = $(".qty-n");
  $$("[data-qty]").forEach(function (b) {
    b.addEventListener("click", function () {
      qty = Math.max(1, Math.min(10, qty + parseInt(b.dataset.qty, 10)));
      if (qtyOut) qtyOut.textContent = qty;
    });
  });

  /* ---------- Shopify checkout ---------- */
  var sh = CFG.shopify || {};
  var live = !!(sh.enabled && sh.storeDomain && sh.storefrontToken && sh.variantId);
  var buyBtns = $$("[data-buy]");
  var label = "Buy now";
  var checkout = function () {
    buyBtns.forEach(function (b) { b.disabled = true; b.textContent = "Opening checkout…"; });
    var query = "mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } } }";
    fetch("https://" + sh.storeDomain + "/api/" + (sh.apiVersion || "2025-01") + "/graphql.json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": sh.storefrontToken },
      body: JSON.stringify({ query: query, variables: { input: { lines: [{ merchandiseId: sh.variantId, quantity: qty }] } } })
    }).then(function (r) { return r.json(); }).then(function (j) {
      var url = j && j.data && j.data.cartCreate && j.data.cartCreate.cart && j.data.cartCreate.cart.checkoutUrl;
      if (url) { location.href = url; return; }
      throw new Error("no checkout url");
    }).catch(function () {
      buyBtns.forEach(function (b) { b.disabled = false; b.textContent = label; });
      alertMsg("Checkout couldn't open. Please try again, or call or text us.");
    });
  };
  var alertMsg = function (t) { var m = $(".notify-msg"); if (m) { m.hidden = false; m.textContent = t; } };
  if (live) {
    buyBtns = buyBtns.concat($$("[data-buy-bar]"));
    buyBtns.forEach(function (b) { b.disabled = false; b.textContent = label; b.addEventListener("click", checkout); });
    var nf = $("[data-notify]"); if (nf) nf.hidden = true;
  }

  /* ---------- Notify me (until checkout is live) ---------- */
  var form = $("[data-notify]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.botcheck && form.botcheck.checked) return;
      var btn = $("button[type=submit]", form), msg = $(".notify-msg", form);
      btn.disabled = true; btn.textContent = "Sending…";
      var payload = {
        access_key: CFG.notifyKey,
        subject: "Notify me: " + CFG.name,
        from_name: "Website: " + CFG.name,
        Email: form.email.value,
        Product: CFG.name,
        Page: location.href
      };
      if (CFG.notifyCc) payload.cc = CFG.notifyCc;
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (j) { return !!(j && j.success); }).catch(function () { return false; })
        .then(function (ok) {
          btn.disabled = false; btn.textContent = "Notify me"; msg.hidden = false;
          if (ok) { msg.textContent = "You're on the list. We'll email you the day it's available."; form.reset(); }
          else { msg.textContent = "That didn't send. Please try again."; }
        });
    });
  }

  /* ---------- Sticky buy bar once the hero has scrolled away ---------- */
  var bar = $(".kit-bar"), hero = $(".kit-hero"), buy = $(".kit-panel");
  if (bar && hero && "IntersectionObserver" in window) {
    var heroOut = false, panelIn = false;
    var update = function () {
      var show = heroOut && !panelIn;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
      $$(".kb-buy", bar).forEach(function (b) { b.tabIndex = show ? 0 : -1; });
      page.classList.toggle("bar-on", show);
    };
    new IntersectionObserver(function (en) { heroOut = !en[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
    if (buy) new IntersectionObserver(function (en) { panelIn = en[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(buy);
    $$(".kb-buy", bar).forEach(function (b) { if (!live) b.addEventListener("click", function () { var n = $("#notify-email"); if (n) { n.scrollIntoView({ behavior: "smooth", block: "center" }); n.focus({ preventScroll: true }); } }); });
  }
})();
