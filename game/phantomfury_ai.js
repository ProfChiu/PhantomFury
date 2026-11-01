/* phantomfury_ai.js — the player-side driver for Phantom Fury.
 *
 * Phantom Fury is solitaire: the "opponent" is the system inside the
 * engine (Reactions, Events, Defensive Fire). This driver plays the USMC
 * side — it sets up, spends Support, reinforces, Fires, Moves toward the
 * Insurgents, and Assaults — so the soak and the bench can play complete
 * games through legalActions/apply alone, and the page can offer a
 * "play my turn" fallback. It is a heuristic scorer over the legal
 * actions, not a planner; the bench in tools/test_phantomfury.js measures
 * it against random play.
 */
(function (global) {
  "use strict";
  var FW = global.FW;

  // Distance over the Zone graph (Adjacent + Neighbouring edges) from the
  // nearest Insurgent-Controlled Zone — the ground still to take. A squad
  // already standing in one is at distance 0 and should hold or clear it.
  function enemyDistances(G, state) {
    var dist = {}, queue = [];
    G.board.zones.forEach(function (z) {
      if (state.zones[z.id].control === "insurgent") { dist[z.id] = 0; queue.push(z.id); }
    });
    while (queue.length) {
      var z = queue.shift();
      G.adjOrNei(z).forEach(function (z2) {
        if (dist[z2] == null) { dist[z2] = dist[z] + 1; queue.push(z2); }
      });
    }
    return dist;
  }
  // Rough hit probability for a Fire action, from the engine's own DRMs:
  // the shot hits on d10 + DRMs <= CF, with an unmodified 9 always failing.
  function hitChance(G, state, action) {
    var firer = state.units[action.uid], target = state.units[action.target];
    var cf = G.effCF(firer) + (action.caat ? 2 : 0);
    var mod = G.fireDrms(state, firer, target).reduce(function (s, d) { return s + d.value; }, 0);
    var hits = 0;
    for (var r = 0; r <= 9; r++) if (r !== 9 && r + mod <= cf) hits++;
    return hits / 10;
  }

  function score(G, state, action, ctx) {
    var u = action.uid ? state.units[action.uid] : null;
    switch (action.type) {
      case "setupPlace": return 10;
      case "setupCaat": return 10;
      case "caatLoss": {
        var sq = state.units[state.pending.uid];
        if (action.apply === "caat") return sq.reduced ? 30 : 8;   // a reduced squad would be eliminated
        return sq.reduced ? -30 : 12;
      }
      case "iedChoice": {
        var s2 = state.units[state.pending.uid];
        return action.choice === "ied" ? (G.effCF(s2) >= 5 ? 10 : 2) : 6;
      }
      case "flood": return 15;
      case "declineFlood": return 5;
      case "dfDetach": return 20;
      case "dfTake": return 10;
      case "mission":
        if (action.mission === "dragonEye") return action.zone2 ? 18 : 10;
        if (action.mission === "cobra") return action.remove.length === 2 ? 40 : 25;
        return 34; // hornet
      case "place": return action.pool === "battalion" ? 16 : 20;
      case "placeAbrams": return 20;
      case "fire": {
        // Firing marks the squad Fired — no Move, no Assault this turn
        // [11.3] — so a shot must be worth the squad's whole turn.
        var t = state.units[action.target];
        var p = hitChance(G, state, action);
        var value = t.kind === "suspect" ? 5 : t.kind === "guerillas" ? 15 : 11;
        var sc = p * value;
        if (action.caat) sc -= 1.5;
        return sc >= 3.4 ? sc : -1;
      }
      case "moveStep": {
        if (!u || !u.pos) return 0;
        var fromZone = u.pos.street != null ? (u.streetFrom ? u.streetFrom.zone : null) : u.pos.zone;
        var toZone = action.to.street != null ? fromZone : action.to.zone;
        var sc2 = 0;
        if (fromZone != null && toZone != null) {
          var d0 = ctx.dist[fromZone], d1 = ctx.dist[toZone];
          if (d0 != null && d1 != null) sc2 += (d0 - d1) * 4;
        }
        if (action.to.street != null) sc2 -= 1;                       // sniper risk while crossing
        if (action.to.zone != null && action.to.loc != null) {
          // Adjacency gain only: a step scores for reaching a firing /
          // assault position it did not already hold (never for stepping
          // back and forth between two linked Locations).
          function adjacentFoe(pos) {
            if (!pos || pos.loc == null) return false;
            if (G.enemyAt(state, pos.zone, pos.loc).length) return true;
            return G.locLinks(state, pos.zone, pos.loc)
              .some(function (l) { return G.enemyAt(state, pos.zone, l).length > 0; });
          }
          if (adjacentFoe(action.to) && !adjacentFoe(u.pos)) sc2 += 6;
          if (fromZone !== action.to.zone && state.zones[action.to.zone].control === "insurgent" &&
              (action.to.loc === "C" || action.to.loc === "OG")) sc2 += 2;
        }
        return sc2;
      }
      case "detach": return (u.pos && state.zones[u.pos.zone].control === "insurgent" &&
        G.insurgentsInZone(state, u.pos.zone).length) ? 5 : 1;
      case "pickup": return -5;
      case "withdraw": return -50;
      case "assault": {
        var t2 = state.units[action.target];
        var sc3 = 16 + (t2.kind === "suspect" ? 2 : (6 - t2.cf) * 2);
        if (action.explosives) sc3 += t2.cf >= 4 ? 3 : -3;
        return sc3;
      }
      case "endPhase": return 0;
    }
    return 0;
  }

  function chooseAction(G, state, opts) {
    var legal = G.legalActions(state);
    if (!legal.length) return null;
    var ctx = { dist: enemyDistances(G, state) };
    var best = null, bestScore = -Infinity;
    legal.forEach(function (a) {
      var sc = score(G, state, a, ctx);
      if (sc > bestScore) { bestScore = sc; best = a; }
    });
    if (best && best.type !== "endPhase" && bestScore <= 0) {
      var end = legal.filter(function (a) { return a.type === "endPhase"; })[0];
      if (end) return { action: end, score: 0, why: "Nothing scores — end the phase." };
    }
    if (!best) best = legal[0];
    return { action: best, score: bestScore, why: best.label || best.type };
  }

  // The best-scoring legal move of one kind (filter), or null. The lesson's
  // watch chapter shows the AI's own choices one at a time with this.
  function bestOf(G, state, filter) {
    var ctx = { dist: enemyDistances(G, state) }, best = null, bestScore = -Infinity;
    G.legalActions(state).filter(filter).forEach(function (a) {
      var sc = score(G, state, a, ctx);
      if (sc > bestScore) { bestScore = sc; best = a; }
    });
    return best;
  }

  // Play the whole Setup phase legally: one drawn squad per Start Zone
  // (ascending), CAATs onto the first four squads [6.3/6.3.1]. Used by the
  // lesson's scripted start, the page's Quick setup button and the tests.
  function autoSetup(G, state, opts) {
    var guard = 0;
    while (state.phase === "setup" && guard++ < 40) {
      var legal = G.legalActions(state);
      var places = legal.filter(function (a) { return a.type === "setupPlace"; })
        .sort(function (a, b) { return a.zone - b.zone; });
      var a = places[0] || legal.filter(function (x) { return x.type === "setupCaat"; })[0];
      if (!a) break;
      state = FW.game.run(G, state, a, opts).state;
    }
    return state;
  }

  global.PhantomFuryAI = { chooseAction: chooseAction, score: score, autoSetup: autoSetup, bestOf: bestOf };
  if (typeof module !== "undefined" && module.exports) module.exports = global.PhantomFuryAI;
})(typeof window !== "undefined" ? window : globalThis);
