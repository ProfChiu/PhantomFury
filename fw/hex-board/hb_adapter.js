/* hb_adapter.js — the bridge between a framework game and the hex board.
 *
 * Same shape as the card-table adapter. The game supplies two functions:
 *
 *   project(state, viewer) -> { counters: [{ uid, hex, cardId, name, side, markers, facing, dim }] }
 *   gestureOf(action, state) -> { uid, hex } | { hex } | { uid, target } | null
 *       { uid, hex }    select the counter, then click (or drag to) the hex   — move, fire at a hex
 *       { uid, target } select the counter, then click another counter        — fire at a unit, assault
 *       { hex }         click a hex with nothing selected                      — place, target a hex
 *       null            a button (end turn, rally all)
 *
 * Click-then-click is the primary path (the accessible one, and the one a
 * test drives); a drag from a counter to a hex is the same { uid, hex }
 * gesture. Selecting a counter lights every hex a legal action can take it
 * to and every counter it can act on. A click that matches no legal action
 * but matches a refusal shows the refusal's own words.
 *
 *   var ad = HexBoard.adapter.connect({ G, grid, view, seat, viewer, getState, setState, apply, opts,
 *                                       project, gestureOf, onApply, onRefuse, onSelect });
 *   ad.sync()  ad.select(uid)  ad.clickHex(id)  ad.clickCounter(uid)  ad.perform(action)
 *   ad.actionsFor(uid)  ad.looseActions()  ad.selected
 */
(function (global) {
  "use strict";

  var FWgame = global.FW && global.FW.game;

  function connect(cfg) {
    if (!cfg || !cfg.G || !cfg.grid || !cfg.getState) throw new Error("HexBoard.adapter.connect: G, grid, getState are required");
    var G = cfg.G, view = cfg.view;
    var viewer = cfg.viewer || cfg.seat || "you";
    var gestureOf = cfg.gestureOf || function () { return null; };
    var apply = cfg.apply || function (state, action, opts) { return FWgame.run(G, state, action, opts); };
    var ad = { selected: null, hexOf: {} };

    function legal() { return G.legalActions(cfg.getState()); }
    function withGesture(list) {
      var state = cfg.getState();
      return list.map(function (a) { return { action: a, g: gestureOf(a, state) }; }).filter(function (x) { return !!x.g; });
    }
    function findLegal(test) {
      var hits = withGesture(legal()).filter(function (x) { return test(x.g); });
      return hits.length ? hits[0].action : null;
    }
    /** A refusal may name hex "*" or target "*" to mean "any": a unit that has
     *  already moved is refused everywhere, and needs no per-hex list. */
    function widen(g) {
      return {
        uid: g.uid,
        hex: g.hex,
        target: g.target,
        anyHex: g.hex === "*",
        anyTarget: g.target === "*"
      };
    }
    function findRefusal(test) {
      var hits = withGesture(G.refusals(cfg.getState())).filter(function (x) {
        var w = widen(x.g);
        return test({
          uid: w.uid,
          hex: w.anyHex ? undefined : w.hex,
          target: w.anyTarget ? undefined : w.target,
          any: w.anyHex || w.anyTarget
        }) || (w.anyHex && test({ uid: w.uid, hex: "*", target: undefined })) ||
          (w.anyTarget && test({ uid: w.uid, hex: undefined, target: "*" }));
      });
      return hits.length ? { ok: false, why: hits[0].action.why || "Not legal right now.", cite: hits[0].action.cite || "" } : null;
    }
    function refuse(test, fallbackWhy) {
      var r = findRefusal(test) || { ok: false, why: fallbackWhy || cfg.defaultWhy || "Not legal right now." };
      if (cfg.onRefuse) cfg.onRefuse(r);
      return r;
    }

    ad.actionsFor = function (uid) {
      return withGesture(legal()).filter(function (x) { return x.g.uid === uid; }).map(function (x) { return x.action; });
    };
    ad.looseActions = function () {
      var state = cfg.getState();
      return legal().filter(function (a) { return !gestureOf(a, state); });
    };
    /** Hexes and counters the selected counter can act on — what lights up. */
    ad.targetsOf = function (uid) {
      var hexes = {}, counters = {};
      withGesture(legal()).forEach(function (x) {
        if (x.g.uid !== uid) return;
        if (x.g.hex) hexes[x.g.hex] = true;
        if (x.g.target) counters[x.g.target] = true;
      });
      return { hexes: Object.keys(hexes), counters: Object.keys(counters) };
    };

    ad.select = function (uid) {
      ad.selected = uid || null;
      paint();
      if (cfg.onSelect) cfg.onSelect(ad.selected);
    };

    ad.clickHex = function (hex) {
      if (ad.selected) {
        var sel = ad.selected;
        var a = findLegal(function (g) { return g.uid === sel && g.hex === hex; });
        if (a) { ad.selected = null; return ad.perform(a); }
        if (ad.hexOf[sel] === hex) { ad.select(null); return { ok: false, why: "deselected" }; }
        return refuse(function (g) { return g.uid === sel && (g.hex === hex || g.hex === "*"); });
      }
      var b = findLegal(function (g) { return !g.uid && g.hex === hex; });
      if (b) return ad.perform(b);
      return refuse(function (g) { return !g.uid && (g.hex === hex || g.hex === "*"); }, null);
    };

    ad.clickCounter = function (uid) {
      if (ad.selected && ad.selected !== uid) {
        var sel = ad.selected;
        var a = findLegal(function (g) { return g.uid === sel && g.target === uid; });
        if (a) { ad.selected = null; return ad.perform(a); }
        // a counter standing on a hex the selected one may move to counts as that hex
        var h = ad.hexOf[uid];
        var m = findLegal(function (g) { return g.uid === sel && g.hex === h; });
        if (m) { ad.selected = null; return ad.perform(m); }
        var r = findRefusal(function (g) { return g.uid === sel && (g.target === uid || g.target === "*" || g.hex === h || g.hex === "*"); });
        if (r) { if (cfg.onRefuse) cfg.onRefuse(r); return r; }
      }
      if (ad.selected === uid) { ad.select(null); return { ok: false, why: "deselected" }; }
      ad.select(uid);
      return { ok: false, why: "selected" };
    };

    ad.onIntent = function (intent) {
      if (intent.kind !== "move") return { ok: false, why: "unknown intent" };
      var a = findLegal(function (g) { return g.uid === intent.uid && g.hex === intent.hex; });
      if (a) { ad.selected = null; return ad.perform(a); }
      return refuse(function (g) { return g.uid === intent.uid && (g.hex === intent.hex || g.hex === "*"); });
    };

    ad.perform = function (action) {
      var result = apply(cfg.getState(), action, cfg.opts || {});
      if (cfg.setState) cfg.setState(result.state);
      ad.sync();
      if (cfg.onApply) cfg.onApply(result, action);
      return { ok: true, result: result };
    };

    function paint() {
      if (!view) return;
      var hl = cfg.highlights ? cfg.highlights(cfg.getState(), ad) : {};
      if (ad.selected) {
        var t = ad.targetsOf(ad.selected);
        hl.legal = (hl.legal || []).concat(t.hexes);
        hl.target = (hl.target || []).concat(t.counters.map(function (u) { return ad.hexOf[u]; }).filter(Boolean));
        hl.selected = [ad.selected];
      }
      view.setHighlights(hl);
    }

    ad.sync = function () {
      var p = cfg.project ? cfg.project(cfg.getState(), viewer) : { counters: [] };
      ad.hexOf = {};
      (p.counters || []).forEach(function (c) { ad.hexOf[c.uid] = c.hex; });
      if (ad.selected && !ad.hexOf[ad.selected]) ad.selected = null;
      if (view) view.setCounters(p.counters || []);
      paint();
    };

    return ad;
  }

  global.HexBoard = global.HexBoard || {};
  global.HexBoard.adapter = { connect: connect };
  if (typeof module !== "undefined" && module.exports) module.exports = global.HexBoard.adapter;
})(typeof window !== "undefined" ? window : globalThis);
