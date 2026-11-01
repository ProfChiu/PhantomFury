/* fw_motion.js — show that a piece moved, without the engine knowing.
 *
 * Every page here rebuilds its table from the state on each action, because a
 * projection is simpler and cannot drift. The cost is that a card travelling
 * from the staging area into the fight, or a counter crossing three hexes,
 * simply appears somewhere else: the one thing a game must show — that THIS
 * piece went THERE — is the thing the page never shows.
 *
 * This file puts the movement back. Before the rebuild the page photographs
 * where every piece is; after it, a copy of each piece that moved flies from
 * its old place to its new one. The copies live in an overlay layer above the
 * whole stage, because a piece crossing a zone boundary passes through
 * `overflow: hidden` on the way and would otherwise be cut in half.
 *
 *   var was = FW.motion.snapshot();      // before rebuilding
 *   ... rebuild ...
 *   FW.motion.play(was);                 // after
 *   FW.motion.pulse(".dial .n, .progress .n");   // numbers cannot travel
 *
 * Options (all optional): {
 *   root:   "#app"        where pieces live
 *   layer:  "#fx"         the overlay; created if absent
 *   select: "[data-uid]"  what counts as a piece (must carry a unique id)
 *   key:    "uid"         the dataset field holding that id
 *   ms:     260
 *   sourceFor: function (id) -> element | rect     where a new piece comes from
 * }
 *
 * The engine is not involved, and nothing here changes layout: a flight is a
 * copy, and the real piece is only hidden while its copy is in the air. A page
 * whose flights never landed would leave pieces invisible, so `settle()` is
 * called at the start of every play() and the live checks assert it
 * (test/fw_ui_checks.py: flights_land).
 *
 * Honours `prefers-reduced-motion`, and `FW.motion.control()` gives the player
 * an on/off switch that is remembered.
 */
(function (root) {
  "use strict";

  var FW = root.FW || (root.FW = {});

  var cfg = {
    root: "#app", layer: "#fx", select: "[data-uid]", key: "uid",
    ms: 260, storeKey: "fw.motion", label: "Motion", sourceFor: null
  };
  var state = { on: null, flights: [], nums: {} };

  function configure(opts) {
    if (!opts) return cfg;
    Object.keys(opts).forEach(function (k) { cfg[k] = opts[k]; });
    return cfg;
  }

  function doc() { return root.document; }

  function on() {
    if (state.on === null) {
      try { state.on = root.localStorage.getItem(cfg.storeKey) !== "0"; }
      catch (e) { state.on = true; }
    }
    if (!state.on) return false;
    try {
      if (root.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    } catch (e) { /* older engines: motion stays on */ }
    return true;
  }

  function toggle(v) {
    state.on = v === undefined ? !on() : !!v;
    try { root.localStorage.setItem(cfg.storeKey, state.on ? "1" : "0"); } catch (e) { /* fine */ }
    settle();
    return state.on;
  }

  // the stage is scaled to the window as one unit; viewport pixels must be
  // divided by that scale before they mean anything inside it
  function scale() {
    var st = doc().querySelector(".fw-stage") || doc().getElementById("stage");
    var k = st && parseFloat(st.dataset.scale);
    return k && isFinite(k) && k > 0 ? k : 1;
  }

  function layer() {
    var l = doc().querySelector(cfg.layer);
    if (!l) {
      var stage = doc().querySelector(".fw-stage") || doc().getElementById("stage") || doc().body;
      l = doc().createElement("div");
      l.id = String(cfg.layer).replace(/^#/, "") || "fx";
      l.className = "fw-fx";
      stage.appendChild(l);
    }
    return l;
  }

  function pieces() {
    var scope = doc().querySelector(cfg.root) || doc();
    return scope.querySelectorAll(cfg.select);
  }

  // Measure the image where a piece has one: a card in hand is often drawn
  // translated out of its layout box, and a flight that starts from the box
  // jumps before it moves.
  function boxOf(node) {
    var img = node.querySelector && node.querySelector("img");
    return (img || node).getBoundingClientRect();
  }

  function snapshot(opts) {
    if (opts) configure(opts);
    var places = {};
    [].forEach.call(pieces(), function (n) {
      var id = n.dataset ? n.dataset[cfg.key] : null;
      if (!id) return;
      var r = boxOf(n), img = n.querySelector && n.querySelector("img");
      if (r.width > 2 && r.height > 2) {
        places[id] = { left: r.left, top: r.top, width: r.width, height: r.height,
                       src: img ? img.src : "", html: img ? "" : n.innerHTML,
                       cls: n.className };
      }
    });
    return places;
  }

  function settle() {
    state.flights.splice(0).forEach(function (f) {
      if (f.anim) { try { f.anim.cancel(); } catch (e) { /* already done */ } }
      if (f.node) f.node.style.visibility = "";
      if (f.copy && f.copy.parentNode) f.copy.parentNode.removeChild(f.copy);
    });
  }

  function copyAt(place, from) {
    var l = layer(), box = l.getBoundingClientRect(), k = scale();
    var c = doc().createElement("div");
    c.className = "fw-flyer";
    if (place.src) {
      var img = doc().createElement("img");
      img.src = place.src;
      img.style.width = (from.width / k) + "px";
      img.style.height = (from.height / k) + "px";
      c.appendChild(img);
    } else {
      c.className += " " + (place.cls || "");
      c.innerHTML = place.html || "";
      c.style.width = (from.width / k) + "px";
      c.style.height = (from.height / k) + "px";
    }
    c.style.left = ((from.left - box.left) / k) + "px";
    c.style.top = ((from.top - box.top) / k) + "px";
    l.appendChild(c);
    return c;
  }

  function fly(node, place, from, to) {
    if (!node.animate) return;
    var k = scale();
    var copy = copyAt(place, from);
    var dx = (to.left - from.left) / k, dy = (to.top - from.top) / k;
    var grow = from.width ? to.width / from.width : 1;
    node.style.visibility = "hidden";
    var flight = { node: node, copy: copy };
    flight.anim = copy.animate(
      [{ transform: "translate(0px,0px) scale(1)" },
       { transform: "translate(" + dx + "px," + dy + "px) scale(" + grow + ")" }],
      { duration: cfg.ms, easing: "cubic-bezier(.25,.8,.35,1)", fill: "forwards" });
    state.flights.push(flight);
    flight.anim.onfinish = function () {
      node.style.visibility = "";
      if (copy.parentNode) copy.parentNode.removeChild(copy);
      var i = state.flights.indexOf(flight);
      if (i >= 0) state.flights.splice(i, 1);
    };
  }

  function rectOf(x) {
    if (!x) return null;
    if (x.getBoundingClientRect) {
      var r = x.getBoundingClientRect();
      return r.width > 2 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
    }
    return x.width ? x : null;
  }

  // A piece that was not there a moment ago: it comes out of wherever the game
  // says it comes from (a deck, a pile, off the board edge), or simply arrives.
  function appear(node, id, to) {
    var src = cfg.sourceFor ? rectOf(cfg.sourceFor(id, node)) : null;
    if (src) {
      var img = node.querySelector && node.querySelector("img");
      fly(node, { src: img ? img.src : "", html: img ? "" : node.innerHTML,
                  cls: node.className }, src, to);
      return;
    }
    if (!node.animate) return;
    node.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1)" }],
                 { duration: cfg.ms, easing: "ease-out" });
  }

  // A piece that has left: it fades where it stood, so the eye is told that
  // something went rather than finding a hole next time it looks.
  function vanish(place) {
    if (!place.src && !place.html) return;
    var c = copyAt(place, place);
    if (!c.animate) { c.parentNode.removeChild(c); return; }
    var a = c.animate([{ opacity: .85, transform: "scale(1)" },
                       { opacity: 0, transform: "scale(.82)" }],
                      { duration: cfg.ms, easing: "ease-in", fill: "forwards" });
    a.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
  }

  function play(was, opts) {
    if (opts) configure(opts);
    settle();
    if (!was || !on()) return 0;
    var moved = 0, now = {};
    [].forEach.call(pieces(), function (n) {
      var id = n.dataset ? n.dataset[cfg.key] : null;
      if (!id) return;
      var r = boxOf(n);
      if (!(r.width > 2 && r.height > 2)) return;
      var to = { left: r.left, top: r.top, width: r.width, height: r.height };
      now[id] = true;
      var from = was[id];
      if (!from) { appear(n, id, to); return; }
      if (Math.abs(from.left - to.left) < 2 && Math.abs(from.top - to.top) < 2 &&
          Math.abs(from.width - to.width) < 2) return;
      fly(n, from, from, to);
      moved += 1;
    });
    Object.keys(was).forEach(function (id) { if (!now[id]) vanish(was[id]); });
    return moved;
  }

  // Numbers do not travel, so they pulse. Track them by a stable key: the same
  // selector in the same place is the same number one action later.
  function pulse(selector, opts) {
    if (opts) configure(opts);
    var scope = doc().querySelector(cfg.root) || doc();
    var seen = {};
    [].forEach.call(scope.querySelectorAll(selector), function (n, i) {
      var parent = n.parentNode;
      var key = (parent && parent.className ? parent.className : "n") + ":" +
                (parent ? [].indexOf.call(parent.children, n) : i) + ":" + i;
      seen[key] = n.textContent;
      if (on() && state.nums[key] !== undefined && state.nums[key] !== n.textContent && n.animate) {
        n.animate([{ transform: "scale(1)", filter: "brightness(1)" },
                   { transform: "scale(1.22)", filter: "brightness(1.9)" },
                   { transform: "scale(1)", filter: "brightness(1)" }],
                  { duration: 420, easing: "ease-out" });
      }
    });
    state.nums = seen;
  }

  function control(opts) {
    if (opts) configure(opts);
    var wrap = doc().createElement("div");
    wrap.className = "fw-typectl fw-motionctl";
    var k = doc().createElement("span");
    k.className = "k";
    k.textContent = cfg.label;
    wrap.appendChild(k);
    var b = doc().createElement("button");
    b.className = "fw-motion-t";
    b.textContent = on() ? "on" : "off";
    b.addEventListener("click", function () { b.textContent = toggle() ? "on" : "off"; });
    wrap.appendChild(b);
    return wrap;
  }

  FW.motion = {
    configure: configure,
    enabled: on,
    toggle: toggle,
    snapshot: snapshot,
    play: play,
    pulse: pulse,
    settle: settle,
    control: control
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FW.motion;
})(typeof window !== "undefined" ? window : globalThis);
