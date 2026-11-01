/* hb_los.js — line of sight over any grid, with the game supplying the rules.
 *
 * The geometry (which hexes a straight line crosses, and where it exactly
 * bisects two) is the grid's. What blocks is the game's: a hex-blocking
 * function and a hexside-blocking function, each answering with a reason
 * string or null. This module walks every candidate path and applies a
 * policy to the bisections.
 *
 *   var r = HexBoard.los.trace({
 *     grid: grid, from: "0305", to: "0709",
 *     blocks: function (hexId, i, path) { return "woods" | null; },   // intervening hexes only
 *     edgeBlocks: function (a, b, i, path) { return "wall" | null; }, // every hexside crossed
 *     endpointBlocks: false,                 // true: from/to hexes are also tested
 *     adjacentAlwaysClear: true,             // most rulebooks: neighbours always see each other
 *     bisect: "any" | "all" | "first"        // clear if ANY candidate path is clear (Ambush §8/1,
 *   });                                      // the attacker's choice) / only if ALL are / take the first
 *   r = { clear, reason, path, blockedAt, blockedEdge, distance, candidates: [...] }
 *
 *   HexBoard.los.visibleFrom(cfg, hexIds) -> { hexId: result }   the field of view
 *
 * ZERO DOM. Pure. Plain script.
 */
(function (global) {
  "use strict";

  function evaluate(path, cfg) {
    var n = path.length;
    for (var i = 0; i < n; i++) {
      var isEnd = i === 0 || i === n - 1;
      if ((!isEnd || cfg.endpointBlocks) && cfg.blocks) {
        var why = cfg.blocks(path[i], i, path);
        if (why) return { clear: false, reason: why, blockedAt: path[i], path: path };
      }
      if (i < n - 1 && cfg.edgeBlocks) {
        var ewhy = cfg.edgeBlocks(path[i], path[i + 1], i, path);
        if (ewhy) return { clear: false, reason: ewhy, blockedEdge: [path[i], path[i + 1]], blockedAt: path[i + 1], path: path };
      }
    }
    return { clear: true, reason: "open", path: path };
  }

  function trace(cfg) {
    if (!cfg || !cfg.grid) throw new Error("HexBoard.los.trace: grid is required");
    var grid = cfg.grid;
    var dist = grid.distance(cfg.from, cfg.to);
    if (dist === 0) return { clear: true, reason: "same hex", path: [cfg.from], distance: 0, candidates: [] };
    if (dist === 1 && cfg.adjacentAlwaysClear !== false) {
      return { clear: true, reason: "adjacent", path: [cfg.from, cfg.to], distance: 1, candidates: [] };
    }
    var policy = cfg.bisect || "any";
    var paths = policy === "first" ? [grid.line(cfg.from, cfg.to).map(function (s) { return s.id; })] : grid.paths(cfg.from, cfg.to);
    var results = paths.map(function (p) { return evaluate(p, cfg); });
    var clearOnes = results.filter(function (r) { return r.clear; });
    var chosen;
    if (policy === "all") chosen = clearOnes.length === results.length ? results[0] : results.filter(function (r) { return !r.clear; })[0];
    else chosen = clearOnes.length ? clearOnes[0] : results[0];
    var out = {};
    for (var k in chosen) if (chosen.hasOwnProperty(k)) out[k] = chosen[k];
    out.distance = dist;
    out.candidates = results;
    out.bisected = paths.length > 1;
    return out;
  }

  function visibleFrom(cfg, hexIds) {
    var out = {};
    (hexIds || cfg.grid.all()).forEach(function (h) {
      if (h === cfg.from) return;
      var c = {};
      for (var k in cfg) if (cfg.hasOwnProperty(k)) c[k] = cfg[k];
      c.to = h;
      out[h] = trace(c);
    });
    return out;
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.los = { trace: trace, visibleFrom: visibleFrom, evaluate: evaluate };
  if (typeof module !== "undefined" && module.exports) module.exports = global.HexBoard.los;
})(typeof window !== "undefined" ? window : globalThis);
