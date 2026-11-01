/* phantomfury_game.js — the Phantom Fury engine, on the framework contract.
 *
 *   create(setup, opts) / legalActions(state) / refusals(state) /
 *   apply(state, action, opts) / isOver(state)
 *   (the new-boardgame skill: framework/docs/ENGINE_CONTRACT.md)
 *
 * A PROJECT-LOCAL AREA BOARD: Phantom Fury is not a hex game. The board is
 * the Zone/Location/Street-Section graph in data/phantomfury_board.js
 * (global.PhantomFuryBoard); the hex files in fw/ are unused by this engine.
 * Every rule below cites rules-digest.md, which digests the rulebook; the
 * digest is the authority and its worked examples are the tests.
 *
 *   - ZERO DOM, ZERO Math.random: dice come from opts.rng; a d10 reads 0-9
 *     (the game's own convention: rollDie(10) - 1).
 *   - state is plain JSON. One open decision at a time: when a resolution
 *     needs the player (a CAAT step-loss choice [5.1.1.2], an IED/Sniper
 *     choice [5.3.5], a may-Flood choice [13.4.7.2]) apply() returns with
 *     state.pending set and legalActions offers only that decision.
 *   - every die roll or table lookup returns an FW.record.
 *
 * Modelling choices where the book is silent (digest, Open questions):
 *   - Marine CF distribution across the 15 squad counters is not printed;
 *     five each of CF 4 / 5 / 6, shuffled at Setup.
 *   - The Insurgents draw pool is 24 counters: CF 1-4 x 3 ID symbols x 2
 *     sides [5.2.1]; the Guerillas and Martyrs CFs of one counter are
 *     paired in rotation. Eliminated counters leave the game. (The printed
 *     game has a fourth ID symbol, diamond; the abstract pool uses three —
 *     it only changes how often a Step Loss finds an exact counter to swap
 *     with, never the CF that results.)
 *   - Suspect markers carry priority lists that are the six permutations
 *     of (2, 1, R), each expanded 2,2' / 1,1',1" (book example [5.3.2.2];
 *     companion sheet shows the (1, 2, R) permutations). 36 markers.
 *   - Fire eligibility follows the owner's ruling (2026-10-19, digest open
 *     question 1): any Marine squad may Fire (the worked example outranks [11.1]'s
 *     wording); the target Zone must still be clear of Marine units.
 *   - [12.4.3] Taking Cover restricts only moves into a USMC-Controlled
 *     Zone (falling back); advancing into another Insurgent Zone is free.
 *   - An Abrams in a Street Section Fires into the Street's Adjacent
 *     Zones (the printed target-symbol binding is approximate data).
 *   - HBIED step losses [9.4] are applied to squads directly (no CAAT
 *     choice) so several squads can be resolved in one Reaction.
 */
(function (global) {
  "use strict";

  var FW = global.FW, B = global.PhantomFuryBoard;

  // ------------------------------------------------------------ board data
  var ZD = {}; B.zones.forEach(function (z) { ZD[z.id] = z; });
  var SD = {}; B.streets.forEach(function (s) { SD[s.id] = s; });
  var LOC_ORDER = ["2", "2'", "1", "1'", "1\"", "C", "OG", "R"];
  var LINK_PAIRS = [["1", "2"], ["2", "R"], ["1", "1'"], ["2", "2'"],
                    ["1'", "2'"], ["1'", "1\""], ["1", "C"], ["1", "OG"], ["C", "OG"]];
  var SYMBOLS = ["triangle", "circle", "square"];

  // Insurgents counters [5.2.1]: index -> { g, m, sym } (Guerillas CF,
  // Martyrs CF, ID symbol). 24 counters; eliminated counters leave play.
  var COUNTERS = [];
  for (var ci = 0; ci < 24; ci++) COUNTERS.push({
    g: (ci % 4) + 1, m: ((ci * 5 + 2) % 4) + 1, sym: SYMBOLS[ci % 3] });

  // Suspect marker priority lists [5.3.2.2]: permutations of (2, 1, R).
  var PERMS = [[2, 1, "R"], [2, "R", 1], [1, 2, "R"], [1, "R", 2], ["R", 2, 1], ["R", 1, 2]];
  function markerList(permIdx) {
    var out = [];
    PERMS[permIdx].forEach(function (t) {
      if (t === 2) out.push("2", "2'");
      else if (t === 1) out.push("1", "1'", "1\"");
      else out.push("R");
    });
    return out;
  }

  function d10(rng) { return rng.rollDie(10) - 1; }
  function locData(zid, loc) {
    var zs = ZD[zid]; if (!zs) return null;
    for (var i = 0; i < zs.locations.length; i++) if (zs.locations[i].id === loc) return zs.locations[i];
    return null;
  }
  function locExists(state, zid, loc) {
    if (!locData(zid, loc)) return false;
    if (state.zones[zid].ruins && (loc === "2" || loc === "2'" || loc === "R")) return false; // [4.1.6]
    return true;
  }
  function locType(zid, loc) { var l = locData(zid, loc); return l ? l.type : null; }
  function storyOf(loc) {
    if (loc === "R") return 3;
    if (loc === "2" || loc === "2'") return 2;
    if (loc === "1" || loc === "1'" || loc === "1\"") return 1;
    return 0; // C, OG
  }
  function entryLoc(state, zid) {
    if (locExists(state, zid, "C")) return "C";
    if (locExists(state, zid, "OG")) return "OG";
    for (var i = 0; i < LOC_ORDER.length; i++) if (locExists(state, zid, LOC_ORDER[i])) return LOC_ORDER[i];
    return null;
  }
  function locLinks(state, zid, loc) {
    var out = [];
    LINK_PAIRS.forEach(function (p) {
      var other = p[0] === loc ? p[1] : p[1] === loc ? p[0] : null;
      if (other && locExists(state, zid, other) && out.indexOf(other) < 0) out.push(other);
    });
    return out;
  }
  function isDoor(zid, loc) { var t = locType(zid, loc); return t === "C" || t === "OG"; }
  function isRoof(zid, loc) { return locType(zid, loc) === "R"; }
  // Locations in an Adjacent Zone linked to (zid, loc) by a shared door or
  // roof entry symbol [4.2.2].
  function crossLinks(state, zid, loc) {
    var out = [], door = isDoor(zid, loc), roof = isRoof(zid, loc);
    if (!door && !roof) return out;
    ZD[zid].adjacent.forEach(function (z2) {
      ZD[z2].locations.forEach(function (l) {
        if (!locExists(state, z2, l.id)) return;
        if ((door && isDoor(z2, l.id)) || (roof && isRoof(z2, l.id))) out.push({ zone: z2, loc: l.id });
      });
    });
    return out;
  }
  function adjOrNei(zid) {
    var out = ZD[zid].adjacent.slice();
    ZD[zid].neighbouring.forEach(function (z) { if (out.indexOf(z) < 0) out.push(z); });
    return out;
  }
  function isAdj(z1, z2) { return ZD[z1].adjacent.indexOf(z2) >= 0; }
  function streetsOfZone(zid) { return B.streets.filter(function (s) { return s.adjacentZones.indexOf(zid) >= 0; }); }

  // ------------------------------------------------------------- unit queries
  function units(state) { return Object.keys(state.units).map(function (k) { return state.units[k]; }).filter(function (u) { return u.alive; }); }
  function posOf(state, u) { return u.kind === "caat" ? state.units[u.attachedTo].pos : u.pos; }
  function isMarineSquad(u) { return u.kind === "squad" || u.kind === "iif"; }
  function isInsurgent(u) { return u.kind === "guerillas" || u.kind === "martyrs"; }
  function marinesInZone(state, zid) {
    return units(state).filter(function (u) {
      if (u.kind === "caat") return false;
      var p = posOf(state, u); return p && p.zone === zid && (isMarineSquad(u) || u.kind === "abrams");
    });
  }
  function squadsInZone(state, zid) { return marinesInZone(state, zid).filter(isMarineSquad); }
  function insurgentsInZone(state, zid) {
    return units(state).filter(function (u) { return isInsurgent(u) && u.pos && u.pos.zone === zid; });
  }
  function suspectsInZone(state, zid) {
    return units(state).filter(function (u) { return u.kind === "suspect" && u.pos && u.pos.zone === zid; });
  }
  function atLoc(state, zid, loc) {
    return units(state).filter(function (u) {
      if (u.kind === "caat") return false;
      var p = posOf(state, u); return p && p.zone === zid && p.loc === loc;
    });
  }
  function enemyAt(state, zid, loc) {
    return atLoc(state, zid, loc).filter(function (u) { return isInsurgent(u) || u.kind === "suspect"; });
  }
  function zoneHasSE(state, zid) {
    return units(state).some(function (u) {
      return isMarineSquad(u) && u.security && u.pos && u.pos.zone === zid;
    });
  }
  function effCF(u) {
    var cf = u.cf;
    if (u.kind === "squad" && u.hero) cf += u.hero;          // [5.1.5.3]
    if (isMarineSquad(u) && u.security) cf -= 1;             // [12.3.2.2]
    return cf;
  }
  function unitName(state, u) {
    if (u.kind === "squad") return "Squad " + u.uid.slice(2) + " (CF " + u.cf + ")";
    if (u.kind === "iif") return "IIF " + u.uid.slice(3) + " (CF " + u.cf + ")";
    if (u.kind === "caat") return "CAAT " + u.uid.slice(4);
    if (u.kind === "abrams") return "M1A1 Abrams (CF 8)";
    if (u.kind === "suspect") return "Suspect marker";
    return (u.kind === "guerillas" ? "Guerillas" : "Martyrs") + " (CF " + u.cf + ", " + u.sym + ")";
  }
  // Phantom Fury markers [13.4.3.2]: -1 per marked Zone affecting this one.
  function pfDrm(state, zid) {
    if (zid == null) return 0;
    var n = state.zones[zid].pf > 0 ? 1 : 0;
    adjOrNei(zid).forEach(function (z) { if (state.zones[z].pf > 0) n++; });
    return n ? -n : 0;
  }

  // ------------------------------------------------------------------ create
  function drawFrom(rng, arr) { return arr.splice(rng.int(arr.length), 1)[0]; }

  function create(setup, opts) {
    setup = setup || {};
    var rng = FW.rng.require(opts, "phantomfury.create");
    var strong = Math.max(0, Math.min(4, setup.strongpoints == null ? 2 : setup.strongpoints)); // [6.1.2]
    var state = {
      turn: 1, phase: "setup", vp: 0, winner: null, result: null, pending: null,
      zones: {}, units: {}, pools: null, support: null,
      setupQueue: [], company: [], battalion: [], iifPool: [], iifFromTurn: 0,
      counters: { ins: 0, sus: 0 }
    };
    var i, k;
    B.zones.forEach(function (z) {
      state.zones[z.id] = { control: z.id === 27 ? "none" : "insurgent",
        activated: false, fortified: false, ruins: false, fanaticism: false, pf: 0, noEvent: false };
    });
    // Activation marker container [6.1.2]: one per white-circle Zone.
    var white = B.zones.filter(function (z) { return z.circle === "white"; }).length;
    state.pools = { draw: COUNTERS.map(function (_, ix) { return ix; }), gone: [],
      markers: [], activation: white - strong, strong: strong };
    for (var m = 0; m < 36; m++) state.pools.markers.push(m % 6);
    state.support = { dragonEye: 0, cobra: 0, hornet: 0 };
    // Marine order of battle [6.3]: 15 squads in the container.
    var cfs = rng.shuffle([4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6]);
    var container = [];
    for (i = 1; i <= 15; i++) {
      state.units["sq" + i] = { uid: "sq" + i, kind: "squad", cf: cfs[i - 1], reduced: false,
        hero: 0, security: false, seLoc: null, caat: null, pos: null, alive: false,
        fired: false, pinned: false, mp: 0, stepTurn: false, assaulted: false };
      container.push("sq" + i);
    }
    for (i = 0; i < 9; i++) state.setupQueue.push(drawFrom(rng, container));
    for (i = 0; i < 3; i++) state.company.push(drawFrom(rng, container));
    state.battalion = container;
    for (i = 1; i <= 4; i++) state.units["caat" + i] = { uid: "caat" + i, kind: "caat",
      attachedTo: null, ammo: 4, explosives: 1, pos: null, alive: true };
    for (i = 1; i <= 3; i++) {
      state.units["iif" + i] = { uid: "iif" + i, kind: "iif", cf: 4, reduced: false,
        hero: 0, security: false, seLoc: null, caat: null, pos: null, alive: false,
        fired: false, pinned: false, mp: 0, stepTurn: false, assaulted: false };
      state.iifPool.push("iif" + i);
    }
    state.units.abrams = { uid: "abrams", kind: "abrams", cf: 8, pos: null, alive: true, fired: false, mp: null };
    // Insurgent setup [6.1-6.2]: Start Zones get 2 Suspects, Activated at
    // once (a Setup roll of 0 is a Dummy); Zone 26 gets 3, unrevealed.
    var events = [];
    B.zones.forEach(function (z) { if (z.circle === "start") state.zones[z.id].activated = true; });
    state.zones[26].activated = true; state.zones[26].fortified = true;
    for (i = 1; i <= 9; i++) {
      var placed = [];
      for (k = 0; k < 2; k++) { var s = placeSuspect(state, i, rng); if (s) placed.push(s); }
      placed.forEach(function (su) { revealSuspect(state, su, rng, events, [], { setup: true }); });
    }
    for (k = 0; k < 3; k++) placeSuspect(state, 26, rng);
    return state;
  }

  // ------------------------------------------------------- suspects & reveals
  function placeSuspect(state, zid, rng) {
    if (!state.pools.markers.length || zid === 27) return null;
    var perm = drawFrom(rng, state.pools.markers);
    var list = markerList(perm), pick = null;
    // Prefer a Location holding no enemy at all (in an Insurgent Zone a
    // Location holds at most one Insurgents unit or Suspect [12.2.1.2]);
    // then one holding no Suspect; then the first listed Location.
    for (var pass = 0; pass < 3 && !pick; pass++) {
      for (var i = 0; i < list.length && !pick; i++) {
        var cands = ZD[zid].locations.filter(function (l) { return l.type === list[i] && locExists(state, zid, l.id); })
          .map(function (l) { return l.id; })
          .sort(function (a, b) { return LOC_ORDER.indexOf(a) - LOC_ORDER.indexOf(b); });
        for (var j = 0; j < cands.length; j++) {
          var occ = enemyAt(state, zid, cands[j]);
          if (pass === 0 && !occ.length) { pick = cands[j]; break; }
          if (pass === 1 && !occ.some(function (u) { return u.kind === "suspect"; })) { pick = cands[j]; break; }
          if (pass === 2) { pick = cands[j]; break; }
        }
      }
    }
    if (!pick) { state.pools.markers.push(perm); return null; }  // [5.3.2.3]
    var uid = "sus" + (++state.counters.sus);
    state.units[uid] = { uid: uid, kind: "suspect", marker: perm, pos: { zone: zid, loc: pick }, alive: true };
    return state.units[uid];
  }

  function activateZone(state, zid, rng, events, place) {
    var zs = state.zones[zid];
    if (!zs || zs.activated || zid === 27) return;
    zs.activated = true;
    var total = state.pools.activation + state.pools.strong;
    if (total > 0) {
      if (rng.int(total) < state.pools.strong) { state.pools.strong--; zs.fortified = true; }
      else state.pools.activation--;
    }
    events.push("Zone " + zid + " Activated" + (zs.fortified ? " — Fortified (Strongpoint)" : ""));
    if (place !== false) { placeSuspect(state, zid, rng); placeSuspect(state, zid, rng); }
  }

  // Reveal one Suspect marker [5.3.3/5.3.4]. opts: { setup, causer, context,
  // dragonEye }. Returns "dummy" | "ied" | "choice" | "stays" | the new unit.
  function revealSuspect(state, su, rng, events, records, opts) {
    opts = opts || {};
    var zid = su.pos.zone, loc = su.pos.loc, fort = state.zones[zid].fortified;
    var roll = d10(rng);
    var outcome;
    if (opts.setup && roll === 0) outcome = "dummy";
    else if (fort) outcome = roll === 0 ? "dummy" : roll <= 7 ? "martyrs" : "ied";
    else outcome = roll === 0 ? "ied" : roll <= 5 ? "dummy" : roll <= 8 ? "guerillas" : "martyrs";
    records.push(FW.record.make({
      context: "Suspect Activation in Zone " + zid, table: fort ? "Fortified Zone [5.3.4]" : "Normal Zone [5.3.3]",
      die: roll, result: outcome === "ied" ? "IED/Sniper" : outcome, ruleRef: fort ? "[5.3.4]" : "[5.3.3]" }));
    if (opts.dragonEye && outcome === "ied") { events.push("Dragon Eye: an IED/Sniper marker in Zone " + zid + " stays hidden"); return "stays"; }
    su.alive = false; su.pos = null; state.pools.markers.push(su.marker);
    if (outcome === "dummy") { events.push("Zone " + zid + ": Suspect was a Dummy"); return "dummy"; }
    if (outcome === "ied") {
      if (!opts.causer) { events.push("Zone " + zid + ": IED/Sniper removed with no Marine squad to blame"); return "ied"; }
      if (!fort) {
        // a Fire's own Sniper Attack waits for this choice [11.4.1]
        state.pending = { kind: "iedChoice", uid: opts.causer.uid, zone: zid, afterFire: opts.context === "fire" };
        events.push("IED or Sniper in Zone " + zid + " — the player chooses [5.3.5]");
        return "choice";
      }
      resolveIED(state, opts.causer, rng, events, records);
      return "ied";
    }
    if (!state.pools.draw.length) { events.push("Zone " + zid + ": the Insurgents pool is empty — nothing replaces the marker"); return "dummy"; }
    var cIdx = drawFrom(rng, state.pools.draw), c = COUNTERS[cIdx];
    var uid = "ins" + (++state.counters.ins);
    var u = { uid: uid, kind: outcome, counter: cIdx, cf: outcome === "guerillas" ? c.g : c.m,
      sym: c.sym, pos: { zone: zid, loc: loc }, alive: true };
    state.units[uid] = u;
    events.push("Zone " + zid + " Location " + loc + ": " + unitName(state, u) + " revealed");
    return u;
  }

  function resolveIED(state, squad, rng, events, records) {
    var roll = d10(rng), cf = effCF(squad);
    records.push(FW.record.make({ context: "IED Attack on " + unitName(state, squad), table: "IED [13.5]",
      die: roll, target: cf, result: roll <= cf ? "Pinned" : "Step Loss", ruleRef: "[13.5]" }));
    if (roll <= cf) { squad.pinned = true; events.push(unitName(state, squad) + " is Pinned by the IED"); }
    else marineStepLoss(state, squad, rng, events, records, {});
  }

  // ------------------------------------------------------------- step losses
  function addVp(state, n, events, why) {
    state.vp += n;
    events.push("VP " + (n > 0 ? "+" : "") + n + " (" + why + ") — total " + state.vp);
  }
  function eliminateInsurgent(state, u, events, vpWhy) {
    u.alive = false; u.pos = null; state.pools.gone.push(u.counter);
    if (u.kind === "guerillas" && vpWhy !== false) addVp(state, 1, events, "Guerillas eliminated [7.2.1]");
    events.push(unitName(state, u) + " eliminated");
  }
  // Insurgent step loss [5.2.1]: swap to the CF-1 counter of the same type
  // and ID symbol when the pool has one; CF 1 is eliminated instead.
  function insurgentStepLoss(state, u, events, opts) {
    opts = opts || {};
    if (u.cf <= 1) {
      if (opts.neverElim) { events.push(unitName(state, u) + " holds at CF 1"); return false; }
      eliminateInsurgent(state, u, events, opts.vpWhy);
      return true;
    }
    var want = u.cf - 1, found = -1;
    for (var i = 0; i < state.pools.draw.length; i++) {
      var c = COUNTERS[state.pools.draw[i]];
      if (c.sym === u.sym && (u.kind === "guerillas" ? c.g : c.m) === want) { found = i; break; }
    }
    if (found >= 0) {
      var nc = state.pools.draw.splice(found, 1)[0];
      state.pools.draw.push(u.counter); u.counter = nc;
    }
    u.cf = want;
    events.push(unitName(state, u) + " suffers a Step Loss (now CF " + u.cf + ")");
    return false;
  }
  function eliminateMarine(state, u, events, viaEvent) {
    u.alive = false; u.pos = null; u.pinned = false;
    if (u.kind === "iif") addVp(state, -2, events, "IIF eliminated [7.2.1]");
    else addVp(state, -5, events, "Marine squad eliminated" + (viaEvent ? " by an Event" : "") + " [7.2.1]");
    if (u.kind === "squad" && u.caat) {
      var c = state.units[u.caat]; c.alive = false; c.attachedTo = null; u.caat = null;
      events.push("Its CAAT support is removed with it (no VP) [5.1.4.3]");
    }
    if (u.hero) { u.hero = 0; events.push("Its Hero marker is removed [5.1.5.1]"); }
    events.push(unitName(state, u) + " eliminated");
  }
  // A Marine step loss [5.1.1]. When the squad carries a CAAT, the player
  // chooses which unit takes it [5.1.1.2] — that becomes state.pending
  // unless opts.noChoice (bulk resolutions) forbids it.
  function marineStepLoss(state, u, rng, events, records, opts) {
    opts = opts || {};
    if (!u.alive) return;
    if (u.kind === "squad" && u.caat && !opts.noChoice) {
      state.pending = { kind: "caatLoss", uid: u.uid, caat: u.caat, resume: opts.resume || null };
      events.push(unitName(state, u) + " suffers a Step Loss — the player chooses: squad or its CAAT [5.1.1.2]");
      return;
    }
    applyMarineStepLoss(state, u, events, opts);
  }
  function applyMarineStepLoss(state, u, events, opts) {
    opts = opts || {};
    u.stepTurn = true;
    if (u.reduced) { eliminateMarine(state, u, events, opts.viaEvent); return; }
    u.reduced = true; u.cf -= 1;
    if (u.kind === "squad") addVp(state, -2, events, "Marine squad reduced [7.2.1]");
    events.push(unitName(state, u) + " suffers a Step Loss (reduced, CF " + u.cf + ")");
  }
  function applyCaatLoss(state, u, events) {
    var c = state.units[u.caat];
    c.alive = false; c.attachedTo = null; u.caat = null; u.stepTurn = true;
    addVp(state, -2, events, "CAAT eliminated [7.2.1]");
    events.push("The CAAT support takes the Step Loss and is withdrawn [5.1.4.3]");
  }

  // ------------------------------------------------------------ fire combat
  // DRMs for a Fire Combat shot [11.2.1], verified against the book's
  // worked examples: Martyrs in Location 1 of a Normal Zone = +2;
  // a Suspect in a Fortified Zone = +1 only.
  function fireDrms(state, firer, target) {
    var zid = target.pos.zone, zs = state.zones[zid], drms = [];
    if (target.kind === "suspect") {
      // A Suspect marker is not an Insurgents unit: the not-in-R and
      // Fortified modifiers do not count (book Example 2, p.11).
      drms.push({ label: "target is a Suspect marker", value: 1, rule: "[11.2.1]" });
    } else {
      if (target.pos.loc !== "R") drms.push({ label: "Insurgents unit not in R", value: 1, rule: "[11.2.1]" });
      if (zid === 26) drms.push({ label: "Insurgents in Zone 26 (the Mosque)", value: 3, rule: "[11.2.1]" });
      else if (zs.fortified) drms.push({ label: "Insurgents unit in a Fortified Zone", value: 2, rule: "[11.2.1]" });
      if (target.kind === "martyrs" && !zs.fortified) drms.push({ label: "Martyrs unit in a Normal Zone", value: 1, rule: "[11.2.1]" });
    }
    var pf = pfDrm(state, firer.pos.zone);
    if (pf) drms.push({ label: "Phantom Fury Event", value: pf, rule: "[13.4.3.2]" });
    return drms;
  }
  function fireTargets(state, firer) {
    var zones = [];
    if (firer.pos.street != null) zones = SD[firer.pos.street].adjacentZones.slice();
    else if (firer.pos.zone != null) zones = adjOrNei(firer.pos.zone);
    var out = [];
    zones.forEach(function (zid) {
      if (zid === 27 || marinesInZone(state, zid).length) return;   // target Zone clear of Marines [11.1]
      enemyAtAll(state, zid).forEach(function (t) {
        if (firer.kind === "abrams" && t.pos.loc === "R") return;   // [11.1.3]
        out.push(t);
      });
    });
    return out;
  }
  function enemyAtAll(state, zid) {
    return units(state).filter(function (u) {
      return u.pos && u.pos.zone === zid && (isInsurgent(u) || u.kind === "suspect");
    });
  }
  function resolveFire(state, firer, target, useCaat, rng, events, records) {
    firer.fired = true;
    var cf = effCF(firer), caat = null;
    if (useCaat && firer.caat) { caat = state.units[firer.caat]; caat.ammo--; cf += 2; }
    var drms = fireDrms(state, firer, target), roll = d10(rng);
    var mod = roll + drms.reduce(function (s, d) { return s + d.value; }, 0);
    var hit = roll !== 9 && mod <= cf;
    records.push(FW.record.make({
      context: "Fire: " + unitName(state, firer) + " at " + unitName(state, target) + " in Zone " + target.pos.zone,
      table: "Fire Combat [11.2]", inputs: [{ label: "firer CF" + (caat ? " (incl. CAAT +2)" : ""), value: cf, rule: "[11.1.2]" }],
      drms: drms, target: cf, die: roll, result: roll === 9 ? "no effect (unmodified 9)" : hit ? "hit" : "no effect",
      ruleRef: "[11.2]" }));
    events.push(unitName(state, firer) + " fires at " + unitName(state, target) +
      ": rolled " + roll + (drms.length ? " (final " + mod + ")" : "") + " vs CF " + cf + " — " + (hit ? "hit" : "no effect"));
    if (hit) {
      if (target.kind === "suspect") revealSuspect(state, target, rng, events, records, { causer: firer, context: "fire" });
      else insurgentStepLoss(state, target, events, {});
    }
    // Sniper Attack after a squad's Fire [11.4.1]; never after an Abrams.
    if (isMarineSquad(firer) && firer.alive && !state.pending) sniperAttack(state, firer, rng, events, records);
  }
  // Sniper Attack [11.4.1]: roll <= the Insurgents + Suspects total in the
  // Zones Adjacent/Neighbouring the squad's Zone -> Pinned; a 0 -> Step Loss.
  function sniperAttack(state, squad, rng, events, records) {
    if (!squad.pos || squad.pos.zone == null) return;
    var total = 0;
    adjOrNei(squad.pos.zone).forEach(function (zid) {
      total += insurgentsInZone(state, zid).length + suspectsInZone(state, zid).length;
    });
    if (!total) return;
    var roll = d10(rng);
    records.push(FW.record.make({ context: "Sniper Attack on " + unitName(state, squad), table: "Sniper Attack [11.4.1]",
      inputs: [{ label: "Insurgents + Suspects nearby", value: total, rule: "[11.4.1]" }],
      die: roll, target: total, result: roll === 0 ? "Pinned and Step Loss" : roll <= total ? "Pinned" : "no effect", ruleRef: "[11.4.1]" }));
    if (roll <= total) {
      if (!squad.pinned) { squad.pinned = true; events.push(unitName(state, squad) + " is Pinned by sniper fire"); }
      if (roll === 0) marineStepLoss(state, squad, rng, events, records, {});
    }
  }
  // Street Sniper Attack [11.4.2]: two independent rolls while crossing.
  function streetSniper(state, squad, street, rng, events, records) {
    var zones = SD[street].adjacentZones, nIns = 0, nSus = 0;
    zones.forEach(function (zid) { nIns += insurgentsInZone(state, zid).length; nSus += suspectsInZone(state, zid).length; });
    if (!nIns && !nSus) return "ok";
    var abramsThere = units(state).some(function (u) { return u.kind === "abrams" && u.pos && u.pos.street === street; });
    if (nIns) {
      var r1 = d10(rng);
      records.push(FW.record.make({ context: "Street Sniper Attack (Insurgents) on " + unitName(state, squad),
        table: "Street Sniper Attack [11.4.2]", inputs: [{ label: "Insurgents nearby", value: nIns, rule: "[11.4.2]" }],
        die: r1, target: nIns, result: r1 <= nIns ? (abramsThere ? "Pinned (Abrams covers)" : "Step Loss") : "no effect", ruleRef: "[11.4.2]" }));
      if (r1 <= nIns) {
        if (abramsThere) { squad.pinned = true; events.push(unitName(state, squad) + " is Pinned in the Street Section (the Abrams covers it)"); return "pinned"; }
        marineStepLoss(state, squad, rng, events, records, {});
        events.push(unitName(state, squad) + " is driven back by sniper fire while crossing [12.5.3]");
        return "back";
      }
    }
    if (nSus && !abramsThere) {
      var r2 = d10(rng);
      records.push(FW.record.make({ context: "Street Sniper Attack (Suspects) on " + unitName(state, squad),
        table: "Street Sniper Attack [11.4.2]", inputs: [{ label: "Suspects nearby", value: nSus, rule: "[11.4.2]" }],
        die: r2, target: nSus, result: r2 <= nSus ? "Pinned" : "no effect", ruleRef: "[11.4.2]" }));
      if (r2 <= nSus) { squad.pinned = true; events.push(unitName(state, squad) + " is Pinned in the Street Section"); return "pinned"; }
    }
    return "ok";
  }

  // ----------------------------------------------------------- defensive fire
  // A squad entering a C or OG Location in an Insurgent-Controlled Zone is
  // fired on by every Insurgents unit there [12.7]; then the Zone's Suspect
  // markers may Activate [12.7.3], and new units fire at once.
  function defensiveFire(state, squad, zid, rng, events, records) {
    var guard = 0;
    var firedOn = {};
    while (guard++ < 12) {
      var shooters = insurgentsInZone(state, zid).filter(function (u) { return !firedOn[u.uid]; });
      if (!shooters.length) break;
      for (var i = 0; i < shooters.length; i++) {
        if (!squad.alive || state.pending) return;
        firedOn[shooters[i].uid] = true;
        defensiveShot(state, squad, shooters[i], rng, events, records);
      }
      if (!squad.alive || state.pending) return;
      var before = insurgentsInZone(state, zid).length;
      suspectsInZone(state, zid).slice().forEach(function (su) {
        if (state.pending || !squad.alive) return;
        var roll = d10(rng);
        records.push(FW.record.make({ context: "Suspect Activation check [12.7.3] in Zone " + zid,
          table: "Defensive Fire activation", inputs: [{ label: "squad CF", value: effCF(squad), rule: "[12.7.3]" }],
          die: roll, target: effCF(squad), result: roll > effCF(squad) ? "Activates" : "stays hidden", ruleRef: "[12.7.3]" }));
        if (roll > effCF(squad)) revealSuspect(state, su, rng, events, records, { causer: squad, context: "defensive" });
      });
      if (insurgentsInZone(state, zid).length === before) break;
    }
  }
  function defensiveShot(state, squad, shooter, rng, events, records) {
    var drms = [], zid = squad.pos.zone, loc = squad.pos.loc;
    if (loc === "OG") {
      var abramsWith = units(state).some(function (u) { return u.kind === "abrams" && u.pos && u.pos.zone === zid && u.pos.loc === "OG"; });
      if (abramsWith) drms.push({ label: "squad with an Abrams in OG", value: 1, rule: "[12.7.2]" });
      else if (!squadsInZone(state, zid).filter(function (u) { return u !== squad; }).length)
        drms.push({ label: "squad alone in OG", value: -1, rule: "[12.7.2]" });
    }
    if (state.zones[zid].fanaticism) drms.push({ label: "Fanaticism", value: -1, rule: "[13.4.3.3]" });
    if (loc === "C" && squad.security && squad.seLoc === "C") drms.push({ label: "squad in C with its Security Element", value: 1, rule: "[12.7.2]" });
    if (loc === "C" && state.zones[zid].ruins) drms.push({ label: "squad in C in a Ruins Zone", value: 1, rule: "[12.7.2]" });
    var roll = d10(rng), mod = roll + drms.reduce(function (s, d) { return s + d.value; }, 0);
    var res = mod < shooter.cf ? "Step Loss" : mod === shooter.cf ? "Pinned" : "no effect";
    records.push(FW.record.make({ context: "Defensive Fire: " + unitName(state, shooter) + " at " + unitName(state, squad),
      table: "Defensive Fire [12.7.2]", inputs: [{ label: "Insurgent CF", value: shooter.cf, rule: "[12.7.2]" }],
      drms: drms, target: shooter.cf, die: roll, result: res, ruleRef: "[12.7.2]" }));
    events.push("Defensive Fire from " + unitName(state, shooter) + ": rolled " + roll + " (final " + mod + ") vs CF " + shooter.cf + " — " + res);
    if (res === "Step Loss") marineStepLoss(state, squad, rng, events, records, {});
    else if (res === "Pinned") { squad.pinned = true; squad.mp = 0; events.push(unitName(state, squad) + " is Pinned"); }
  }

  // --------------------------------------------------------- retreat [13.6]
  function routeIsolated(state, zFrom, zTo) {
    var seps = B.streets.filter(function (s) {
      return s.adjacentZones.indexOf(zFrom) >= 0 && s.adjacentZones.indexOf(zTo) >= 0;
    });
    if (!seps.length) return false;
    function covered(s) {
      var abr = units(state).some(function (u) { return u.kind === "abrams" && u.pos && u.pos.street === s.id; });
      if (abr) return true;
      var nearAbr = B.streets.some(function (s2) {
        return s2.id !== s.id && s2.adjacentZones.some(function (z) { return s.adjacentZones.indexOf(z) >= 0; }) &&
          units(state).some(function (u) { return u.kind === "abrams" && u.pos && u.pos.street === s2.id; });
      });
      if (nearAbr) return true;
      return s.adjacentZones.some(function (z) {
        return state.zones[z].control === "usmc" && squadsInZone(state, z).length > 0;
      });
    }
    return seps.every(covered);
  }
  function retreatUnit(state, u, rng, events, records) {
    if (u.kind !== "guerillas" || !u.pos) return false;
    var zid = u.pos.zone;
    if (zid === 26 || state.zones[zid].fanaticism) return false;
    if (zoneHasSE(state, zid)) {   // [13.6.4]
      state.zones[zid].noEvent = true;
      events.push(unitName(state, u) + " cannot Retreat past a Security Element — CF drops instead [13.6.4]");
      insurgentStepLoss(state, u, events, { neverElim: true });
      return false;
    }
    var egress = ZD[zid].egress || [];
    for (var i = 0; i < egress.length; i++) {
      var dest = egress[i];
      if (dest === "EXIT") {   // [13.6.6]
        u.alive = false; u.pos = null; state.pools.gone.push(u.counter);
        events.push(unitName(state, u) + " retreats off the south edge (EXIT) and leaves the game");
        return true;
      }
      if (!ZD[dest] || dest === 27) continue;
      if (!isAdj(zid, dest) && routeIsolated(state, zid, dest)) continue;    // [13.6.5]
      if (state.zones[dest].control === "usmc" && squadsInZone(state, dest).length) continue;
      if (!state.pools.markers.length) return false;
      var perm = drawFrom(rng, state.pools.markers);
      var list = markerList(perm), loc = null;
      for (var j = 0; j < list.length && !loc; j++) {
        var cands = ZD[dest].locations.filter(function (l) { return l.type === list[j] && locExists(state, dest, l.id); })
          .map(function (l) { return l.id; })
          .sort(function (a, b) { return LOC_ORDER.indexOf(a) - LOC_ORDER.indexOf(b); });
        for (var k = 0; k < cands.length; k++) if (!atLoc(state, dest, cands[k]).length) { loc = cands[k]; break; }
      }
      state.pools.markers.push(perm);
      if (!loc) continue;
      u.pos = { zone: dest, loc: loc };
      events.push(unitName(state, u) + " retreats to Zone " + dest + " Location " + loc + " [13.6]");
      if (state.zones[dest].control === "usmc") {
        state.zones[dest].control = "insurgent";
        events.push("Zone " + dest + " flips back to Insurgent Control [13.6.3]");
      }
      return true;
    }
    events.push(unitName(state, u) + " has no Retreat route and stays [13.6.2.4]");
    return false;
  }

  // ---------------------------------------------------------------- assault
  function assaultType(aLoc, tLoc) {
    var a = storyOf(aLoc), t = storyOf(tLoc);
    if (a > t && a >= 2 && t >= 1) return "Top-Down";
    if (t > a && t >= 2) return "Bottom-Up";
    return "Normal";
  }
  function assaultTargets(state, atk) {
    if (!atk.pos || atk.pos.loc == null) return [];
    var zid = atk.pos.zone, out = [], seen = {};
    locLinks(state, zid, atk.pos.loc).forEach(function (loc) {
      enemyAt(state, zid, loc).forEach(function (t) { if (!seen[t.uid]) { seen[t.uid] = 1; out.push(t); } });
    });
    crossLinks(state, zid, atk.pos.loc).forEach(function (cl) {
      enemyAt(state, cl.zone, cl.loc).forEach(function (t) { if (!seen[t.uid]) { seen[t.uid] = 1; out.push(t); } });
    });
    return out;
  }
  function sumDrms(list) { return list.reduce(function (s, d) { return s + d.value; }, 0); }

  function doAssault(state, atk, tgt, useExplosives, rng, events, records, floodCtx) {
    var zone = tgt.pos.zone, atkStartLoc = atk.pos.loc, activationTriggered = false;
    if (tgt.kind === "suspect") {
      var r = revealSuspect(state, tgt, rng, events, records, { causer: atk, context: "assault" });
      if (typeof r === "string") return { targetStays: false };
      tgt = r; activationTriggered = true;
    }
    var type = floodCtx ? "Top-Down" : assaultType(atkStartLoc, tgt.pos.loc);
    var tgtLoc = tgt.pos.loc, tgtZone = tgt.pos.zone;
    var caat = atk.caat ? state.units[atk.caat] : null;
    if (useExplosives && caat && caat.explosives > 0) { caat.explosives--; events.push("The CAAT spends its Explosives — unmodifiable CF 8 [13.7.1]"); }
    var mRoll = d10(rng), iRoll = d10(rng);
    var marineCF = useExplosives ? 8 : effCF(atk), insCF = tgt.cf;
    var mDrms = [], iDrms = [], drugged = false, tgtGone = false, cancelled = false;
    var common = atk.kind === "iif" && zone === 26;
    if (!(mRoll === 0 && iRoll === 0)) {
      if (common) {
        if (mRoll === 0 || iRoll === 0) {
          var ev = d10(rng);
          records.push(FW.record.make({ context: "IIF Assault in Zone 26", table: "Common Events [13.4.3.4]", die: ev,
            result: ev <= 1 ? "Al Fajr (IIF CF +2)" : ev <= 4 ? "Fallujah! (IIF CF +1)" : ev <= 7 ? "Confusion" : "Drugged Fighters", ruleRef: "[13.4.3.4]" }));
          if (ev <= 1) marineCF += 2; else if (ev <= 4) marineCF += 1;
          else if (ev <= 7) cancelled = true; else drugged = true;
        }
      } else {
        if (mRoll === 0 && atk.kind === "squad") {
          var mev = d10(rng);
          records.push(FW.record.make({ context: "Marine Events", table: "Marine Events [13.4.3]", die: mev,
            result: mev <= 1 ? "Phantom Fury" : mev <= 4 ? "Hero" : mev <= 7 ? "Marine sniper" : "Desertion", ruleRef: "[13.4.3]" }));
          if (mev <= 1) {
            if (!state.zones[zone].pf) state.zones[zone].pf = 1;
            events.push("Phantom Fury Event: marker placed in Zone " + zone + " [13.4.3.2]");
          } else if (mev <= 4) {
            atk.hero = Math.min(2, atk.hero + 1);
            if (!useExplosives) marineCF = effCF(atk);
            events.push("A Hero appears with " + unitName(state, atk) + " (" + (atk.hero === 2 ? "Medal of Honor, +2 CF" : "Silver Star, +1 CF") + ") [5.1.5]");
          } else if (mev <= 7) {
            events.push("Marine sniper: the Insurgents unit's CF drops by 1 before resolution [13.4.3]");
            if (insurgentStepLoss(state, tgt, events, {})) tgtGone = true; else insCF = tgt.cf;
          } else if (tgt.kind === "guerillas") {
            events.push("Desertion: the Guerillas unit's CF drops by 1 before resolution [13.4.3]");
            if (tgt.cf > 1) { insurgentStepLoss(state, tgt, events, { neverElim: true }); insCF = tgt.cf; }
          }
        }
        if (!tgtGone && iRoll === 0 && !state.zones[zone].noEvent) {
          var iev = d10(rng);
          records.push(FW.record.make({ context: "Insurgent Events", table: "Insurgent Events [13.4.3]", die: iev,
            result: iev <= 1 ? "Fanaticism" : iev <= 3 ? "Confusion" : iev <= 5 ? "Suicide Bomber" : "Drugged Fighters", ruleRef: "[13.4.3]" }));
          if (iev <= 1) {
            var blk = ZD[zone].block;
            B.zones.forEach(function (z) {
              if (z.block === blk && state.zones[z.id].control === "insurgent" && !state.zones[z.id].fanaticism) {
                state.zones[z.id].fanaticism = true;
                events.push("Fanaticism marker in Zone " + z.id + " [13.4.3.3]");
              }
            });
            if (!state.zones[zone].fanaticism) state.zones[zone].fanaticism = true;
          } else if (iev <= 3) cancelled = true;
          else if (iev <= 5) {
            if (tgt.kind === "martyrs") {
              events.push("Suicide Bomber: the Martyrs unit and the Marine squad are both eliminated [13.4.3]");
              eliminateInsurgent(state, tgt, events, false);
              eliminateMarine(state, atk, events, true);
              return { targetStays: false };
            }
          } else drugged = true;
        }
      }
    }
    if (cancelled) { events.push("Confusion — the Assault is cancelled before resolution [13.4.3]"); return { targetStays: true }; }
    if (tgtGone) {
      finishAssault(state, atk, tgt, { type: type, fromLoc: atkStartLoc, zone: tgtZone, tgtLoc: tgtLoc, flood: !!floodCtx }, rng, events, records);
      return { targetStays: false };
    }
    if (!useExplosives) {
      if (activationTriggered) mDrms.push({ label: "Suspect Activation triggered", value: 1, rule: "[13.4.4]" });
      if (tgt.kind === "martyrs") mDrms.push({ label: "vs a Martyrs unit", value: 1, rule: "[13.4.5]" });
      if (tgt.kind === "guerillas" && state.zones[zone].fortified) mDrms.push({ label: "vs Guerillas in a Fortified Zone", value: 1, rule: "[13.4.5]" });
      var pf = pfDrm(state, atk.pos.zone);
      if (pf) mDrms.push({ label: "Phantom Fury Event", value: pf, rule: "[13.4.3.2]" });
      if (type === "Top-Down") mDrms.push({ label: "Top-Down Assault", value: -1, rule: "[13.4.5]" });
      if (type === "Bottom-Up") mDrms.push({ label: "Bottom-Up Assault", value: 1, rule: "[13.4.6]" });
      if (state.zones[zone].fanaticism) iDrms.push({ label: "Fanaticism", value: -1, rule: "[13.4.3.3]" });
    }
    var mFinal = mRoll + sumDrms(mDrms);
    var marineHits = mRoll !== 9 && mFinal <= marineCF;
    var insElim = false;
    if (marineHits) {
      if (drugged) { insurgentStepLoss(state, tgt, events, { neverElim: true }); events.push("Drugged Fighters: the unit fights on at CF -1 [13.4.3]"); }
      else { insurgentStepLoss(state, tgt, events, {}); insElim = !tgt.alive; }
    }
    if (!useExplosives && !insElim && tgt.alive) {
      if (type === "Top-Down") iDrms.push({ label: "Top-Down (Insurgent not eliminated)", value: -1, rule: "[13.4.5]" });
      if (type === "Bottom-Up") iDrms.push({ label: "Bottom-Up (Insurgent not eliminated)", value: 1, rule: "[13.4.6]" });
    }
    var iFinal = iRoll + sumDrms(iDrms);
    var insHits = iRoll !== 9 && iFinal <= insCF;
    records.push(FW.record.make({ context: "Assault: " + unitName(state, atk) + " (" + type + ") vs " + unitName(state, tgt),
      table: "Assault — Marine roll [13.4.2]", inputs: [{ label: "Marine CF", value: marineCF, rule: "[13.4.2]" }],
      drms: mDrms, target: marineCF, die: mRoll, result: marineHits ? "Insurgents suffer a Step Loss" : "no Step Loss", ruleRef: "[13.4.2]" }));
    records.push(FW.record.make({ context: "Assault: " + unitName(state, tgt) + " vs " + unitName(state, atk),
      table: "Assault — Insurgent roll [13.4.2]", inputs: [{ label: "Insurgent CF", value: insCF, rule: "[13.4.2]" }],
      drms: iDrms, target: insCF, die: iRoll, result: insHits ? "Marines suffer a Step Loss" : "no Step Loss", ruleRef: "[13.4.2]" }));
    events.push("Assault (" + type + "): " + unitName(state, atk) + " rolls " + mRoll + " (final " + mFinal + ") vs CF " + marineCF +
      "; " + unitName(state, tgt) + " rolls " + iRoll + " (final " + iFinal + ") vs CF " + insCF);
    if (insHits && atk.alive) {
      marineStepLoss(state, atk, rng, events, records, {
        resume: { assault: { target: tgt.uid, type: type, fromLoc: atkStartLoc, zone: tgtZone, tgtLoc: tgtLoc, flood: !!floodCtx } } });
      if (state.pending) return { targetStays: !!(tgt.alive && tgt.pos), deferred: true };
    }
    finishAssault(state, atk, tgt, { type: type, fromLoc: atkStartLoc, zone: tgtZone, tgtLoc: tgtLoc, flood: !!floodCtx }, rng, events, records);
    return { targetStays: !!(tgt.alive && tgt.pos) };
  }

  function finishAssault(state, atk, tgt, ctx, rng, events, records) {
    if (!atk.alive) return;
    if (tgt.alive && tgt.kind === "guerillas") retreatUnit(state, tgt, rng, events, records);
    var enemies = enemyAt(state, ctx.zone, ctx.tgtLoc).filter(isInsurgent);
    if (!enemies.length && !(atk.pos.zone === ctx.zone && atk.pos.loc === ctx.tgtLoc)) {
      atk.pos = { zone: ctx.zone, loc: ctx.tgtLoc };
      events.push(unitName(state, atk) + " enters Location " + ctx.tgtLoc + " of Zone " + ctx.zone + " [13.4.7.2]");
      if (ctx.type === "Top-Down" && ctx.fromLoc === "R" && !state.zones[ctx.zone].fortified && !ctx.flood && effCF(atk) > 4) {
        if (!atk.reduced) { events.push(unitName(state, atk) + " Floods the Zone [13.4.7.2]"); runFlood(state, atk, ctx.zone, rng, events, records); }
        else { state.pending = { kind: "flood", uid: atk.uid, zone: ctx.zone }; events.push("A reduced squad may Flood — the player chooses [13.4.7.2]"); }
      }
    }
  }

  function runFlood(state, atk, zid, rng, events, records) {
    var guard = 0;
    while (guard++ < 24) {
      if (!atk.alive || state.pending) return;
      if (effCF(atk) <= 4) { events.push("Flooding stops: the squad's CF is 4 or less [13.4.8.2]"); return; }
      var targets = enemyAtAll(state, zid).slice().sort(function (a, b) {
        return LOC_ORDER.indexOf(a.pos.loc) - LOC_ORDER.indexOf(b.pos.loc) || (a.uid < b.uid ? -1 : 1);
      });
      if (!targets.length) { events.push("Zone " + zid + " is clear — Flooding complete [13.4.8]"); return; }
      var tgt = targets[0];
      if (atk.pos.loc !== tgt.pos.loc && locLinks(state, zid, atk.pos.loc).indexOf(tgt.pos.loc) < 0) {
        var links = locLinks(state, zid, tgt.pos.loc);
        if (!links.length) return;
        atk.pos = { zone: zid, loc: links[0] };
        events.push(unitName(state, atk) + " moves Adjacent to Location " + tgt.pos.loc + " [13.4.8]");
      }
      var res = doAssault(state, atk, tgt, false, rng, events, records, { flood: true });
      if (state.pending) return;
      if (res.targetStays) { events.push("Flooding stops: a unit holds its Location [13.4.8]"); return; }
    }
  }

  // -------------------------------------------------------------- reactions
  // Insurgent Reactions [9.4], rolled after every Support Mission.
  function reactionRoll(state, rng, events, records) {
    var roll = d10(rng);
    var name = roll <= 1 ? "No effect" : roll <= 3 ? "Reinforcements" : roll <= 5 ? "Retreat" :
      roll === 6 ? "The Eagle of Fallujah" : roll <= 8 ? "Counter-attack" : "HBIED";
    records.push(FW.record.make({ context: "Insurgent Reaction", table: "Reactions [9.4]", die: roll, result: name, ruleRef: "[9.4]" }));
    events.push("Insurgent Reaction: " + name + " [9.4]");
    var i, u;
    if (roll <= 1) return;
    if (roll <= 3) {           // Reinforcements: stronger counters replace Guerillas
      units(state).filter(function (x) { return x.kind === "guerillas"; }).forEach(function (g) {
        if (zoneHasSE(state, g.pos.zone) || !state.pools.draw.length) return;
        var j = rng.int(state.pools.draw.length), cIdx = state.pools.draw[j], c = COUNTERS[cIdx];
        if (c.g > g.cf) {
          state.pools.draw[j] = g.counter; g.counter = cIdx; g.cf = c.g; g.sym = c.sym;
          events.push("Reinforcements: a Guerillas unit in Zone " + g.pos.zone + " is replaced by a stronger counter (CF " + g.cf + ")");
        }
      });
      return;
    }
    if (roll <= 5) {           // Retreat
      units(state).filter(function (x) { return x.kind === "guerillas"; }).forEach(function (g) {
        if (squadsInZone(state, g.pos.zone).length && !zoneHasSE(state, g.pos.zone)) retreatUnit(state, g, rng, events, records);
      });
      return;
    }
    if (roll === 6) {          // The Eagle of Fallujah
      units(state).filter(isMarineSquad).forEach(function (s) {
        if (state.pending || !s.alive) return;
        if (s.pos && s.pos.zone != null && state.zones[s.pos.zone].control === "insurgent") sniperAttack(state, s, rng, events, records);
      });
      return;
    }
    if (roll <= 8) {           // Counter-attack
      var zones = B.zones.map(function (z) { return z.id; }).filter(function (zid) {
        return insurgentsInZone(state, zid).some(function (x) { return x.kind === "guerillas"; }) &&
          squadsInZone(state, zid).length && !zoneHasSE(state, zid);
      });
      for (i = 0; i < zones.length; i++) {
        if (state.pending) return;
        var zid = zones[i];
        var gs = insurgentsInZone(state, zid).filter(function (x) { return x.kind === "guerillas"; });
        var maxCf = Math.max.apply(null, gs.map(function (x) { return x.cf; }));
        var atk = gs.filter(function (x) { return x.cf === maxCf; })[rng.int(gs.filter(function (x) { return x.cf === maxCf; }).length)];
        var squads = squadsInZone(state, zid);
        var def = squads[rng.int(squads.length)];
        if (!def.pos || def.pos.loc == null) continue;
        var links = locLinks(state, zid, def.pos.loc)
          .filter(function (l) { return !enemyAt(state, zid, l).length; });
        if (links.length && atk.pos.loc !== def.pos.loc && links.indexOf(atk.pos.loc) < 0) {
          atk.pos = { zone: zid, loc: links[0] };
          events.push("Counter-attack: " + unitName(state, atk) + " moves Adjacent to " + unitName(state, def) + " in Zone " + zid);
        }
        var gRoll = d10(rng), mRoll2 = d10(rng);
        records.push(FW.record.make({ context: "Counter-attack in Zone " + zid, table: "Counter-attack [9.4]",
          die: gRoll, target: atk.cf, result: gRoll <= atk.cf ? "Marines suffer a Step Loss" : "no effect", ruleRef: "[9.4]" }));
        if (gRoll <= atk.cf) marineStepLoss(state, def, rng, events, records, {});
        if (def.alive && mRoll2 <= effCF(def)) insurgentStepLoss(state, atk, events, {});
      }
      return;
    }
    // HBIED: a USMC Zone next to the Insurgents becomes Ruins.
    var cands = B.zones.map(function (z) { return z.id; }).filter(function (zid) {
      return zid !== 26 && zid !== 27 && state.zones[zid].control === "usmc" && !state.zones[zid].ruins &&
        adjOrNei(zid).some(function (z2) { return state.zones[z2].control === "insurgent"; });
    });
    if (!cands.length) { events.push("HBIED: no USMC Zone is exposed — no effect"); return; }
    var hz = cands[rng.int(cands.length)];
    state.zones[hz].ruins = true;
    events.push("HBIED: Zone " + hz + " is devastated and becomes a Ruins Zone [9.4]");
    units(state).slice().forEach(function (x) {
      if (!x.pos || x.pos.zone !== hz) return;
      if (x.pos.loc === "2" || x.pos.loc === "2'" || x.pos.loc === "R") {
        if (isMarineSquad(x)) eliminateMarine(state, x, events, true);
        else if (isInsurgent(x)) eliminateInsurgent(state, x, events, true);
        else if (x.kind === "suspect") { x.alive = false; x.pos = null; state.pools.markers.push(x.marker); }
      } else if (isMarineSquad(x)) {
        applyMarineStepLoss(state, x, events, {});
        x.pinned = true;
      }
    });
  }

  // ---------------------------------------------------------------- movement
  function holdApplies(state, u) {
    if (!u.pos || u.pos.zone == null) return false;
    var zid = u.pos.zone;
    return state.zones[zid].control === "insurgent" &&
      !insurgentsInZone(state, zid).length && !suspectsInZone(state, zid).length;
  }
  function canEnterLoc(state, u, zid, loc, fromZone) {
    if (!locExists(state, zid, loc) || zid === 27) return false;
    if (u.kind === "squad" && zid === 26) return false;                       // [12.4.2]
    if (enemyAt(state, zid, loc).length) return false;                        // [12.3.1]
    if (atLoc(state, zid, loc).some(function (x) { return isMarineSquad(x) && x !== u; })) return false; // one squad per Location [12.2]
    if (fromZone != null && zid !== fromZone && state.zones[zid].control === "insurgent" &&
        squadsInZone(state, zid).some(function (x) { return x !== u; })) return false; // [12.2]
    if (u.security && zid !== u.pos.zone) return false;                       // [12.3.2.2]
    if (fromZone != null && zid !== fromZone && holdApplies(state, u)) return false;    // [12.1.2]
    if (fromZone != null && zid !== fromZone && state.zones[fromZone].control === "insurgent" &&
        state.zones[zid].control === "usmc" && !u.stepTurn) return false;   // [12.4.3]
    return true;
  }
  function stepLabel(state, u, to) {
    if (to.street != null) return unitName(state, u) + " crosses into Street Section " + to.street;
    return unitName(state, u) + " to Zone " + to.zone + " Location " + to.loc;
  }
  function squadSteps(state, u) {
    var out = [];
    if (!u.pos) return out;
    if (u.pos.street != null) {
      var fromZone = u.streetFrom ? u.streetFrom.zone : null;
      SD[u.pos.street].adjacentZones.forEach(function (zid) {
        ZD[zid].locations.forEach(function (l) {
          if (isDoor(zid, l.id) && canEnterLoc(state, u, zid, l.id, fromZone))
            out.push({ type: "moveStep", uid: u.uid, to: { zone: zid, loc: l.id }, label: stepLabel(state, u, { zone: zid, loc: l.id }), cite: "[12.5.1]" });
        });
      });
      return out;
    }
    var zid = u.pos.zone, loc = u.pos.loc;
    locLinks(state, zid, loc).forEach(function (l2) {
      if (canEnterLoc(state, u, zid, l2, zid))
        out.push({ type: "moveStep", uid: u.uid, to: { zone: zid, loc: l2 }, label: stepLabel(state, u, { zone: zid, loc: l2 }), cite: "[12.3.1]" });
    });
    crossLinks(state, zid, loc).forEach(function (cl) {
      if (canEnterLoc(state, u, cl.zone, cl.loc, zid))
        out.push({ type: "moveStep", uid: u.uid, to: { zone: cl.zone, loc: cl.loc }, label: stepLabel(state, u, { zone: cl.zone, loc: cl.loc }), cite: "[12.4.1]" });
    });
    if (isDoor(zid, loc) && !u.security && !holdApplies(state, u)) {
      streetsOfZone(zid).forEach(function (s) {
        out.push({ type: "moveStep", uid: u.uid, to: { street: s.id }, label: stepLabel(state, u, { street: s.id }), cite: "[12.5.1]" });
      });
    }
    return out;
  }
  function abramsSteps(state, a) {
    var out = [];
    if (!a.pos) return out;
    if (a.pos.street != null) {
      var cur = SD[a.pos.street];
      B.streets.forEach(function (s2) {
        if (s2.id !== a.pos.street && s2.adjacentZones.some(function (z) { return cur.adjacentZones.indexOf(z) >= 0; }))
          out.push({ type: "moveStep", uid: "abrams", to: { street: s2.id }, label: "Abrams to Street Section " + s2.id, cite: "[12.6.2]" });
      });
      cur.adjacentZones.forEach(function (zid) {
        if (locExists(state, zid, "OG") && !enemyAt(state, zid, "OG").length)
          out.push({ type: "moveStep", uid: "abrams", to: { zone: zid, loc: "OG" }, label: "Abrams into Zone " + zid + " Open Ground", cite: "[12.6.2]" });
      });
    } else if (a.pos.zone != null) {
      streetsOfZone(a.pos.zone).forEach(function (s) {
        out.push({ type: "moveStep", uid: "abrams", to: { street: s.id }, label: "Abrams to Street Section " + s.id, cite: "[12.6.2]" });
      });
    }
    return out;
  }
  function stackingViolations(state) {
    var bad = {};
    B.zones.forEach(function (z) {
      if (state.zones[z.id].control !== "usmc") return;
      var seen = {};
      squadsInZone(state, z.id).forEach(function (u) {
        if (!u.pos || u.pos.loc == null) return;
        if (seen[u.pos.loc]) { bad[u.uid] = true; bad[seen[u.pos.loc]] = true; }
        else seen[u.pos.loc] = u.uid;
      });
    });
    return Object.keys(bad).map(function (k) { return state.units[k]; });
  }
  function abramsEndOk(state) {
    var a = state.units.abrams;
    if (!a.pos) return true;
    if (a.pos.street != null) return SD[a.pos.street].adjacentZones.some(function (z) { return state.zones[z].control === "usmc"; });
    return adjOrNei(a.pos.zone).some(function (z) { return state.zones[z].control === "usmc"; });
  }
  // Distance over the Abrams movement graph (Street Sections and OG
  // Locations as nodes) from every node to the nearest legal end position
  // [12.6.3]. Returns null when no legal end position exists at all — then
  // the Abrams simply stays where it is, as the book has no ruling for a
  // board with no USMC Zone. Corrective steps use this so that every step
  // strictly closes on a legal end and the phase always terminates.
  function abramsGraphDist(state) {
    var valid = {}, dist = {}, queue = [];
    B.streets.forEach(function (s) {
      if (s.adjacentZones.some(function (z) { return state.zones[z].control === "usmc"; })) valid["s" + s.id] = true;
    });
    B.zones.forEach(function (z) {
      if (z.id !== 27 && locExists(state, z.id, "OG") &&
          adjOrNei(z.id).some(function (z2) { return state.zones[z2].control === "usmc"; })) valid["z" + z.id] = true;
    });
    if (!Object.keys(valid).length) return null;
    function neighbours(key) {
      var out = [];
      if (key[0] === "s") {
        var s = SD[+key.slice(1)];
        B.streets.forEach(function (s2) {
          if (s2.id !== s.id && s2.adjacentZones.some(function (z) { return s.adjacentZones.indexOf(z) >= 0; })) out.push("s" + s2.id);
        });
        s.adjacentZones.forEach(function (zid) { if (locExists(state, zid, "OG")) out.push("z" + zid); });
      } else {
        streetsOfZone(+key.slice(1)).forEach(function (s) { out.push("s" + s.id); });
      }
      return out;
    }
    Object.keys(valid).forEach(function (k) { dist[k] = 0; queue.push(k); });
    while (queue.length) {
      var cur = queue.shift();
      neighbours(cur).forEach(function (n) {
        if (dist[n] == null) { dist[n] = dist[cur] + 1; queue.push(n); }
      });
    }
    return dist;
  }
  function abramsNode(a) { return a.pos.street != null ? "s" + a.pos.street : "z" + a.pos.zone; }

  // ------------------------------------------------------------ legal actions
  function legalActions(state) {
    if (state.phase === "done") return [];
    if (state.pending) {
      var p = state.pending;
      if (p.kind === "caatLoss") return [
        { type: "caatLoss", apply: "squad", label: "The squad takes the Step Loss [5.1.1.2]", cite: "[5.1.1.2]" },
        { type: "caatLoss", apply: "caat", label: "The CAAT takes the Step Loss and is withdrawn [5.1.4.3]", cite: "[5.1.1.2]" }];
      if (p.kind === "iedChoice") return [
        { type: "iedChoice", choice: "ied", label: "Resolve it as an IED [5.3.5]", cite: "[5.3.5]" },
        { type: "iedChoice", choice: "sniper", label: "Resolve it as a Sniper [5.3.5]", cite: "[5.3.5]" }];
      if (p.kind === "flood") return [
        { type: "flood", label: "Flood the Zone [13.4.7.2]", cite: "[13.4.7.2]" },
        { type: "declineFlood", label: "Do not Flood", cite: "[13.4.7.2]" }];
      if (p.kind === "dfChoice") return [
        { type: "dfDetach", label: "Detach the Security Element (1 MP), then take Defensive Fire [12.3.2.1]", cite: "[12.3.2.1]" },
        { type: "dfTake", label: "Take Defensive Fire now [12.7]", cite: "[12.7]" }];
      return [];
    }
    var out = [], i, j;
    function endPhase(label, cite) { out.push({ type: "endPhase", label: label, cite: cite }); }

    if (state.phase === "setup") {
      var placedZones = {};
      state.setupQueue.forEach(function (uid) { var u = state.units[uid]; if (u.pos) placedZones[u.pos.zone] = true; });
      state.setupQueue.forEach(function (uid) {
        var u = state.units[uid]; if (u.pos) return;
        B.zones.forEach(function (z) {
          if (z.circle === "start" && !placedZones[z.id])
            out.push({ type: "setupPlace", uid: uid, zone: z.id, label: "Place " + unitName(state, u) + " in Start Zone " + z.id, cite: "[6.3]" });
        });
      });
      units(state).filter(function (u) { return u.kind === "caat" && !u.attachedTo; }).forEach(function (c) {
        state.setupQueue.forEach(function (uid) {
          var u = state.units[uid];
          if (u.pos && !u.caat) out.push({ type: "setupCaat", caat: c.uid, uid: uid, label: "Attach " + unitName(state, c) + " to " + unitName(state, u), cite: "[6.3.1]" });
        });
      });
      return out;
    }

    if (state.phase === "support") {
      var clearOfMarines = function (zid) { return !marinesInZone(state, zid).length; };
      if (state.support.dragonEye < B.counters.support.dragonEye.max) {
        var unact = B.zones.map(function (z) { return z.id; }).filter(function (zid) {
          return state.zones[zid].control === "insurgent" && !state.zones[zid].activated && clearOfMarines(zid);
        });
        unact.forEach(function (z1) {
          out.push({ type: "mission", mission: "dragonEye", zone: z1, zone2: null, label: "Dragon Eye: Activate Zone " + z1, cite: "[9.3]" });
          unact.forEach(function (z2) {
            if (z2 > z1 && adjOrNei(z1).indexOf(z2) >= 0)
              out.push({ type: "mission", mission: "dragonEye", zone: z1, zone2: z2, label: "Dragon Eye: Activate Zones " + z1 + " and " + z2, cite: "[9.3]" });
          });
        });
      }
      if (state.support.cobra < B.counters.support.superCobra.max) {
        B.zones.forEach(function (z) {
          if (state.zones[z.id].control !== "insurgent" || z.id === 26 || !clearOfMarines(z.id)) return;
          var es = enemyAtAll(state, z.id);
          es.forEach(function (t) { out.push({ type: "mission", mission: "cobra", zone: z.id, remove: [t.uid], label: "Super Cobra on Zone " + z.id + ": remove " + unitName(state, t), cite: "[9.3]" }); });
          for (i = 0; i < es.length; i++) for (j = i + 1; j < es.length; j++)
            out.push({ type: "mission", mission: "cobra", zone: z.id, remove: [es[i].uid, es[j].uid], label: "Super Cobra on Zone " + z.id + ": remove " + unitName(state, es[i]) + " and " + unitName(state, es[j]), cite: "[9.3]" });
        });
      }
      if (state.support.hornet < B.counters.support.hornet.max) {
        B.zones.forEach(function (z) {
          if (state.zones[z.id].control !== "insurgent" || z.id === 26 || !clearOfMarines(z.id)) return;
          if (adjOrNei(z.id).some(function (z2) { return marinesInZone(state, z2).length; })) return;
          out.push({ type: "mission", mission: "hornet", zone: z.id, label: "Hornet strike on Zone " + z.id + " (becomes Ruins)", cite: "[9.3]" });
        });
      }
      endPhase("End the Support Phase", "[9]");
      return out;
    }

    if (state.phase === "reinforce") {
      var startUsmc = B.zones.filter(function (z) {
        if (z.circle !== "start" || state.zones[z.id].control !== "usmc") return false;
        var el = entryLoc(state, z.id);
        return el && !atLoc(state, z.id, el).some(isMarineSquad);   // entry Location free [12.2]
      }).map(function (z) { return z.id; });
      if (state.turn >= 2) state.company.forEach(function (uid) {
        startUsmc.forEach(function (zid) { out.push({ type: "place", pool: "company", uid: uid, zone: zid, label: "Company: place " + unitName(state, state.units[uid]) + " in Start Zone " + zid, cite: "[10.1]" }); });
      });
      if (state.turn >= 9) state.battalion.forEach(function (uid) {
        startUsmc.forEach(function (zid) { out.push({ type: "place", pool: "battalion", uid: uid, zone: zid, label: "Battalion: place " + unitName(state, state.units[uid]) + " in Start Zone " + zid + " (-2 VP)", cite: "[10.3]" }); });
      });
      if (state.iifFromTurn && state.turn >= state.iifFromTurn) state.iifPool.forEach(function (uid) {
        startUsmc.forEach(function (zid) { out.push({ type: "place", pool: "iif", uid: uid, zone: zid, label: "IIF: place " + unitName(state, state.units[uid]) + " in Start Zone " + zid, cite: "[10.4]" }); });
      });
      if (state.turn >= 2 && !state.units.abrams.pos) {
        B.streets.forEach(function (s) {
          if (s.adjacentZones.some(function (zid) { return state.zones[zid].control === "usmc"; }))
            out.push({ type: "placeAbrams", street: s.id, label: "Place the Abrams in Street Section " + s.id, cite: "[10.2]" });
        });
      }
      endPhase("End the Reinforcements Phase", "[10]");
      return out;
    }

    if (state.phase === "fire") {
      units(state).forEach(function (u) {
        if (!isMarineSquad(u) && u.kind !== "abrams") return;
        if (!u.pos || u.fired || u.pinned) return;
        if (u.kind === "abrams" && u.pos.zone != null) return;      // in OG: may not Fire [11.1.3]
        if (isMarineSquad(u) && u.pos.loc == null) return;           // in a Street: may not Fire [12.5.4]
        fireTargets(state, u).forEach(function (t) {
          out.push({ type: "fire", uid: u.uid, target: t.uid, caat: false, label: unitName(state, u) + " fires at " + unitName(state, t) + " in Zone " + t.pos.zone, cite: "[11.1]" });
          if (u.caat && state.units[u.caat].ammo > 0 && ["C", "OG", "R"].indexOf(locType(u.pos.zone, u.pos.loc)) >= 0)
            out.push({ type: "fire", uid: u.uid, target: t.uid, caat: true, label: unitName(state, u) + " fires at " + unitName(state, t) + " with CAAT support (+2 CF, 1 Ammo)", cite: "[11.1.2]" });
        });
      });
      endPhase("End the Fire Phase", "[11]");
      return out;
    }

    if (state.phase === "movement") {
      var viol = stackingViolations(state), aBad = !abramsEndOk(state);
      var aDist = null;
      if (aBad) {
        // Corrective Abrams steps must strictly close on a legal end
        // position [12.6.3]; if none exists or none is reachable, the
        // Abrams stays where it is and the phase may end.
        aDist = abramsGraphDist(state);
        if (!aDist || aDist[abramsNode(state.units.abrams)] == null) aBad = false;
      }
      if (viol.length || aBad) {
        // Corrective steps only, and only to a Location holding no other
        // squad, so every step strictly reduces the violation [12.2].
        viol.forEach(function (u) {
          squadSteps(state, u).filter(function (a) {
            return a.to.loc == null || !atLoc(state, a.to.zone, a.to.loc).some(function (x) { return isMarineSquad(x) && x !== u; });
          }).forEach(function (a) { out.push(a); });
        });
        if (aBad) {
          var curD = aDist[abramsNode(state.units.abrams)];
          abramsSteps(state, state.units.abrams).filter(function (a) {
            var key = a.to.street != null ? "s" + a.to.street : "z" + a.to.zone;
            return aDist[key] != null && aDist[key] < curD;
          }).forEach(function (a) { out.push(a); });
        }
        return out;
      }
      units(state).forEach(function (u) {
        if (isMarineSquad(u)) {
          if (!u.pos || u.pinned || u.fired || u.mp <= 0) return;
          squadSteps(state, u).forEach(function (a) { out.push(a); });
          if (!u.security && u.pos.loc != null && (locType(u.pos.zone, u.pos.loc) === "C" || locType(u.pos.zone, u.pos.loc) === "R"))
            out.push({ type: "detach", uid: u.uid, label: unitName(state, u) + " detaches its Security Element here (1 MP)", cite: "[12.3.2]" });
          if (u.security) out.push({ type: "pickup", uid: u.uid, label: unitName(state, u) + " picks up its Security Element (all MP)", cite: "[12.3.2.3]" });
          if (u.stepTurn && u.pos.zone != null && ZD[u.pos.zone].circle === "start" &&
              !adjOrNei(u.pos.zone).some(function (z2) { return state.zones[z2].control === "usmc"; }))
            out.push({ type: "withdraw", uid: u.uid, label: unitName(state, u) + " is withdrawn from its Start Zone (-2 VP) [12.4.3]", cite: "[12.4.3]" });
        } else if (u.kind === "abrams" && u.pos && (u.mp == null || u.mp > 0)) {
          abramsSteps(state, u).forEach(function (a) { out.push(a); });
        }
      });
      endPhase("End the Movement Phase", "[12]");
      return out;
    }

    if (state.phase === "assault") {
      units(state).forEach(function (u) {
        if (!isMarineSquad(u) || !u.pos || u.pos.loc == null || u.fired || u.pinned || u.assaulted) return;
        if (holdApplies(state, u)) return;   // may not Assault out of a held empty Zone [12.1.2]; nothing to Assault inside one
        assaultTargets(state, u).forEach(function (t) {
          out.push({ type: "assault", uid: u.uid, target: t.uid, explosives: false, label: unitName(state, u) + " assaults " + unitName(state, t) + " in Zone " + t.pos.zone + " Location " + t.pos.loc, cite: "[13]" });
          if (u.caat && state.units[u.caat].explosives > 0)
            out.push({ type: "assault", uid: u.uid, target: t.uid, explosives: true, label: unitName(state, u) + " assaults " + unitName(state, t) + " with CAAT Explosives (CF 8)", cite: "[13.7.1]" });
        });
      });
      endPhase("End the Assault Phase — Reorganisation", "[14]");
      return out;
    }
    return out;
  }

  // --------------------------------------------------------------- refusals
  function refusals(state) {
    var out = [];
    if (state.phase === "done") return out;
    if (state.pending) {
      var why = "A decision is waiting: " + (state.pending.kind === "caatLoss" ? "which unit takes the Step Loss" :
        state.pending.kind === "iedChoice" ? "IED or Sniper" :
        state.pending.kind === "dfChoice" ? "whether to detach the Security Element before Defensive Fire" :
        "whether to Flood") + " — resolve it first.";
      out.push({ type: "endPhase", why: why, cite: "[5.1.1.2]" });
      out.push({ type: "fire", uid: "*", target: "*", caat: "*", why: why, cite: "[5.1.1.2]" });
      out.push({ type: "moveStep", uid: "*", to: "*", why: why, cite: "[5.1.1.2]" });
      out.push({ type: "assault", uid: "*", target: "*", explosives: "*", why: why, cite: "[5.1.1.2]" });
      return out;
    }
    units(state).forEach(function (u) {
      if (isInsurgent(u) || u.kind === "suspect")
        out.push({ type: "moveStep", uid: u.uid, to: "*", why: "Insurgents move by the rules (Reactions, Retreats), not by orders.", cite: "[9.4]" });
      if (isMarineSquad(u) || u.kind === "abrams") {
        if (u.fired) out.push({ type: "fire", uid: u.uid, target: "*", caat: "*", why: unitName(state, u) + " has Fired and may not Fire again, Move or Assault this turn.", cite: "[11.3]" });
        if (u.pinned) {
          out.push({ type: "fire", uid: u.uid, target: "*", caat: "*", why: unitName(state, u) + " is Pinned and cannot Fire, Move or Assault.", cite: "[11.5]" });
          out.push({ type: "moveStep", uid: u.uid, to: "*", why: unitName(state, u) + " is Pinned and cannot Move.", cite: "[11.5]" });
          out.push({ type: "assault", uid: u.uid, target: "*", explosives: "*", why: unitName(state, u) + " is Pinned and cannot Assault.", cite: "[11.5]" });
        }
      }
    });
    if (state.phase === "fire") {
      units(state).forEach(function (u) {
        if ((!isMarineSquad(u) && u.kind !== "abrams") || !u.pos || u.fired || u.pinned) return;
        var can = {};
        fireTargets(state, u).forEach(function (t) { can[t.uid] = true; });
        enemyAtAllZones(state).forEach(function (t) {
          if (can[t.uid]) return;
          var why = marinesInZone(state, t.pos.zone).length ? "Zone " + t.pos.zone + " holds Marine units — no Fire into it [11.1]"
            : u.kind === "abrams" && t.pos.loc === "R" ? "An Abrams may not Fire at a target in Location R [11.1.3]"
            : "Zone " + t.pos.zone + " is not Adjacent or Neighbouring to the firer [11.1]";
          out.push({ type: "fire", uid: u.uid, target: t.uid, caat: "*", why: why, cite: "[11.1]" });
        });
      });
    }
    if (state.phase === "movement") {
      units(state).filter(isMarineSquad).forEach(function (u) {
        if (u.pos && !u.pinned && !u.fired && u.mp <= 0)
          out.push({ type: "moveStep", uid: u.uid, to: "*", why: unitName(state, u) + " has no Movement Points left.", cite: "[12.1]" });
        if (u.pos && u.fired)
          out.push({ type: "moveStep", uid: u.uid, to: "*", why: unitName(state, u) + " has Fired and may not Move this turn.", cite: "[11.3]" });
      });
    }
    if (state.phase === "assault") {
      units(state).filter(isMarineSquad).forEach(function (u) {
        if (u.assaulted) out.push({ type: "assault", uid: u.uid, target: "*", explosives: "*", why: unitName(state, u) + " has already Assaulted this phase.", cite: "[13]" });
      });
    }
    if (state.phase === "support") {
      if (state.support.dragonEye >= B.counters.support.dragonEye.max)
        out.push({ type: "mission", mission: "dragonEye", zone: "*", zone2: "*", why: "All 4 Dragon Eye missions have been used.", cite: "[9.3]" });
      if (state.support.cobra >= B.counters.support.superCobra.max)
        out.push({ type: "mission", mission: "cobra", zone: "*", remove: "*", why: "Both Super Cobra missions have been used.", cite: "[9.3]" });
      if (state.support.hornet >= B.counters.support.hornet.max)
        out.push({ type: "mission", mission: "hornet", zone: "*", why: "The Hornet mission has been used.", cite: "[9.3]" });
    }
    return out;
  }
  function enemyAtAllZones(state) {
    return units(state).filter(function (u) { return u.pos && u.pos.zone != null && (isInsurgent(u) || u.kind === "suspect"); });
  }

  // ------------------------------------------------------------------- apply
  function maybeAdvanceSetup(state, events) {
    var allPlaced = state.setupQueue.every(function (uid) { return !!state.units[uid].pos; });
    var allCaat = units(state).filter(function (u) { return u.kind === "caat"; })
      .every(function (c) { return !!c.attachedTo; });
    if (allPlaced && allCaat && state.phase === "setup") {
      state.phase = "support";
      events.push("Setup complete — Turn 1, Support Phase [8]");
    }
  }
  function refreshNoEvent(state) {
    B.zones.forEach(function (z) { if (!zoneHasSE(state, z.id)) state.zones[z.id].noEvent = false; });
  }

  function doMission(state, action, rng, events, records) {
    var roll = d10(rng), ok = false, label = "";
    if (action.mission === "dragonEye") {
      label = "Dragon Eye UAV Report";
      ok = roll <= B.counters.support.dragonEye.success[1];
      records.push(FW.record.make({ context: label + " on Zone " + action.zone + (action.zone2 ? " and Zone " + action.zone2 : ""),
        table: "Support Missions [9.3]", die: roll, target: B.counters.support.dragonEye.success[1], result: ok ? "success" : "no effect", ruleRef: "[9.3]" }));
      if (ok) {
        state.support.dragonEye++;   // only a success uses up a Mission and moves its marker [9.2, 9.2.1]
        var zs = [action.zone]; if (action.zone2) zs.push(action.zone2);
        zs.forEach(function (zid) { activateZone(state, zid, rng, events, true); });
        zs.forEach(function (zid) {
          if (state.zones[zid].fortified) return;   // Dragon Eye Activates Suspects in Normal Zones [9.3]
          suspectsInZone(state, zid).slice().forEach(function (su) {
            if (!state.pending) revealSuspect(state, su, rng, events, records, { dragonEye: true });
          });
        });
      }
    } else if (action.mission === "cobra") {
      label = "AH-1W Super Cobra CAS";
      ok = roll <= B.counters.support.superCobra.success[1];
      records.push(FW.record.make({ context: label + " on Zone " + action.zone, table: "Support Missions [9.3]",
        die: roll, target: B.counters.support.superCobra.success[1], result: ok ? "success" : "no effect", ruleRef: "[9.3]" }));
      if (ok) state.support.cobra++;   // [9.2, 9.2.1]
      if (ok) action.remove.forEach(function (uid) {
        var t = state.units[uid]; if (!t || !t.alive) return;
        if (t.kind === "suspect") { t.alive = false; t.pos = null; state.pools.markers.push(t.marker); events.push("Super Cobra removes a Suspect marker in Zone " + action.zone); }
        else eliminateInsurgent(state, t, events, true);
      });
    } else if (action.mission === "hornet") {
      label = "F/A-18 Hornet CAS";
      ok = roll <= B.counters.support.hornet.success[1];
      records.push(FW.record.make({ context: label + " on Zone " + action.zone, table: "Support Missions [9.3]",
        die: roll, target: B.counters.support.hornet.success[1], result: ok ? "success" : "no effect", ruleRef: "[9.3]" }));
      if (ok) {
        state.support.hornet++;   // [9.2, 9.2.1]
        if (!state.zones[action.zone].activated) activateZone(state, action.zone, rng, events, false);
        enemyAtAll(state, action.zone).slice().forEach(function (t) {
          if (t.kind === "suspect") { t.alive = false; t.pos = null; state.pools.markers.push(t.marker); }
          else eliminateInsurgent(state, t, events, true);
        });
        state.zones[action.zone].ruins = true;
        events.push("Zone " + action.zone + " is reduced to Ruins [9.3]");
      }
    }
    events.push(label + ": rolled " + roll + " — " + (ok ? "success" : "no effect"));
    reactionRoll(state, rng, events, records);
  }

  function doMoveStep(state, action, rng, events, records) {
    var u = state.units[action.uid];
    if (u.kind === "abrams") {
      if (u.mp == null) {
        var r = d10(rng);
        u.mp = r <= 1 ? 4 : r <= 5 ? 3 : r <= 8 ? 2 : 1;
        records.push(FW.record.make({ context: "Abrams Movement Capacity", table: "Abrams MC [12.6.1]",
          die: r, result: "MC " + u.mp, ruleRef: "[12.6.1]" }));
        events.push("The Abrams rolls its Movement Capacity: " + u.mp + " [12.6.1]");
      }
      u.mp -= 1;
      u.pos = action.to.street != null ? { street: action.to.street } : { zone: action.to.zone, loc: action.to.loc };
      events.push(stepLabel(state, u, action.to));
      return;
    }
    var fromStreet = u.pos.street != null;
    var origin = fromStreet ? null : { zone: u.pos.zone, loc: u.pos.loc };
    if (action.to.street != null) {
      u.streetFrom = { zone: u.pos.zone, loc: u.pos.loc };
      u.pos = { street: action.to.street };
      u.mp -= 1;
      events.push(stepLabel(state, u, action.to));
      var res = streetSniper(state, u, action.to.street, rng, events, records);
      if (res === "back") { u.pos = origin; u.mp = 0; }
      else if (res === "pinned") u.mp = 0;
      return;
    }
    u.mp -= 1;
    u.pos = { zone: action.to.zone, loc: action.to.loc };
    if (fromStreet) u.streetFrom = null;
    events.push(stepLabel(state, u, action.to));
    if ((action.to.loc === "C" || action.to.loc === "OG") && state.zones[action.to.zone].control === "insurgent") {
      // Entering a C Location, the squad may detach its Security Element
      // BEFORE any Defensive Fire [12.3.2.1] — that choice comes first.
      if (action.to.loc === "C" && !u.security && u.mp > 0 &&
          (insurgentsInZone(state, action.to.zone).length || suspectsInZone(state, action.to.zone).length)) {
        state.pending = { kind: "dfChoice", uid: u.uid, zone: action.to.zone };
        events.push(unitName(state, u) + " enters Location C — detach the Security Element before Defensive Fire? [12.3.2.1]");
      } else defensiveFire(state, u, action.to.zone, rng, events, records);
    }
    if (u.pinned) u.mp = 0;
  }

  function reorganise(state, rng, events, records) {
    var i, zid;
    // 1. Taking Control [14.1] + Contact [14.2]
    var newly = [];
    B.zones.forEach(function (z) {
      zid = z.id;
      if (zid === 27 || state.zones[zid].control !== "insurgent") return;
      if (squadsInZone(state, zid).length && !insurgentsInZone(state, zid).length && !suspectsInZone(state, zid).length) {
        state.zones[zid].control = "usmc";
        if (state.zones[zid].fanaticism) { state.zones[zid].fanaticism = false; events.push("Zone " + zid + ": Fanaticism marker removed [13.4.3.3]"); }
        newly.push(zid);
        events.push("Zone " + zid + " comes under USMC Control [14.1]");
        if (!state.iifFromTurn && adjOrNei(zid).indexOf(26) >= 0) state.iifFromTurn = state.turn + 1;
      }
    });
    newly.forEach(function (z) {
      adjOrNei(z).forEach(function (z2) { if (!state.zones[z2].activated) activateZone(state, z2, rng, events, true); });
    });
    // 2. Regrouping [14.3]
    units(state).filter(isMarineSquad).forEach(function (u) {
      if (u.security && u.pos && u.pos.zone != null && state.zones[u.pos.zone].control === "usmc") {
        u.security = false; u.seLoc = null;
        events.push(unitName(state, u) + " regroups its Security Element [14.3.1]");
      }
      u.fired = false;
    });
    refreshNoEvent(state);
    units(state).filter(isMarineSquad).forEach(function (u) {
      if (!u.pinned || !u.pos) return;
      var zoneSet = {};
      if (u.pos.zone != null) { zoneSet[u.pos.zone] = true; adjOrNei(u.pos.zone).forEach(function (z) { zoneSet[z] = true; }); }
      else SD[u.pos.street].adjacentZones.forEach(function (z) { zoneSet[z] = true; adjOrNei(z).forEach(function (z2) { zoneSet[z2] = true; }); });
      var clear = Object.keys(zoneSet).every(function (z) { return !insurgentsInZone(state, +z).length && !suspectsInZone(state, +z).length; });
      if (clear) { u.pinned = false; events.push(unitName(state, u) + " unpins automatically (no Insurgents nearby) [14.3.4]"); return; }
      var drm = 0;
      if (u.pos.loc === "C") drm = 1;
      else if (u.pos.loc === "OG") drm = 2;
      else if (u.pos.street != null && !units(state).some(function (x) { return x.kind === "abrams" && x.pos && x.pos.street === u.pos.street; })) drm = 2;
      var roll = d10(rng);
      records.push(FW.record.make({ context: "Unpin roll for " + unitName(state, u), table: "Regrouping [14.3.4]",
        drms: drm ? [{ label: "exposed Location", value: drm, rule: "[14.3.4]" }] : [],
        inputs: [{ label: "squad CF", value: effCF(u), rule: "[14.3.4]" }], die: roll, target: effCF(u),
        result: roll + drm <= effCF(u) ? "unpins" : "stays Pinned", ruleRef: "[14.3.4]" }));
      if (roll + drm <= effCF(u)) { u.pinned = false; events.push(unitName(state, u) + " unpins [14.3.4]"); }
    });
    units(state).filter(function (u) { return u.kind === "squad" && u.caat; }).forEach(function (u) {
      var c = state.units[u.caat];
      if (c.ammo <= 0 && c.explosives <= 0) {
        c.alive = false; c.attachedTo = null; u.caat = null;
        events.push("A CAAT support with no munitions left is removed (no VP) [14.3.5]");
      }
    });
    // 3. Enemy Infiltration [14.4]
    var sources = {};
    B.zones.forEach(function (z) {
      if (state.zones[z.id].control === "insurgent" && !squadsInZone(state, z.id).length &&
          (insurgentsInZone(state, z.id).length || suspectsInZone(state, z.id).length)) sources[z.id] = true;
    });
    B.zones.forEach(function (z) {
      zid = z.id;
      if (state.zones[zid].control !== "usmc" || squadsInZone(state, zid).length) return;
      var srcs = adjOrNei(zid).filter(function (z2) { return sources[z2]; });
      if (!srcs.length) return;
      var blocked = srcs.every(function (z2) {
        if (isAdj(z2, zid)) return false;
        var seps = B.streets.filter(function (s) { return s.adjacentZones.indexOf(z2) >= 0 && s.adjacentZones.indexOf(zid) >= 0; });
        return seps.length && seps.every(function (s) {
          return units(state).some(function (x) { return x.kind === "abrams" && x.pos && x.pos.street === s.id; }) ||
            units(state).some(function (x) { return isMarineSquad(x) && x.pinned && x.pos && x.pos.street === s.id; }) ||
            s.adjacentZones.some(function (z3) { return state.zones[z3].control === "usmc" && squadsInZone(state, z3).length; });
        });
      });
      if (blocked) return;
      if (placeSuspect(state, zid, rng)) {
        state.zones[zid].control = "insurgent";
        events.push("Enemy Infiltration: a Suspect marker appears in Zone " + zid + ", which falls back under Insurgent Control [14.4]");
      }
    });
    // 4. Events [14.5]: Phantom Fury markers age.
    B.zones.forEach(function (z) {
      if (state.zones[z.id].pf === 2) state.zones[z.id].pf = 0;
      else if (state.zones[z.id].pf === 1) state.zones[z.id].pf = 2;
    });
    // 5. Victory [7] and the Turn marker.
    var win = checkWin(state);
    if (win.win) {
      if (win.except) addVp(state, -5, events, "Zone 26 left empty but uncontrolled [7.2.1]");
      var unplayed = 16 - state.turn;
      if (unplayed > 0) addVp(state, 5 * unplayed, events, unplayed + " unplayed turns [7.2.1]");
      state.phase = "done"; state.winner = "you";
      state.result = "Every Zone is under USMC Control at the end of Turn " + state.turn + " [7.2]";
      return;
    }
    if (state.turn >= 16) {
      state.phase = "done"; state.winner = "foe";
      state.result = "16 Turns played and Fallujah is not cleared [7.1]";
      return;
    }
    state.turn++;
    state.phase = "support";
    units(state).forEach(function (u) {
      if (isMarineSquad(u)) { u.assaulted = false; u.stepTurn = false; u.mp = 0; }
      if (u.kind === "abrams") u.fired = false;
    });
    events.push("Turn " + state.turn + " — Support Phase [8]");
  }
  function checkWin(state) {
    var others = true, z26clear = true;
    for (var zid = 1; zid <= 61; zid++) {
      if (zid === 27) continue;
      if (zid === 26) {
        z26clear = !insurgentsInZone(state, 26).length && !suspectsInZone(state, 26).length &&
          state.zones[26].control !== "usmc" ? z26clear : true;
        if (state.zones[26].control === "usmc") continue;
        if (insurgentsInZone(state, 26).length || suspectsInZone(state, 26).length) others = false;
        continue;
      }
      if (state.zones[zid].control !== "usmc") others = false;
    }
    if (!others) return { win: false };
    if (state.zones[26].control === "usmc") return { win: true, except: false };
    return { win: true, except: true };
  }

  function endPhase(state, rng, events, records) {
    if (state.phase === "support") { state.phase = "reinforce"; events.push("Reinforcements Phase [10]"); }
    else if (state.phase === "reinforce") { state.phase = "fire"; events.push("Fire Combat Phase [11]"); }
    else if (state.phase === "fire") {
      state.phase = "movement";
      units(state).forEach(function (u) { if (isMarineSquad(u)) u.mp = 4; if (u.kind === "abrams") u.mp = null; });
      events.push("Movement Phase [12]");
    }
    else if (state.phase === "movement") { state.phase = "assault"; events.push("Assault Phase [13]"); }
    else if (state.phase === "assault") reorganise(state, rng, events, records);
  }

  function apply(state, action, opts) {
    var rng = FW.rng.require(opts, "phantomfury.apply");
    var events = [], records = [], u, p;
    switch (action.type) {
      case "setupPlace":
        u = state.units[action.uid];
        u.alive = true; u.pos = { zone: action.zone, loc: entryLoc(state, action.zone) };
        events.push(unitName(state, u) + " sets up in Start Zone " + action.zone + " [6.3]");
        maybeAdvanceSetup(state, events);
        break;
      case "setupCaat":
        u = state.units[action.uid];
        state.units[action.caat].attachedTo = action.uid; u.caat = action.caat;
        events.push(unitName(state, state.units[action.caat]) + " attached to " + unitName(state, u) + " [6.3.1]");
        maybeAdvanceSetup(state, events);
        break;
      case "caatLoss":
        p = state.pending; u = state.units[p.uid];
        if (action.apply === "caat") applyCaatLoss(state, u, events);
        else applyMarineStepLoss(state, u, events, {});
        state.pending = null;
        if (p.resume && p.resume.assault) {
          var ra = p.resume.assault, tgt = state.units[ra.target];
          if (tgt) finishAssault(state, u, tgt, { type: ra.type, fromLoc: ra.fromLoc, zone: ra.zone, tgtLoc: ra.tgtLoc, flood: ra.flood }, rng, events, records);
          if (ra.flood && !state.pending && u.alive) runFlood(state, u, ra.zone, rng, events, records);
        }
        break;
      case "iedChoice":
        p = state.pending; state.pending = null;
        u = state.units[p.uid];
        if (u && u.alive) {
          if (action.choice === "ied") resolveIED(state, u, rng, events, records);
          else { events.push("Resolved as a Sniper [5.3.5]"); sniperAttack(state, u, rng, events, records); }
          // the Activation is resolved: now the Fire's own Sniper Attack [11.4.1]
          if (p.afterFire && u.alive && !state.pending) sniperAttack(state, u, rng, events, records);
        }
        break;
      case "flood":
        p = state.pending; state.pending = null; u = state.units[p.uid];
        if (u && u.alive) runFlood(state, u, p.zone, rng, events, records);
        break;
      case "declineFlood":
        state.pending = null; events.push("The squad holds its Location — no Flooding [13.4.7.2]");
        break;
      case "dfDetach":
        p = state.pending; u = state.units[p.uid];
        u.mp -= 1; u.security = true; u.seLoc = u.pos.loc;
        events.push(unitName(state, u) + " detaches its Security Element in Location C [12.3.2.1]");
        state.pending = null;
        defensiveFire(state, u, p.zone, rng, events, records);
        if (u.pinned) u.mp = 0;
        break;
      case "dfTake":
        p = state.pending; u = state.units[p.uid];
        state.pending = null;
        defensiveFire(state, u, p.zone, rng, events, records);
        if (u.pinned) u.mp = 0;
        break;
      case "mission": doMission(state, action, rng, events, records); break;
      case "place": {
        var pool = action.pool === "company" ? state.company : action.pool === "battalion" ? state.battalion : state.iifPool;
        var ix = pool.indexOf(action.uid); if (ix >= 0) pool.splice(ix, 1);
        u = state.units[action.uid];
        u.alive = true; u.pos = { zone: action.zone, loc: entryLoc(state, action.zone) };
        events.push(unitName(state, u) + " enters in Start Zone " + action.zone + " [" + (action.pool === "company" ? "10.1" : action.pool === "battalion" ? "10.3" : "10.4") + "]");
        if (action.pool === "battalion") addVp(state, -2, events, "Battalion squad committed [7.2.1]");
        break;
      }
      case "placeAbrams":
        state.units.abrams.pos = { street: action.street };
        events.push("The M1A1 Abrams enters in Street Section " + action.street + " [10.2]");
        break;
      case "fire":
        resolveFire(state, state.units[action.uid], state.units[action.target], action.caat, rng, events, records);
        break;
      case "moveStep": doMoveStep(state, action, rng, events, records); break;
      case "detach":
        u = state.units[action.uid];
        u.mp -= 1; u.security = true; u.seLoc = u.pos.loc;
        events.push(unitName(state, u) + " detaches its Security Element in Location " + u.pos.loc + " (CF -1 while detached) [12.3.2]");
        break;
      case "pickup":
        u = state.units[action.uid];
        u.mp = 0; u.security = false; u.seLoc = null; refreshNoEvent(state);
        events.push(unitName(state, u) + " picks up its Security Element [12.3.2.3]");
        break;
      case "withdraw":
        u = state.units[action.uid];
        u.alive = false; u.pos = null;
        if (u.caat) { state.units[u.caat].alive = false; state.units[u.caat].attachedTo = null; u.caat = null; }
        addVp(state, -2, events, "Squad withdrawn from a Start Zone [12.4.3]");
        events.push(unitName(state, u) + " is withdrawn from the game [12.4.3]");
        break;
      case "assault":
        u = state.units[action.uid];
        u.assaulted = true;
        doAssault(state, u, state.units[action.target], action.explosives, rng, events, records, null);
        break;
      case "endPhase": endPhase(state, rng, events, records); break;
      default: throw new Error("phantomfury: unknown action " + action.type);
    }
    return { state: state, records: records, events: events };
  }

  // ------------------------------------------------------------------ isOver
  function isOver(state) {
    if (state.phase !== "done") return null;
    var zones = B.zones.filter(function (z) { return z.id !== 27 && state.zones[z.id].control === "usmc"; }).length;
    var level = state.winner === "you"
      ? (state.vp > 10 ? "a Major Victory" : state.vp >= 0 ? "a Minor Victory" : "a Costly Victory")
      : "an Insurgent victory";
    return { winner: state.winner, why: state.result + " — " + level + " (VP " + state.vp + ") [7.2.1]",
      score: { vp: state.vp, zones: zones } };
  }

  global.PhantomFury = FW.game.define({
    name: "phantomfury", SIDES: ["you", "foe"],
    board: B, ZD: ZD, SD: SD, COUNTERS: COUNTERS, markerList: markerList,
    units: units, posOf: posOf, unitName: unitName, effCF: effCF,
    isMarineSquad: isMarineSquad, isInsurgent: isInsurgent,
    marinesInZone: marinesInZone, squadsInZone: squadsInZone,
    insurgentsInZone: insurgentsInZone, suspectsInZone: suspectsInZone,
    atLoc: atLoc, enemyAt: enemyAt, locExists: locExists, entryLoc: entryLoc,
    locLinks: locLinks, crossLinks: crossLinks, adjOrNei: adjOrNei, assaultTargets: assaultTargets, fireTargets: fireTargets,
    fireDrms: fireDrms,
    create: create, legalActions: legalActions, refusals: refusals, apply: apply, isOver: isOver
  });
  if (typeof module !== "undefined" && module.exports) module.exports = global.PhantomFury;
})(typeof window !== "undefined" ? window : globalThis);
