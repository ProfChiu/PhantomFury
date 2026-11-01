/* fw_rng.js — the only place randomness comes from.
 *
 * A rules module never calls Math.random. It receives an `rng` through opts
 * and asks it for dice, shuffles and picks. That one rule is what makes every
 * test deterministic, every rulebook example replayable, and every soak run
 * reproducible from a seed.
 *
 * Three kinds of rng share one interface:
 *   seeded(seed)   a mulberry32 stream — the same seed gives the same game
 *   tape(values)   a scripted die sequence, for replaying a worked example
 *   recording(rng) wraps another rng and keeps every roll it handed out
 *
 * Interface: { next(), rollDie(sides), int(n), pick(arr), shuffle(arr) }
 *   next()          float in [0, 1)
 *   rollDie(sides)  integer 1..sides  (a d10 that must read 0-9 is the game's
 *                   own convention: subtract one in the rules module and say so)
 *   int(n)          integer 0..n-1
 *   pick(arr)       one element, or undefined for an empty array
 *   shuffle(arr)    Fisher-Yates in place; returns the array
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Turn a string seed into a number so "game-7" is as good as 7. */
  function hashSeed(seed) {
    if (typeof seed === "number") return seed >>> 0;
    var s = String(seed == null ? "0" : seed), h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function fromNext(next, meta) {
    var rng = {
      kind: meta.kind,
      seed: meta.seed,
      calls: 0,
      next: function () { rng.calls += 1; return next(); },
      rollDie: function (sides) {
        if (!(sides >= 1)) throw new Error("rollDie: sides must be a positive integer, got " + sides);
        return 1 + Math.floor(rng.next() * sides);
      },
      int: function (n) {
        if (!(n >= 1)) throw new Error("int: n must be a positive integer, got " + n);
        return Math.floor(rng.next() * n);
      },
      pick: function (arr) {
        if (!arr || !arr.length) return undefined;
        return arr[rng.int(arr.length)];
      },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = rng.int(i + 1);
          var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      }
    };
    return rng;
  }

  function seeded(seed) {
    var s = hashSeed(seed);
    return fromNext(mulberry32(s), { kind: "seeded", seed: seed });
  }

  /**
   * A scripted sequence. Each rollDie(sides) returns the next value verbatim
   * (it is checked to be in 1..sides); next() is derived from it so shuffles
   * and picks also consume the tape. Running off the end throws, because a
   * worked example that needs more dice than the book gave is a bug.
   */
  function tape(values, opts) {
    opts = opts || {};
    var i = 0;
    var vals = (values || []).slice();
    var rng = {
      kind: "tape",
      seed: null,
      calls: 0,
      remaining: function () { return vals.length - i; },
      next: function () {
        rng.calls += 1;
        if (i >= vals.length) {
          if (opts.then) return opts.then.next();
          throw new Error("rng tape exhausted after " + vals.length + " values");
        }
        // Map a die face to a float so int()/pick()/shuffle() are usable.
        var v = vals[i++], sides = opts.sides || 10;
        return ((v - 1) % sides) / sides;
      },
      rollDie: function (sides) {
        rng.calls += 1;
        if (i >= vals.length) {
          if (opts.then) return opts.then.rollDie(sides);
          throw new Error("rng tape exhausted after " + vals.length + " values");
        }
        var v = vals[i++];
        if (!(v >= 1 && v <= sides)) {
          throw new Error("rng tape value " + v + " is not a valid d" + sides + " result");
        }
        return v;
      },
      int: function (n) { return Math.floor(rng.next() * n); },
      pick: function (arr) { return arr && arr.length ? arr[rng.int(arr.length)] : undefined; },
      shuffle: function (arr) {
        for (var k = arr.length - 1; k > 0; k--) {
          var j = rng.int(k + 1);
          var tmp = arr[k]; arr[k] = arr[j]; arr[j] = tmp;
        }
        return arr;
      }
    };
    return rng;
  }

  /** Wrap an rng and remember every die it handed out, in order. */
  function recording(inner) {
    var rolls = [];
    var rng = {
      kind: "recording",
      seed: inner.seed,
      rolls: rolls,
      calls: 0,
      next: function () { rng.calls += 1; return inner.next(); },
      rollDie: function (sides) {
        rng.calls += 1;
        var v = inner.rollDie(sides);
        rolls.push({ sides: sides, value: v });
        return v;
      },
      int: function (n) { rng.calls += 1; return inner.int(n); },
      pick: function (arr) { rng.calls += 1; return inner.pick(arr); },
      shuffle: function (arr) { rng.calls += 1; return inner.shuffle(arr); }
    };
    return rng;
  }

  /** What a rules module calls at the top of anything random. */
  function require_(opts, where) {
    if (!opts || !opts.rng || typeof opts.rng.rollDie !== "function") {
      throw new Error((where || "rules module") + ": opts.rng is required — this module never rolls its own dice");
    }
    return opts.rng;
  }

  var api = { seeded: seeded, tape: tape, recording: recording, require: require_, hashSeed: hashSeed };

  global.FW = global.FW || {};
  global.FW.rng = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
