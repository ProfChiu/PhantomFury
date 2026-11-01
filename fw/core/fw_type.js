/* fw_type.js — one multiplier for every font size on the page.
 *
 * Text size is personal taste, and a fixed canvas makes it worse: the stage is
 * authored at 1920 and scaled to the window, so a 10px label on a laptop lands
 * near 8 real pixels. Rather than argue about a number, the page offers a few
 * steps and remembers the choice.
 *
 * The contract is one line of CSS discipline: every font size on the page is
 * written as `calc(Npx * var(--type))`, and `:root { --type: 1 }`. Nothing else
 * changes. The layout must hold at the largest step — that is a live check, not
 * a hope (see test/fw_ui_checks.py: type_steps_hold).
 *
 *   FW.type.apply();                      // at boot, before the first render
 *   el.appendChild(FW.type.control());    // a slider with a live name
 *   FW.type.set(2);                       // by index, persists
 *
 * Options: { key: "fw.type", steps: [{v, name}, ...], label: "Text" }.
 */
(function (root) {
  "use strict";

  var FW = root.FW || (root.FW = {});

  var STEPS = [
    { v: 0.9, name: "Small" },
    { v: 1.0, name: "Normal" },
    { v: 1.15, name: "Large" },
    { v: 1.3, name: "Larger" }
  ];

  var cfg = { key: "fw.type", steps: STEPS, label: "Text" };

  function configure(opts) {
    opts = opts || {};
    if (opts.key) cfg.key = opts.key;
    if (opts.steps && opts.steps.length) cfg.steps = opts.steps;
    if (opts.label) cfg.label = opts.label;
    return cfg;
  }

  function stored() {
    try {
      var raw = root.localStorage.getItem(cfg.key);
      if (raw == null) return null;
      var v = parseFloat(raw);
      return isFinite(v) ? v : null;
    } catch (e) { return null; }       // private window, blocked storage
  }

  function index() {
    var v = stored();
    if (v == null) return defaultIndex();
    var best = 0, gap = Infinity;
    cfg.steps.forEach(function (s, i) {
      var d = Math.abs(s.v - v);
      if (d < gap) { gap = d; best = i; }
    });
    return best;
  }

  function defaultIndex() {
    for (var i = 0; i < cfg.steps.length; i++) if (cfg.steps[i].v === 1) return i;
    return Math.floor(cfg.steps.length / 2);
  }

  function set(i) {
    var step = cfg.steps[Math.max(0, Math.min(cfg.steps.length - 1, i | 0))];
    if (root.document && root.document.documentElement) {
      root.document.documentElement.style.setProperty("--type", String(step.v));
    }
    try { root.localStorage.setItem(cfg.key, String(step.v)); } catch (e) { /* not fatal */ }
    return step;
  }

  function apply(opts) {
    if (opts) configure(opts);
    return set(index());
  }

  // A slider rather than a menu: the steps are ordered, and the name beside it
  // says which one you are on without opening anything.
  function control(opts) {
    if (opts) configure(opts);
    var doc = root.document;
    var wrap = doc.createElement("div");
    wrap.className = "fw-typectl";

    var k = doc.createElement("span");
    k.className = "k";
    k.textContent = cfg.label;
    wrap.appendChild(k);

    var slider = doc.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(cfg.steps.length - 1);
    slider.step = "1";
    slider.value = String(index());
    slider.setAttribute("aria-label", cfg.label + " size");
    wrap.appendChild(slider);

    var name = doc.createElement("span");
    name.className = "v";
    name.textContent = cfg.steps[index()].name;
    wrap.appendChild(name);

    slider.addEventListener("input", function () {
      var step = set(parseInt(slider.value, 10));
      name.textContent = step.name;
      if (typeof cfg.onChange === "function") cfg.onChange(step);
    });

    return wrap;
  }

  FW.type = {
    steps: function () { return cfg.steps.slice(); },
    configure: configure,
    index: index,
    set: set,
    apply: apply,
    control: control
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FW.type;
})(typeof window !== "undefined" ? window : globalThis);
