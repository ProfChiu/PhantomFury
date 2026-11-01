/* fw_ai.js — the opponent, as a loop over legal actions.
 *
 * Every opponent this workspace has built (Up Front, WARS, Monsterpocalypse,
 * Space Hulk) is the same shape: enumerate legalActions, score each one, take
 * the best above a threshold, else stop. The scoring is the game's; the loop
 * is here, so it is written once and its failure modes are fixed once:
 *
 *   - it can never take an action that was not offered (it goes through run)
 *   - it cannot loop forever on a phase it cannot leave (maxActions)
 *   - a tie between equal scores is broken by the injected rng, not by
 *     enumeration order, so the bench is not measuring array order
 *   - "nothing worth doing" is a real answer (null), and the caller decides
 *     what ending the turn means for this game
 *
 * Usage:
 *   var ai = FW.ai.greedy({
 *     score: function (state, action, G) { return number; },  // higher is better
 *     minScore: 0,            // below this the AI holds (returns null)
 *     skip: ["endTurn"],      // types never chosen by score (the caller handles them)
 *     lookahead: false        // true: score the state AFTER applying on a clone
 *   });
 *   var choice = ai.chooseAction(G, state, opts);   // { action, score, why } | null
 *   FW.ai.driveTurn(G, state, ai, { until: fn, fallback: fn, maxActions: 40 })
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  var game = global.FW && global.FW.game;
  if (!game && typeof require === "function") game = require("./fw_game.js");

  function greedy(cfg) {
    cfg = cfg || {};
    if (typeof cfg.score !== "function") throw new Error("FW.ai.greedy: score(state, action, G) is required");
    var skip = {};
    (cfg.skip || []).forEach(function (t) { skip[t] = true; });
    var minScore = cfg.minScore == null ? -Infinity : cfg.minScore;

    function candidates(G, state) {
      return G.legalActions(state).filter(function (a) { return !skip[a.type]; });
    }

    function scoreOf(G, state, action, opts) {
      if (!cfg.lookahead) return cfg.score(state, action, G);
      // One-ply lookahead: play it out on a copy. The copy gets a throwaway
      // rng so the real stream is not consumed by imagined rolls.
      var clone = JSON.parse(JSON.stringify(state));
      var peekOpts = {};
      for (var k in opts) if (opts.hasOwnProperty(k)) peekOpts[k] = opts[k];
      peekOpts.rng = (global.FW && global.FW.rng) ? global.FW.rng.seeded("peek") : opts.rng;
      var r = game.run(G, clone, action, peekOpts);
      return cfg.score(r.state, action, G, state);
    }

    function chooseAction(G, state, opts) {
      opts = opts || {};
      var cands = candidates(G, state);
      if (!cands.length) return null;
      var best = [], bestScore = -Infinity;
      cands.forEach(function (a) {
        var s = scoreOf(G, state, a, opts);
        if (typeof s !== "number" || isNaN(s)) throw new Error("FW.ai: score() returned " + s + " for " + game.key(a));
        if (s > bestScore) { bestScore = s; best = [a]; }
        else if (s === bestScore) best.push(a);
      });
      if (bestScore < minScore) return null;
      var pick = best.length === 1 ? best[0]
        : (opts.rng ? opts.rng.pick(best) : best[0]);
      return {
        action: pick,
        score: bestScore,
        why: cfg.why ? cfg.why(state, pick, bestScore, G) : (pick.label || pick.type) + " (" + round(bestScore) + ")"
      };
    }

    return { chooseAction: chooseAction, candidates: candidates, config: cfg };
  }

  function round(x) { return Math.round(x * 100) / 100; }

  /**
   * Keep choosing and applying until the AI holds, the game ends, or
   * `until(state)` says the turn is over. When the AI holds and the game is
   * not over, `fallback(state, legal)` names the action that ends the phase
   * or turn (an end-turn action, a pass) — without one the loop stops and
   * reports `held: true` so the caller can decide.
   *
   * Returns { state, taken: [{action, score, why, records, events}], held, over }
   */
  function driveTurn(G, state, ai, opts) {
    opts = opts || {};
    var max = opts.maxActions || 60;
    var taken = [];
    var cur = state;
    for (var n = 0; n < max; n++) {
      var over = G.isOver(cur);
      if (over) return { state: cur, taken: taken, held: false, over: over };
      if (opts.until && opts.until(cur)) return { state: cur, taken: taken, held: false, over: null };

      var choice = ai.chooseAction(G, cur, opts);
      var action = choice ? choice.action : null;
      if (!action && opts.fallback) action = opts.fallback(cur, G.legalActions(cur));
      if (!action) return { state: cur, taken: taken, held: true, over: null };

      var r = game.run(G, cur, action, opts);
      cur = r.state;
      taken.push({
        action: r.action, score: choice ? choice.score : null, why: choice ? choice.why : "pass",
        records: r.records, events: r.events
      });
      if (opts.onAction) opts.onAction(taken[taken.length - 1], cur);
    }
    throw new Error("FW.ai.driveTurn: " + max + " actions without the turn ending — the AI or the game is stuck");
  }

  /** The dumbest possible policy, for soaks and as the bench control. */
  function random(cfg) {
    cfg = cfg || {};
    var skip = {};
    (cfg.skip || []).forEach(function (t) { skip[t] = true; });
    return {
      chooseAction: function (G, state, opts) {
        var legal = G.legalActions(state).filter(function (a) { return !skip[a.type]; });
        if (!legal.length) return null;
        var rng = (opts && opts.rng) || (global.FW.rng.seeded("random-policy"));
        var a = rng.pick(legal);
        return { action: a, score: 0, why: "random" };
      }
    };
  }

  var api = { greedy: greedy, random: random, driveTurn: driveTurn };

  global.FW = global.FW || {};
  global.FW.ai = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
