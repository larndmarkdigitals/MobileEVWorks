/* Copy editor: highlights changed text, counts edits, search and "only my changes"
   filters, keeps a draft in this browser, and sends the changes to Netlify Forms. */
(function () {
  "use strict";
  var form = document.querySelector(".ce-form");
  if (!form) return;
  var boxes = Array.prototype.slice.call(form.querySelectorAll(".ce-item textarea"));
  var groups = Array.prototype.slice.call(form.querySelectorAll(".ce-group"));
  var count = form.querySelector(".ce-count"), search = form.querySelector(".ce-search");
  var only = form.querySelector(".ce-only input"), payload = form.querySelector(".ce-payload");
  var err = form.querySelector(".pr-error"), done = form.querySelector(".pr-done"), btn = form.querySelector(".ce-send");
  var KEY = "evw-copy-edits";

  var grow = function (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; };
  var clean = function (v) { return v.replace(/\r\n?/g, "\n").trim(); };
  var changed = function (t) { return clean(t.value) !== clean(t.dataset.original); };

  var mark = function (t) {
    var item = t.closest(".ce-item"), on = changed(t);
    item.classList.toggle("is-edited", on);
    item.querySelector(".ce-reset").hidden = !on;
    var was = item.querySelector(".ce-was");
    was.hidden = !on; was.textContent = on ? "Was: " + t.dataset.original : "";
  };
  var refresh = function () {
    var n = boxes.filter(changed).length;
    count.textContent = n ? n + (n === 1 ? " change" : " changes") : "No changes yet";
    groups.forEach(function (g) {
      var k = g.querySelectorAll(".ce-item.is-edited").length;
      g.querySelector(".ce-edited").textContent = k ? " · " + k + " changed" : "";
    });
  };
  var filter = function () {
    var q = search.value.trim().toLowerCase(), mine = only.checked;
    groups.forEach(function (g) {
      var visible = 0;
      g.querySelectorAll(".ce-item").forEach(function (item) {
        var t = item.querySelector("textarea");
        var hit = (!q || t.value.toLowerCase().indexOf(q) > -1 || t.dataset.original.toLowerCase().indexOf(q) > -1) && (!mine || changed(t));
        item.hidden = !hit; if (hit) visible++;
      });
      g.hidden = visible === 0;
      if ((q || mine) && visible) g.open = true;
    });
  };
  var save = function () {
    var edits = {};
    boxes.forEach(function (t) { if (changed(t)) edits[t.id + "|" + t.dataset.original] = t.value; });
    try { localStorage.setItem(KEY, JSON.stringify({ edits: edits, note: form.note.value })); } catch (e) {}
  };
  var load = function () {
    var d; try { d = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { d = {}; }
    var edits = d.edits || {};
    boxes.forEach(function (t) {
      var v = edits[t.id + "|" + t.dataset.original];
      if (v !== undefined) t.value = v;
    });
    if (d.note) form.note.value = d.note;
  };

  boxes.forEach(function (t) {
    t.addEventListener("input", function () { grow(t); mark(t); refresh(); save(); });
  });
  form.addEventListener("click", function (e) {
    if (!e.target.classList.contains("ce-reset")) return;
    var t = e.target.closest(".ce-item").querySelector("textarea");
    t.value = t.dataset.original; grow(t); mark(t); refresh(); save(); filter();
  });
  form.note.addEventListener("input", save);
  search.addEventListener("input", filter);
  only.addEventListener("change", filter);
  groups.forEach(function (g) { g.addEventListener("toggle", function () { if (g.open) g.querySelectorAll("textarea").forEach(grow); }); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var edits = boxes.filter(changed).map(function (t) {
      return { page: t.closest(".ce-item").dataset.page, original: t.dataset.original, edited: t.value.trim() };
    });
    if (!edits.length && !form.note.value.trim()) { err.hidden = false; err.textContent = "Nothing's changed yet. Edit some text first."; return; }
    err.hidden = true; btn.disabled = true; btn.textContent = "Sending…";
    payload.value = JSON.stringify(edits);
    var body = new URLSearchParams(new FormData(form)).toString();
    fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () { done.hidden = false; btn.textContent = "Sent"; try { localStorage.removeItem(KEY); } catch (e) {} })
      .catch(function () { btn.disabled = false; btn.textContent = "Send my changes"; err.hidden = false; err.textContent = "That didn't send. Check your connection and try again."; });
  });

  load();
  boxes.forEach(function (t) { mark(t); });
  groups.filter(function (g) { return g.open; }).forEach(function (g) { g.querySelectorAll("textarea").forEach(grow); });
  refresh();
  if (/[?&]sent=1/.test(location.search)) done.hidden = false;
})();
