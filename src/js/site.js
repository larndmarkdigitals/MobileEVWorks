/* Mobile EV Works — site behaviour (no dependencies) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + Number(n).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SITE = window.EVW || {};

  /* ---------- Header: Products mega menu (keyboard / touch) ---------- */
  var header = $(".site-header");
  var productsBtn = $(".nav-products > button");
  if (header && productsBtn) {
    productsBtn.addEventListener("click", function () {
      var open = header.classList.toggle("mega-open");
      productsBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!header.contains(e.target)) { header.classList.remove("mega-open"); productsBtn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") header.classList.remove("mega-open"); });
  }

  /* ---------- Mobile menu ---------- */
  var mm = $(".mobile-menu");
  if (mm) {
    var openMenu = function () { mm.classList.add("open"); document.body.style.overflow = "hidden"; showPanel("main"); };
    var closeMenu = function () { mm.classList.remove("open"); document.body.style.overflow = ""; };
    var showPanel = function (name) { $$(".mm-panel", mm).forEach(function (p) { p.hidden = p.dataset.panel !== name; }); };
    $$(".menu-btn").forEach(function (b) { b.addEventListener("click", openMenu); });
    $$("[data-mm-close]", mm).forEach(function (b) { b.addEventListener("click", closeMenu); });
    $$("[data-mm-show]", mm).forEach(function (b) { b.addEventListener("click", function () { showPanel(b.dataset.mmShow); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------- Reveal on scroll ---------- */
  // Every block marked data-stagger brings its parts in one after another (heading, text, picture…).
  $$("[data-stagger]").forEach(function (box) {
    Array.prototype.slice.call(box.children).forEach(function (child, i) {
      child.classList.add("rv");
      child.style.setProperty("--d", Math.min(i, 8) * 80 + "ms");
    });
  });
  var reveals = $$(".rv");
  var showAll = function () { reveals.forEach(function (el) { el.classList.add("in"); }); };
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden (e.g. printing, odd viewports)
    setTimeout(function () { reveals.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add("in"); }); }, 1800);
    window.addEventListener("beforeprint", showAll);
  } else { showAll(); }

  /* ---------- Count-up stats ---------- */
  var counters = $$("[data-count]");
  var runCount = function (el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || "0", 10), suffix = el.dataset.suffix || "";
    var start = performance.now(), dur = 1400;
    var tick = function (now) {
      var t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * e).toFixed(dec) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length && "IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCount(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Generic horizontal carousel (home slides, reviews) ---------- */
  $$("[data-carousel]").forEach(function (root) {
    var track = $("[data-track]", root);
    var slides = $$("[data-slide]", track);
    var prev = $("[data-prev]", root), next = $("[data-next]", root);
    var dots = $$("[data-dot]", root);
    var index = 0;
    var go = function (i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      var s = slides[index];
      var left = s.offsetLeft - (track.clientWidth - s.clientWidth) * (root.dataset.carousel === "center" ? 0.5 : 0) - parseFloat(getComputedStyle(track).paddingLeft) * (root.dataset.carousel === "center" ? 0 : 1);
      track.scrollTo({ left: left, behavior: "smooth" });
    };
    var sync = function () {
      var best = 0, bestD = Infinity, mid = track.scrollLeft + track.clientWidth / 2;
      slides.forEach(function (s, i) {
        var c = root.dataset.carousel === "center" ? s.offsetLeft + s.clientWidth / 2 : s.offsetLeft;
        var ref = root.dataset.carousel === "center" ? mid : track.scrollLeft + parseFloat(getComputedStyle(track).paddingLeft);
        var d = Math.abs(c - ref); if (d < bestD) { bestD = d; best = i; }
      });
      index = best;
      dots.forEach(function (d, i) { d.classList.toggle("active", i === best); });
      slides.forEach(function (s, i) { s.classList.toggle("is-active", i === best); });
      if (prev) prev.disabled = best === 0;
      if (next) next.disabled = best === slides.length - 1;
    };
    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    var raf; track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  });

  /* ---------- Lightbox ---------- */
  var lb = $(".lightbox");
  var lbItems = [], lbIndex = 0;
  var lbRender = function () {
    if (!lb) return;
    var it = lbItems[lbIndex], stage = $(".lb-stage", lb);
    stage.innerHTML = /\.mp4$/i.test(it.src)
      ? '<video src="' + esc(it.src) + '" controls autoplay playsinline></video>'
      : '<img src="' + esc(it.src) + '" alt="' + esc(it.alt || "") + '">';
    $(".lb-caption", lb).textContent = it.alt || "";
    $$(".lb-nav", lb).forEach(function (b) { b.hidden = lbItems.length < 2; });
  };
  var openLb = function (items, i) { lbItems = items; lbIndex = i || 0; lbRender(); lb.hidden = false; document.body.style.overflow = "hidden"; };
  var closeLb = function () { lb.hidden = true; $(".lb-stage", lb).innerHTML = ""; document.body.style.overflow = ""; };
  if (lb) {
    $(".lb-close", lb).addEventListener("click", closeLb);
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    $(".lb-nav.prev", lb).addEventListener("click", function () { lbIndex = (lbIndex - 1 + lbItems.length) % lbItems.length; lbRender(); });
    $(".lb-nav.next", lb).addEventListener("click", function () { lbIndex = (lbIndex + 1) % lbItems.length; lbRender(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") $(".lb-nav.next", lb).click();
      if (e.key === "ArrowLeft") $(".lb-nav.prev", lb).click();
    });
  }
  var gallery = $(".gallery");
  if (gallery) {
    gallery.addEventListener("click", function (e) {
      var btn = e.target.closest("button"); if (!btn) return;
      var visible = $$("button", gallery).filter(function (b) { return b.offsetParent !== null; });
      openLb(visible.map(function (b) { var im = $("img", b); return { src: im.getAttribute("src"), alt: im.alt }; }), visible.indexOf(btn));
    });
  }

  /* ---------- Review cards: media slider + read more ---------- */
  $$(".review-card").forEach(function (card) {
    var media = JSON.parse(card.dataset.media || "[]");
    var box = $(".rc-media", card), i = 0;
    var paint = function () {
      var src = media[i];
      var old = $(".rc-media > video, .rc-media > img", card);
      var el;
      if (/\.mp4$/i.test(src)) {
        el = document.createElement("video");
        el.src = src; el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; el.setAttribute("playsinline", "");
      } else {
        el = document.createElement("img"); el.src = src; el.alt = card.dataset.name + " install photo"; el.loading = "lazy";
      }
      if (old) box.replaceChild(el, old); else box.insertBefore(el, box.firstChild);
      $$(".rc-dots button", card).forEach(function (d, k) { d.classList.toggle("active", k === i); });
    };
    $$(".rc-dots button", card).forEach(function (d, k) { d.addEventListener("click", function () { i = k; paint(); }); });
    var p = $(".rc-arrow.prev", card), n = $(".rc-arrow.next", card);
    if (p) p.addEventListener("click", function () { i = (i - 1 + media.length) % media.length; paint(); });
    if (n) n.addEventListener("click", function () { i = (i + 1) % media.length; paint(); });
    box.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      openLb(media.map(function (s) { return { src: s, alt: card.dataset.name + " — " + card.dataset.product }; }), i);
    });
    var quote = $(".rc-quote", card), more = $(".rc-more", card), clamp = $(".clamp", card);
    if (more && clamp) {
      var check = function () { more.hidden = quote.classList.contains("expanded") ? false : clamp.scrollHeight <= clamp.clientHeight + 1; };
      more.addEventListener("click", function () {
        var ex = quote.classList.toggle("expanded");
        more.textContent = ex ? "Show less" : "Read more";
      });
      window.addEventListener("resize", check); setTimeout(check, 50);
    }
  });

  /* ---------- Accordions (product info + FAQ) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".acc-btn"); if (!b) return;
    var item = b.closest(".acc-item"); var open = item.classList.toggle("open");
    b.setAttribute("aria-expanded", open ? "true" : "false");
    var panel = item.querySelector(".acc-panel"); if (panel) { if (open) panel.removeAttribute("inert"); else panel.setAttribute("inert", ""); }
  });

  /* ---------- Web3Forms submit helper ---------- */
  var send = function (payload) {
    return fetch(SITE.formsEndpoint || "https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) { return !!(j && j.success); }).catch(function () { return false; });
  };

  var params = new URLSearchParams(location.search);

  /* ---------- Shop page filtered by category (e.g. ?category=ambient-lighting) ---------- */
  var dir = $(".directory[data-categories]");
  var cat = params.get("category");
  if (dir && cat) {
    var labels = JSON.parse(dir.dataset.categories || "{}");
    if (labels[cat]) {
      $("h1", dir).textContent = "Shop " + labels[cat] + " for your Tesla";
      $$(".model-card, .hm-card", dir).forEach(function (a) { var t = a.getAttribute("data-cat-" + cat); if (t) a.setAttribute("href", t); });
    }
  }

  /* ---------- Contact form ---------- */
  var cf = $("#contact-form");
  var topicParam = params.get("topic");
  if (cf && topicParam) {
    var opt = $$("option", cf.topic).find(function (o) { return o.value && o.value.toLowerCase().indexOf(topicParam.toLowerCase()) === 0; });
    if (opt) cf.topic.value = opt.value;
  }
  if (cf) {
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      if (cf.botcheck && cf.botcheck.checked) return;
      var btn = $(".send", cf), err = $(".form-error", cf);
      err.hidden = true; btn.disabled = true; btn.textContent = "Sending…";
      var topic = cf.topic.value || "General inquiry";
      var payload = {
        access_key: cf.dataset.key,
        subject: "Contact form: " + topic,
        from_name: cf.name.value || "Website contact",
        Name: cf.name.value, Email: cf.email.value, Phone: cf.phone.value || "(not provided)", Topic: topic, Message: cf.message.value
      };
      if (cf.dataset.cc) payload.cc = cf.dataset.cc;
      send(payload).then(function (ok) {
        btn.disabled = false; btn.textContent = "Send message";
        if (ok) { cf.hidden = true; $(".contact-success").hidden = false; cf.reset(); }
        else { err.hidden = false; }
      });
    });
  }

  /* ---------- Product configurator + booking request ---------- */
  var dataEl = $("#product-data");
  if (dataEl) {
    var P = JSON.parse(dataEl.textContent);
    var state = { v: 0, photo: 0, warranty: false, addons: {} };
    var root = $(".product");
    var img = $(".pc-media img", root);
    var dotsBox = $(".pc-dots", root);
    var V = function () { return P.variants[state.v]; };

    var paintPhotos = function () {
      var photos = V().images;
      if (!photos.length) return;
      state.photo = Math.min(state.photo, photos.length - 1);
      if (img.getAttribute("src") !== photos[state.photo]) {
        img.classList.add("swap");
        img.onload = function () { img.classList.remove("swap"); };
        img.src = photos[state.photo];
      }
      img.alt = V().title + " photo " + (state.photo + 1);
      var many = photos.length > 1;
      $$(".pc-arrow", root).forEach(function (a) { a.hidden = !many; });
      dotsBox.hidden = !many;
      dotsBox.innerHTML = photos.map(function (_, i) { return '<button type="button" aria-label="Go to photo ' + (i + 1) + '"' + (i === state.photo ? ' class="active"' : "") + "></button>"; }).join("");
      var thumbs = $(".pc-thumbs", root);
      if (thumbs) thumbs.innerHTML = many ? photos.map(function (src, i) { return '<button type="button" aria-label="Show photo ' + (i + 1) + '" aria-current="' + (i === state.photo) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>'; }).join("") : "";
    };
    var sticky = $(".sticky-book");
    var paintVariant = function () {
      $$(".pc-variant", root).forEach(function (b, i) { b.classList.toggle("active", i === state.v); b.setAttribute("aria-pressed", i === state.v ? "true" : "false"); });
      $('[data-acc="details"] .acc-body', root).textContent = V().details || "";
      $('[data-acc="included"] .acc-body', root).textContent = V().included || P.includedFallback || "";
      $(".pc-book", root).innerHTML = "Book " + esc(V().title) + ' <span class="arrow" aria-hidden="true">→</span>';
      if (sticky) { $(".sb-name", sticky).textContent = V().title; $(".sb-price", sticky).textContent = money(V().price); }
      paintPhotos();
    };
    // preload all variant photos
    P.variants.forEach(function (v) { v.images.forEach(function (s) { var i = new Image(); i.src = s; }); });

    $$(".pc-variant", root).forEach(function (b, i) { b.addEventListener("click", function () { state.v = i; if (state.photo >= V().images.length) state.photo = 0; paintVariant(); }); });
    $(".pc-arrow.prev", root).addEventListener("click", function () { var n = V().images.length; state.photo = (state.photo - 1 + n) % n; paintPhotos(); });
    $(".pc-arrow.next", root).addEventListener("click", function () { var n = V().images.length; state.photo = (state.photo + 1) % n; paintPhotos(); });
    var thumbsBox = $(".pc-thumbs", root);
    if (thumbsBox) thumbsBox.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; state.photo = $$("button", thumbsBox).indexOf(b); paintPhotos(); });
    dotsBox.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; state.photo = $$("button", dotsBox).indexOf(b); paintPhotos(); });
    var touchX = null, media = $(".pc-media", root);
    media.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    media.addEventListener("touchend", function (e) {
      if (touchX == null) return; var dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 40) $(dx < 0 ? ".pc-arrow.next" : ".pc-arrow.prev", root).click();
    });

    var warrantyBtn = $(".pc-warranty", root);
    if (warrantyBtn) warrantyBtn.addEventListener("click", function () { state.warranty = !state.warranty; warrantyBtn.setAttribute("aria-pressed", state.warranty); });

    // Booking modal
    var modal = $("#booking-modal");
    var form = $("form", modal);
    var addonList = function () {
      var list = (P.bookingAddons || []).map(function (a) { return { key: a.key, title: a.title, price: a.price, checked: !!state.addons[a.key] }; });
      if (P.addon && P.addon.enabled) list.push({ key: "extendedWarranty", title: P.addon.title, price: P.addon.price, checked: state.warranty });
      return list;
    };
    var total = function () { return addonList().reduce(function (s, a) { return s + (a.checked ? parseFloat(a.price) : 0); }, parseFloat(V().price)); };
    var paintModal = function () {
      $(".m-title", modal).textContent = P.title + " — " + V().title;
      var rows = '<div class="sum-row"><span>' + esc(V().title) + "</span><span>" + money(V().price) + "</span></div>";
      addonList().forEach(function (a) { if (a.checked) rows += '<div class="sum-row"><span>+ ' + esc(a.title) + "</span><span>" + money(a.price) + "</span></div>"; });
      rows += '<div class="sum-total"><span>Total</span><span>' + money(total()) + "</span></div>";
      $(".m-sum", modal).innerHTML = rows;
      $(".m-addons", modal).innerHTML = addonList().map(function (a) {
        return '<button type="button" class="choice check-choice" data-addon="' + a.key + '" aria-pressed="' + a.checked + '"><span class="box"></span><span class="c-name">' + esc(a.title) + '</span><span class="c-price">+' + money(a.price) + "</span></button>";
      }).join("");
    };
    $(".m-addons", modal).addEventListener("click", function (e) {
      var b = e.target.closest("[data-addon]"); if (!b) return;
      var k = b.dataset.addon;
      if (k === "extendedWarranty") { state.warranty = !state.warranty; if (warrantyBtn) warrantyBtn.setAttribute("aria-pressed", state.warranty); }
      else state.addons[k] = !state.addons[k];
      paintModal();
    });
    var lastFocus;
    var openModal = function () {
      lastFocus = document.activeElement;
      $(".m-form", modal).hidden = false; $(".m-success", modal).hidden = true; $(".form-error", modal).hidden = true;
      paintModal(); modal.hidden = false; document.body.style.overflow = "hidden";
      setTimeout(function () { form.elements.name.focus(); }, 30);
    };
    var submitting = false;
    var closeModal = function () { if (submitting) return; modal.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
    $(".pc-book", root).addEventListener("click", openModal);
    $(".modal-close", modal).addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.botcheck && form.botcheck.checked) return;
      var btn = $(".submit-btn", form), err = $(".form-error", form);
      submitting = true; btn.disabled = true; btn.textContent = "Sending…"; err.hidden = true;
      var chosen = addonList().filter(function (a) { return a.checked; });
      // Model 3 and Model Y (or S and X) installs are identical, so the email names the pair
      var modelText = (P.models || []).join(" / ");
      var payload = {
        access_key: SITE.bookingKey,
        subject: "New booking request: " + P.title + " — " + V().title + " — " + (P.models || []).join("/"),
        from_name: form.elements.name.value || "Website booking",
        "Tesla model": modelText,
        Product: P.title,
        Kit: V().title,
        Price: money(V().price),
        Name: form.elements.name.value,
        Phone: form.elements.phone.value,
        Zip: form.elements.zip.value,
        "Add-ons requested": chosen.map(function (a) { return a.title + " (" + money(a.price) + ")"; }).join(", ") || "(none)",
        Total: money(total()),
        Page: location.href
      };
      if (SITE.bookingCc) payload.cc = SITE.bookingCc;
      send(payload).then(function (ok) {
        submitting = false; btn.disabled = false; btn.textContent = "Send request";
        if (ok) { $(".m-form", modal).hidden = true; $(".m-success", modal).hidden = false; form.reset(); }
        else err.hidden = false;
      });
    });

    // Sticky "Book" bar on phones: shows once the main Book button scrolls off screen
    if (sticky && "IntersectionObserver" in window) {
      var mainBtn = $(".pc-book", root);
      $(".sb-btn", sticky).addEventListener("click", openModal);
      new IntersectionObserver(function (en) {
        var show = !en[0].isIntersecting;
        sticky.classList.toggle("show", show);
        sticky.setAttribute("aria-hidden", show ? "false" : "true");
        $(".sb-btn", sticky).tabIndex = show ? 0 : -1;
        document.body.classList.toggle("sticky-on", show);
      }).observe(mainBtn);
    }

    paintVariant();
  }
})();
