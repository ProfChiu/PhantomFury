/* hb_view.js — the board on screen: an SVG hex layer over an optional map
 * scan, and a counter layer of persistent, animating tokens.
 *
 * Lifted from SF3D's board-view.js (SVG polygons, token divs at hex centres,
 * stack spread) and Ambush's mainscreen (counters positioned over a raster
 * map by the fitted grid). The view never decides anything: it reports
 * clicks and drags as intents and paints whatever highlights it is given.
 *
 *   var view = HexBoard.view.mount({
 *     root: el, grid: grid,
 *     map: { image: "assets/map.png", width: 5336, height: 4850 } | null,   // null: draw terrain fills
 *     terrainOf: function (hexId) { return "woods"; },   // class on the polygon (hb-t-woods)
 *     labels: true,                                       // print ids in each hex
 *     scale: 0.18 | "fit",                                // board pixels -> screen; "fit" fills root
 *     resolve: function (counterId) { return { image, name }; },
 *     onHexClick(hexId), onCounterClick(uid), onIntent({ kind: "move", uid, hex }),
 *     onHover(hexId | null)
 *   });
 *   view.setCounters([{ uid, hex, cardId, name, side, markers: ["pinned"], facing: 0, dim }])
 *   view.setHighlights({ legal: [ids], path: [ids], los: [ids], blocked: [ids], target: [ids], selected: [uids], hint: [ids] })
 *   view.sync()   view.locked = true   view.hexAt(clientX, clientY)
 *
 * Plain script; DOM only here.
 */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function mount(opts) {
    var grid = opts.grid;
    var view = {
      grid: grid,
      root: opts.root,
      resolve: opts.resolve || function (id) { return { name: id }; },
      onHexClick: opts.onHexClick || function () {},
      onCounterClick: opts.onCounterClick || function () {},
      onIntent: opts.onIntent || function () {},
      onHover: opts.onHover || function () {},
      locked: false,
      counters: [],
      highlights: {},
      nodes: {},        // uid -> counter element
      polys: {},        // hexId -> polygon
      scale: 1
    };

    var b = grid.bounds();
    var W = opts.map ? opts.map.width : Math.ceil(b.width);
    var H = opts.map ? opts.map.height : Math.ceil(b.height);
    view.boardW = W; view.boardH = H;

    opts.root.innerHTML = "";
    opts.root.classList.add("hb-root");
    var stage = el("div", "hb-stage");
    stage.style.width = W + "px";
    stage.style.height = H + "px";
    view.stage = stage;

    if (opts.map && opts.map.image) {
      var img = el("img", "hb-map");
      img.src = opts.map.image;
      img.draggable = false;
      stage.appendChild(img);
    }
    var svg = svgEl("svg", { "class": "hb-hexes", width: W, height: H, viewBox: "0 0 " + W + " " + H });
    stage.appendChild(svg);
    var layer = el("div", "hb-counters");
    stage.appendChild(layer);
    opts.root.appendChild(stage);
    view.svg = svg; view.layer = layer;

    // hexes
    grid.all().forEach(function (h) {
      var pts = grid.corners(h).map(function (p) { return p[0].toFixed(2) + "," + p[1].toFixed(2); }).join(" ");
      var poly = svgEl("polygon", { points: pts, "class": "hb-hex" + (opts.terrainOf ? " hb-t-" + (opts.terrainOf(h) || "clear") : "") });
      poly.dataset.hex = h;
      poly.addEventListener("click", function (ev) { ev.stopPropagation(); view.onHexClick(h); });
      poly.addEventListener("mouseenter", function () { view.onHover(h); });
      poly.addEventListener("mouseleave", function () { view.onHover(null); });
      svg.appendChild(poly);
      view.polys[h] = poly;
      if (opts.labels) {
        var c = grid.center(h);
        var t = svgEl("text", { x: c.x, y: c.y + (grid.radius || grid.size / 2) * 0.72, "text-anchor": "middle", "class": "hb-label" });
        t.textContent = h;
        svg.appendChild(t);
      }
    });

    function applyScale() {
      var s = opts.scale;
      if (s === "fit" || s == null) {
        // Layout pixels, not getBoundingClientRect(): the whole stage is itself
        // scaled to the window by FW.stage.fit(), and a viewport measurement
        // already includes that. Fitting to it scaled the map twice — at 1412
        // wide it drew 578px across where 786px was due, shrinking with the
        // square of the window size.
        var rw = opts.root.clientWidth || W, rh = opts.root.clientHeight || H;
        s = Math.min(rw / W, rh / H) || 1;
      }
      view.scale = s;
      stage.style.transform = "scale(" + s + ")";
      opts.root.style.setProperty("--hb-scale", String(s));
    }
    applyScale();
    view.rescale = applyScale;

    // Board pixels per viewport pixel, as actually drawn. This includes every
    // transform above the board — the map's own scale AND the stage fitted to
    // the window — which `view.scale` alone does not. Anything that turns a
    // pointer position into a board position must go through here.
    view.screenScale = function () {
      var r = stage.getBoundingClientRect();
      return { kx: (r.width / W) || view.scale || 1, ky: (r.height / H) || view.scale || 1,
               left: r.left, top: r.top };
    };

    view.hexAt = function (clientX, clientY) {
      var k = view.screenScale();
      return grid.pixelToHex((clientX - k.left) / k.kx, (clientY - k.top) / k.ky);
    };

    view.setCounters = function (list) { view.counters = list || []; sync(view); };
    view.setHighlights = function (h) { view.highlights = h || {}; sync(view); };
    view.sync = function () { sync(view); };
    wireDrag(view);
    sync(view);
    return view;
  }

  var HL = ["legal", "path", "los", "blocked", "target", "hint", "reach"];

  function sync(view) {
    var hl = view.highlights;
    var sets = {};
    HL.forEach(function (k) { sets[k] = {}; (hl[k] || []).forEach(function (h) { sets[k][h] = true; }); });
    Object.keys(view.polys).forEach(function (h) {
      var p = view.polys[h];
      HL.forEach(function (k) { p.classList.toggle("hb-" + k, !!sets[k][h]); });
    });

    var selected = {};
    (hl.selected || []).forEach(function (u) { selected[u] = true; });
    var byHex = {};
    view.counters.forEach(function (c) { (byHex[c.hex] = byHex[c.hex] || []).push(c); });
    var seen = {};
    Object.keys(byHex).forEach(function (h) {
      var stack = byHex[h];
      var ctr = view.grid.center(h);
      var step = Math.max(10, (view.grid.radius || view.grid.size / 2) * 0.28);
      stack.forEach(function (c, i) {
        seen[c.uid] = true;
        var node = view.nodes[c.uid] || counterNode(view, c);
        var info = view.resolve(c.cardId || c.uid) || {};
        var img = node.querySelector("img");
        var src = c.image || info.image;
        if (src) { if (img.getAttribute("src") !== src) img.src = src; img.style.display = ""; }
        else img.style.display = "none";
        node.querySelector(".hb-name").textContent = c.name || info.name || c.uid;
        node.title = c.name || info.name || c.uid;
        node.className = "hb-counter" + (c.side ? " hb-side-" + c.side : "") + (selected[c.uid] ? " hb-selected" : "") +
          (c.dim ? " hb-dim" : "") + (sets.target[h] ? " hb-targeted" : "");
        var mk = node.querySelector(".hb-markers");
        mk.innerHTML = "";
        (c.markers || []).forEach(function (m) { mk.appendChild(el("span", "hb-marker hb-marker-" + m, m)); });
        var off = (i - (stack.length - 1) / 2) * step;
        if (view.dragging && view.dragging.uid === c.uid) return;
        node.style.left = (ctr.x + off) + "px";
        node.style.top = (ctr.y + off) + "px";
        node.style.zIndex = String(100 + i);
        node.style.transform = "translate(-50%, -50%) rotate(" + (c.facing || 0) + "deg)";
        node.dataset.homeX = ctr.x + off; node.dataset.homeY = ctr.y + off;
      });
    });
    Object.keys(view.nodes).forEach(function (uid) {
      if (seen[uid]) return;
      var n = view.nodes[uid];
      n.classList.add("hb-leaving");
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 220);
      delete view.nodes[uid];
    });
  }

  function counterNode(view, c) {
    var node = el("div", "hb-counter");
    node.dataset.uid = c.uid;
    var size = (view.grid.radius || view.grid.size / 2) * 1.15;
    node.style.width = size + "px"; node.style.height = size + "px";
    var img = el("img"); img.draggable = false;
    node.appendChild(img);
    node.appendChild(el("div", "hb-name"));
    node.appendChild(el("div", "hb-markers"));
    view.layer.appendChild(node);
    view.nodes[c.uid] = node;
    return node;
  }

  function wireDrag(view) {
    var start = null, THRESH = 6;
    view.layer.addEventListener("pointerdown", function (ev) {
      var node = ev.target.closest(".hb-counter");
      if (!node) return;
      var k = view.screenScale();          // fixed for the length of one drag
      start = { uid: node.dataset.uid, node: node, x: ev.clientX, y: ev.clientY, moved: false, id: ev.pointerId,
        kx: k.kx, ky: k.ky,
        homeX: parseFloat(node.dataset.homeX || 0), homeY: parseFloat(node.dataset.homeY || 0) };
      try { node.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ }
    });
    view.layer.addEventListener("pointermove", function (ev) {
      if (!start || view.locked) return;
      // viewport pixels -> board pixels at the true drawn scale, or the counter
      // lags the pointer whenever the stage is fitted smaller than 1:1
      var dx = (ev.clientX - start.x) / start.kx, dy = (ev.clientY - start.y) / start.ky;
      if (!start.moved && Math.abs(dx) + Math.abs(dy) < THRESH) return;
      if (!start.moved) { start.moved = true; view.dragging = start; start.node.classList.add("hb-dragging"); start.node.style.zIndex = "9000"; }
      start.node.style.left = (start.homeX + dx) + "px";
      start.node.style.top = (start.homeY + dy) + "px";
      var over = view.hexAt(ev.clientX, ev.clientY);
      Object.keys(view.polys).forEach(function (h) { view.polys[h].classList.toggle("hb-hover", h === over); });
    });
    function finish(ev) {
      if (!start) return;
      var s = start; start = null;
      try { s.node.releasePointerCapture(s.id); } catch (e) { /* gone */ }
      if (!s.moved) { view.onCounterClick(s.uid); return; }
      view.dragging = null;
      s.node.classList.remove("hb-dragging");
      Object.keys(view.polys).forEach(function (h) { view.polys[h].classList.remove("hb-hover"); });
      var over = view.hexAt(ev.clientX, ev.clientY);
      if (over) view.onIntent({ kind: "move", uid: s.uid, hex: over });
      sync(view);                       // snaps home if refused
    }
    view.layer.addEventListener("pointerup", finish);
    view.layer.addEventListener("pointercancel", finish);
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.view = { mount: mount, el: el };
})(typeof window !== "undefined" ? window : globalThis);
