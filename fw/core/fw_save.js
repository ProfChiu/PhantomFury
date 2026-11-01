/* fw_save.js — save slots and JSON export, engine-agnostic.
 *
 * State is plain data (the contract requires it), so saving is JSON. Slots
 * live in localStorage when there is one and in memory otherwise, which is
 * what a Node test or a private window gets. Every read and write is guarded:
 * a blocked or full store degrades to "nothing saved" rather than an exception
 * in the middle of a turn.
 *
 * Usage:
 *   var store = FW.save.create("upfront");           // namespace
 *   store.save(1, state, { label: "Turn 4" });        // slot 1..n
 *   store.load(1)      -> { state, meta } | null
 *   store.list()       -> [{ slot, meta }]
 *   store.remove(1)
 *   store.exportJSON(state)  -> string     store.importJSON(text) -> state
 *
 * Plain script: <script src> in the browser, require() in Node.
 */
(function (global) {
  "use strict";

  function memoryStore() {
    var m = {};
    return {
      getItem: function (k) { return m.hasOwnProperty(k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; },
      keys: function () { return Object.keys(m); }
    };
  }

  function browserStore() {
    try {
      var ls = global.localStorage;
      if (!ls) return null;
      var probe = "__fw_probe__";
      ls.setItem(probe, "1"); ls.removeItem(probe);
      return {
        getItem: function (k) { try { return ls.getItem(k); } catch (e) { return null; } },
        setItem: function (k, v) { try { ls.setItem(k, v); return true; } catch (e) { return false; } },
        removeItem: function (k) { try { ls.removeItem(k); } catch (e) { /* ignore */ } },
        keys: function () {
          var out = [];
          try { for (var i = 0; i < ls.length; i++) out.push(ls.key(i)); } catch (e) { /* ignore */ }
          return out;
        }
      };
    } catch (e) { return null; }
  }

  function create(namespace, backing) {
    var store = backing || browserStore() || memoryStore();
    var prefix = "fw:" + (namespace || "game") + ":slot:";

    function save(slot, state, meta) {
      var payload = {
        v: 1, savedAt: new Date().toISOString(),
        meta: meta || {}, state: state
      };
      try { return store.setItem(prefix + slot, JSON.stringify(payload)) !== false; }
      catch (e) { return false; }
    }
    function load(slot) {
      var raw = store.getItem(prefix + slot);
      if (!raw) return null;
      try {
        var p = JSON.parse(raw);
        return { state: p.state, meta: p.meta || {}, savedAt: p.savedAt };
      } catch (e) { return null; }
    }
    function remove(slot) { store.removeItem(prefix + slot); }
    function list() {
      return store.keys().filter(function (k) { return k.indexOf(prefix) === 0; })
        .map(function (k) {
          var slot = k.slice(prefix.length);
          var p = null;
          try { p = JSON.parse(store.getItem(k)); } catch (e) { /* skip */ }
          return { slot: isNaN(+slot) ? slot : +slot, meta: (p && p.meta) || {}, savedAt: p && p.savedAt };
        })
        .sort(function (a, b) { return String(a.slot).localeCompare(String(b.slot), undefined, { numeric: true }); });
    }
    function exportJSON(state, meta) {
      return JSON.stringify({ v: 1, savedAt: new Date().toISOString(), meta: meta || {}, state: state }, null, 2);
    }
    function importJSON(text) {
      var p = JSON.parse(text);
      if (!p || typeof p !== "object" || !("state" in p)) throw new Error("not a framework save file");
      return p.state;
    }
    return { save: save, load: load, remove: remove, list: list, exportJSON: exportJSON, importJSON: importJSON };
  }

  var api = { create: create, memoryStore: memoryStore };

  global.FW = global.FW || {};
  global.FW.save = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
