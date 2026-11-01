/* fw_soak.js — play many games with a random policy and count what breaks.
 *
 * The one test every engine needs before a UI exists: N seeded games driven
 * purely through legalActions/apply. It reports crashes (an exception out of
 * apply), stalls (a game that hit maxSteps without isOver), dead ends (no
 * legal action and no ending), and the step distribution. Any of the first
 * three is a bug in the rules, not in the policy.
 *
 * Works in a page or in Node:
 *   const S = FW.soak.run(G, { games: 200, seed: 1, maxSteps: 500, setup, policy })
 *   S.crashes, S.stalls, S.deadEnds, S.median, S.max, S.failures[]
 *
 * `policy` defaults to FW.ai.random(); pass your greedy AI for one seat via
 * `policies: { you: ai, foe: FW.ai.random() }` and `seatOf(state)`.
 */
(function (global) {
  "use strict";

  var FW = global.FW;
  if ((!FW || !FW.game) && typeof require === "function") {
    FW = { game: require("../core/fw_game.js"), rng: require("../core/fw_rng.js"), ai: require("../core/fw_ai.js") };
  }

  function run(G, cfg) {
    cfg = cfg || {};
    var games = cfg.games || 100;
    var maxSteps = cfg.maxSteps || 1000;
    var out = { games: games, crashes: 0, stalls: 0, deadEnds: 0, finished: 0, steps: [], failures: [], winners: {} };
    var fallbackPolicy = cfg.policy || FW.ai.random();

    for (var g = 0; g < games; g++) {
      var seed = (cfg.seed == null ? 1 : cfg.seed) + ":" + g;
      var rng = FW.rng.seeded(seed);
      var opts = { rng: rng };
      if (cfg.opts) for (var k in cfg.opts) if (cfg.opts.hasOwnProperty(k)) opts[k] = cfg.opts[k];
      var state, steps = 0, ended = null;
      try {
        state = G.create(cfg.setup, opts);
        for (steps = 0; steps < maxSteps; steps++) {
          ended = G.isOver(state);
          if (ended) break;
          var pol = fallbackPolicy;
          if (cfg.policies && cfg.seatOf) pol = cfg.policies[cfg.seatOf(state)] || fallbackPolicy;
          var choice = pol.chooseAction(G, state, opts);
          var action = choice ? choice.action : null;
          if (!action) {
            var legal = G.legalActions(state);
            if (!legal.length) { out.deadEnds++; out.failures.push({ seed: seed, kind: "dead-end", steps: steps }); break; }
            action = rng.pick(legal);      // an AI that held still has to move on
          }
          state = FW.game.run(G, state, action, opts).state;
        }
        if (ended) {
          out.finished++;
          var w = String(ended.winner == null ? "none" : ended.winner);
          out.winners[w] = (out.winners[w] || 0) + 1;
        } else if (steps >= maxSteps) {
          out.stalls++;
          out.failures.push({ seed: seed, kind: "stall", steps: steps });
        }
      } catch (e) {
        out.crashes++;
        out.failures.push({ seed: seed, kind: "crash", steps: steps, error: e.message, stack: e.stack });
      }
      out.steps.push(steps);
    }
    var sorted = out.steps.slice().sort(function (a, b) { return a - b; });
    out.median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    out.max = sorted.length ? sorted[sorted.length - 1] : 0;
    out.min = sorted.length ? sorted[0] : 0;
    out.clean = out.crashes === 0 && out.stalls === 0 && out.deadEnds === 0;
    return out;
  }

  function summary(S) {
    var w = Object.keys(S.winners).map(function (k) { return k + " " + S.winners[k]; }).join(", ");
    return S.games + " games: " + S.crashes + " crashes, " + S.stalls + " stalls, " + S.deadEnds +
      " dead ends; steps min/median/max " + S.min + "/" + S.median + "/" + S.max +
      (w ? "; winners " + w : "");
  }

  var api = { run: run, summary: summary };

  global.FW = global.FW || {};
  global.FW.soak = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
