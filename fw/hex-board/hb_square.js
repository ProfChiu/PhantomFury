/* hb_square.js — a square grid with the same interface as the hex grid.
 *
 * Warhammer Quest, Space Hulk and Monsterpocalypse are square boards. They
 * share the hex kit's line-of-sight and movement modules by presenting the
 * same handful of functions: id/parse, neighbors, distance, line, center.
 *
 *   var grid = HexBoard.square.grid({ cols, rows, diag: true, size: 48, labels: "xy" | "ccrr" | "letters" });
 *
 * `diag: true` gives 8 neighbours and Chebyshev distance (WHQ, Space Hulk);
 * `diag: false` gives 4 and Manhattan. line() is the supercover walk from
 * Space Hulk's engine: a step that passes exactly through a corner reports
 * the two flanking squares as { id, alt }, and the LOS module's policy
 * decides whether one clear flank is enough.
 *
 * ZERO DOM. Plain script.
 */
(function (global) {
  "use strict";

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var DIRS8 = [["N", 0, -1], ["NE", 1, -1], ["E", 1, 0], ["SE", 1, 1], ["S", 0, 1], ["SW", -1, 1], ["W", -1, 0], ["NW", -1, -1]];

  function grid(cfg) {
    cfg = cfg || {};
    var cols = cfg.cols, rows = cfg.rows;
    if (!(cols >= 1 && rows >= 1)) throw new Error("HexBoard.square.grid: cols and rows are required");
    var diag = cfg.diag !== false;
    var size = cfg.size || 40;
    var labels = cfg.labels || "xy";
    var colFrom = cfg.colFrom == null ? (labels === "xy" ? 0 : 1) : cfg.colFrom;
    var rowFrom = cfg.rowFrom == null ? (labels === "xy" ? 0 : 1) : cfg.rowFrom;
    var digits = cfg.digits || 2;
    var pad0 = cfg.pad || 0;
    var dirs = diag ? DIRS8 : DIRS8.filter(function (d) { return d[0].length === 1; });

    function pad(n) { var s = String(n); while (s.length < digits) s = "0" + s; return s; }
    function inBounds(c, r) { return c >= 0 && c < cols && r >= 0 && r < rows; }
    function id(c, r) {
      if (!inBounds(c, r)) return null;
      if (labels === "letters") return LETTERS[c] + (r + rowFrom);
      if (labels === "ccrr") return pad(c + colFrom) + pad(r + rowFrom);
      return c + "," + r;
    }
    function parse(s) {
      if (s == null) return null;
      s = String(s);
      var c, r, m;
      if (labels === "letters") { m = /^([A-Z])(\d+)$/.exec(s); if (!m) return null; c = LETTERS.indexOf(m[1]); r = parseInt(m[2], 10) - rowFrom; }
      else if (labels === "ccrr") { if (!/^\d+$/.test(s) || s.length !== digits * 2) return null; c = parseInt(s.slice(0, digits), 10) - colFrom; r = parseInt(s.slice(digits), 10) - rowFrom; }
      else { m = /^(-?\d+),(-?\d+)$/.exec(s); if (!m) return null; c = parseInt(m[1], 10); r = parseInt(m[2], 10); }
      return inBounds(c, r) ? { col: c, row: r } : null;
    }
    function need(s) { var p = parse(s); if (!p) throw new Error("HexBoard: no such square " + JSON.stringify(s)); return p; }

    function all() { var out = []; for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) out.push(id(c, r)); return out; }
    function neighborsByDir(s) {
      var p = need(s), out = {};
      dirs.forEach(function (d) { var n = id(p.col + d[1], p.row + d[2]); if (n) out[d[0]] = n; });
      return out;
    }
    function neighbors(s) { var b = neighborsByDir(s); return dirs.map(function (d) { return b[d[0]]; }).filter(Boolean); }
    function distance(a, b) {
      var A = need(a), B = need(b), dx = Math.abs(A.col - B.col), dy = Math.abs(A.row - B.row);
      return diag ? Math.max(dx, dy) : dx + dy;
    }
    function dirBetween(a, b) {
      var A = need(a), B = need(b), dx = B.col - A.col, dy = B.row - A.row;
      for (var i = 0; i < dirs.length; i++) if (dirs[i][1] === dx && dirs[i][2] === dy) return dirs[i][0];
      return null;
    }
    function ring(s, n) {
      if (n === 0) return [s];
      var p = need(s), out = [];
      for (var c = p.col - n; c <= p.col + n; c++) for (var r = p.row - n; r <= p.row + n; r++) {
        var h = id(c, r);
        if (!h) continue;
        var d = diag ? Math.max(Math.abs(c - p.col), Math.abs(r - p.row)) : Math.abs(c - p.col) + Math.abs(r - p.row);
        if (d === n) out.push(h);
      }
      return out;
    }
    function range(s, n) { var out = []; for (var k = 0; k <= n; k++) out = out.concat(ring(s, k)); return out; }
    function edgeKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

    /** Supercover line: every square the segment between centres touches.
     *  An exact corner crossing yields { id: <the diagonal square>, alt: null }
     *  preceded by a step whose `alt` names the other flanking square. */
    function line(a, b) {
      var A = need(a), B = need(b);
      var x0 = A.col, y0 = A.row, x1 = B.col, y1 = B.row;
      var adx = Math.abs(x1 - x0), ady = Math.abs(y1 - y0);
      var sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
      var x = x0, y = y0, ix = 0, iy = 0;
      var out = [{ id: id(x, y), alt: null }];
      while (ix < adx || iy < ady) {
        var tx = (2 * ix + 1) * ady, ty = (2 * iy + 1) * adx;
        if (adx > 0 && ady > 0 && tx === ty) {
          // corner: the two flanking squares are alternatives to each other
          out.push({ id: id(x + sx, y), alt: id(x, y + sy) });
          x += sx; y += sy; ix++; iy++;
        } else if (adx === 0 || (ady > 0 && tx > ty)) { y += sy; iy++; }
        else { x += sx; ix++; }
        out.push({ id: id(x, y), alt: null });
      }
      // The flank pair was pushed as its own step; the diagonal square follows it.
      return out;
    }
    var MAX_PATHS = 16;
    function paths(a, b) {
      var steps = line(a, b), out = [[]];
      steps.forEach(function (st) {
        var options = st.alt ? [st.id, st.alt] : [st.id], next = [];
        out.forEach(function (p) { options.forEach(function (o) { if (next.length < MAX_PATHS) next.push(p.concat([o])); }); });
        out = next;
      });
      return out;
    }

    function center(s) { var p = need(s); return { x: pad0 + (p.col + 0.5) * size, y: pad0 + (p.row + 0.5) * size }; }
    function corners(s) {
      var c = center(s), h = size / 2;
      return [[c.x - h, c.y - h], [c.x + h, c.y - h], [c.x + h, c.y + h], [c.x - h, c.y + h]];
    }
    function pixelToHex(x, y) { return id(Math.floor((x - pad0) / size), Math.floor((y - pad0) / size)); }
    function bounds() { return { minX: pad0, minY: pad0, maxX: pad0 + cols * size, maxY: pad0 + rows * size, width: cols * size + pad0 * 2, height: rows * size + pad0 * 2 }; }

    return {
      kind: "square", diag: diag, cols: cols, rows: rows, labels: labels, size: size,
      DIRS: dirs.map(function (d) { return d[0]; }),
      id: id, parse: parse, inBounds: inBounds, all: all,
      neighbors: neighbors, neighborsByDir: neighborsByDir, distance: distance, dirBetween: dirBetween,
      ring: ring, range: range, edgeKey: edgeKey, line: line, paths: paths,
      center: center, corners: corners, pixelToHex: pixelToHex, bounds: bounds
    };
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.square = { grid: grid };
  if (typeof module !== "undefined" && module.exports) module.exports = global.HexBoard.square;
})(typeof window !== "undefined" ? window : globalThis);
