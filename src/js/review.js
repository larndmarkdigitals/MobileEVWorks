/* Photo review page: progress count, draft saved in this browser, reason required for
   "Needs changes", and sending the answers to Netlify Forms. */
(function () {
  "use strict";
  var form = document.querySelector(".pr-form");
  if (!form) return;
  var cards = Array.prototype.slice.call(form.querySelectorAll(".pr-card"));
  var count = form.querySelector(".pr-count"), split = form.querySelector(".pr-split");
  var err = form.querySelector(".pr-error"), done = form.querySelector(".pr-done"), btn = form.querySelector(".pr-send");
  var KEY = "evw-photo-review-" + (form.round ? form.round.value : "1");

  var save = function () {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "hidden" || el.name === "bot-field") return;
      if (el.type === "radio") { if (el.checked) data[el.name] = el.value; } else data[el.name] = el.value;
    });
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  };
  var load = function () {
    var data; try { data = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { data = {}; }
    Object.keys(data).forEach(function (k) {
      var els = form.querySelectorAll('[name="' + k + '"]');
      Array.prototype.forEach.call(els, function (el) { if (el.type === "radio") el.checked = el.value === data[k]; else el.value = data[k]; });
    });
  };
  var update = function () {
    var ok = 0, change = 0;
    cards.forEach(function (c) {
      var picked = c.querySelector("input[type=radio]:checked");
      c.classList.toggle("is-approved", !!picked && picked.value === "approve");
      c.classList.toggle("is-change", !!picked && picked.value === "change");
      if (picked) { if (picked.value === "approve") ok++; else change++; }
    });
    count.textContent = (ok + change) + " of " + cards.length + " reviewed";
    split.textContent = (ok || change) ? ok + " approved · " + change + " need changes" : "";
  };

  form.addEventListener("change", function () { update(); save(); });
  form.addEventListener("input", save);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var missing = cards.filter(function (c) {
      var picked = c.querySelector("input[type=radio]:checked");
      return picked && picked.value === "change" && !c.querySelector("textarea").value.trim();
    });
    cards.forEach(function (c) { c.classList.toggle("needs-note", missing.indexOf(c) > -1); });
    if (missing.length) {
      err.hidden = false;
      err.textContent = "Add a quick note to " + (missing.length === 1 ? "the photo" : "the " + missing.length + " photos") + " marked “Needs changes” so I know what to fix.";
      missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
      missing[0].querySelector("textarea").focus({ preventScroll: true });
      return;
    }
    err.hidden = true; btn.disabled = true; btn.textContent = "Sending…";
    var body = new URLSearchParams(new FormData(form)).toString();
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        done.hidden = false; btn.textContent = "Sent";
        try { localStorage.removeItem(KEY); } catch (e) {}
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Send review";
        err.hidden = false; err.textContent = "That didn't send. Check your connection and try again.";
      });
  });

  load(); update();
  if (/[?&]sent=1/.test(location.search)) done.hidden = false;
})();
