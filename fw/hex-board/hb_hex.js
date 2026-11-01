/* hb_hex.js — hex grid geometry, one convention for every hex game.
 *
 * Lifted from Ambush! (apps/game/hexgrid.js: fitted raster grid, odd-q,
 * letter+row labels, bisecting hex lines) and S.F.3.D (js/hex.js, js/los.js:
 * regular grid, cube line-draw) and generalised. Internally everything is
 * axial/cube; offset coordinates exist only at the edges: parsing a printed
 * label and placing a pixel.
 *
 *   var grid = HexBoard.hex.grid({
 *     orient: "flat" | "pointy",       flat-top (Ambush, SF3D) or pointy-top
 *     offset: "odd" | "even",          which columns (flat) / rows (pointy) are shoved
 *     cols, rows,
 *     labels: "letters" | "ccrr" | "rrcc" | "xy",   printed id scheme (see ids below)
 *     colFrom: 1, rowFrom: 1,          first printed number (0 or 1)
 *     size: 40,                        hex radius for a regular grid, OR
 *     fit: { originX, originY, colPitch, rowPitch, oddShift }   a grid fitted to a map scan
 *   });
 *
 *   grid.id(col, row) / grid.parse(id) -> { col, row } (0-based indices) / grid.inBounds
 *   grid.all() -> [ids]      grid.neighbors(id) -> [ids]     grid.neighborsByDir(id) -> { N: id, ... }
 *   grid.distance(a, b)      grid.ring(id, n)     grid.range(id, n)     grid.dirBetween(a, b)
 *   grid.line(a, b) -> [{ id, alt }]  cube line-draw; `alt` set where the line exactly
 *                                     bisects two hexes (Ambush §8/1)
 *   grid.paths(a, b) -> [[ids]]       every candidate path through the bisections
 *   grid.center(id) -> { x, y }       grid.corners(id) -> [[x, y] x6]
 *   grid.pixelToHex(x, y) -> id | null grid.bounds() -> { width, height }
 *   grid.edgeKey(a, b)                a stable key for a hexside
 *
 * Ids: "letters" = column letter + 1-based row ("J5", Ambush); "ccrr" = two-digit
 * column then row ("0912", most SPI/AH maps); "rrcc" = row then column (SF3D);
 * "xy" = "col,row" 0-based. Internally an id is whatever the scheme prints, so
 * the engine, the UI and the rulebook all say the same thing.
 *
 * ZERO DOM. Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  var SQRT3 = Math.sqrt(3);
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Axial directions, shared by both orientations; names differ.
  var AXIAL_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var DIR_NAMES = {
    flat:   ["SE", "NE", "N", "NW", "SW", "S"],
    pointy: ["E", "NE", "NW", "W", "SW", "SE"]
  };

  function grid(cfg) {
    cfg = cfg || {};
    var orient = cfg.orient === "pointy" ? "pointy" : "flat";
    var evenShove = cfg.offset === "even";
    var cols = cfg.cols, rows = cfg.rows;
    if (!(cols >= 1 && rows >= 1)) throw new Error("HexBoard.hex.grid: cols and rows are required");
    var labels = cfg.labels || "ccrr";
    var colFrom = cfg.colFrom == null ? (labels === "xy" ? 0 : 1) : cfg.colFrom;
    var rowFrom = cfg.rowFrom == null ? (labels === "xy" ? 0 : 1) : cfg.rowFrom;
    var digits = cfg.digits || 2;
    var names = DIR_NAMES[orient];

    // ---- pixel calibration -----------------------------------------------
    var fit = cfg.fit;
    if (!fit) {
      var size = cfg.size || 40;
      fit = orient === "flat"
        ? { originX: size, originY: size * SQRT3 / 2, colPitch: 1.5 * size, rowPitch: SQRT3 * size, oddShift: SQRT3 * size / 2 }
        : { originX: size * SQRT3 / 2, originY: size, colPitch: SQRT3 * size, rowPitch: 1.5 * size, oddShift: SQRT3 * size / 2 };
      if (cfg.pad) { fit.originX += cfg.pad; fit.originY += cfg.pad; }
    }
    // The radius that draws corners: exact for a regular grid, the best fit otherwise.
    var radius = cfg.size || (orient === "flat" ? fit.rowPitch / SQRT3 : fit.colPitch / SQRT3);

    // ---- ids ----------------------------------------------------------------
    function pad(n) { var s = String(n); while (s.length < digits) s = "0" + s; return s; }
    function colLetter(i) {
      var s = "";
      do { s = LETTERS[i % 26] + s; i = Math.floor(i / 26) - 1; } while (i >= 0);
      return s;
    }
    function letterIndex(s) {
      var n = 0;
      for (var i = 0; i < s.length; i++) n = n * 26 + (LETTERS.indexOf(s[i]) + 1);
      return n - 1;
    }
    function inBounds(col, row) { return col >= 0 && col < cols && row >= 0 && row < rows; }
    function id(col, row) {
      if (!inBounds(col, row)) return null;
      switch (labels) {
        case "letters": return colLetter(col) + (row + rowFrom);
        case "rrcc": return pad(row + rowFrom) + pad(col + colFrom);
        case "xy": return col + "," + row;
        default: return pad(col + colFrom) + pad(row + rowFrom);
      }
    }
    function parse(s) {
      if (s == null) return null;
      s = String(s);
      var col, row, m;
      switch (labels) {
        case "letters":
          m = /^([A-Z]+)(\d+)$/.exec(s); if (!m) return null;
          col = letterIndex(m[1]); row = parseInt(m[2], 10) - rowFrom; break;
        case "rrcc":
          if (s.length !== digits * 2 || !/^\d+$/.test(s)) return null;
          row = parseInt(s.slice(0, digits), 10) - rowFrom; col = parseInt(s.slice(digits), 10) - colFrom; break;
        case "xy":
          m = /^(-?\d+),(-?\d+)$/.exec(s); if (!m) return null;
          col = parseInt(m[1], 10); row = parseInt(m[2], 10); break;
        default:
          if (s.length !== digits * 2 || !/^\d+$/.test(s)) return null;
          col = parseInt(s.slice(0, digits), 10) - colFrom; row = parseInt(s.slice(digits), 10) - rowFrom;
      }
      return inBounds(col, row) ? { col: col, row: row } : null;
    }
    function need(s) {
      var p = parse(s);
      if (!p) throw new Error("HexBoard: no such hex " + JSON.stringify(s));
      return p;
    }

    // ---- offset <-> axial <-> cube ----------------------------------------
    function toAxial(col, row) {
      if (orient === "flat") {
        var shove = evenShove ? (col + (col & 1)) : (col - (col & 1));
        return { q: col, r: row - shove / 2 };
      }
      var shoveR = evenShove ? (row + (row & 1)) : (row - (row & 1));
      return { q: col - shoveR / 2, r: row };
    }
    function toOffset(q, r) {
      if (orient === "flat") {
        var shove = evenShove ? (q + (q & 1)) : (q - (q & 1));
        return { col: q, row: r + shove / 2 };
      }
      var shoveR = evenShove ? (r + (r & 1)) : (r - (r & 1));
      return { col: q + shoveR / 2, row: r };
    }
    function toCube(s) { var p = need(s), a = toAxial(p.col, p.row); return { x: a.q, z: a.r, y: -a.q - a.r }; }
    function fromCube(c) { var o = toOffset(c.x, c.z); return id(o.col, o.row); }

    // ---- topology ------------------------------------------------------------
    function all() {
      var out = [];
      for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) out.push(id(c, r));
      return out;
    }
    function neighborsByDir(s) {
      var a = toCube(s), out = {};
      AXIAL_DIRS.forEach(function (d, i) {
        var n = fromCube({ x: a.x + d[0], z: a.z + d[1], y: 0 });
        if (n) out[names[i]] = n;
      });
      return out;
    }
    function neighbors(s) {
      var byDir = neighborsByDir(s);
      return names.map(function (n) { return byDir[n]; }).filter(Boolean);
    }
    function distance(a, b) {
      var A = toCube(a), B = toCube(b);
      return Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z));
    }
    function dirBetween(a, b) {
      var A = toCube(a), B = toCube(b);
      var dq = B.x - A.x, dr = B.z - A.z;
      for (var i = 0; i < 6; i++) if (AXIAL_DIRS[i][0] === dq && AXIAL_DIRS[i][1] === dr) return names[i];
      return null;
    }
    function ring(s, n) {
      if (n === 0) return [s];
      var a = toCube(s), out = [];
      var cur = { x: a.x + AXIAL_DIRS[4][0] * n, z: a.z + AXIAL_DIRS[4][1] * n };
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < n; j++) {
          var h = fromCube({ x: cur.x, z: cur.z });
          if (h) out.push(h);
          cur = { x: cur.x + AXIAL_DIRS[i][0], z: cur.z + AXIAL_DIRS[i][1] };
        }
      }
      return out;
    }
    function range(s, n) {
      var out = [];
      for (var k = 0; k <= n; k++) out = out.concat(ring(s, k));
      return out;
    }
    function edgeKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }

    // ---- lines (cube lerp + round, with bisection detection) ---------------
    var EPS = 1e-6, TIE_EPS = 1e-4;
    function cubeRound(c) {
      var rx = Math.round(c.x), ry = Math.round(c.y), rz = Math.round(c.z);
      var dx = Math.abs(rx - c.x), dy = Math.abs(ry - c.y), dz = Math.abs(rz - c.z);
      var diffs = [{ k: "x", v: dx }, { k: "y", v: dy }, { k: "z", v: dz }].sort(function (p, q) { return q.v - p.v; });
      var tie = Math.abs(diffs[0].v - diffs[1].v) < TIE_EPS && diffs[0].v > EPS;
      var primary = { x: rx, y: ry, z: rz }, corrected;
      if (dx > dy && dx > dz) { primary.x = -ry - rz; corrected = "x"; }
      else if (dy > dz) { primary.y = -rx - rz; corrected = "y"; }
      else { primary.z = -rx - ry; corrected = "z"; }
      var alt = null;
      if (tie) {
        // The twin corrects the OTHER of the two tied components. (Ambush's
        // hexLine took diffs[1] blindly, which is the same component whenever
        // the primary branch had already chosen it, so its "alternate" was
        // often the hex itself.)
        var other = diffs[0].k === corrected ? diffs[1].k : diffs[0].k;
        alt = { x: rx, y: ry, z: rz };
        if (other === "x") alt.x = -ry - rz; else if (other === "y") alt.y = -rx - rz; else alt.z = -rx - ry;
      }
      return { primary: primary, alt: alt };
    }
    function line(a, b) {
      var A = toCube(a), B = toCube(b);
      var n = Math.max(Math.abs(A.x - B.x), Math.abs(A.y - B.y), Math.abs(A.z - B.z));
      var out = [];
      for (var i = 0; i <= n; i++) {
        var t = n === 0 ? 0 : i / n;
        var r = cubeRound({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t });
        var altId = r.alt ? fromCube(r.alt) : null;
        var mainId = fromCube(r.primary);
        // At an exact bisection Math.round's half-up bias can pick the twin that
        // lies off the board (a line along a map edge). The on-board one is the
        // hex; the other, if any, is the alternate. A twin equal to the hex is
        // no alternate at all (Ambush's hexLine reports those; this does not).
        if (!mainId && altId) { mainId = altId; altId = null; }
        out.push({ id: mainId, alt: altId && altId !== mainId ? altId : null });
      }
      return out;
    }
    var MAX_PATHS = 16;
    function paths(a, b) {
      var steps = line(a, b), out = [[]];
      steps.forEach(function (st) {
        var options = st.alt ? [st.id, st.alt] : [st.id], next = [];
        out.forEach(function (p) {
          options.forEach(function (o) { if (next.length < MAX_PATHS) next.push(p.concat([o])); });
        });
        out = next;
      });
      return out;
    }

    // ---- pixels ---------------------------------------------------------------
    function center(s) {
      var p = need(s);
      if (orient === "flat") {
        var shoved = evenShove ? (p.col % 2 === 0) : (p.col % 2 === 1);
        return { x: fit.originX + p.col * fit.colPitch, y: fit.originY + p.row * fit.rowPitch + (shoved ? fit.oddShift : 0) };
      }
      var shovedR = evenShove ? (p.row % 2 === 0) : (p.row % 2 === 1);
      return { x: fit.originX + p.col * fit.colPitch + (shovedR ? fit.oddShift : 0), y: fit.originY + p.row * fit.rowPitch };
    }
    function corners(s) {
      var c = center(s), out = [], start = orient === "flat" ? 0 : 30;
      for (var i = 0; i < 6; i++) {
        var ang = Math.PI / 180 * (start + 60 * i);
        out.push([c.x + radius * Math.cos(ang), c.y + radius * Math.sin(ang)]);
      }
      return out;
    }
    function pixelToHex(x, y) {
      var q, r;
      if (orient === "flat") {
        q = (x - fit.originX) / fit.colPitch;
        r = (y - fit.originY) / fit.rowPitch - q / 2 - (evenShove ? 0.5 : 0);
      } else {
        r = (y - fit.originY) / fit.rowPitch;
        q = (x - fit.originX) / fit.colPitch - r / 2 - (evenShove ? 0.5 : 0);
      }
      var c = cubeRound({ x: q, z: r, y: -q - r }).primary;
      return fromCube(c);
    }
    function bounds() {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      all().forEach(function (h) {
        corners(h).forEach(function (pt) {
          minX = Math.min(minX, pt[0]); maxX = Math.max(maxX, pt[0]);
          minY = Math.min(minY, pt[1]); maxY = Math.max(maxY, pt[1]);
        });
      });
      return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, width: maxX + minX, height: maxY + minY };
    }

    return {
      kind: "hex", orient: orient, cols: cols, rows: rows, labels: labels, fit: fit, radius: radius,
      DIRS: names.slice(),
      id: id, parse: parse, inBounds: inBounds, all: all,
      toAxial: toAxial, toOffset: toOffset, toCube: toCube, fromCube: fromCube,
      neighbors: neighbors, neighborsByDir: neighborsByDir, distance: distance, dirBetween: dirBetween,
      ring: ring, range: range, edgeKey: edgeKey,
      line: line, paths: paths,
      center: center, corners: corners, pixelToHex: pixelToHex, bounds: bounds
    };
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.hex = { grid: grid, AXIAL_DIRS: AXIAL_DIRS, DIR_NAMES: DIR_NAMES };
  if (typeof module !== "undefined" && module.exports) module.exports = global.HexBoard.hex;
})(typeof window !== "undefined" ? window : globalThis);
