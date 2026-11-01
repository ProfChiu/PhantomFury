/* fw_tutorial.js — a tutorial is data replayed through the real engine.
 *
 * A beat is one thing the reader is shown, then one thing that happens:
 *   {
 *     say:     "Turn 1. She activates four energy.",   what the caption reads
 *     explain: "Each icon on her side of a location ...", the rule behind it (optional)
 *     cite:    "[4.2]",                                 citation (optional)
 *     action:  { type: "activate", n: 4 },              applied through FW.game.run
 *     run:     function (state, opts) {},               OR arbitrary setup (scripted deals)
 *     show:    "foeHand",                               a UI reveal the page knows how to do
 *     spot:    ["u12"],                                 uids to highlight
 *     expect:  function (state) { return true|string }, what must be true afterwards
 *     done:    true                                     the closing beat
 *   }
 *
 * The runner steps through beats one Continue at a time; the same array runs
 * headless in a test, so a beat that breaks is caught before a lesson does.
 *
 * YOUR MOVE (0.5.0). A newcomer learns a game by making its decisions, not by
 * watching a script make them. A beat may hand the move over instead of acting:
 *
 *   { say: "Lead with your 7.", explain: "...", cite: "[2.1]",
 *     await:  { type: "play", uid: "you1" },   the move asked for; fields left
 *                                              out are the player's choice
 *     action: { type: "play", uid: "you1" },   optional model answer for replay;
 *                                              default: first legal move that fits
 *     hint:   "Click your 7, then your row.",  how to make it, in interface words
 *     wrong:  "Not that one — lead the 7." }   said when another legal move is tried
 *
 * The page then unlocks the board, spotlights `t.matches()`, and passes every
 * move the player makes to `t.offer(action)`: a move that fits is applied
 * through the hard lock and the lesson moves on; one that does not is refused
 * with `wrong` and the lesson waits where it was, so it cannot be lost by
 * clicking elsewhere. An await beat always has at least one fitting legal move
 * — `replay` fails the lesson if it does not, naming what the game offered.
 *
 * Usage:
 *   var t = FW.tutorial.create(G, beats, { setup, opts });   // opts.rng is usually a tape
 *   t.current()   -> beat        t.advance() -> { ok, beat, records, events, error }
 *   t.atEnd()     -> bool        t.restart()
 *   t.waiting()   -> bool        does this beat want the player's move?
 *   t.matches()   -> [actions]   the legal moves that would satisfy it
 *   t.wants(a)    -> bool        t.offer(a) -> { ok, refused, why, beat, records, events, error }
 *   FW.tutorial.replay(G, beats, { setup, opts }) -> { passed, failed, failures[] }
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  var game = global.FW && global.FW.game;
  if (!game && typeof require === "function") game = require("./fw_game.js");

  function create(G, beats, cfg) {
    cfg = cfg || {};
    var t = {
      G: G,
      beats: beats,
      i: 0,
      state: null,
      log: [],
      current: function () { return beats[t.i] || null; },
      atEnd: function () { return t.i >= beats.length; },
      restart: function () {
        t.i = 0;
        t.log = [];
        t.state = typeof cfg.setup === "function" ? cfg.setup(cfg.opts) : G.create(cfg.setup, cfg.opts);
        return t.state;
      },
      waiting: function () {
        var b = beats[t.i];
        return !!(b && b.await && !b.done);
      },
      wants: function (action) { return fits(beats[t.i] && beats[t.i].await, action); },
      matches: function () {
        var b = beats[t.i];
        if (!b || !b.await) return [];
        return G.legalActions(t.state).filter(function (a) { return fits(b.await, a); });
      },
      /** The player's move, on a beat that waits for one. */
      offer: function (action) {
        var b = beats[t.i];
        if (!b || !b.await) return { ok: false, beat: b, error: "this beat does not wait for a move" };
        if (!fits(b.await, action)) {
          return { ok: false, refused: true, beat: b,
                   why: b.wrong || ("The lesson asks for: " + describe(b.await)) };
        }
        return step(b, action);
      },
      /** Perform the current beat, then move on. A beat that waits for the
       *  player is not performed by Continue: pass { auto: true } to answer it
       *  with its model move (the headless replay does). */
      advance: function (how) {
        var b = beats[t.i];
        if (!b) return { ok: false, beat: null, error: "no more beats" };
        if (b.await && !b.done) {
          if (!(how && how.auto)) return { ok: false, waiting: true, beat: b, error: "this beat waits for the player's move" };
          var answer = b.action || t.matches()[0];
          if (!answer) {
            var offered = G.legalActions(t.state).map(function (a) { return a.type; });
            var err = "the lesson waits for " + describe(b.await) +
                      " but the game offers no such move; it offers: " + (offered.join(", ") || "nothing");
            t.log.push({ i: t.i, beat: b, error: err });
            return { ok: false, beat: b, error: err };
          }
          return step(b, answer);
        }
        return step(b, b.action);
      }
    };

    // apply one beat: its setup, then the move (scripted or the player's)
    function step(b, move) {
      var out = { ok: true, beat: b, records: [], events: [] };
        try {
          if (b.run) {
            var r = b.run(t.state, cfg.opts) || {};
            if (r.state) t.state = r.state;
            out.records = r.records || [];
            out.events = r.events || [];
          }
          if (move) {
            var res = game.run(G, t.state, move, cfg.opts);
            t.state = res.state;
            out.records = out.records.concat(res.records);
            out.events = out.events.concat(res.events);
          }
          if (b.expect) {
            var e = b.expect(t.state);
            if (e !== true && e !== undefined) {
              throw new Error("expectation failed" + (typeof e === "string" ? ": " + e : ""));
            }
          }
        } catch (err) {
          out.ok = false;
          out.error = err.message;
          t.log.push({ i: t.i, beat: b, error: err.message });
          return out;
        }
        t.log.push({ i: t.i, beat: b, records: out.records });
        t.i += 1;
        return out;
    }
    t.restart();
    return t;
  }

  // Does an action satisfy what a beat asked for? Every field the beat names
  // must match; fields it leaves out are the player's to choose. Arrays (a
  // group of attackers, say) must hold the same members in any order.
  function fits(want, action) {
    if (!want || !action) return false;
    return Object.keys(want).every(function (k) {
      var w = want[k], a = action[k];
      if (Array.isArray(w)) {
        return Array.isArray(a) && a.length === w.length &&
          w.every(function (x) { return a.indexOf(x) >= 0; });
      }
      return w === a;
    });
  }

  function describe(want) {
    return Object.keys(want || {}).map(function (k) { return k + " " + JSON.stringify(want[k]); }).join(", ") || "a move";
  }

  /** Run every beat headless. Stops at the first broken beat, since later
   *  beats depend on it, and says which one. */
  function replay(G, beats, cfg) {
    var t = create(G, beats, cfg);
    var failures = [];
    var passed = 0;
    for (var n = 0; n < beats.length; n++) {
      var b = beats[n];
      var label = "beat " + n + ": " + String(b.say || b.type || "").slice(0, 60);
      if (!b.say && !b.done) { failures.push(label + " — every beat says something"); }
      if (b.await && !b.hint && !b.done) { failures.push(label + " — a beat that hands over the move must say how to make it (hint)"); }
      var r = t.advance({ auto: true });
      if (!r.ok) { failures.push(label + " — " + r.error); break; }
      passed += 1;
    }
    return { passed: passed, failed: failures.length, failures: failures, state: t.state, runner: t };
  }

  var api = { create: create, replay: replay, fits: fits };

  global.FW = global.FW || {};
  global.FW.tutorial = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
