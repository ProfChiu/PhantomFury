/* fw_record.js — the resolution record.
 *
 * Every table lookup, die roll or comparison the rules make comes out as one
 * of these. The UI renders records; it never recomputes them. A player who
 * asks "why did that miss?" is shown the record, and a test that asserts a
 * worked example from the rulebook asserts the record.
 *
 * Shape:
 *   {
 *     context:     "Fire: Group A at Group C"     what was being resolved
 *     table:       "Fire Table"                   which table or rule
 *     inputs:      [{ label, value, rule }]       the numbers that went in
 *     drms:        [{ label, value, rule }]       modifiers applied to the die
 *     target:      5                              what had to be met/beaten
 *     die:         3                              raw roll (null if none)
 *     modifiedDie: 4                              after drms (null if none)
 *     result:      "miss"                         the outcome, in the rules' words
 *     ruleRef:     "[9.1]"                        citation
 *     detail:      {}                             anything else the game wants
 *   }
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  function make(spec) {
    spec = spec || {};
    var rec = {
      context: spec.context || "",
      table: spec.table || "",
      inputs: (spec.inputs || []).map(entry),
      drms: (spec.drms || []).map(entry),
      target: spec.target == null ? null : spec.target,
      die: spec.die == null ? null : spec.die,
      modifiedDie: spec.modifiedDie == null ? (spec.die == null ? null : spec.die + sum(spec.drms)) : spec.modifiedDie,
      result: spec.result == null ? "" : spec.result,
      ruleRef: spec.ruleRef || spec.cite || "",
      detail: spec.detail || {}
    };
    return rec;
  }

  function entry(e) {
    if (typeof e === "string") return { label: e, value: null, rule: "" };
    return { label: e.label || "", value: e.value == null ? null : e.value, rule: e.rule || e.cite || "" };
  }

  function sum(drms) {
    var t = 0;
    (drms || []).forEach(function (d) { if (typeof d.value === "number") t += d.value; });
    return t;
  }

  /**
   * Roll and record in one step:
   *   roll(rng, 6, { context, table, drms, target, ruleRef, resolve: function(modified, raw) -> result })
   */
  function roll(rng, sides, spec) {
    if (!rng || typeof rng.rollDie !== "function") throw new Error("record.roll: an rng is required");
    var raw = rng.rollDie(sides);
    var mod = raw + sum(spec.drms);
    var result = spec.resolve ? spec.resolve(mod, raw) : "";
    return make({
      context: spec.context, table: spec.table, inputs: spec.inputs, drms: spec.drms,
      target: spec.target, die: raw, modifiedDie: mod, result: result,
      ruleRef: spec.ruleRef || spec.cite, detail: spec.detail
    });
  }

  function isRecord(x) {
    return !!x && typeof x === "object" && Array.isArray(x.inputs) && Array.isArray(x.drms) &&
      "result" in x && "ruleRef" in x;
  }

  /** One readable line: "Fire Table — 3 +1 cover = 4 vs 5: miss [9.1]" */
  function format(rec) {
    var parts = [];
    if (rec.context) parts.push(rec.context);
    var mid = [];
    if (rec.table) mid.push(rec.table);
    var nums = [];
    if (rec.inputs.length) {
      nums.push(rec.inputs.map(function (i) {
        return i.label + (i.value == null ? "" : " " + i.value);
      }).join(", "));
    }
    if (rec.die != null) {
      var dice = "rolled " + rec.die;
      if (rec.drms.length) {
        dice += " " + rec.drms.map(function (d) {
          return (d.value >= 0 ? "+" : "") + d.value + " " + d.label;
        }).join(" ");
        dice += " = " + rec.modifiedDie;
      }
      nums.push(dice);
    }
    if (rec.target != null) nums.push("vs " + rec.target);
    if (mid.length || nums.length) parts.push(mid.concat([nums.join(", ")]).filter(Boolean).join(" — "));
    var line = parts.join(": ");
    if (rec.result !== "") line += ": " + rec.result;
    if (rec.ruleRef) line += " " + rec.ruleRef;
    return line;
  }

  var api = { make: make, roll: roll, format: format, isRecord: isRecord, sumDrms: sum };

  global.FW = global.FW || {};
  global.FW.record = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
