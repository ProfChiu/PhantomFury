/* fw_stage.js — fit the fixed canvas to the window.
 *
 * Every page here is authored at one size (1920 x 1080, the console authoring
 * size) and scaled to the window as a single unit, so nothing reflows and the
 * layout a screenshot shows is the layout everyone sees. This is the only
 * place that scaling happens.
 *
 *   FW.stage.fit();                       // fits .fw-stage, or #stage
 *   FW.stage.fit(el, { width: 1920, height: 1080, mode: "contain" });
 *
 * mode "contain" (the default) fits the whole canvas in the window, letterboxed.
 * mode "cover" fills the window and lets the canvas overflow — only sensible
 * when the edges carry nothing but background.
 *
 * The 10% title-safe area is a layout rule, not this file's job: keep anything
 * readable or clickable inside var(--safe-x) / var(--safe-y).
 */
(function (root) {
  "use strict";

  var FW = root.FW || (root.FW = {});

  function fit(el, opts) {
    opts = opts || {};
    el = el || document.querySelector(".fw-stage") || document.getElementById("stage");
    if (!el) return null;
    var w = opts.width || el.dataset.canvasW || 1920;
    var h = opts.height || el.dataset.canvasH || 1080;
    w = parseInt(w, 10);
    h = parseInt(h, 10);

    function apply() {
      var sw = root.innerWidth / w;
      var sh = root.innerHeight / h;
      var scale = opts.mode === "cover" ? Math.max(sw, sh) : Math.min(sw, sh);
      if (opts.max !== false) scale = Math.min(scale, opts.max || 1);   // never blow past 1:1
      el.style.transformOrigin = "top left";
      el.style.transform = "scale(" + scale + ")";
      el.style.position = "absolute";
      el.style.left = Math.max(0, Math.round((root.innerWidth - w * scale) / 2)) + "px";
      el.style.top = Math.max(0, Math.round((root.innerHeight - h * scale) / 2)) + "px";
      el.dataset.scale = String(scale);
      return scale;
    }

    var scale = apply();
    if (!fit._bound) {
      fit._bound = true;
      root.addEventListener("resize", function () { apply(); });
    }
    return scale;
  }

  FW.stage = { fit: fit };
  if (typeof module !== "undefined" && module.exports) module.exports = FW.stage;
})(typeof window !== "undefined" ? window : globalThis);
