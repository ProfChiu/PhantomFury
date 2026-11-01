/* fw_game.js — the engine contract.
 *
 * Every game in the framework is one object with five functions. Everything
 * else — the table, the AI, the tutorial runner, the soak test, save/load —
 * is written once against these five and never against a particular game.
 *
 *   G.create(setup, opts)          -> state
 *   G.legalActions(state)          -> [ action ]      every action permitted right now
 *   G.refusals(state)              -> [ refusal ]     verbs on offer but not permitted, with why
 *   G.apply(state, action, opts)   -> { state?, records?, events? }
 *   G.isOver(state)                -> null | { winner, why, score? }
 *
 * An action is a plain object with a `type` and whatever parameters fully
 * specify it: { type: "fire", group: "A", target: "C", cards: [12, 15] }.
 * A compound UI decision (pick a card, then a target, then confirm) is ONE
 * action here; the UI assembles it, the engine never pauses mid-apply.
 *
 * Fields that are presentational — `label`, `cite`, `why`, `ui`, `score`,
 * `group_label` — do not take part in matching, so an engine can decorate its
 * legal actions freely. Everything else is identity.
 *
 * A refusal is { type, why, cite, ...params }: the same shape as an action
 * plus the reason. A param may be "*" to mean any value, so "this unit has
 * already moved" is one refusal rather than one per hex. The UI lists verbs from refusals as greyed rows so a verb
 * never disappears — it explains itself instead (Warhammer Quest v2.3a).
 *
 * Hard lock: FW.game.run() will not apply an action that legalActions did not
 * offer. It throws, naming the action, with the matching refusal's `why` if
 * there is one. The UI therefore cannot cheat, and neither can the AI.
 *
 * Rules: G has no DOM, no Math.random (dice come from opts.rng), and every
 * table lookup returns a record (FW.record). The contract does not enforce the
 * first two — a code review does — but the soak test will catch the effects.
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  var IGNORED = { label: 1, cite: 1, why: 1, ui: 1, score: 1, hint: 1 };

  /** A stable identity string for an action: sorted keys, ignoring decoration. */
  function key(action) {
    if (!action || typeof action !== "object") return String(action);
    var keys = Object.keys(action).filter(function (k) { return !IGNORED[k]; }).sort();
    var out = {};
    keys.forEach(function (k) { out[k] = action[k]; });
    return JSON.stringify(out);
  }

  function same(a, b) { return key(a) === key(b); }

  /** The legal action that matches, or null. */
  function find(legal, action) {
    var k = key(action);
    for (var i = 0; i < legal.length; i++) if (key(legal[i]) === k) return legal[i];
    return null;
  }

  /** The refusal that covers this action: every identity field equal, or "*"
   *  in the refusal meaning any value (a unit refused everywhere). */
  function findRefusal(refusals, action) {
    var exact = find(refusals, action);
    if (exact) return exact;
    for (var i = 0; i < refusals.length; i++) {
      var r = refusals[i], ok = true, k;
      for (k in r) {
        if (!r.hasOwnProperty(k) || IGNORED[k]) continue;
        if (r[k] === "*") continue;
        if (JSON.stringify(r[k]) !== JSON.stringify(action[k])) { ok = false; break; }
      }
      if (!ok) continue;
      for (k in action) {
        if (!action.hasOwnProperty(k) || IGNORED[k]) continue;
        if (!(k in r)) { ok = false; break; }
      }
      if (ok) return r;
    }
    return null;
  }

  function IllegalAction(message, action, why) {
    var e = new Error(message);
    e.name = "IllegalAction";
    e.action = action;
    e.why = why || null;
    return e;
  }

  /**
   * define(spec) checks that the five functions exist and fills the two that
   * may be omitted. Returns the same object, decorated, so a game file can do
   *   global.MyGame = FW.game.define({ name, create, legalActions, apply, ... })
   */
  function define(spec) {
    if (!spec || typeof spec !== "object") throw new Error("FW.game.define: spec object required");
    ["create", "legalActions", "apply"].forEach(function (fn) {
      if (typeof spec[fn] !== "function") throw new Error("FW.game.define: " + fn + "() is required");
    });
    if (typeof spec.refusals !== "function") spec.refusals = function () { return []; };
    if (typeof spec.isOver !== "function") spec.isOver = function () { return null; };
    if (typeof spec.describe !== "function") {
      spec.describe = function (action) { return action.label || action.type; };
    }
    spec.name = spec.name || "game";
    spec.__fw = true;
    return spec;
  }

  /**
   * Apply one action under the hard lock.
   *   run(G, state, action, opts) -> { ok: true, state, action, records, events }
   * Throws IllegalAction if the action was not offered. Throws whatever the
   * engine throws. Never returns ok:false — a refused action is a bug in the
   * caller, and hiding it as a result is how "the AI repeats itself forever"
   * happens.
   */
  function run(G, state, action, opts) {
    opts = opts || {};
    if (!G || !G.__fw) throw new Error("FW.game.run: G must come from FW.game.define()");
    var legal = G.legalActions(state);
    var matched = find(legal, action);
    if (!matched) {
      var refusal = findRefusal(G.refusals(state), action);
      var why = refusal ? refusal.why : null;
      throw IllegalAction(
        "Illegal action " + key(action) + (why ? " — " + why : "") +
        " (" + legal.length + " legal action" + (legal.length === 1 ? "" : "s") + " available)",
        action, why);
    }
    var res = G.apply(state, matched, opts) || {};
    var next = res.state || state;
    return {
      ok: true,
      state: next,
      action: matched,
      records: res.records || [],
      events: res.events || []
    };
  }

  /**
   * A session: state plus history, for a UI or a driver. Keeps `history` of
   * { action, records, events } and, if opts.undo is true, a JSON snapshot
   * before each step so `undo()` works without the engine knowing.
   */
  function session(G, setup, opts) {
    opts = opts || {};
    var s = {
      G: G,
      opts: opts,
      state: G.create(setup, opts),
      history: [],
      snapshots: [],
      legal: function () { return G.legalActions(s.state); },
      refusals: function () { return G.refusals(s.state); },
      over: function () { return G.isOver(s.state); },
      apply: function (action) {
        if (opts.undo) s.snapshots.push(JSON.stringify(s.state));
        var r = run(G, s.state, action, opts);
        s.state = r.state;
        s.history.push({ action: r.action, records: r.records, events: r.events });
        return r;
      },
      undo: function () {
        if (!opts.undo || !s.snapshots.length) return false;
        s.state = JSON.parse(s.snapshots.pop());
        s.history.pop();
        return true;
      },
      records: function () {
        var out = [];
        s.history.forEach(function (h) { out = out.concat(h.records); });
        return out;
      },
      /**
       * Let an opponent (anything with chooseAction(G, state, opts)) act
       * through THIS session, so history and undo snapshots include its
       * moves. Stops when the game ends, `until(state)` is true, or the AI
       * holds with no `fallback(state, legal)` to name a pass.
       * Returns { taken: [{action, score, why, records, events}], held, over }
       */
      drive: function (ai, o) {
        o = o || {};
        var max = o.maxActions || 60, taken = [];
        for (var n = 0; n < max; n++) {
          var over = G.isOver(s.state);
          if (over) return { taken: taken, held: false, over: over };
          if (o.until && o.until(s.state)) return { taken: taken, held: false, over: null };
          var choice = ai.chooseAction(G, s.state, opts);
          var action = choice ? choice.action : null;
          if (!action && o.fallback) action = o.fallback(s.state, G.legalActions(s.state));
          if (!action) return { taken: taken, held: true, over: null };
          var r = s.apply(action);
          var step = { action: r.action, score: choice ? choice.score : null, why: choice ? choice.why : "pass",
            records: r.records, events: r.events };
          taken.push(step);
          if (o.onAction) o.onAction(step, s.state);
        }
        throw new Error("session.drive: " + max + " actions without the turn ending — the AI or the game is stuck");
      }
    };
    return s;
  }

  var api = { define: define, key: key, same: same, find: find, findRefusal: findRefusal, run: run, session: session, IGNORED: IGNORED };

  global.FW = global.FW || {};
  global.FW.game = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
