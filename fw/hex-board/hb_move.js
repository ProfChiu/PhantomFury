/* hb_move.js — movement over any grid: reachable set, cheapest path, each step's cost.
 *
 * Dijkstra, the same one SF3D's movement.js, Ambush's movementrules.js and
 * WHQ's reachable() each wrote for themselves. The game supplies the cost of
 * one step and (optionally) whether a hex may be entered or stopped in.
 *
 *   var r = HexBoard.move.reachable({
 *     grid: grid, from: "0305", budget: 4,
 *     cost: function (fromId, toId) { return 1 | 2 | Infinity; },  // MP to step; Infinity = prohibited
 *     canStop: function (id) { return true; },                      // may the move END here? (stacking)
 *     mustStop: function (id) { return false; },                    // entering ends the move (enemy hex, ZOC)
 *     maxSteps: 50
 *   });
 *   r.costs   { id: mp }      every hex reachable within budget (start excluded)
 *   r.prev    { id: fromId }  for path()
 *   HexBoard.move.path(r, toId) -> [ids] from start to toId inclusive, or null
 *   HexBoard.move.stepCosts(cfg, [ids]) -> total MP along a given route (Infinity if illegal)
 *
 * ZERO DOM. Pure. Plain script.
 */
(function (global) {
  "use strict";

  function reachable(cfg) {
    if (!cfg || !cfg.grid || cfg.from == null) throw new Error("HexBoard.move.reachable: grid and from are required");
    var grid = cfg.grid, budget = cfg.budget == null ? Infinity : cfg.budget;
    var cost = cfg.cost || function () { return 1; };
    var canStop = cfg.canStop || function () { return true; };
    var mustStop = cfg.mustStop || function () { return false; };
    var maxSteps = cfg.maxSteps || 500;
    var dist = {}, prev = {}, done = {};
    dist[cfg.from] = 0;
    var open = [cfg.from];
    var stepsLeft = maxSteps;
    while (open.length && stepsLeft-- > 0) {
      // smallest tentative cost (small grids: a scan is fine)
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      var cur = open.splice(bi, 1)[0];
      if (done[cur]) continue;
      done[cur] = true;
      if (cur !== cfg.from && mustStop(cur)) continue;          // may not continue past it
      grid.neighbors(cur).forEach(function (n) {
        var c = cost(cur, n);
        if (!(c >= 0) || c === Infinity) return;
        var total = dist[cur] + c;
        if (total > budget) return;
        if (dist[n] === undefined || total < dist[n]) { dist[n] = total; prev[n] = cur; open.push(n); }
      });
    }
    var costs = {};
    Object.keys(dist).forEach(function (h) {
      if (h === cfg.from) return;
      if (!canStop(h)) return;
      costs[h] = dist[h];
    });
    return { from: cfg.from, costs: costs, prev: prev, all: dist };
  }

  function path(r, to) {
    if (r.all[to] === undefined) return null;
    var out = [to], cur = to;
    while (cur !== r.from) { cur = r.prev[cur]; if (cur === undefined) return null; out.unshift(cur); }
    return out;
  }

  function stepCosts(cfg, route) {
    var total = 0, cost = cfg.cost || function () { return 1; };
    for (var i = 0; i < route.length - 1; i++) {
      if (cfg.grid.distance(route[i], route[i + 1]) !== 1) return Infinity;
      var c = cost(route[i], route[i + 1]);
      if (c === Infinity) return Infinity;
      total += c;
    }
    return total;
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.move = { reachable: reachable, path: path, stepCosts: stepCosts };
  if (typeof module !== "undefined" && module.exports) module.exports = global.HexBoard.move;
})(typeof window !== "undefined" ? window : globalThis);
