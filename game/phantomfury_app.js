/* phantomfury_app.js — the page. The ONLY file that touches the DOM.
 *
 * Phantom Fury's board is an area graph, not a hex grid, so the page is
 * project-local: the real board scan (assets/PhF_Board.jpeg) with Zone
 * tiles, Location dots and Street chips laid over it at the VASSAL
 * coordinates in data/phantomfury_board.js. The kit's contract still holds:
 *   project(state)          engine state -> what the board shows
 *   gestureOf(action,state) which click means which action
 *   resolve(uid)            a counter's face
 * plus the chrome: prompt, log, buttons, tutorial panel, end screen.
 * No rule logic here — the page asks legalActions / refusals / isOver.
 * The controller below is DOM-free, so tools/test_phantomfury.js drives
 * the very clicks the page makes.
 */
(function (global) {
  "use strict";

  var FW = global.FW, G = global.PhantomFury, AI = global.PhantomFuryAI,
      TUT = global.PhantomFuryTutorial, B = global.PhantomFuryBoard,
      PRIMER = global.PhantomFuryPrimer || null,
      TRACKS = global.PhantomFuryTracks || null, INFO = global.PhantomFuryCounterInfo || {};
  // The board image is the owner's crop of the original scan; every
  // coordinate in the data stays in original-scan pixels, and these two
  // helpers are the only place the crop is applied. The map world keeps
  // a 1300-wide coordinate system at the image's own aspect ratio.
  var CROP = (B.meta && B.meta.imageCrop) || { x: 0, y: 0, w: B.meta.boardSize[0], h: B.meta.boardSize[1] };
  var WORLD_W = 1300, WORLD_H = WORLD_W * CROP.h / CROP.w;
  function mx(x) { return ((x - CROP.x) / CROP.w * 100).toFixed(3) + "%"; }
  function my(y) { return ((y - CROP.y) / CROP.h * 100).toFixed(3) + "%"; }
  var PHASE_NAMES = { setup: "Setup", support: "Support Phase", reinforce: "Reinforcements Phase",
    fire: "Fire Combat Phase", movement: "Movement Phase", assault: "Assault Phase", done: "Game over" };

  // ------------------------------------------------------------- projection
  function project(state) {
    var units = [];
    Object.keys(state.units).forEach(function (k) {
      var u = state.units[k];
      var markers = [];
      if (u.fired) markers.push("fired");
      if (u.pinned) markers.push("pinned");
      if (u.reduced) markers.push("reduced");
      if (u.hero) markers.push(u.hero === 2 ? "hero (Medal of Honor)" : "hero (Silver Star)");
      if (u.security) markers.push("security element detached");
      var pool = null;
      if (!u.pos) {
        if (u.kind === "squad" && state.setupQueue.indexOf(u.uid) >= 0) pool = "setup";
        else if (u.kind === "squad" && state.company.indexOf(u.uid) >= 0) pool = "company";
        else if (u.kind === "squad" && state.battalion.indexOf(u.uid) >= 0) pool = "battalion";
        else if (u.kind === "iif" && state.iifPool.indexOf(u.uid) >= 0) pool = "iif";
        else if (u.kind === "caat" && !u.attachedTo && u.alive) pool = "caat";
        else if (u.kind === "abrams" && u.alive) pool = "abrams";
      }
      if (!u.alive && !pool) return;
      units.push({ uid: u.uid, kind: u.kind, name: G.unitName(state, u), cf: u.cf == null ? null : G.effCF(u),
        pcf: u.cf == null ? null : u.cf, sym: u.sym || null, marker: u.marker == null ? null : u.marker,
        pos: u.pos || null, pool: pool, markers: markers, caat: u.caat || null, attachedTo: u.attachedTo || null,
        ammo: u.ammo, explosives: u.explosives });
    });
    var zones = B.zones.map(function (z) {
      var zs = state.zones[z.id];
      return { id: z.id, centre: z.centre, circle: z.circle, control: zs.control,
        activated: zs.activated, fortified: zs.fortified, ruins: zs.ruins, fanaticism: zs.fanaticism };
    });
    return { units: units, zones: zones };
  }

  var FRIENDLY = { squad: true, iif: true, caat: true, abrams: true };   // the player's side
  function gestureOf(action) {
    if (action.type === "moveStep") return { uid: action.uid, to: action.to };
    if (action.type === "fire" || action.type === "assault") return { uid: action.uid, target: action.target };
    if (action.type === "setupPlace" || action.type === "place") return { uid: action.uid, zone: action.zone };
    if (action.type === "placeAbrams") return { street: action.street };
    return null;                                     // a button, not a click on the board
  }

  // ------------------------------------------------------- state changes
  // The right panel answers "what just happened?" from the states either
  // side of an action, not from a second telling of the rules. summarizeState
  // keeps only what a player can see; compareSummaries turns the difference
  // into lines, and marks the pieces and Zones that changed so the board can
  // flash them. Both are DOM-free and unit-tested.
  function actionActor(action) {
    if (!action) return null;
    if (action.type === "setupCaat") return action.caat || null;
    if (action.type === "placeAbrams") return "abrams";
    return action.uid || null;
  }
  function posLabel(u) {
    if (u.attachedTo) return "Attached to " + u.attachedTo;
    if (u.pool) return { setup: "Setup draw", company: "Company reserve", battalion: "Battalion reserve",
      iif: "IIF reserve", caat: "CAAT support", abrams: "Awaiting placement" }[u.pool] || "Reserve";
    if (!u.pos) return "Off the board";
    if (u.pos.street != null) return "Street Section " + u.pos.street;
    return "Zone " + u.pos.zone + " · Location " + u.pos.loc;
  }
  function posKey(u) {
    if (u.pool) return "pool:" + u.pool;
    if (!u.pos) return "off";
    return u.pos.street != null ? "street:" + u.pos.street : "zone:" + u.pos.zone + ":" + u.pos.loc;
  }
  function summarizeState(state) {
    var proj = project(state), units = {}, zones = {};
    proj.units.forEach(function (u) {
      units[u.uid] = { uid: u.uid, kind: u.kind, name: u.name, cf: u.cf, posKey: posKey(u),
        posLabel: posLabel(u), markers: u.markers.slice(), ammo: u.ammo,
        explosives: u.explosives, caat: u.caat, attachedTo: u.attachedTo };
    });
    proj.zones.forEach(function (z) {
      zones[z.id] = { control: z.control, activated: z.activated, fortified: z.fortified,
        ruins: z.ruins, fanaticism: z.fanaticism };
    });
    return { turn: state.turn, phase: state.phase, vp: state.vp,
      support: { dragonEye: state.support.dragonEye, cobra: state.support.cobra, hornet: state.support.hornet },
      units: units, zones: zones };
  }
  function compareSummaries(before, after, result) {
    var lines = [], units = {}, zones = {}, phaseChanged = false;
    if (!before || !after) return { lines: lines, units: units, zones: zones, phaseChanged: phaseChanged };
    result = result || {};
    if (before.turn !== after.turn) lines.push("Turn " + before.turn + " ended — Turn " + after.turn + " began.");
    if (before.phase !== after.phase) {
      phaseChanged = true;
      lines.push((PHASE_NAMES[before.phase] || before.phase) + " → " + (PHASE_NAMES[after.phase] || after.phase) + ".");
    }
    if (before.vp !== after.vp) {
      var dv = after.vp - before.vp;
      lines.push("VP " + (dv > 0 ? "+" : "") + dv + " — now " + after.vp + ".");
    }
    [["dragonEye", "Dragon Eye"], ["cobra", "Super Cobra"], ["hornet", "Hornet"]].forEach(function (pair) {
      if (before.support[pair[0]] !== after.support[pair[0]]) {
        var max = B.counters.support[pair[0] === "cobra" ? "superCobra" : pair[0]].max;
        lines.push(pair[1] + " support used — " + (max - after.support[pair[0]]) + " remaining.");
      }
    });
    Object.keys(after.zones).forEach(function (id) {
      var b = before.zones[id], a = after.zones[id];
      if (!b) return;
      if (b.control !== a.control) {
        zones[id] = true;
        lines.push("Zone " + id + " is now " + (a.control === "usmc" ? "USMC-controlled" : "Insurgent-controlled") + ".");
      }
      if (!b.activated && a.activated) { zones[id] = true; lines.push("Zone " + id + " Activated."); }
      if (!b.fortified && a.fortified) { zones[id] = true; lines.push("Zone " + id + " is Fortified."); }
      if (!b.ruins && a.ruins) { zones[id] = true; lines.push("Zone " + id + " became Ruins."); }
      if (!b.fanaticism && a.fanaticism) { zones[id] = true; lines.push("Fanaticism took hold in Zone " + id + "."); }
      if (b.fanaticism && !a.fanaticism) { zones[id] = true; lines.push("Fanaticism ended in Zone " + id + "."); }
    });
    var uids = {};
    Object.keys(before.units).forEach(function (k) { uids[k] = true; });
    Object.keys(after.units).forEach(function (k) { uids[k] = true; });
    Object.keys(uids).forEach(function (uid) {
      var b = before.units[uid], a = after.units[uid];
      if (!b && a) { units[uid] = true; lines.push(a.name + " entered play at " + a.posLabel + "."); return; }
      if (b && !a) { units[uid] = true; lines.push(b.name + " was eliminated or removed from play."); return; }
      if (b.posKey !== a.posKey) { units[uid] = true; lines.push(a.name + " moved: " + b.posLabel + " → " + a.posLabel + "."); }
      if (b.cf !== a.cf && a.cf != null && b.cf != null) {
        units[uid] = true;
        lines.push(a.name + " CF " + b.cf + " → " + a.cf + (a.markers.indexOf("reduced") >= 0 ? " (reduced)" : "") + ".");
      }
      a.markers.forEach(function (m) {
        if (b.markers.indexOf(m) < 0) { units[uid] = true; lines.push(a.name + " — " + m + "."); }
      });
      b.markers.forEach(function (m) {
        if (a.markers.indexOf(m) < 0) { units[uid] = true; lines.push(a.name + " — " + m + " cleared."); }
      });
      if (b.ammo !== a.ammo && a.ammo != null) { units[uid] = true; lines.push(a.name + " Ammo " + b.ammo + " → " + a.ammo + "."); }
      if (b.explosives !== a.explosives && a.explosives != null) { units[uid] = true; lines.push(a.name + " Explosives used."); }
      if (b.caat !== a.caat && a.caat) { units[uid] = true; lines.push("A CAAT was attached to " + a.name + "."); }
    });
    (result.events || []).forEach(function (e) { lines.push(e); });
    (result.records || []).forEach(function (r) { lines.push(FW.record.format(r)); });
    return { lines: lines, units: units, zones: zones, phaseChanged: phaseChanged };
  }
  function describeChanges(before, after, result) {
    return compareSummaries(before, after, result).lines;
  }

  var FACE_COLORS = { squad: "#2a5bd7", iif: "#3d9970", caat: "#b8860b", abrams: "#666",
    guerillas: "#a03d2a", martyrs: "#7b1f1f", suspect: "#c9a227" };
  var FACE_SHORT = { squad: "Sq", iif: "IIF", caat: "CAAT", abrams: "M1", guerillas: "GUE", martyrs: "MAR", suspect: "?" };
  function resolve(uid, kind) {
    kind = kind || (uid || "").replace(/[0-9]/g, "") || "squad";
    if (kind === "sus") kind = "suspect";
    if (kind === "ins") kind = "guerillas";
    var fill = FACE_COLORS[kind] || "#555";
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'>" +
      "<rect width='60' height='60' rx='8' fill='" + fill + "'/>" +
      "<text x='30' y='38' font-family='sans-serif' font-size='17' font-weight='bold' fill='#fff' text-anchor='middle'>" +
      (FACE_SHORT[kind] || "?") + "</text></svg>";
    // %27 too: the face goes into single-quoted src='' attributes, and an
    // unescaped ' cut the URL short (a broken image on the board)
    return { name: kind, image: "data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/'/g, "%27") };
  }

  // The real counter faces from the VASSAL module (assets/counters/, see
  // its manifest.json). A reduced squad shows the back of the next-higher
  // counter — "Marine 6 Reduced" is the CF 6 counter flipped, printed CF 5 —
  // so the file follows the counter, not the current CF. Where the module
  // has no art (Guerillas CF 4, the square ID symbol, the Suspect 2R1
  // marker) the drawn face above stands in.
  var ART_DIR = "../assets/counters/";
  var SUSPECT_ART = ["21r", null, "12r", "1r2", "r21", "r12"];   // by marker (perm) index
  var SYM_ART = { triangle: 1, circle: 1, diamond: 1 };
  function faceFor(u) {
    var file = null;
    if (u.kind === "squad") {
      file = u.markers.indexOf("reduced") >= 0
        ? (u.pcf + 1 <= 6 ? "marine-" + (u.pcf + 1) + "-reduced.png" : null)
        : "marine-" + u.pcf + ".png";
    } else if (u.kind === "iif") file = "iif-" + u.pcf + ".png";
    else if (u.kind === "caat") file = "caat.png";
    else if (u.kind === "abrams") file = "abrams.png";
    else if (u.kind === "guerillas") file = (u.pcf <= 3 && SYM_ART[u.sym]) ? "guerillas-" + u.pcf + "-" + u.sym + ".png" : null;
    else if (u.kind === "martyrs") file = SYM_ART[u.sym] ? "martyrs-" + u.pcf + "-" + u.sym + ".png" : null;
    else if (u.kind === "suspect") { var s = SUSPECT_ART[u.marker]; file = s ? "suspect-" + s + ".png" : null; }
    if (file) return { name: u.kind, image: ART_DIR + file, art: file };
    var f = resolve(u.uid, u.kind); f.art = null; return f;
  }

  // -------------------------------------------------------------- controller
  // DOM-free: the page wires real clicks to these; the test drives them too.
  function createController(app) {
    // mission: an air-support marker taken from the tray ("dragonEye",
    // "cobra", "hornet"); cobraZone: the Zone a Super Cobra is over while
    // the player chooses its targets in the In hand slot.
    var ctl = { selected: null, zonePick: null, mission: null, cobraZone: null };

    function legal() { return G.legalActions(app.session.state); }
    function refuse(why) { if (app.onRefuse) app.onRefuse(why); return { ok: false, why: why }; }
    function doAction(a) {
      var r = app.perform(a);
      if (r && r.ok !== false) ctl.selected = null, ctl.zonePick = null, ctl.mission = null, ctl.cobraZone = null;
      return r;
    }
    ctl.targetsOf = function (uid) {
      return legal().filter(function (a) { return gestureOf(a) && a.uid === uid; });
    };
    ctl.looseActions = function () {
      return legal().filter(function (a) { return !gestureOf(a); });
    };
    // Every action belonging to one playable piece: its board gestures, its
    // button actions, and (for a CAAT) the attachments it can make. The
    // floating decision panel is built from this, so it cannot drift from
    // the moves the board itself offers.
    ctl.actionsOf = function (uid) {
      return legal().filter(function (a) {
        return a.uid === uid || a.caat === uid || (uid === "abrams" && a.type === "placeAbrams");
      });
    };
    // take an air-support marker from the tray (again: put it back)
    ctl.pickMission = function (m) {
      ctl.mission = ctl.mission === m ? null : m;
      ctl.selected = null; ctl.zonePick = null; ctl.cobraZone = null;
      if (app.onSelect) app.onSelect(null);
      return { ok: true, mission: ctl.mission };
    };
    ctl.missionOptions = function (m, zone) {
      return legal().filter(function (a) { return a.type === "mission" && a.mission === m && (zone == null || a.zone === zone); });
    };
    ctl.clickUnit = function (uid) {
      var st = app.session.state, sel = ctl.selected;
      if (ctl.mission === "cobra") {
        // a click on an enemy in a Cobra-able Zone picks that Zone
        var u0 = st.units[uid];
        if (u0 && u0.pos && u0.pos.zone != null && ctl.missionOptions("cobra", u0.pos.zone).length) return ctl.clickZone(u0.pos.zone);
      }
      if (ctl.mission === "hornet") {
        var u1 = st.units[uid];
        if (u1 && u1.pos && u1.pos.zone != null) return ctl.clickZone(u1.pos.zone);
      }
      if (sel && sel !== uid) {
        var atk = legal().filter(function (a) {
          return (a.type === "fire" || a.type === "assault") && a.uid === sel && a.target === uid;
        })[0];
        if (atk) return doAction(atk);
        var attach = legal().filter(function (a) { return a.type === "setupCaat" && a.caat === sel && a.uid === uid; })[0];
        if (attach) return doAction(attach);
      }
      ctl.selected = ctl.selected === uid ? null : uid;
      ctl.zonePick = null;
      if (app.onSelect) app.onSelect(ctl.selected);
      return { ok: true, selected: ctl.selected };
    };
    ctl.clickLoc = function (zone, loc) {
      var sel = ctl.selected;
      if (!sel) return refuse("Select a unit first — click one of your squads.");
      var a = legal().filter(function (x) {
        return x.type === "moveStep" && x.uid === sel && x.to.zone === zone && x.to.loc === loc;
      })[0];
      if (a) return doAction(a);
      var pl = legal().filter(function (x) {
        return (x.type === "setupPlace" || x.type === "place") && x.uid === sel && x.zone === zone;
      })[0];
      if (pl) return doAction(pl);
      var r = G.refusals(app.session.state).filter(function (x) { return x.type === "moveStep" && x.uid === sel; })[0];
      return refuse(r ? r.why : G.unitName(app.session.state, app.session.state.units[sel]) + " cannot go to Zone " + zone + " Location " + loc + " from here.");
    };
    ctl.clickStreet = function (street) {
      var sel = ctl.selected;
      var a = sel && legal().filter(function (x) {
        return x.type === "moveStep" && x.uid === sel && x.to.street === street;
      })[0];
      if (a) return doAction(a);
      var pa = legal().filter(function (x) { return x.type === "placeAbrams" && x.street === street; })[0];
      if (pa) return doAction(pa);
      return refuse("No unit can enter Street Section " + street + " now.");
    };
    ctl.clickZone = function (zone) {
      var sel = ctl.selected, st = app.session.state;
      if (sel) {
        var pl = legal().filter(function (x) {
          return (x.type === "setupPlace" || x.type === "place") && x.uid === sel && x.zone === zone;
        })[0];
        if (pl) return doAction(pl);
      }
      if (st.phase === "support" && ctl.mission === "hornet") {
        var h = ctl.missionOptions("hornet", zone)[0];
        if (h) return doAction(h);
        return refuse("The Hornet cannot strike Zone " + zone + ": it must be Insurgent-Controlled (not 26), clear of Marines, and neither Adjacent nor Neighbouring to a Marine-occupied Zone [9.3].");
      }
      if (st.phase === "support" && ctl.mission === "cobra") {
        var opts = ctl.missionOptions("cobra", zone);
        if (!opts.length) return refuse("The Super Cobra cannot strike Zone " + zone + ": it must be Insurgent-Controlled (not 26), clear of Marines, with Insurgents or Suspects in it [9.3].");
        if (opts.length === 1) return doAction(opts[0]);
        ctl.cobraZone = zone;                          // choose its targets in the In hand slot
        if (app.onSelect) app.onSelect(null);
        return { ok: true, cobraZone: zone };
      }
      if (st.phase === "support") {
        // Dragon Eye by two clicks: a Zone, then an Adjacent/Neighbouring one.
        if (ctl.zonePick == null) {
          var single = legal().filter(function (x) { return x.type === "mission" && x.mission === "dragonEye" && x.zone === zone && !x.zone2; })[0];
          if (single) { ctl.zonePick = zone; if (app.onSelect) app.onSelect(null); return { ok: true, picked: zone }; }
        } else if (ctl.zonePick === zone) {
          var s2 = legal().filter(function (x) { return x.type === "mission" && x.mission === "dragonEye" && x.zone === zone && !x.zone2; })[0];
          ctl.zonePick = null;
          if (s2) return doAction(s2);
        } else {
          var pair = legal().filter(function (x) {
            return x.type === "mission" && x.mission === "dragonEye" &&
              ((x.zone === ctl.zonePick && x.zone2 === zone) || (x.zone === zone && x.zone2 === ctl.zonePick));
          })[0];
          var pick = ctl.zonePick; ctl.zonePick = null;
          if (pair) return doAction(pair);
          return refuse("Zone " + zone + " is not Adjacent or Neighbouring to Zone " + pick + ".");
        }
      }
      return { ok: true, focus: zone };
    };
    ctl.performAction = function (a) { return doAction(a); };
    return ctl;
  }

  // -------------------------------------------------------------------- app
  var app = { session: null, tutorial: null, controller: null,
    store: FW.save.create("phantomfury"), gestureOf: gestureOf, project: project, resolve: resolve,
    faceFor: faceFor, createController: createController, PHASE_NAMES: PHASE_NAMES,
    boardView: { level: 0, zoom: 1, x: 0, y: 0 }, decisionOpen: false, decisionActor: null, decisionKey: null, decisionSeenKey: null,
    changeEntries: [], lastChanges: null, lastChangeAt: 0,
    changeStamp: null, changesSeen: null,
    highlights: { units: [], locs: [], streets: [], zones: [] } };
  app.controller = createController(app);
  var els = {};
  function $(id) { return document.getElementById(id); }

  function motionSnapshot() {
    if (typeof document === "undefined" || !FW.motion) return null;
    FW.motion.configure({ root: ".fw-stage", layer: "#fx", select: ".pf-unit", key: "uid" });
    return FW.motion.snapshot();
  }
  app.perform = function (action) {
    var before = summarizeState(app.session.state), was = motionSnapshot();
    var shot = shotFrom(action), turnWas = app.session.state.turn;
    hideReport();
    if (app.coachEvent) { app.coachEvent = null; renderCoach(); }   // the player has moved on
    var r;
    if (app.tutorial) {
      if (app.outcome) return { ok: false, why: "See what happened first, then press Next." };
      var asked = app.tutorial.current(), pieces = piecesNow();
      r = lessonMove(action);
      if (!r.ok) { app.lessonTries += 1; return r; }
      r.byPlayer = action;
      noteOutcome(asked, action, before, pieces, r);
    } else {
      r = app.session.apply(action);
    }
    r.beforeSummary = before; r.motionWas = was; r.shot = shot; r.action = action; r.turnWas = turnWas;
    afterAction(r);
    return { ok: true, records: r.records, events: r.events };
  };
  app.onRefuse = function (why) { say(why, "bad"); if (app.tutorial && DIR()) DIR().refused(why); };
  app.onSelect = function () { refresh(); };

  function boot() {
    // Text starts half again as large as the kit's base (a player's UI
    // pass: the game should stay readable on a smaller screen). The steps
    // are this page's own, under this page's own storage key, so the new
    // base is what a first visit gets; the slider in the menu bar still
    // moves through every step.
    FW.type.configure({ key: "phantomfury.type", steps: [
      { v: 1.2, name: "Small" }, { v: 1.35, name: "Medium" },
      { v: 1.5, name: "Large" }, { v: 1.7, name: "Larger" }, { v: 1.9, name: "Largest" }] });
    FW.type.apply();
    ["log", "status", "prompt", "why", "end", "board", "pools"].forEach(function (k) { els[k] = $(k); });
    app.boardView = boardHome();
    $("btn-new").addEventListener("click", function () { newMatch(); showReady(); });
    $("btn-undo").addEventListener("click", undo);
    $("btn-save").addEventListener("click", saveGame);
    $("btn-load").addEventListener("click", loadGame);
    $("btn-tutorial").addEventListener("click", openChapters);
    $("btn-continue").addEventListener("click", tutorialAdvance);
    $("btn-end-new").addEventListener("click", function () { hideEnd(); newMatch(); showReady(); });
    $("btn-auto").addEventListener("click", autoSetup);
    $("btn-decision-save").addEventListener("click", saveGame);
    $("btn-decision-load").addEventListener("click", loadGame);
    $("btn-decision-end").addEventListener("click", function () {
      var end = G.legalActions(app.session.state).filter(function (a) { return a.type === "endPhase"; })[0];
      if (end) app.perform(end);
    });
    document.querySelectorAll("#zoom-seg [data-zoom]").forEach(function (b) {
      b.addEventListener("click", function () { zoomTo(+b.dataset.zoom); });
    });
    els.board.addEventListener("wheel", onBoardWheel, { passive: false });
    // The board clips, but a browser still scrolls a clipped box to bring
    // a focused or clicked piece into view; the camera is the only pan.
    els.board.addEventListener("scroll", function () { els.board.scrollLeft = 0; els.board.scrollTop = 0; });
    els.board.addEventListener("dblclick", function (ev) {
      if (!app.tutorial && ev.target.classList && ev.target.classList.contains("pf-map")) zoomStep(1, ev.clientX, ev.clientY);
    });
    window.addEventListener("resize", function () {
      // after the stage has re-fitted: the levels depend on its scale,
      // and City on its width
      setTimeout(function () {
        if (!app.boardView.level && !app.boardView.free) app.boardView = boardHome();
        applyBoardView();
        if (app.tutorial && DIR()) DIR().layout();
      }, 0);
    });
    els.board.addEventListener("pointerdown", onBoardPointerDown);
    els.board.addEventListener("pointermove", onBoardPointerMove);
    // A drag ends wherever the button comes up — over the menu strip or
    // the dock too, or the next mouse move would keep panning the map.
    document.addEventListener("pointerup", onBoardPointerUp);
    document.addEventListener("pointercancel", onBoardPointerUp);
    els.board.addEventListener("dragstart", function (ev) { ev.preventDefault(); });
    els.board.addEventListener("click", function (ev) {
      // A drag that ended over a counter must not also click it.
      if (boardClickGuard) { boardClickGuard = false; ev.stopPropagation(); ev.preventDefault(); }
    }, true);
    wirePopups();
    wirePopupDrags();
    wirePeek();
    wireHand();
    wireCoach();
    $("report-ok").addEventListener("click", hideReport);
    document.addEventListener("keydown", function (ev) {
      var tag = ev.target && ev.target.tagName;
      if (app.tutorial) return;                      // the lesson owns the camera and its own keys
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        if (/^[1-4]$/.test(ev.key)) { zoomTo(+ev.key - 1); return; }
        if (ev.key === "+" || ev.key === "=") { zoomStep(1); return; }
        if (ev.key === "-" || ev.key === "_") { zoomStep(-1); return; }
      }
      if (ev.key !== "Escape") return;
      if (!$("ready").hidden) { hideReady(); return; }
      if (anyPopupOpen()) { closePopups(); return; }
      app.controller.selected = null; app.controller.zonePick = null;
      app.controller.mission = null; app.controller.cobraZone = null; refresh();
    });
    var taste = document.getElementById("taste");
    if (taste) taste.appendChild(FW.type.control());
    var m = /[?&]seed=([^&]+)/.exec(location.search);
    newMatch(m ? decodeURIComponent(m[1]) : null);
    wireNewcomer();
  }

  // ------------------------------------------------------------ popups
  // The panels live in popup windows: one large button per
  // window in the dock, one window open at a time over a dimmed table,
  // a big round close button (or the scrim, or Escape) to dismiss. The
  // widgets inside keep their ids, so every renderer works as before.
  function anyPopupOpen() {
    return !!document.querySelector(".popup:not([hidden])");
  }
  function openPopup(id) {
    document.querySelectorAll(".popup").forEach(function (p) { p.hidden = p.id !== id; });
    $("popup-scrim").hidden = false;
    document.querySelectorAll(".dock-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.popup === id);
    });
    if (id === "popup-changes") {
      app.changesSeen = app.changeStamp || null;
      $("dock-changes-badge").hidden = true;
    }
    app.decisionOpen = id === "decision-panel";
    renderDecisionPanel();
  }
  function closePopups() {
    document.querySelectorAll(".popup").forEach(function (p) { p.hidden = true; });
    var scrim = $("popup-scrim"); if (scrim) scrim.hidden = true;
    document.querySelectorAll(".dock-btn").forEach(function (b) { b.classList.remove("active"); });
    if (app.decisionOpen) { app.decisionOpen = false; renderDecisionPanel(); }
  }
  app.openPopup = openPopup; app.closePopups = closePopups;
  function wirePopups() {
    document.querySelectorAll(".dock-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = $(b.dataset.popup);
        if (p && !p.hidden) closePopups(); else openPopup(b.dataset.popup);
      });
    });
    document.querySelectorAll(".popup-close").forEach(function (b) {
      b.addEventListener("click", closePopups);
    });
    $("popup-scrim").addEventListener("click", closePopups);
  }
  // Every popup drags by its head: grab the banner (not the close
  // button), and the window follows, clamped inside the framed game area. Positions are left inline, so a
  // window stays where the player put it when it reopens.
  function wirePopupDrags() {
    document.querySelectorAll(".popup").forEach(function (panel) {
      var head = panel.querySelector(".popup-head");
      if (!head) return;
      var drag = null;
      head.addEventListener("pointerdown", function (ev) {
        if (ev.target.closest("button")) return;
        var r = panel.getBoundingClientRect(), stage = document.querySelector(".fw-stage");
        var k = stage ? parseFloat(stage.dataset.scale || "1") : 1;
        var sr = stage.getBoundingClientRect();
        drag = { x: ev.clientX, y: ev.clientY, k: k,
          left: (r.left - sr.left) / k, top: (r.top - sr.top) / k };
        panel.style.left = drag.left + "px"; panel.style.top = drag.top + "px";
      });
      document.addEventListener("pointermove", function (ev) {
        if (!drag) return;
        var maxL = 1920 - 96 - panel.offsetWidth, maxT = 1080 - 54 - Math.min(panel.offsetHeight, 300);
        panel.style.left = Math.max(96, Math.min(maxL, drag.left + (ev.clientX - drag.x) / drag.k)) + "px";
        panel.style.top = Math.max(54, Math.min(maxT, drag.top + (ev.clientY - drag.y) / drag.k)) + "px";
      });
      document.addEventListener("pointerup", function () { drag = null; });
    });
  }
  // The lesson keeps the player on one move at a time: of all the moves
  // that would satisfy the beat, only the first piece's are offered (on
  // the board) or the one button (a phase end, a Dragon Eye flight).
  function lessonFocus() {
    if (!lessonWaits()) return [];
    var ms = app.tutorial.matches();
    var onBoard = ms.filter(function (a) { return gestureOf(a); });
    var b = app.tutorial.current();
    if (b.accept) {
      // a puzzle: every choice is on the board, the answers first (a CAAT
      // attachment is no board gesture, but it is clicked on the map too)
      var s = app.tutorial.state;
      return ms.slice().sort(function (x, y) { return (b.accept(s, y) === true) - (b.accept(s, x) === true); });
    }
    // A first step is a quiet one: not a Street (snipers) and not a
    // Courtyard or Open Ground (Defensive Fire), whose dice can stop the
    // squad dead [12.5.1, 12.7] before the lesson has taught them.
    var quiet = onBoard.filter(function (a) {
      if (a.type !== "moveStep") return true;
      if (a.to.street != null) return false;
      var l = B.zones[a.to.zone - 1].locations.filter(function (x) { return x.id === a.to.loc; })[0];
      return l && l.type !== "C" && l.type !== "OG";
    });
    if (quiet.length) onBoard = quiet;
    if (onBoard.length) {
      var who = actionActor(onBoard[0]);
      return onBoard.filter(function (a) { return actionActor(a) === who; });
    }
    var pair = ms.filter(function (a) { return a.type === "mission" && a.mission === "dragonEye" && a.zone2; });
    return (pair.length ? pair : ms).slice(0, 1);
  }

  // The buttons a lesson shows: its moves with no board gesture. In a
  // puzzle they keep the engine's order, so the first is not always the
  // answer, and a shot or assault with a CAAT or Explosives version shows
  // both versions (a click on the target plays the plain one) [11.1.2, 13.7.1].
  function lessonButtons() {
    var b = app.tutorial && app.tutorial.current();
    if (!b || b.tray) return [];
    if (!b.accept) return lessonFocus().filter(function (a) { return !gestureOf(a); });
    var ms = lessonWaits() ? app.tutorial.matches() : [];
    function twin(a) { return ms.some(function (x) { return a.target != null && x !== a && x.type === a.type && x.uid === a.uid && x.target === a.target; }); }
    return ms.filter(function (a) { return !gestureOf(a) || twin(a); });
  }

  function newMatch(seed) {
    app.tutorial = null; hideEnd();
    if (typeof document !== "undefined" && document.querySelector(".popup")) closePopups();
    app.changesSeen = null;
    seed = seed || String(Date.now());
    app.session = FW.game.session(G, {}, { rng: FW.rng.seeded(seed), undo: true });
    app.controller.selected = null; app.controller.zonePick = null;
    app.decisionActor = null; app.decisionKey = null; app.decisionSeenKey = null;
    app.lastChanges = null;
    app.changeEntries = [{ title: "New game", total: 1, tone: "",
      lines: ["Set up: place one squad in each Start Zone, then attach the four CAATs."] }];
    els.log.innerHTML = "";
    log("New game, seed " + seed + ". Set up: place one squad in each Start Zone (click a squad chip, then a Zone), then attach the four CAATs.");
    $("tutor").hidden = true;
    clearLessonChrome();
    refresh();
  }
  // Out of a lesson: the guide, ring and pointer go, the menu comes back,
  // and the map returns to City for the board it now has.
  function clearLessonChrome() {
    if (DIR()) DIR().hide();
    var st = document.querySelector(".fw-stage");
    if (st) st.classList.remove("lesson-chrome");
    if (st && st.classList.contains("in-lesson")) { st.classList.remove("in-lesson"); app.boardView = boardHome(); }
  }

  function load(state) {
    app.tutorial = null; hideEnd();
    clearLessonChrome();
    closePopups();
    app.session = FW.game.session(G, {}, { rng: FW.rng.seeded("loaded-" + Date.now()), undo: true });
    app.session.state = state;
    refresh();
  }

  // ---------------------------------------------------- save / load (any time)
  // One in-progress slot, offered in the top bar and on the decision panel:
  // saving is legal in every phase, even with a decision waiting, because
  // the state — pending decision included — is plain JSON.
  function addChange(title, lines, tone) {
    app.changeEntries.unshift({ title: title, lines: (lines || []).slice(0, 14),
      total: (lines || []).length, tone: tone || "" });
    app.changeEntries = app.changeEntries.slice(0, 5);
  }
  function saveGame() {
    var label = "Turn " + app.session.state.turn + " · " + (PHASE_NAMES[app.session.state.phase] || app.session.state.phase);
    if (app.store.save(1, app.session.state, { label: label })) {
      addChange("Game saved", ["Saved in progress: " + label + ". Load restores this exact position."], "good");
      say("Saved: " + label + ".", "good"); refresh();
    } else say("The save did not stick — this browser refused storage.", "bad");
  }
  function loadGame() {
    var s = app.store.load(1);
    if (!s) { say("Nothing saved yet.", "bad"); return; }
    load(s.state);
    addChange("Saved game loaded", ["Restored: " + (s.meta.label || "a saved game") +
      (s.savedAt ? " (saved " + String(s.savedAt).slice(0, 10) + ")" : "") + "."], "good");
    say("Loaded: " + (s.meta.label || "a saved game") + ".", "good");
    refresh();
  }

  // ------------------------------------------------------------- map view
  // The map lives in its own viewport below the permanent menu strip
  // (the stage is a column: bars, then the board). The world is
  // WORLD_W x WORLD_H at the cropped image's own aspect ratio; zoom and
  // pan are one transform on it. boardView.zoom is the current level's
  // scale over City's (1 = City).
  var boardDrag = null, boardClickGuard = false, homeScale = 1;
  function boardSize() {
    return { w: els.board && els.board.clientWidth ? els.board.clientWidth : 1920,
             h: els.board && els.board.clientHeight ? els.board.clientHeight : 1080 };
  }
  function gridExtents() {
    var top = 1e9, bot = 0;
    B.zones.forEach(function (z) { z.locations.forEach(function (l) {
      var wy = (l.y - CROP.y) / CROP.h * WORLD_H; if (wy < top) top = wy; if (wy > bot) bot = wy;
    }); });
    return { top: top, bottom: bot };
  }
  // City, the furthest out: the map exactly as wide as the viewport, no
  // further (the owner's call: never a band of empty table at the sides).
  // The map is taller than the viewport at that width, so City opens on
  // the playable grid's middle and pans up and down to the edge tracks.
  function boardHome() {
    var bs = boardSize(), g = gridExtents();
    var s = bs.w / WORLD_W;
    homeScale = s;
    return { level: 0, zoom: 1, x: 0, y: bs.h / 2 - (g.top + g.bottom) / 2 * s };
  }
  // Zoom is four fixed levels, not a free scale. City is the home view
  // (the whole grid); Close shows the scan at its own resolution, one
  // file pixel per screen pixel, the most detail the art holds; District
  // and Zone sit between. The levels are worked out from the stage's
  // current scale and the display's pixel density, so Close is true 1:1
  // on any screen.
  var ZOOM_NAMES = ["City", "District", "Zone", "Close"];
  function stageScale() {
    var stage = document.querySelector(".fw-stage");
    return stage ? parseFloat(stage.dataset.scale || "1") : 1;
  }
  function levelScales() {
    var dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    var native = (CROP.w / WORLD_W) / (stageScale() * dpr);
    var lv = [homeScale, native * 0.5, native * 0.75, native];
    for (var i = 1; i < lv.length; i++) lv[i] = Math.max(lv[i], lv[i - 1] * 1.25);
    return lv;
  }
  // The lesson's camera may stop between the levels: boardView.free is
  // that scale, and any level the player picks clears it.
  function viewScale() { return app.boardView.free || levelScales()[app.boardView.level || 0]; }
  function viewTransform() {
    return "translate(" + app.boardView.x + "px," + app.boardView.y + "px) scale(" + viewScale() + ")";
  }
  function clampBoardView() {
    var bs = boardSize(), s = viewScale();
    // the dock stands over the map's right edge, where the date and VP
    // wheels are printed: the map may pan that much further left so they
    // can always be brought out from under it
    var dock = typeof document !== "undefined" && $("dock"), k = stageScale();
    var pad = dock && dock.offsetWidth ? (bs.w - (dock.getBoundingClientRect().left - els.board.getBoundingClientRect().left) / k) + 10 : 0;
    var xLo = Math.min(0, bs.w - pad - WORLD_W * s), xHi = Math.max(0, bs.w - WORLD_W * s);
    var yLo = Math.min(0, bs.h - WORLD_H * s), yHi = Math.max(0, bs.h - WORLD_H * s);
    // the lesson's camera may look past the map's edge, so a piece on the
    // last row can still be brought to where the guide wants it
    // (loose: true is 40% of the board; a lesson may ask for a larger share)
    var lx = app.boardView.loose === true ? 0.4 : (app.boardView.loose || 0);
    if (lx) { xLo -= bs.w * lx; xHi += bs.w * lx; yLo -= bs.h * lx; yHi += bs.h * lx; }
    app.boardView.x = Math.max(xLo, Math.min(xHi, app.boardView.x));
    app.boardView.y = Math.max(yLo, Math.min(yHi, app.boardView.y));
  }
  // A level change eases in. While it moves, the world is a promoted
  // layer (will-change); once it lands that is dropped, so the browser
  // re-rasters the map from the full-size scan at the new scale instead
  // of stretching a cached small copy — the blur a player saw.
  var settleTimer = null;
  function applyBoardView(animate, ms) {
    clampBoardView();
    app.boardView.zoom = viewScale() / homeScale;
    var w = $("board-world");
    if (w) {
      var still = typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (animate && !still) {
        w.style.transition = ms ? "transform " + ms / 1000 + "s cubic-bezier(.65,0,.35,1)" : "transform .22s ease-out";
        w.style.willChange = "transform";
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () {
          var w2 = $("board-world");
          if (w2) { w2.style.transition = ""; w2.style.willChange = ""; }
        }, (ms || 220) + 60);
      }
      w.style.transform = viewTransform();
    }
    document.querySelectorAll("#zoom-seg [data-zoom]").forEach(function (b) {
      b.classList.toggle("on", +b.dataset.zoom === app.boardView.level);
    });
  }
  function zoomTo(level, clientX, clientY) {
    level = Math.max(0, Math.min(ZOOM_NAMES.length - 1, level));
    if (level === 0) { app.boardView = boardHome(); applyBoardView(true); return; }
    if (level === app.boardView.level && !app.boardView.free) { applyBoardView(); return; }
    var old = viewScale();
    app.boardView.free = null; app.boardView.loose = false;
    var br = els.board.getBoundingClientRect(), k = stageScale();
    var cx = clientX == null ? br.width / k / 2 : (clientX - br.left) / k;
    var cy = clientY == null ? br.height / k / 2 : (clientY - br.top) / k;
    var wx = (cx - app.boardView.x) / old, wy = (cy - app.boardView.y) / old;
    app.boardView.level = level;
    var ns = viewScale();
    app.boardView.x = cx - wx * ns;
    app.boardView.y = cy - wy * ns;
    applyBoardView(true);
  }
  function zoomStep(dir, clientX, clientY) { zoomTo((app.boardView.level || 0) + dir, clientX, clientY); }
  // The lesson's camera: ease the map so a box in world space (the map's
  // own px) fills `fill` of the board, its centre at (ax, ay) of the board.
  // The scale stays between District and Close.
  function cameraTo(box, opts) {
    opts = opts || {};
    var bs = boardSize(), lv = levelScales(), fill = opts.fill || 0.3, fillH = opts.fillH || Math.min(0.8, fill * 1.6);
    var s = Math.min(bs.w * fill / Math.max(box.w, 60), bs.h * fillH / Math.max(box.h, 60));
    s = Math.max(opts.min || lv[0] * (opts.minScale || 1), Math.min(lv[3], s));
    app.boardView.free = s;
    // a close look may pass the map's edge; so may the lesson, to keep its
    // focus clear of the bubble; a wide look elsewhere keeps the map on screen
    app.boardView.loose = opts.loose != null ? opts.loose : s > lv[0] * 1.3;
    app.boardView.x = bs.w * (opts.ax == null ? 0.5 : opts.ax) - (box.x + box.w / 2) * s;
    app.boardView.y = bs.h * (opts.ay == null ? 0.5 : opts.ay) - (box.y + box.h / 2) * s;
    // or: the box's foot at `bottom` px down the board, when the box fits above it
    if (opts.bottom != null && box.h * s < opts.bottom - 20) app.boardView.y = opts.bottom - (box.y + box.h) * s;
    applyBoardView(true, opts.ms || 800);
  }
  // The world-space box around some map elements (counters, Locations,
  // Zone tiles), from where the page laid them out — offsets, not screen
  // rectangles, so a piece still in flight (FW.motion) counts where it lands.
  // Every one is centred on its point (translate -50%).
  function worldBoxOf(nodes) {
    var w = $("board-world");
    if (!w || !nodes.length) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    nodes.forEach(function (n) {
      if (n.offsetParent !== w) return;
      var hw = n.offsetWidth / 2, hh = n.offsetHeight / 2;
      x0 = Math.min(x0, n.offsetLeft - hw); y0 = Math.min(y0, n.offsetTop - hh);
      x1 = Math.max(x1, n.offsetLeft + hw); y1 = Math.max(y1, n.offsetTop + hh);
    });
    return x1 < x0 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // ...and that box on the stage, where the camera has put it.
  function worldToStage(b) {
    var st = document.querySelector(".fw-stage"), k = stageScale(), s = viewScale();
    var br = els.board.getBoundingClientRect(), sr = st.getBoundingClientRect();
    var ox = (br.left - sr.left) / k + app.boardView.x, oy = (br.top - sr.top) / k + app.boardView.y;
    return { x: ox + b.x * s, y: oy + b.y * s, w: b.w * s, h: b.h * s };
  }
  // The stage is map-centric: always 1080 tall, as wide as the window's
  // shape (never narrower than 1920), scaled as one unit. Margins are a
  // share of that: 2% of the width at the sides, 1% over the menu, 2%
  // under the map. Anything left over around the stage shows the blurred
  // map behind it (#backdrop).
  function fitStage() {
    var st = document.querySelector(".fw-stage");
    if (!st) return;
    var H = 1080, W = Math.max(1920, Math.round(H * window.innerWidth / window.innerHeight));
    var k = Math.min(window.innerWidth / W, window.innerHeight / H, 2);
    st.style.width = W + "px"; st.style.height = H + "px";
    st.style.setProperty("--safe-x", Math.round(W * 0.02) + "px");
    st.style.transformOrigin = "top left";
    st.style.transform = "scale(" + k + ")";
    st.style.position = "absolute"; st.style.margin = "0";
    st.style.left = Math.max(0, Math.round((window.innerWidth - W * k) / 2)) + "px";
    st.style.top = Math.max(0, Math.round((window.innerHeight - H * k) / 2)) + "px";
    st.dataset.scale = String(k);
    if (!fitStage.bound) { fitStage.bound = true; window.addEventListener("resize", fitStage); }
  }
  function DIR() { return global.PhantomFuryDirector || null; }
  // One wheel notch is one level. A trackpad sends a stream of small
  // deltas: they add up to a notch, and a short lock after each step
  // keeps one flick from running through every level.
  var wheelAcc = 0, wheelLock = 0;
  function onBoardWheel(ev) {
    ev.preventDefault();
    if (app.tutorial) return;
    var now = Date.now();
    if (now < wheelLock) { wheelAcc = 0; return; }
    wheelAcc += ev.deltaY;
    if (Math.abs(wheelAcc) < 40) return;
    var dir = wheelAcc < 0 ? 1 : -1;
    wheelAcc = 0; wheelLock = now + 280;
    zoomStep(dir, ev.clientX, ev.clientY);
  }
  function onBoardPointerDown(ev) {
    // A pan may start anywhere on the map — a Zone tile, a Location dot,
    // the art itself. On the art, preventDefault (with draggable=false and
    // -webkit-user-drag in the CSS) stops the browser from hijacking the
    // gesture into a native image drag — the ghost-board bug a player hit.
    if (ev.target.classList && ev.target.classList.contains("pf-map")) ev.preventDefault();
    if (app.tutorial) return;                        // in a lesson the camera is the guide's
    boardDrag ={ x: ev.clientX, y: ev.clientY, vx: app.boardView.x, vy: app.boardView.y, moved: false };
  }
  function onBoardPointerMove(ev) {
    if (!boardDrag) return;
    if (Math.abs(ev.clientX - boardDrag.x) + Math.abs(ev.clientY - boardDrag.y) > 6) boardDrag.moved = true;
    if (!boardDrag.moved) return;
    var stage = document.querySelector(".fw-stage");
    var k = stage ? parseFloat(stage.dataset.scale || "1") : 1;
    app.boardView.x = boardDrag.vx + (ev.clientX - boardDrag.x) / k;
    app.boardView.y = boardDrag.vy + (ev.clientY - boardDrag.y) / k;
    applyBoardView();
  }
  function onBoardPointerUp(ev) {
    // the guard eats the click a drag ends with — only one on the map
    if (boardDrag && boardDrag.moved && ev && ev.type === "pointerup" && els.board.contains(ev.target)) boardClickGuard = true;
    boardDrag = null;
  }
  function showPhaseBanner(text) {
    var b = $("phase-banner");
    if (!b) return;
    b.textContent = text;
    b.hidden = false;
    b.classList.remove("show");
    void b.offsetWidth;
    b.classList.add("show");
    clearTimeout(showPhaseBanner.timer);
    showPhaseBanner.timer = setTimeout(function () { b.hidden = true; b.classList.remove("show"); }, 1700);
  }

  function undo() {
    if (app.tutorial) return;
    var was = motionSnapshot();
    if (!app.session.undo()) return;
    app.controller.selected = null;
    app.lastChanges = null;
    addChange("Undone", ["The last action was taken back."], "");
    refresh();
    if (was && FW.motion) FW.motion.play(was);
  }

  function autoSetup() {
    if (app.tutorial || app.session.state.phase !== "setup") return;
    var before = summarizeState(app.session.state), was = motionSnapshot();
    var guard = 0;
    while (app.session.state.phase === "setup" && guard++ < 40) {
      var legal = app.session.legal();
      var places = legal.filter(function (a) { return a.type === "setupPlace"; })
        .sort(function (a, b) { return a.zone - b.zone; });
      var a = places[0] || legal.filter(function (x) { return x.type === "setupCaat"; })[0];
      if (!a) break;
      app.session.apply(a);
    }
    afterAction({ records: [], events: ["Setup played automatically [6.3]."],
      beforeSummary: before, motionWas: was });
  }

  function afterAction(result) {
    // the lesson's next step is drawn by the refresh below: hand the guide
    // this move's dice first, so they open that step's bubble
    if (app.tutorial && DIR() && result.byPlayer) DIR().result(result);
    (result.records || []).forEach(function (r) { log(FW.record.format(r), "rec"); });
    (result.events || []).forEach(function (e) { log(e); });
    var after = summarizeState(app.session.state);
    var cmp = compareSummaries(result.beforeSummary, after, result);
    app.lastChanges = cmp; app.lastChangeAt = Date.now();
    if (cmp.lines.length) {
      addChange(cmp.phaseChanged ? "State changed — " + (PHASE_NAMES[after.phase] || after.phase)
        : "Action resolved", cmp.lines, cmp.phaseChanged ? "phase" : "");
    }
    refresh();
    if (result.motionWas && typeof document !== "undefined" && FW.motion) {
      FW.motion.play(result.motionWas);
      FW.motion.pulse("#status");
    }
    if (cmp.phaseChanged) {
      showPhaseBanner((PHASE_NAMES[after.phase] || after.phase) + " — Turn " + after.turn);
    }
    var ch = $("changes");
    if (ch && cmp.lines.length) {
      ch.classList.remove("flash"); void ch.offsetWidth; ch.classList.add("flash");
    }
    if (app.tutorial) {
      renderBeat(); return;
    }
    if (result.shot) playShot(result.shot);
    if (result.records && result.records.length && result.action) showReport(result);
    if (result.turnWas && app.session.state.turn === result.turnWas + 1) turnEvent(result.turnWas, app.session.state.turn);
    var over = app.session.over();
    if (over) showEnd(over);
  }

  // --------------------------------------------------------- shots fired
  // Owner, 2026-10-31: an assault or a shot must be seen. Before the move,
  // note where the shooter and the target stand (world px); after it, a
  // tracer runs between them and the target flashes, over the new board.
  function shotFrom(a) {
    if (app.tutorial || typeof document === "undefined" || !a || (a.type !== "fire" && a.type !== "assault")) return null;
    var p = function (uid) {
      var n = document.querySelector("#board .pf-unit[data-uid='" + uid + "']");
      return n && n.offsetParent === $("board-world") ? { x: n.offsetLeft, y: n.offsetTop } : null;
    };
    var from = p(a.uid), to = p(a.target);
    return from && to ? { from: from, to: to, kind: a.type } : null;
  }
  function playShot(sh) {
    var w = $("board-world"); if (!w) return;
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var len = Math.hypot(sh.to.x - sh.from.x, sh.to.y - sh.from.y).toFixed(1);
    var svg = "<svg class='pf-shot " + sh.kind + "' viewBox='0 0 " + WORLD_W + " " + WORLD_H.toFixed(1) + "' aria-hidden='true'>";
    for (var i = 0; i < (sh.kind === "fire" ? 3 : 1); i++)
      svg += "<line x1='" + sh.from.x + "' y1='" + sh.from.y + "' x2='" + sh.to.x + "' y2='" + sh.to.y +
        "' style='stroke-dasharray:14 " + len + ";stroke-dashoffset:14;animation-delay:" + (i * 0.18) + "s;--len:" + len + "'/>";
    svg += "<circle class='burst' cx='" + sh.to.x + "' cy='" + sh.to.y + "' r='16'/>";
    if (sh.kind === "assault") svg += "<circle class='burst b2' cx='" + sh.to.x + "' cy='" + sh.to.y + "' r='24'/>";
    svg += "</svg>";
    if (still) return;
    // kept on app.shotFx so a board redraw in the next instant (the click
    // handler's refresh) carries it on, until it has played out
    app.shotFx = { html: svg, until: Date.now() + 1800 };
    w.insertAdjacentHTML("beforeend", svg);
    setTimeout(function () {
      if (app.shotFx && Date.now() >= app.shotFx.until) app.shotFx = null;
      document.querySelectorAll("#board .pf-shot").forEach(function (n) { n.parentNode.removeChild(n); });
    }, 1850);
  }

  // -------------------------------------------------------- combat report
  // Every roll of the move, in the lesson's panel: who rolled what, the
  // modifiers, the number to beat, and what came of it. Stays until OK or
  // the next move; the Log keeps the full record.
  var CAMEO = { fire: "hendrix-rifle-kneeling-fire.png", assault: "hendrix-rifle-standing-firing.png" };
  function recTone(r) {
    var res = String(r.result || "");
    if (/^no\b|no effect|miss/i.test(res)) return "";
    if (/Insurgent roll|Defensive Fire|Sniper|IED|Reaction/i.test(r.table || "")) return "bad";
    if (/Marine roll|Fire Combat|Super Cobra|Hornet|Dragon Eye|Mission/i.test(r.table || "") && /success|hit|Step Loss|eliminat|removed/i.test(res)) return "good";
    return "";
  }
  function showReport(r) {
    var box = $("report"); if (!box || app.tutorial) return;
    var a = r.action, kind = a.type === "mission" ? ({ dragonEye: "Dragon Eye", cobra: "Super Cobra", hornet: "Hornet" }[a.mission] || "Mission")
      : a.type === "fire" ? "Fire" : a.type === "assault" ? "Assault" : a.type === "moveStep" ? "Movement" : a.type === "endPhase" ? "End of phase" : "Result";
    var zone = /Zone (\d+)/.exec(a.label || "");
    $("report-kicker").textContent = kind + (zone ? " · Zone " + zone[1] : "");
    $("report-cite").textContent = a.cite || "";
    // the headline: what happened, from the events (not the roll summaries)
    var ev = (r.events || []).filter(function (e) { return !/ rolls? \d/.test(e) && !/: rolled \d/.test(e); });
    $("report-title").textContent = ev[0] || (r.records[r.records.length - 1].result || "Resolved");
    var ol = $("report-rolls"); ol.innerHTML = "";
    r.records.slice(0, 5).forEach(function (rec) {
      var li = document.createElement("li"), tone = recTone(rec);
      if (tone) li.className = tone;
      var mods = (rec.drms || []).map(function (d) { return (d.value > 0 ? "+" : "−") + Math.abs(d.value) + " " + d.label; }).join(", ");
      li.innerHTML = "<span class='die'></span><span class='rt'><span class='ctx'></span><span class='calc'></span><b class='res'></b></span>";
      li.querySelector(".die").textContent = rec.die == null ? "–" : rec.die;
      li.querySelector(".ctx").textContent = rec.context || rec.table || "";
      li.querySelector(".calc").textContent = rec.die == null ? "" :
        "rolled " + rec.die + (mods ? " (" + mods + ") = " + rec.modifiedDie : "") + (rec.target != null ? " vs " + rec.target : "");
      li.querySelector(".res").textContent = rec.result || "";
      ol.appendChild(li);
    });
    var more = r.records.length - 5 + Math.max(0, ev.length - 1);
    $("report-more").textContent = ev.slice(1, 3).join(" · ") + (more > 2 ? "  (more in the Log)" : "");
    var cam = CAMEO[a.type];
    $("report-cameo").hidden = !cam;
    if (cam) $("report-cameo-img").src = "../assets/characters/" + cam;
    box.hidden = false;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  }
  function hideReport() { var b = typeof document !== "undefined" && $("report"); if (b) b.hidden = true; }

  // ------------------------------------------------------- the turn moves
  // Owner, 2026-10-31: a new turn is an event. The camera glides to the
  // date wheel, the Game Turn marker steps on, Walsh says what the turn
  // brings; Got it brings the camera back to where the player was.
  function turnEvent(from, to) {
    if (app.tutorial || typeof document === "undefined" || !GUIDE || !GUIDE.turnTalk || !TRACKS) return;
    var t = GUIDE.turnTalk[to] || GUIDE.turnTalk.any;
    var fill = function (x) { return String(x).replace(/\{n\}/g, to).replace(/\{left\}/g, 16 - to); };
    var token = document.querySelector("#board .pf-track[data-peek='turn']"); if (!token) return;
    var saved = JSON.parse(JSON.stringify(app.boardView));
    var a = TRACKS.turn[from - 1], b = TRACKS.turn[to - 1];
    // stand the marker back on the old space; it steps on once the camera lands
    token.style.left = mx(a[0]); token.style.top = my(a[1]);
    var box = worldBoxOf([token]);
    if (box) cameraTo({ x: box.x - 120, y: box.y - 40, w: box.w + 240, h: box.h + 200 }, { fill: 0.5, ms: 1100, loose: false, ay: 0.4 });
    setTimeout(function () {
      var tk = document.querySelector("#board .pf-track[data-peek='turn']"); if (!tk) return;
      tk.classList.add("stepping");
      tk.style.left = mx(b[0]); tk.style.top = my(b[1]);
      setTimeout(function () {
        tk.classList.remove("stepping");
        app.coachEvent = { at: "#board .pf-track[data-peek='turn']", pose: "talk", title: fill(t.title), say: fill(t.say), cite: t.cite,
          onDone: function () { app.boardView = saved; applyBoardView(true, 900); } };
        renderCoach();
      }, 1100);
    }, 1200);
  }

  // --------------------------------------------------------------- rendering
  function refresh() {
    if (!app.session) return;
    var s = app.session.state;
    renderBoard();
    renderPools();
    var held = B.zones.filter(function (z) { return z.id !== 27 && s.zones[z.id].control === "usmc"; }).length;
    els.status.textContent = "Turn " + s.turn + " of 16 — " + (PHASE_NAMES[s.phase] || s.phase) +
      " · VP " + s.vp + " · Zones held " + held + "/60" +
      " · Support left: Dragon Eye " + (B.counters.support.dragonEye.max - s.support.dragonEye) +
      ", Cobra " + (B.counters.support.superCobra.max - s.support.cobra) +
      ", Hornet " + (B.counters.support.hornet.max - s.support.hornet);
    if (G.isOver(s)) els.prompt.textContent = "Game over.";
    else if (app.tutorial) els.prompt.textContent = lessonWaits() ? "Lesson — your move." : "Lesson — press Continue.";
    else if (s.pending) els.prompt.textContent = "A decision is waiting — see the highlighted actions.";
    else els.prompt.textContent = "";
    renderGuide(s);
    $("btn-undo").disabled = !!app.tutorial || !app.session.snapshots.length;
    $("btn-auto").disabled = !!app.tutorial || s.phase !== "setup";
    $("btn-load").disabled = !app.store.list().length;
    renderChanges();
    renderDecisionPanel();
    renderHand();
    renderAvailability();
    renderTray();
    renderCoach();
    if (app.tutorial && DIR()) renderBeat();        // the ring and the step list follow what the board now marks
  }

  // ------------------------------------------------- edge tracks and boxes
  // The four margins of the board carry the tabletop game's own tracks
  // and reserve boxes; the page puts the markers where a player would.
  // Track markers (Game Turn, VP units and tens, the three Mission
  // markers) are moved by the game alone [8] [7.2.1] [9.2.1]: they are
  // drawn as plain tokens with no click, only the hover card. Pieces in
  // the reserve boxes are the player's to bring on [10]: they are real
  // counters — click one, then its entry on the map, as from Pieces.
  var MISSION_ART = { dragonEye: "dragon-eye.png", superCobra: "super-cobra.png", hornet: "hornet.png" };
  var MISSION_STATE = { dragonEye: "dragonEye", superCobra: "cobra", hornet: "hornet" };
  function trackToken(xy, art, peek, extra) {
    return "<div class='pf-track' data-peek='" + peek + "' style='left:" + mx(xy[0]) + ";top:" + my(xy[1]) +
      (extra || "") + "'><img src='" + ART_DIR + art + "' alt='' draggable='false'></div>";
  }
  function vpParts(vp) {
    var a = Math.abs(vp);
    return { ones: a % 10, tens: Math.min(3, Math.floor(a / 10)), neg: vp < 0 };
  }
  function renderTracks(s, proj) {
    if (!TRACKS) return "";
    var html = "";
    html += trackToken(TRACKS.turn[Math.max(1, Math.min(16, s.turn)) - 1], "turn.png", "turn");
    var v = vpParts(s.vp);
    html += trackToken(TRACKS.score[v.ones], "vp.png", "vp");
    // The tens marker turns in the wheel's centre to point at 0 / 10 / 20 / 30
    // (up, right, down, left); the art's pointer starts at the lower left.
    html += trackToken(TRACKS.scoreCentre, v.neg ? "vp10-neg.png" : "vp10-pos.png", "vp10",
      ";transform:translate(-50%,-50%) rotate(" + (135 + 90 * v.tens) + "deg)");
    Object.keys(MISSION_ART).forEach(function (m) {
      var spaces = TRACKS.missions[m], used = s.support[MISSION_STATE[m]] || 0;
      html += trackToken(spaces[Math.min(used, spaces.length - 1)], MISSION_ART[m], m);
    });
    var sel = app.controller.selected;
    ["company", "battalion", "iif", "abrams"].forEach(function (pk) {
      var slots = TRACKS.boxes[pk] || [];
      proj.units.filter(function (u) { return u.pool === pk; }).forEach(function (u, i) {
        if (!slots[i]) return;
        var face = faceFor(u);
        html += "<button class='pf-unit in-box kind-" + u.kind + (sel === u.uid ? " sel" : "") +
          "' data-uid='" + u.uid + "' style='left:" + mx(slots[i][0]) + ";top:" + my(slots[i][1]) +
          "' aria-label='" + u.name + "'><img src='" + face.image + "' alt='' draggable='false'><span>" +
          u.cf + "</span></button>";
      });
    });
    return html;
  }

  // ------------------------------------------------------------ hover card
  // Hovering a counter or marker shows it large on a see-through backing
  // with what it is beside it: the live state first (CF now, markers,
  // where it stands), then the rule notes from data/phantomfury_counter_info.js.
  // It stands beside the piece (right, or left when there is no room) and
  // never takes the mouse.
  var peekFor = null;
  function peekContent(el) {
    var s = app.session.state;
    if (el.dataset.peek) {
      var key = el.dataset.peek, info = INFO[key] || {}, facts = [], img = el.querySelector("img").getAttribute("src");
      if (key === "turn") facts.push("Turn " + s.turn + " of 16 — " + (PHASE_NAMES[s.phase] || s.phase));
      if (key === "vp" || key === "vp10") {
        var v = vpParts(s.vp);
        facts.push("Score " + (s.vp > 0 ? "+" : "") + s.vp + " VP");
        facts.push(key === "vp" ? "Units marker on " + v.ones : "Tens marker points at " + (v.tens * 10) + (v.neg ? ", − side up" : ", + side up"));
      }
      if (info.mission) {
        var sp = B.counters.support[info.mission], used = s.support[MISSION_STATE[info.mission]] || 0;
        facts.push("Successful Missions: " + used + " of " + sp.max + (used >= sp.max ? " — none left" : ""));
        facts.push("Success on a d10 roll of " + sp.success[0] + "–" + sp.success[1]);
      }
      facts.push("Moved by the game — not clickable");
      return { img: img, title: info.title || key, side: info.side || "", facts: facts, notes: info.notes || [] };
    }
    var uid = el.dataset.uid || el.dataset.decisionUid;
    var u = project(s).units.filter(function (x) { return x.uid === uid; })[0];
    if (!u) return null;
    var inf = INFO[u.kind] || {}, f = [];
    if (u.kind === "suspect") f.push("Face down — what it hides is revealed on Activation");
    else if (u.cf != null) f.push("CF " + u.cf + (u.pcf != null && u.pcf !== u.cf ? " (printed " + u.pcf + ")" : ""));
    f.push(posLabel(u));
    if (u.markers.length) f.push(u.markers.join(" · "));
    if (u.kind === "caat") f.push("Ammo " + (u.ammo || 0) + " · Explosives " + (u.explosives ? "ready" : "used"));
    if (u.caat && s.units[u.caat]) f.push("CAAT attached");
    return { img: faceFor(u).image, title: u.name, side: inf.side || "", sub: inf.title, facts: f, notes: inf.notes || [] };
  }
  function showPeek(el) {
    var box = $("peek");
    if (!box || !app.session) return;
    var c = peekContent(el);
    if (!c) { hidePeek(); return; }
    peekFor = el;
    box.querySelector(".peek-face img").src = c.img;
    $("peek-side").textContent = c.side;
    $("peek-title").textContent = c.title + (c.sub && c.sub !== c.title ? " — " + c.sub : "");
    $("peek-facts").innerHTML = c.facts.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    $("peek-notes").innerHTML = c.notes.map(function (n) {
      return "<li>" + n[0] + " <span class='cite'>" + n[1] + "</span></li>";
    }).join("");
    box.hidden = false;
    var stage = document.querySelector(".fw-stage"), k = stageScale();
    var sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    var w = box.offsetWidth, h = box.offsetHeight;
    // right of the piece, or left of it when that would run under the dock
    var dock = $("dock"), limit = dock ? (dock.getBoundingClientRect().left - sr.left) / k - 10 : 1920 - 96;
    var left = (r.right - sr.left) / k + 14;
    if (left + w > limit) left = (r.left - sr.left) / k - 14 - w;
    var top = ((r.top + r.bottom) / 2 - sr.top) / k - h / 2;
    box.style.left = Math.max(96, left) + "px";
    box.style.top = Math.max(54, Math.min(1080 - 54 - h, top)) + "px";
  }
  function hidePeek() {
    peekFor = null;
    var box = typeof document !== "undefined" && $("peek");
    if (box) box.hidden = true;
  }
  function wirePeek() {
    var PEEK = ".pf-unit, .pf-track, .decision-piece";
    document.addEventListener("mouseover", function (ev) {
      var t = ev.target.closest && ev.target.closest(PEEK);
      if (!t || t === peekFor || (boardDrag && boardDrag.moved)) return;
      showPeek(t);
    });
    document.addEventListener("mouseout", function (ev) {
      if (!peekFor) return;
      if (ev.relatedTarget && peekFor.contains(ev.relatedTarget)) return;
      if (ev.target === peekFor || peekFor.contains(ev.target)) hidePeek();
    });
    document.addEventListener("pointerdown", hidePeek, true);
    document.addEventListener("wheel", hidePeek, { capture: true, passive: true });
  }
  app.showPeek = showPeek; app.hidePeek = hidePeek;

  function renderBoard() {
    var s = app.session.state, proj = project(s);
    var changed = (app.lastChanges && Date.now() - app.lastChangeAt < 4000) ? app.lastChanges : null;
    var sel = app.controller.selected;
    var targets = sel ? app.controller.targetsOf(sel) : [];
    var tgtLocs = {}, tgtUnits = {}, tgtStreets = {}, tgtZones = {};
    targets.forEach(function (a) {
      var g = gestureOf(a);
      if (g.to) { if (g.to.street != null) tgtStreets[g.to.street] = true; else tgtLocs[g.to.zone + ":" + g.to.loc] = true; }
      if (g.target) tgtUnits[g.target] = true;
      if (g.zone) { tgtLocs[g.zone + ":*"] = true; tgtZones[g.zone] = true; }
    });
    // a CAAT in hand: the squads it may join light up
    if (sel) G.legalActions(s).forEach(function (a) { if (a.type === "setupCaat" && a.caat === sel) tgtUnits[a.uid] = true; });
    var mis = app.controller.mission;
    if (s.phase === "support" && !app.tutorial && (mis === "cobra" || mis === "hornet")) {
      // a Super Cobra or Hornet in hand: the Zones it may strike; a Cobra
      // over its Zone: the pieces it may remove
      G.legalActions(s).forEach(function (a) {
        if (a.type !== "mission" || a.mission !== mis) return;
        if (app.controller.cobraZone == null) tgtZones[a.zone] = true;
        else if (a.zone === app.controller.cobraZone) (a.remove || []).forEach(function (uid) { tgtUnits[uid] = true; });
      });
    } else if (s.phase === "support" && !app.tutorial) {
      // Dragon Eye is picked on the map with no unit selected: light up
      // the Zones a click would take (first picks, then valid partners).
      G.legalActions(s).forEach(function (a) {
        if (a.type !== "mission" || a.mission !== "dragonEye") return;
        if (app.controller.zonePick == null && !a.zone2) tgtZones[a.zone] = true;
        if (app.controller.zonePick != null && a.zone === app.controller.zonePick && a.zone2) tgtZones[a.zone2] = true;
      });
    }
    var actors = {};
    lessonFocus().forEach(function (a) {
      if (a.type === "mission" && a.zone) { tgtZones[a.zone] = true; if (a.zone2) tgtZones[a.zone2] = true; }
      if (a.type === "setupCaat") tgtUnits[a.uid] = true;            // the squad a CAAT may join
      if (a.type === "setupPlace") { tgtZones[a.zone] = true; tgtLocs[a.zone + ":*"] = true; }   // anywhere in the Start Zone
      var g = gestureOf(a); if (!g) return;
      if (g.uid) actors[g.uid] = true;
      if (g.to) { if (g.to.street != null) tgtStreets[g.to.street] = true; else tgtLocs[g.to.zone + ":" + g.to.loc] = true; }
      if (g.target) tgtUnits[g.target] = true;
    });
    // Focus (owner, 2026-10-31): grey what cannot be used now. With a piece
    // in hand, everything but it and its targets; otherwise your pieces
    // that have no legal action this phase (only when some piece has one).
    var idle = {};
    if (!app.tutorial && !G.isOver(s)) {
      var acting = {};
      G.legalActions(s).forEach(function (a) {
        if (a.type === "endPhase") return;
        if (a.uid) acting[a.uid] = true;
        if (a.caat) acting[a.caat] = true;
      });
      proj.units.forEach(function (u) {
        if (!u.pos) return;
        if (sel || app.controller.cobraZone != null) { if (u.uid !== sel && !tgtUnits[u.uid]) idle[u.uid] = true; }
        else if (Object.keys(acting).length && FRIENDLY[u.kind] && !acting[u.uid]) idle[u.uid] = true;
      });
    }
    hidePeek();
    var html = "<div class='pf-world' id='board-world' style='width:" + WORLD_W + "px;height:" + WORLD_H.toFixed(1) +
      "px;transform:" + viewTransform() + "'>" +
      "<img class='pf-map' draggable='false' src='../assets/PhF_Board.jpeg' alt='Phantom Fury board'>";
    B.streets.forEach(function (st) {
      html += "<button class='pf-street" + (tgtStreets[st.id] ? " tgt" : "") + "' data-street='" + st.id +
        "' style='left:" + mx(st.centre[0]) + ";top:" + my(st.centre[1]) + "' title='Street Section " + st.id + "'></button>";
    });
    proj.zones.forEach(function (z) {
      html += "<button class='pf-zone ctl-" + z.control + (z.ruins ? " ruins" : "") +
        (changed && changed.zones[z.id] ? " state-changed" : "") +
        (tgtZones[z.id] ? " tgt" : "") +
        (app.controller.zonePick === z.id ? " pick" : "") + "' data-zone='" + z.id +
        "' style='left:" + mx(z.centre[0]) + ";top:" + my(z.centre[1]) +
        "' title='Zone " + z.id + " — " + z.control + (z.fortified ? ", Fortified" : "") + (z.ruins ? ", Ruins" : "") + "'><span class='pf-zone-mark'></span></button>";
    });
    var occupied = {};
    proj.units.forEach(function (u) { if (u.pos && u.pos.zone != null) occupied[u.pos.zone + ":" + u.pos.loc] = true; });
    B.zones.forEach(function (z) {
      z.locations.forEach(function (l) {
        var key = z.id + ":" + l.id;
        if (occupied[key]) return; // the counter on it is the click target
        html += "<button class='pf-loc" + (tgtLocs[key] || tgtLocs[z.id + ":*"] ? " tgt" : "") + "' data-loc='" + key +
          "' data-zone='" + z.id + "' style='left:" + mx(l.x) + ";top:" + my(l.y) +
          "' title='Zone " + z.id + " Location " + l.id + "'></button>";
      });
    });
    var byLoc = {};
    proj.units.forEach(function (u) {
      if (!u.pos) return;
      var key = u.pos.street != null ? "S" + u.pos.street : u.pos.zone + ":" + u.pos.loc;
      byLoc[key] = byLoc[key] || 0;
      var off = byLoc[key]++;
      var xy = u.pos.street != null ? B.streets[u.pos.street - 1].centre
        : (function () { var l = B.zones[u.pos.zone - 1].locations.filter(function (x) { return x.id === u.pos.loc; })[0]; return l ? [l.x, l.y] : B.zones[u.pos.zone - 1].centre; })();
      var face = faceFor(u);
      html += "<button class='pf-unit kind-" + u.kind + (sel === u.uid ? " sel" : "") + (tgtUnits[u.uid] ? " tgt" : "") +
        (idle[u.uid] ? " idle" : "") +
        (actors[u.uid] ? " lesson-actor" : "") +
        (changed && changed.units[u.uid] ? " state-changed" : "") + outcomeMark(u.uid) +
        (u.markers.indexOf("pinned") >= 0 ? " pinned" : "") + (u.markers.indexOf("fired") >= 0 ? " fired" : "") +
        "' data-uid='" + u.uid + "'" + (u.pos.zone != null ? " data-at='" + u.pos.zone + ":" + u.pos.loc + "' data-zone='" + u.pos.zone + "'" : "") +
        " style='left:calc(" + mx(xy[0]) + " + " + (off * 12) + "px);top:calc(" + my(xy[1]) + " + " + (off * 9) + "px)'" +
        " aria-label='" + u.name + "'><img src='" + face.image + "' alt='' draggable='false'>" +
        // an attached CAAT has no counter of its own on the map: a badge on its squad
        (u.caat ? "<img class='pf-caat' src='" + ART_DIR + "caat.png' alt='CAAT' title='CAAT attached' draggable='false'>" : "") +
        // a detached Security Element and a Hero have no counter of their own on the map either
        (u.markers.indexOf("security element detached") >= 0 ? "<img class='pf-badge-r' src='" + ART_DIR + "security.png' alt='Security Element' title='Security Element detached' draggable='false'>" : "") +
        (u.markers.some(function (m) { return m.indexOf("hero") === 0; }) ? "<img class='pf-badge-l' src='" + ART_DIR + "hero-" + (u.markers.indexOf("hero (Medal of Honor)") >= 0 ? 2 : 1) + ".png' alt='Hero' title='Hero' draggable='false'>" : "") +
        "<span>" +
        (u.kind === "suspect" ? "?" : u.cf) + "</span></button>" +
        outcomeStamp(u.uid, "left:calc(" + mx(xy[0]) + " + " + (off * 12) + "px);top:calc(" + my(xy[1]) + " + " + (off * 9) + "px)");
    });
    html += outcomeLayer();
    html += renderTracks(s, proj);
    html += lessonLinks();
    if (app.shotFx && Date.now() < app.shotFx.until) html += app.shotFx.html;
    html += "</div>";
    els.board.innerHTML = html;
    els.board.classList.toggle("lesson-lock", !!app.tutorial);
    els.board.classList.toggle("lesson-quiz", !!quizOpen());
    els.board.querySelectorAll(".pf-unit").forEach(function (n) {
      n.addEventListener("click", function () {
        if (quizClick(n)) return;
        app.controller.clickUnit(n.dataset.uid); refresh();
      });
    });
    els.board.querySelectorAll(".pf-loc").forEach(function (n) {
      n.addEventListener("click", function () {
        if (quizClick(n)) return;
        var parts = n.dataset.loc.split(":"); app.controller.clickLoc(+parts[0], parts[1]); refresh();
      });
    });
    els.board.querySelectorAll(".pf-street").forEach(function (n) {
      n.addEventListener("click", function () { app.controller.clickStreet(+n.dataset.street); refresh(); });
    });
    els.board.querySelectorAll(".pf-zone").forEach(function (n) {
      n.addEventListener("click", function () { if (quizClick(n)) return; app.controller.clickZone(+n.dataset.zone); refresh(); });
    });
  }

  function renderPools() {
    var proj = project(app.session.state);
    var pools = { setup: "Drawn squads — place one per Start Zone", company: "Company reinforcements",
      battalion: "Battalion reinforcements", iif: "IIF reinforcements", caat: "CAAT supports — attach to a squad",
      abrams: "Abrams — click, then a Street next to a USMC Zone" };
    var html = "";
    Object.keys(pools).forEach(function (pk) {
      var us = proj.units.filter(function (u) { return u.pool === pk; });
      if (!us.length) return;
      html += "<div class='pool-label'>" + pools[pk] + "</div><div class='pool-row'>";
      us.forEach(function (u) {
        var face = faceFor(u);
        html += "<button class='pf-unit pool kind-" + u.kind + (app.controller.selected === u.uid ? " sel" : "") +
          "' data-uid='" + u.uid + "' data-pool='" + pk + "' aria-label='" + u.name + "' title='" + u.name + "'><img src='" + face.image + "' alt=''>" +
          (u.kind === "suspect" ? "<span>?</span>" : u.cf != null ? "<span>" + u.cf + "</span>" : "") + "</button>";
      });
      html += "</div>";
    });
    els.pools.innerHTML = html || "<div class='pool-label'>Reserves empty</div>";
    els.pools.querySelectorAll(".pf-unit").forEach(function (n) {
      n.addEventListener("click", function () {
        app.controller.clickUnit(n.dataset.uid);
        // Picking a reserve piece is the start of a board gesture: close
        // the popup so the board is there to receive the second click.
        closePopups();
        refresh();
      });
    });
  }

  // Dock buttons with nothing to offer now are greyed (owner, 2026-10-31):
  // Decide stays openable (Save and Load live there) but greys with no decision.
  function renderAvailability() {
    var s = app.session.state, dec = $("dock-decisions");
    if (app.tutorial || G.isOver(s)) { if (dec) dec.classList.remove("idle"); return; }
    var any = s.pending || G.legalActions(s).some(function (a) { return a.type !== "endPhase"; });
    if (dec) dec.classList.toggle("idle", !any);
  }

  // ------------------------------------------------------- reserve tray
  // The reserves the rules let the player bring on right now, in a tray
  // over the map's top edge: no scrim, open from one placement to the next,
  // gone when nothing is left to place. Which pieces show comes from the
  // engine's legal actions, so the tray never offers a refusal.
  var TRAY_LABEL = { setup: "Drawn squads", company: "Company reinforcements", battalion: "Battalion reinforcements",
    iif: "IIF reinforcements", caat: "CAATs", abrams: "Abrams" };
  var TRAY_HINT = { setup: "pick one, then a glowing Start Zone", caat: "pick one, then a lit squad",
    abrams: "pick it, then a Street next to a USMC Zone" };
  function trayUnits() {
    var s = app.session && app.session.state;
    if (!s || app.tutorial || G.isOver(s) || s.pending) return [];
    var legal = G.legalActions(s);
    return project(s).units.filter(function (u) {
      if (!u.pool) return false;
      return legal.some(function (a) { return a.uid === u.uid && gestureOf(a) || a.caat === u.uid || (u.uid === "abrams" && a.type === "placeAbrams"); });
    });
  }
  // Air support in the Support Phase: the three mission markers, each
  // while it has uses left and somewhere to go [9.3].
  function trayMissions() {
    var s = app.session && app.session.state;
    if (!s || app.tutorial || G.isOver(s) || s.pending || s.phase !== "support") return [];
    var legal = G.legalActions(s);
    return ["dragonEye", "cobra", "hornet"].filter(function (m) {
      return legal.some(function (a) { return a.type === "mission" && a.mission === m; });
    });
  }
  function renderTray() {
    var tray = $("reserve-tray"); if (!tray) return;
    var ms = trayMissions();
    if (ms.length) {
      if (tray.hidden) tray.hidden = false;
      var s = app.session.state, used = { dragonEye: s.support.dragonEye, cobra: s.support.cobra, hornet: s.support.hornet };
      var max = { dragonEye: B.counters.support.dragonEye.max, cobra: B.counters.support.superCobra.max, hornet: B.counters.support.hornet.max };
      $("reserve-tray-k").textContent = "Air support";
      $("reserve-tray-hint").textContent = "— pick a mission, then a lit Zone; or save them";
      var row = $("reserve-tray-row"), html = "";
      ms.forEach(function (m) {
        html += "<button class='pf-unit pool tray mission" + (app.controller.mission === m ? " sel" : "") + "' data-mission='" + m +
          "' aria-label='" + MISSION_NAME[m] + "' title='" + MISSION_NAME[m] + " — " + (max[m] - used[m]) + " left'><img src='" + ART_DIR + MISSION_FILE[m] +
          "' alt=''><span>" + (max[m] - used[m]) + "</span></button>";
      });
      row.innerHTML = html;
      row.querySelectorAll(".pf-unit").forEach(function (n) {
        n.addEventListener("click", function () { app.controller.pickMission(n.dataset.mission); refresh(); });
      });
      return;
    }
    var us = trayUnits();
    if (tray.hidden !== !us.length) tray.hidden = !us.length;
    if (!us.length) return;
    var pools = []; us.forEach(function (u) { if (pools.indexOf(u.pool) < 0) pools.push(u.pool); });
    $("reserve-tray-k").textContent = pools.map(function (pk) { return TRAY_LABEL[pk] || pk; }).join(" · ");
    $("reserve-tray-hint").textContent = pools.length === 1 && TRAY_HINT[pools[0]] ? "— " + TRAY_HINT[pools[0]]
      : "— pick one, then a glowing place on the map";
    var row = $("reserve-tray-row"), html = "";
    us.forEach(function (u) {
      var face = faceFor(u);
      html += "<button class='pf-unit pool tray kind-" + u.kind + (app.controller.selected === u.uid ? " sel" : "") +
        "' data-uid='" + u.uid + "' data-pool='" + u.pool + "' aria-label='" + u.name + "' title='" + u.name + "'><img src='" + face.image + "' alt=''>" +
        (u.kind === "suspect" ? "<span>?</span>" : u.cf != null ? "<span>" + u.cf + "</span>" : "") + "</button>";
    });
    row.innerHTML = html;
    row.querySelectorAll(".pf-unit").forEach(function (n) {
      n.addEventListener("click", function () { app.controller.clickUnit(n.dataset.uid); refresh(); });
    });
  }

  // ---------------------------------------------------------- right panel
  function changeTone(line) {
    if (/eliminated|reduced|Pinned|Defensive|Sniper|HBIED|Step Loss/.test(line)) return "bad";
    if (/USMC-controlled|VP \+|entered play/.test(line)) return "good";
    if (/→|began\./.test(line)) return "phase";
    return "";
  }
  function renderChanges() {
    var list = $("change-list");
    if (!list) return;
    var latest = app.changeEntries[0];
    $("change-stamp").textContent = latest ? latest.title : "No changes yet";
    $("change-summary").textContent = latest && latest.lines.length ? latest.lines[0] : "Nothing has changed yet.";
    list.innerHTML = "";
    app.changeEntries.forEach(function (entry, idx) {
      var show = idx === 0 ? entry.lines : entry.lines.slice(0, 3);
      show.forEach(function (line) {
        var li = document.createElement("li");
        li.className = changeTone(line);
        li.textContent = (idx === 0 ? "" : entry.title + ": ") + line;
        list.appendChild(li);
      });
      if (idx === 0 && entry.total > entry.lines.length) {
        var more = document.createElement("li");
        more.textContent = "+ " + (entry.total - entry.lines.length) + " more — see the Game log.";
        list.appendChild(more);
      }
    });
    // the dock button wears a badge until the feed has been read
    app.changeStamp = latest ? latest.title + "|" + (latest.lines[0] || "") : null;
    var badge = $("dock-changes-badge"), pop = $("popup-changes");
    if (badge && pop) badge.hidden = !pop.hidden || !app.changeStamp || app.changeStamp === app.changesSeen;
  }

  // ------------------------------------------------------ decision panel
  // The floating panel is a second road to the same legalActions: every
  // playable piece, everything the selected piece can do, the phase-wide
  // actions, and END PHASE pinned at the foot. It opens itself whenever
  // the decision context changes (a new phase, a new turn, a decision
  // left waiting by an effect); between those moments the player may
  // close it and reopen it from the "Your move" button.
  function decisionActionButton(a) {
    var b = document.createElement("button");
    b.className = "btn" + (app.session.state.pending ? " primary" : "");
    b.textContent = a.label || a.type;
    b.title = a.cite || "";
    b.dataset.actionType = a.type;
    b.addEventListener("click", function () { app.perform(a); });
    return b;
  }
  function renderDecisionPanel() {
    var panel = $("decision-panel"), dockBtn = $("dock-decisions"), badge = $("dock-decisions-badge");
    if (!panel || !app.session) return;
    var s = app.session.state;
    if (app.tutorial || G.isOver(s)) {
      if (!panel.hidden) closePopups();
      // shown (to look at, not to press) while the controls tour points at the dock
      var tour = app.tutorial && app.tutorial.current() && app.tutorial.current().chrome;
      if (dockBtn) dockBtn.hidden = !tour;
      return;
    }
    if (dockBtn) dockBtn.hidden = false;
    var key = s.turn + ":" + s.phase + ":" + (s.pending ? s.pending.kind : "");
    if (app.decisionKey !== key) {
      app.decisionKey = key;
      var scroller = panel.querySelector(".decision-scroll");
      if (scroller) scroller.scrollTop = 0;
      // A popup like the others: it waits behind its dock button, which
      // wears a badge for a new phase. Only a decision the game is paused
      // on (an effect needs the player's call) opens it unasked.
      if (s.pending && !app.decisionOpen && !anyPopupOpen()) { openPopup("decision-panel"); return; }
    }
    app.decisionOpen = !panel.hidden;
    if (badge) badge.hidden = app.decisionOpen || app.decisionSeenKey === key;
    if (app.decisionOpen) app.decisionSeenKey = key;
    if (!app.decisionOpen) return;
    if (app.controller.selected) app.decisionActor = app.controller.selected;
    var legal = G.legalActions(s);
    $("decision-title").textContent = s.pending ? "Decision required" : (PHASE_NAMES[s.phase] || s.phase);
    $("decision-subtitle").textContent = els.prompt.textContent;
    var end = legal.filter(function (a) { return a.type === "endPhase"; })[0];
    var alert = $("decision-alert");
    if (s.pending) {
      alert.hidden = false;
      alert.textContent = "The game is paused on one decision — an effect needs your call. Choose below; END PHASE unlocks once it is resolved.";
    } else if (!end && s.phase === "setup") {
      alert.hidden = false;
      alert.textContent = "Finish Setup — every squad placed, every CAAT attached — to unlock END PHASE.";
    } else if (!end && s.phase === "movement") {
      alert.hidden = false;
      alert.textContent = "END PHASE is locked until every piece ends its move in a legal position.";
    } else alert.hidden = true;
    var endBtn = $("btn-decision-end");
    endBtn.disabled = !end;
    endBtn.textContent = end ? "END PHASE" : "END PHASE (locked)";

    var piecesEl = $("decision-pieces");
    piecesEl.innerHTML = "";
    var friendly = project(s).units.filter(function (u) {
      return ["squad", "iif", "caat", "abrams"].indexOf(u.kind) >= 0;
    });
    friendly.sort(function (a, b) {
      return (a.pool ? 0 : 1) - (b.pool ? 0 : 1) || a.name.localeCompare(b.name);
    });
    friendly.forEach(function (u) {
      var acts = app.controller.actionsOf(u.uid);
      var b = document.createElement("button");
      b.className = "decision-piece" + (app.decisionActor === u.uid ? " selected" : "") + (!acts.length ? " no-actions" : "");
      b.dataset.decisionUid = u.uid;
      var face = faceFor(u);
      b.innerHTML = "<img src='" + face.image + "' alt=''><span class='piece-main'>" + u.name +
        "<small>" + posLabel(u) + (u.markers.length ? " · " + u.markers.join(", ") : "") + "</small></span>" +
        "<span class='piece-count'>" + (acts.length ? acts.length + (acts.length === 1 ? " action" : " actions") : "—") + "</span>";
      b.addEventListener("click", function () {
        app.decisionActor = u.uid;
        if (app.controller.selected !== u.uid) app.controller.clickUnit(u.uid);
        // a reserve piece is placed by clicking the map: clear the way
        if (u.pool && app.controller.selected === u.uid) closePopups();
        refresh();
      });
      piecesEl.appendChild(b);
    });
    if (!friendly.length) piecesEl.innerHTML = "<div class='decision-empty'>No pieces on the table.</div>";

    var actEl = $("decision-actions");
    actEl.innerHTML = "";
    var list, title;
    if (s.pending) { list = legal.slice(); title = "Resolve this decision"; }
    else if (app.decisionActor && s.units[app.decisionActor]) {
      list = app.controller.actionsOf(app.decisionActor);
      title = "Actions — " + G.unitName(s, s.units[app.decisionActor]);
    } else { list = []; title = "Actions for the selected piece"; }
    $("decision-action-title").textContent = title;
    if (!list.length) {
      var d = document.createElement("div");
      d.className = "decision-empty";
      d.textContent = s.pending ? "No choices are offered." :
        "Choose one of your pieces above — everything it can do appears here, and its targets light up on the board.";
      actEl.appendChild(d);
    }
    list.forEach(function (a) { actEl.appendChild(decisionActionButton(a)); });

    var phEl = $("decision-phase-actions");
    phEl.innerHTML = "";
    // Air support is played on the map from the tray (owner, 2026-10-31),
    // so its dozens of Zone and target choices are not listed here.
    var phaseActs = s.pending ? [] : legal.filter(function (a) {
      return !actionActor(a) && a.type !== "endPhase" && a.type !== "mission";
    });
    var eye = !s.pending && legal.some(function (a) { return a.type === "mission"; });
    if (!phaseActs.length && !eye) {
      var d2 = document.createElement("div");
      d2.className = "decision-empty";
      d2.textContent = s.pending ? "Phase actions unlock after this decision." : "No phase-wide actions right now.";
      phEl.appendChild(d2);
    }
    if (eye) {
      var de = document.createElement("div");
      de.className = "decision-empty decision-eye";
      de.textContent = "Air support is played on the map: take Dragon Eye, Super Cobra or Hornet from the tray at the top of the map, then click a lit Zone.";
      phEl.insertBefore(de, phEl.firstChild);
    }
    phaseActs.forEach(function (a) { phEl.appendChild(decisionActionButton(a)); });

    var saved = app.store.list().filter(function (x) { return x.slot === 1; })[0];
    $("decision-save-note").textContent = saved
      ? "Saved game: " + (saved.meta.label || "slot 1") + (saved.savedAt ? " · " + String(saved.savedAt).slice(0, 10) : "") + "."
      : "No saved game yet — Save in progress works at any point, even mid-phase.";
    $("btn-decision-load").disabled = !saved;
  }

  function log(text, cls) {
    var line = document.createElement("div");
    line.className = "line" + (cls ? " " + cls : "");
    line.textContent = text;
    els.log.appendChild(line);
    els.log.scrollTop = els.log.scrollHeight;
  }
  var whyTimer = null;
  function say(text, cls) {
    els.why.textContent = text;
    els.why.className = "why show " + (cls || "");
    clearTimeout(whyTimer);
    whyTimer = setTimeout(function () { els.why.className = "why"; }, 3200);
  }
  function showEnd(over) {
    $("end-title").textContent = over.winner === "you" ? "Fallujah is yours" : "The Insurgents hold";
    $("end-body").textContent = over.why;
    els.end.hidden = false;
  }
  function hideEnd() { els.end.hidden = true; }

  // ------------------------------------------------------------ play guide
  // The status card says where the game is: the turn's phases with this one
  // lit, what to do now (Setup as a checklist), and what comes next, with
  // the button that goes there (data/phantomfury_guide.js).
  var GUIDE = global.PhantomFuryGuide || null;
  function setupCounts(s) {
    var placed = s.setupQueue.filter(function (uid) { return !!s.units[uid].pos; }).length;
    var caats = Object.keys(s.units).map(function (k) { return s.units[k]; }).filter(function (u) { return u.kind === "caat"; });
    return { placed: placed, squads: s.setupQueue.length,
      attached: caats.filter(function (c) { return !!c.attachedTo; }).length, caats: caats.length };
  }
  function guideButton(label, fn, primary) {
    var b = document.createElement("button");
    b.className = "btn" + (primary ? " primary" : ""); b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }
  function renderGuide(s) {
    var track = $("phase-track"), steps = $("guide-steps"), acts = $("guide-acts"), next = $("guide-next");
    if (!GUIDE || !track) return;
    var order = GUIDE.track, over = G.isOver(s), here = over ? order.length : order.indexOf(s.phase);
    var nextKey = s.phase === "setup" ? "support" : (s.phase === "assault" ? "reorg" : order[here + 1]);
    track.innerHTML = "";
    order.forEach(function (k, i) {
      var li = document.createElement("li");
      li.textContent = GUIDE.phases[k].short;
      li.dataset.phase = k;
      li.title = GUIDE.phases[k].name + " " + GUIDE.phases[k].cite;
      if (k === "setup") li.classList.add("setup-only");
      if (!over && k === s.phase) li.classList.add("now");
      else if (i < here) li.classList.add("done");
      else if (!over && k === nextKey) li.classList.add("next");
      track.appendChild(li);
    });
    steps.hidden = true; acts.hidden = true; next.innerHTML = "";
    steps.innerHTML = ""; acts.innerHTML = "";
    if (over || app.tutorial) return;
    if (s.pending) { next.textContent = "Answer the decision first; the phase goes on after it."; return; }
    var ph = GUIDE.phases[s.phase]; if (!ph) return;
    var legal = G.legalActions(s), end = legal.filter(function (a) { return a.type === "endPhase"; })[0];
    var moves = legal.filter(function (a) { return a.type !== "endPhase"; });
    els.prompt.textContent = ph.name + ": " + (moves.length || !ph.empty ? ph.now : ph.empty);
    if (s.phase === "setup") {
      var c = setupCounts(s), sq = c.placed >= c.squads, pick = app.controller.selected && s.units[app.controller.selected];
      var pickName = function (u) { var pu = project(s).units.filter(function (x) { return x.uid === u.uid; })[0]; return pu ? pu.name : "it"; };
      if (pick && pick.kind === "caat" && !pick.attachedTo) els.prompt.textContent = "Now click a placed squad to attach " + pickName(pick) + ".";
      else if (pick && !pick.pos && s.setupQueue.indexOf(pick.uid) >= 0) els.prompt.textContent = "Now click a glowing Start Zone for " + pickName(pick) + ".";
      [{ t: ph.steps[0] + " " + ph.steps[1], n: c.placed + "/" + c.squads, done: sq },
       { t: ph.steps[2], n: c.attached + "/" + c.caats, done: c.attached >= c.caats }].forEach(function (x, i) {
        var li = document.createElement("li");
        li.className = x.done ? "done" : ((i === 0 || sq) ? "now" : "");
        li.innerHTML = "<span class='tick'>" + (x.done ? "✓" : (i + 1)) + "</span><span></span><span class='count'></span>";
        li.children[1].textContent = x.t; li.children[2].textContent = x.n;
        steps.appendChild(li);
      });
      steps.hidden = false;
      acts.appendChild(guideButton("Auto setup", autoSetup));
      acts.hidden = false;
      next.innerHTML = "<b>Next:</b> ";
      next.appendChild(document.createTextNode(ph.next));
      return;
    }
    if (s.phase === "support" && moves.length) {
      // the air-support markers wait in the tray at the top of the map
    }
    var nx = GUIDE.phases[nextKey];
    next.innerHTML = "<b>Next:</b> ";
    next.appendChild(document.createTextNode(s.phase === "assault"
      ? "Reorganisation (automatic), then Turn " + (s.turn < 16 ? s.turn + 1 : "16 ends") + (s.turn < 16 ? " Support." : ".")
      : nx.name + ". End this phase when you are done here."));
    if (end) {
      next.appendChild(document.createElement("br"));
      var b = guideButton("End " + ph.short + " ▸ " + (s.phase === "assault" ? "Reorganise" : nx.short), function () {
        var e = G.legalActions(app.session.state).filter(function (a) { return a.type === "endPhase"; })[0];
        if (e) app.perform(e);
      }, !moves.length);
      b.id = "btn-guide-end";
      next.appendChild(b);
    }
  }

  // Ready to play: when no game is under way (a fresh table after Play, New
  // match, or out of a lesson), the way into a real game.
  function showReady() {
    if (!GUIDE || app.tutorial || !app.session || app.session.state.phase !== "setup") return;
    if (!$("title-screen").hidden) return;
    var R = GUIDE.ready;
    $("ready-kicker").textContent = R.kicker;
    $("ready-head").textContent = R.head;
    $("ready-body").textContent = R.body;
    fill("ready-steps", GUIDE.phases.setup.steps, function (t) { var li = document.createElement("li"); li.textContent = t; return li; });
    $("btn-ready-setup").textContent = R.setup;
    $("btn-ready-auto").textContent = R.auto;
    $("btn-ready-learn").textContent = R.learn;
    $("btn-ready-title").textContent = R.title;
    closePopups();
    $("ready").hidden = false;
    $("btn-ready-setup").focus();
  }
  function hideReady() { $("ready").hidden = true; }
  function wireReady() {
    $("btn-ready-setup").addEventListener("click", function () { hideReady(); refresh(); });   // the reserve tray is already out
    $("btn-ready-auto").addEventListener("click", function () { hideReady(); autoSetup(); });
    $("btn-ready-learn").addEventListener("click", function () { hideReady(); openChapters(); });
    $("btn-ready-title").addEventListener("click", function () { hideReady(); showTitle(); });
  }

  // -------------------------------------------------------------- newcomer
  function fill(id, items, make) {
    var n = $(id); n.innerHTML = "";
    items.forEach(function (x) { n.appendChild(make(x)); });
  }
  function renderPrimer() {
    if (!PRIMER) return;
    $("primer-goal").textContent = PRIMER.goal;
    fill("primer-turn", PRIMER.turn, function (t) {
      var li = document.createElement("li");
      li.textContent = t.step;
      if (t.cite) { var c = document.createElement("span"); c.className = "cite"; c.textContent = t.cite; li.appendChild(c); }
      return li;
    });
    fill("primer-decisions", PRIMER.decisions, function (d) {
      var li = document.createElement("li"); li.textContent = d; return li;
    });
    var dl = $("primer-terms"); dl.innerHTML = "";
    Object.keys(PRIMER.terms || {}).forEach(function (k) {
      var dt = document.createElement("dt"); dt.textContent = k;
      var dd = document.createElement("dd"); dd.textContent = PRIMER.terms[k];
      dl.appendChild(dt); dl.appendChild(dd);
    });
  }
  function showPrimer() { renderPrimer(); $("primer").hidden = false; }
  function hidePrimer() { $("primer").hidden = true; }
  // The title screen: shown every time the page opens, and from the menu's
  // logo. Play starts a new match; Learn to play opens the chapters; Load
  // restores the saved game (greyed when there is none).
  function savedGame() { return app.store.list().filter(function (x) { return x.slot === 1; })[0] || null; }
  function showTitle() {
    var T = global.PhantomFuryTitle, n = $("title-screen");
    if (!T || !n) return;
    $("ts-kicker").textContent = T.kicker;
    $("ts-name").textContent = T.name;
    $("ts-sub").textContent = T.sub;
    $("ts-orig-head").textContent = T.original.head;
    $("ts-orig-text").textContent = T.original.text;
    $("ts-orig-owns").textContent = T.original.owns;
    $("ts-priv-head").textContent = T.privacy.head;
    $("ts-priv-text").textContent = T.privacy.text;
    $("ts-vibe-head").textContent = T.vibe.head;
    $("ts-vibe-text").textContent = T.vibe.text;
    $("ts-version").textContent = "Version 1 · kit 0.5.0 · " + T.updated;
    var B = T.buttons, saved = savedGame();
    $("btn-title-play").querySelector("span").textContent = B.play.label;
    $("btn-title-play").querySelector("small").textContent = B.play.sub;
    $("btn-title-learn").querySelector("b").textContent = B.learn.label;
    $("btn-title-learn").querySelector("small").textContent = B.learn.sub;
    $("btn-title-load").querySelector("b").textContent = B.load.label;
    $("btn-title-load").querySelector("small").textContent = saved
      ? (saved.meta.label || "Slot 1") + (saved.savedAt ? " · saved " + String(saved.savedAt).slice(0, 10) : "")
      : B.load.sub;
    $("btn-title-load").disabled = !saved;
    closePopups(); hideReady();
    n.hidden = false;
    $("btn-title-play").focus();
  }
  function hideTitle() { $("title-screen").hidden = true; }
  function wireNewcomer() {
    $("btn-primer").addEventListener("click", showPrimer);
    $("btn-primer-close").addEventListener("click", hidePrimer);
    $("btn-primer-learn").addEventListener("click", function () { hidePrimer(); openChapters(); });
    $("btn-title-play").addEventListener("click", function () {
      // the first time, the table the page just set up (it keeps a ?seed=);
      // from the logo later on, a fresh match
      hideTitle();
      if (app.titleBoot) { app.titleBoot = false; showReady(); return; }
      app.chapter = null; app.outcome = null; closeChapters(); newMatch(); showReady();
    });
    $("btn-title-learn").addEventListener("click", function () { app.titleBoot = false; hideTitle(); openChapters(); });
    $("btn-title-load").addEventListener("click", function () { app.titleBoot = false; hideTitle(); loadGame(); });
    $("btn-title").addEventListener("click", showTitle);
    $("btn-chapters-close").addEventListener("click", function () { closeChapters(); showReady(); });
    wireReady();
    $("btn-leave").addEventListener("click", leaveLesson);
    $("btn-back").addEventListener("click", function () { if (DIR()) DIR().back(); });
    $("btn-why").addEventListener("click", function () { $("tutor").classList.toggle("why-open"); if (DIR()) DIR().layout(); });
    app.titleBoot = true;
    showTitle();
  }

  // --------------------------------------------------------------- tutorial
  function lessonMove(action) {
    // a puzzle beat: a legal move that does not answer it is refused in the
    // guide's words before the engine sees it
    var b = app.tutorial.current();
    if (b && b.accept && app.tutorial.wants(action)) {
      var ok = b.accept(app.tutorial.state, action);
      if (ok !== true) {
        say(ok, "bad");
        if (DIR()) DIR().refused(ok);
        return { ok: false, why: ok };
      }
    }
    var r = app.tutorial.offer(action);
    if (!r.ok) {
      var why = r.why || ("The lesson could not take that move: " + r.error);
      say(why, "bad");
      if (DIR()) DIR().refused(why);
      return { ok: false, why: r.why };
    }
    app.session.state = app.tutorial.state;
    return { ok: true, state: app.tutorial.state, records: r.records, events: r.events };
  }
  // Out of a chapter, finished or not, the chapter list comes back.
  function endLesson() { app.chapter = null; app.outcome = null; newMatch(); openChapters(); }
  // Leaving a lesson part-way: a fresh table and the way into a real game
  // (Ready to play offers the chapters again).
  function leaveLesson() { app.chapter = null; app.outcome = null; newMatch(); showReady(); }

  // ------------------------------------------------------ the chapter list
  // Learn to play opens the chapters (docs/LESSON_PLAN.md): a tick on each
  // one finished (this browser only), "Start here" on the first one not
  // yet done, and the chapters still to be built shown but closed.
  var DONE_KEY = "phantomfury.chapters.done";
  function chaptersDone() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); } catch (e) { return []; }
  }
  function markChapterDone(id) {
    var d = chaptersDone();
    if (d.indexOf(id) < 0) d.push(id);
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) { /* private window: no ticks */ }
  }
  function openChapters() {
    hideEnd(); closePopups();
    var list = $("chapter-list"), done = chaptersDone(), next = null;
    list.innerHTML = "";
    TUT.chapters.forEach(function (ch, i) {
      var ready = !!ch.beats, isDone = done.indexOf(ch.id) >= 0;
      if (ready && !isDone && !next) next = ch.id;
      var li = document.createElement("li");
      li.style.setProperty("--i", i);
      var b = document.createElement("button");
      b.className = "chapter" + (isDone ? " done" : "") + (ready ? "" : " soon") + (next === ch.id ? " next" : "");
      b.dataset.chapter = ch.id;
      b.disabled = !ready;
      b.innerHTML = "<span class='chapter-n'></span><span class='chapter-body'><span class='chapter-title'></span>" +
        "<span class='chapter-blurb'></span></span><span class='chapter-tag'></span>";
      b.querySelector(".chapter-n").textContent = isDone ? "✓" : String(ch.n);
      b.querySelector(".chapter-title").textContent = ch.title;
      b.querySelector(".chapter-blurb").textContent = ch.blurb;
      b.querySelector(".chapter-tag").textContent = !ready ? "Coming soon" : next === ch.id ? "Start here" : ch.mode;
      if (ready) b.addEventListener("click", function () { closeChapters(); startTutorial(ch.id); });
      li.appendChild(b);
      list.appendChild(li);
    });
    $("chapters").hidden = false;
  }
  function closeChapters() { $("chapters").hidden = true; }

  // A quiz beat asks the player to find a piece on the map. It is the
  // page's check, not a game move: the state never changes, and Next
  // opens once the right piece is clicked.
  function pickFocus(p) {
    return p.kind === "unit" ? { units: [p.key] } : p.kind === "loc" ? { locs: [p.key] } : { zones: [+p.key] };
  }
  // Off-map pieces a beat shows in the bubble: the drawn squads, the CAATs.
  // Clicking one picks it up, as clicking it in the Pieces popup would.
  function trayOf(uids) {
    var proj = project(app.session.state);
    return uids.map(function (uid) {
      var u = proj.units.filter(function (x) { return x.uid === uid; })[0];
      return u ? { uid: uid, image: faceFor(u).image, cf: u.cf, name: u.name, sel: app.controller.selected === uid } : null;
    }).filter(Boolean);
  }
  app.trayPick = function (uid) { app.controller.clickUnit(uid); refresh(); renderBeat(); };
  function quizOpen() {
    var b = app.tutorial && app.tutorial.current();
    return b && b.quiz && app.quizSolved !== app.tutorial.i ? b.quiz : null;
  }
  // A quiz asks for a piece (kind "unit": uids), a place (kind "loc":
  // "zone:loc" keys) or a Zone (kind "zone": Zone numbers as strings). A
  // click on a piece standing on a place answers for that place, and a
  // click anywhere in a Zone answers for the Zone.
  function quizKey(q, el) {
    var kind = q.kind || "unit";
    if (kind === "unit") return el.dataset.uid || null;
    if (kind === "loc") return el.dataset.loc || el.dataset.at || null;
    return el.dataset.zone || null;
  }
  // the right answers, the ones inside the ring (what the player can see) first
  function quizAnswers() {
    var q = quizOpen(), s = app.session.state;
    if (!q) return [];
    var b = app.tutorial.current(), f = typeof b.focus === "function" ? b.focus(s) : b.focus;
    var ring = f ? [].concat(f.units || [], f.locs || [], (f.zones || []).map(String)) : [];
    return q.answers(s).slice().sort(function (x, y) { return (ring.indexOf(y) >= 0) - (ring.indexOf(x) >= 0); });
  }
  // where on the page an answer can be clicked (the live check uses it)
  function quizSelector(key) {
    var kind = (quizOpen() || {}).kind || "unit";
    if (kind === "unit") return "#board .pf-unit[data-uid='" + key + "']";
    if (kind === "loc") return document.querySelector("#board [data-loc='" + key + "']")
      ? "#board [data-loc='" + key + "']" : "#board .pf-unit[data-at='" + key + "']";
    // a Zone is answered by a click anywhere in it: its Location dots are the
    // biggest targets (the small Zone tile sits under them)
    var inZone = ["#board .pf-loc[data-zone='" + key + "']", "#board .pf-unit[data-zone='" + key + "']"]
      .filter(function (sel) { return document.querySelector(sel); })[0];
    return inZone || "#board .pf-zone[data-zone='" + key + "']";
  }
  function quizClick(el) {
    var q = quizOpen();
    if (!q) return false;
    var key = quizKey(q, el), s = app.session.state;
    if (key == null) return true;
    if (quizAnswers().indexOf(key) >= 0) {
      app.quizSolved = app.tutorial.i; app.quizPick = { kind: q.kind || "unit", key: key };
      if (DIR()) DIR().quizRight(q.right);
      refresh(); renderBeat();
    } else if (DIR()) {
      var u = el.dataset.uid && s.units[el.dataset.uid];
      var what = (q.kind || "unit") === "unit" ? (u ? G.unitName(s, u) : null)
        : q.kind === "loc" ? "Zone " + key.split(":")[0] + ", Location " + key.split(":")[1] : "Zone " + key;
      DIR().refused(q.wrong + (what ? " (That was " + what + ".)" : ""));
    }
    return true;
  }
  // ------------------------------------------------------------ in hand
  // The piece the player has picked rides in the status card's "In hand"
  // slot, and a dashed arrow runs from it (or from the piece itself, when
  // it is on the map) to every place it may go. Hovering a target makes
  // its arrow bold and says what the click will do. The targets come from
  // the engine's legal actions, so an arrow is never drawn to a refusal.
  var HAND_VERB = { moveStep: "Move here", fire: "Fire at", assault: "Assault",
    setupPlace: "Place in", place: "Bring on in", setupCaat: "Attach the CAAT to", placeAbrams: "Abrams onto" };
  function handTargets(uid) {
    if (!uid || !app.session) return [];
    var s = app.session.state, seen = {}, out = [];
    var mm = /^mission:(\w+)$/.exec(uid);
    if (mm) {
      if (app.controller.cobraZone != null) return [];
      app.controller.missionOptions(mm[1]).forEach(function (a) {
        var key = "z:" + a.zone; if (seen[key]) return;
        seen[key] = { key: key, sel: "#board .pf-zone[data-zone='" + a.zone + "']", what: "Zone " + a.zone, zone: a.zone,
          verbs: [{ dragonEye: "Fly the Dragon Eye over", cobra: "Super Cobra on", hornet: "Hornet strike on" }[mm[1]]] };
        out.push(seen[key]);
      });
      return out;
    }
    G.legalActions(s).forEach(function (a) {
      var key = null, sel = null, what = "";
      if (a.type === "setupCaat" && a.caat === uid) {
        key = "u:" + a.uid; sel = "#board .pf-unit[data-uid='" + a.uid + "']"; what = G.unitName(s, s.units[a.uid]);
      } else if (a.type === "placeAbrams" && uid === "abrams") {
        key = "s:" + a.street; sel = "#board .pf-street[data-street='" + a.street + "']"; what = "Street Section " + a.street;
      } else if (a.uid === uid) {
        var g = gestureOf(a); if (!g) return;
        if (g.target) { key = "u:" + g.target; sel = "#board .pf-unit[data-uid='" + g.target + "']"; what = G.unitName(s, s.units[g.target]); }
        else if (g.zone) { key = "z:" + g.zone; sel = "#board .pf-zone[data-zone='" + g.zone + "']"; what = (a.type === "setupPlace" ? "Start Zone " : "Zone ") + g.zone; }
        else if (g.to && g.to.street != null) { key = "s:" + g.to.street; sel = "#board .pf-street[data-street='" + g.to.street + "']"; what = "Street Section " + g.to.street; }
        else if (g.to) {
          var lk = g.to.zone + ":" + g.to.loc; key = "l:" + lk;
          sel = "#board .pf-loc[data-loc='" + lk + "'], #board .pf-unit[data-at='" + lk + "']";
          what = "Zone " + g.to.zone + ", Location " + g.to.loc;
        }
      }
      if (!key) return;
      var verb = HAND_VERB[a.type] || "Go to";
      if (seen[key]) { if (seen[key].verbs.indexOf(verb) < 0) seen[key].verbs.push(verb); return; }
      seen[key] = { key: key, sel: sel, what: what, verbs: [verb], zone: key[0] === "z" ? +key.slice(2) : null };
      out.push(seen[key]);
    });
    return out;
  }
  var MISSION_NAME = { dragonEye: "Dragon Eye UAV", cobra: "AH-1W Super Cobra", hornet: "F/A-18 Hornet" };
  var MISSION_FILE = { dragonEye: "dragon-eye.png", cobra: "super-cobra.png", hornet: "hornet.png" };
  function handUnit() {
    var m = app.controller && app.controller.mission;
    if (m && app.session && !app.tutorial)
      return { uid: "mission:" + m, mission: m, name: MISSION_NAME[m], art: ART_DIR + MISSION_FILE[m] };
    var uid = app.controller && app.controller.selected;
    if (!uid || !app.session || app.tutorial) return null;
    var proj = project(app.session.state);
    return proj.units.filter(function (u) { return u.uid === uid; })[0] || (uid === "abrams" ? { uid: "abrams", name: "Abrams", kind: "abrams" } : null);
  }
  function renderHand() {
    var hand = $("hand"), u = handUnit();
    if (!hand) return;
    var tg = u ? handTargets(u.uid) : [];
    hand.hidden = !u;
    if (u && u.mission) {
      // an air-support marker: where it may strike, or (a Cobra over its
      // Zone) which pieces to remove, as buttons with the engine's labels
      var ctl = app.controller, opts = ctl.missionOptions(u.mission, ctl.cobraZone);
      $("hand-token").innerHTML = "<span class='pf-unit hand-face mission'><img src='" + u.art + "' alt=''></span>";
      var zones = {}; opts.forEach(function (a) { zones[a.zone] = true; });
      var nz = Object.keys(zones).length;
      if (u.mission === "cobra" && ctl.cobraZone != null) {
        $("hand-text").innerHTML = "<b>Super Cobra over Zone " + ctl.cobraZone + "</b><br>Remove up to two of its pieces:<div class='hand-choices'></div>";
        var box = $("hand-text").querySelector(".hand-choices");
        opts.forEach(function (a) {
          var b = document.createElement("button");
          b.className = "btn"; b.dataset.actionType = "mission";
          b.textContent = a.label.replace(/^Super Cobra on Zone \d+: remove /, "");
          b.title = a.cite || "";
          b.addEventListener("click", function () { ctl.performAction(a); refresh(); });
          box.appendChild(b);
        });
      } else {
        $("hand-text").innerHTML = "<b>" + u.name + "</b><br>" + (nz
          ? (u.mission === "dragonEye" ? "Click a lit Zone, then an Adjacent or Neighbouring one (or the same Zone again)."
            : nz + (nz === 1 ? " Zone it may strike glows" : " Zones it may strike glow") + " — click one.")
          : "No Zone it may strike right now. Put it back.");
      }
      return;
    }
    if (u) {
      var face = u.kind ? faceFor(u) : null;
      $("hand-token").innerHTML = face ? "<span class='pf-unit hand-face kind-" + u.kind + "'><img src='" + face.image + "' alt=''></span>" : "";
      $("hand-text").innerHTML = "<b>" + (u.name || u.uid) + "</b><br>" + (tg.length
        ? tg.length + (tg.length === 1 ? " place glows" : " places glow") + " green on the map — click one."
        : "Nothing it can do in this phase. Put it back and pick another piece.");
    }
  }
  // Which hand target is under the pointer: a Start Zone is hit anywhere in it.
  function handKeyAt(el) {
    if (!el || !el.closest) return null;
    var n = el.closest("#board .pf-unit, #board .pf-loc, #board .pf-zone, #board .pf-street"); if (!n) return null;
    var keys = [];
    if (n.dataset.uid) keys.push("u:" + n.dataset.uid);
    if (n.dataset.at) keys.push("l:" + n.dataset.at);
    if (n.dataset.loc) keys.push("l:" + n.dataset.loc);
    if (n.dataset.street) keys.push("s:" + n.dataset.street);
    if (n.dataset.zone) keys.push("z:" + n.dataset.zone);
    return keys;
  }
  function wireHand() {
    $("hand-drop").addEventListener("click", function () {
      app.controller.selected = null; app.controller.zonePick = null;
      app.controller.mission = null; app.controller.cobraZone = null; refresh();
    });
    els.board.addEventListener("mouseover", function (ev) {
      var u = handUnit(), tip = $("hand-tip"); if (!u) return;
      var keys = handKeyAt(ev.target) || [], tg = handTargets(u.uid), hit = null;
      keys.some(function (k) { hit = tg.filter(function (t) { return t.key === k; })[0]; return !!hit; });
      if (!hit) { tip.hidden = true; return; }
      // the label sits just above the lit target under the pointer
      var n = ev.target.closest("#board .pf-unit, #board .pf-loc, #board .pf-zone, #board .pf-street");
      var stage = document.querySelector(".fw-stage"), k = stageScale();
      var sr = stage.getBoundingClientRect(), r = n.getBoundingClientRect();
      tip.innerHTML = "<b>" + hit.verbs.join(" / ") + "</b> " + hit.what;
      tip.hidden = false;
      tip.style.left = ((r.left + r.width / 2 - sr.left) / k) + "px"; tip.style.top = ((r.top - sr.top) / k - 8) + "px";
    });
    els.board.addEventListener("mouseleave", function () { $("hand-tip").hidden = true; });
  }

  // ------------------------------------------------------- first-game coach
  // Walsh beside the exact control for each step of Setup and Turn 1
  // (steps in GUIDE.coach). She moves on by herself when the step is done.
  // Off for good with "Don't show again"; How to play can replay it.
  var COACH_KEY = "phantomfury.coach.off", coachDone = {}, coachShown = null;
  var ARROW_KEY = "phantomfury.coach.arrow";
  function coachArrow() { try { return localStorage.getItem(ARROW_KEY) === "1"; } catch (e) { return false; } }
  var HINTS_OFF = "phantomfury.hints.off", HINTS_SEEN = "phantomfury.hints.seen";
  function hintsOff() { try { return localStorage.getItem(HINTS_OFF) === "1"; } catch (e) { return false; } }
  function hintsSeen() { try { return JSON.parse(localStorage.getItem(HINTS_SEEN) || "[]"); } catch (e) { return []; } }
  function markHintSeen(id) {
    var seen = hintsSeen(); if (seen.indexOf(id) >= 0) return;
    seen.push(id); try { localStorage.setItem(HINTS_SEEN, JSON.stringify(seen)); } catch (e) { /* private window */ }
  }
  function coachOff() { try { return localStorage.getItem(COACH_KEY) === "1"; } catch (e) { return false; } }
  function setCoachOff(v) { try { if (v) localStorage.setItem(COACH_KEY, "1"); else localStorage.removeItem(COACH_KEY); } catch (e) { /* private window */ } }
  function coachWhen(key) {
    var s = app.session && app.session.state; if (!s) return false;
    var proj = project(s), u = handUnit();
    var drawn = proj.units.filter(function (x) { return x.pool === "setup"; }).length;
    var caats = proj.units.filter(function (x) { return x.pool === "caat"; }).length;
    var setup = s.phase === "setup";
    switch (key) {
      case "setupTakeSquad": return setup && drawn === 9 && !u;
      case "setupSquadInHand": return setup && !!u && u.pool === "setup";
      case "setupSomePlaced": return setup && drawn > 0 && drawn < 9 && !u;
      case "setupTakeCaat": return setup && drawn === 0 && caats > 0 && !u;
      case "setupCaatInHand": return setup && !!u && u.pool === "caat";
      case "turn3": return s.turn === 3;
      case "event": return !!app.coachEvent;
      case "dragonEyePick": return s.phase === "support" && app.controller.zonePick != null;
      case "abramsInHand": return !!u && u.uid === "abrams";
    }
    var pk = /^pending:(\w+)$/.exec(key);
    if (pk) return !!s.pending && s.pending.kind === pk[1];
    var m = /^early:(\w+)$/.exec(key);                // Turns 1 and 2 (owner, 2026-10-31: one more turn)
    return !!m && s.turn <= 2 && s.phase === m[1];
  }
  function renderCoach() {
    var box = $("coach"), ptr = $("coach-pointer"); if (!box || !GUIDE || !GUIDE.coach) return;
    var steps = GUIDE.coach;
    // a `once` step that was on screen and no longer holds has been done;
    // a hint whose moment has passed has been seen
    function doneKey(c) { return /^early:/.test(c.when) ? c.id + "@" + app.session.state.turn : c.id; }
    if (coachShown && !coachWhen(coachShown.when)) {
      if (coachShown.once) coachDone[coachShown.doneKey || coachShown.id] = true;
      if (coachShown.hint) markHintSeen(coachShown.id);
    }
    var blocked = !app.session || app.tutorial || !$("ready").hidden || !$("title-screen").hidden ||
      !!document.querySelector(".overlay:not([hidden])") || G.isOver(app.session.state);
    if (app.session && app.session.state.turn > 3) setCoachOff(true);   // the guide's job ends after Turn 2
    var openPop = document.querySelector(".popup:not([hidden])");
    function reachable(c) {                          // an open window hides what is not in it
      var el = document.querySelector(c.at);
      return !!el && (!openPop || openPop === el || openPop.contains(el));
    }
    var seen = hintsSeen();
    var ev = app.coachEvent ? [Object.assign({ id: "event", when: "event", event: true, gotIt: true }, app.coachEvent)] : [];
    var pool = ev.concat(coachOff() ? [] : steps.filter(function (c) { return !coachDone[doneKey(c)]; })
        .map(function (c) { return Object.assign({ doneKey: doneKey(c) }, c); }))
      .concat(hintsOff() ? [] : (GUIDE.hints || []).filter(function (h) { return seen.indexOf(h.id) < 0; })
        .map(function (h) { return Object.assign({ hint: true, gotIt: true }, h); }));
    var step = blocked ? null : pool.filter(function (c) { return coachWhen(c.when) && reachable(c); })[0];
    var target = step && document.querySelector(step.at);
    // assign `hidden` only on a change: the observer below watches it
    function show(el, v) {                          // works for the SVG pointer too, which has no .hidden
      if (el.hasAttribute("hidden") === v) { if (v) el.removeAttribute("hidden"); else el.setAttribute("hidden", ""); }
    }
    if (!step || !target || !target.getClientRects().length) { show(box, false); show(ptr, false); coachShown = null; return; }
    var fresh = !coachShown || coachShown.id !== step.id;
    coachShown = step;
    $("coach-img").src = "../assets/characters/" + ({ point: "walsh-bust-hand-signals.png", talk: "walsh-face-smiling.png",
      grin: "walsh-bust-laughing-side.png" }[step.pose] || "walsh-bust-calm.png");
    // a phase with nothing to do this time: say so, in the guide's words
    var st = app.session.state, ph = /^early:(\w+)$/.exec(step.when);
    var idle = ph && GUIDE.phases[ph[1]] && GUIDE.phases[ph[1]].empty &&
      !G.legalActions(st).some(function (a) { return gestureOf(a) || (a.type !== "endPhase" && a.type !== "mission"); }) &&
      !(ph[1] === "support" && G.legalActions(st).some(function (a) { return a.type === "mission"; }));
    var line = (st.turn === 2 && step.say2) ? step.say2 : step.say;
    $("coach-say").textContent = idle ? GUIDE.phases[ph[1]].empty + " The End button is in the card." : line;
    $("coach-title").textContent = (st.turn === 2 && step.title2) || step.title || "";
    var ix = steps.map(function (c) { return c.id; }).indexOf(step.id);
    $("coach-count").textContent = step.event ? (step.cite || "") : step.hint ? "Tip " + (step.cite || "") : "Step " + (ix + 1) + " of " + steps.length;
    show($("coach-skip"), !step.event);
    $("coach-skip").textContent = step.hint ? "No more tips" : "Don't show again";
    show($("coach-ok"), !!step.gotIt);
    show(box, true); show(ptr, true);
    if (fresh) { box.classList.remove("in"); void box.offsetWidth; box.classList.add("in"); }
    placeCoach(target);
  }
  // The panel stays on the right of the stage, clear of the play; an arrow
  // runs from its nearest edge to a ring around the control she means.
  function placeCoach(target) {
    var box = $("coach"), stage = document.querySelector(".fw-stage"), k = stageScale();
    var sr = stage.getBoundingClientRect(), r = target.getBoundingClientRect();
    var t = { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    var bx = box.offsetLeft, by = box.offsetTop, bw = box.offsetWidth, bh = box.offsetHeight, pad = 6;
    var ring = $("coach-ring");
    ring.setAttribute("x", t.x - pad); ring.setAttribute("y", t.y - pad);
    ring.setAttribute("width", t.w + pad * 2); ring.setAttribute("height", t.h + pad * 2);
    var tx = t.x + t.w / 2, ty = t.y + t.h / 2;
    // start: the panel's left edge, or its top edge when the target is above it
    var sx, sy;
    if (tx < bx) { sx = bx; sy = Math.max(by + 30, Math.min(by + bh - 30, ty)); }
    else { sx = Math.max(bx + 30, Math.min(bx + bw - 30, tx)); sy = by; }
    // end: the ring's nearest edge
    var ex = Math.max(t.x - pad, Math.min(t.x + t.w + pad, sx)), ey = Math.max(t.y - pad, Math.min(t.y + t.h + pad, sy));
    if (ex > t.x - pad && ex < t.x + t.w + pad && ey > t.y - pad && ey < t.y + t.h + pad) { ex = tx; ey = t.y + t.h + pad; }
    var dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy) || 1;
    ex -= dx / len * 6; ey -= dy / len * 6;
    var bend = Math.min(90, len * .2), mx = (sx + ex) / 2 + dy / len * bend, my = (sy + ey) / 2 - dx / len * bend;
    var d = "M" + sx.toFixed(1) + "," + sy.toFixed(1) + " Q" + mx.toFixed(1) + "," + my.toFixed(1) + " " + ex.toFixed(1) + "," + ey.toFixed(1);
    $("coach-line").setAttribute("d", d); $("coach-case").setAttribute("d", d);
    // the arrow is an option (owner, 2026-10-31): by default only the ring highlights
    $("coach-pointer").classList.toggle("with-arrow", coachArrow());
  }
  function wireCoach() {
    $("coach-ok").addEventListener("click", function () {
      if (coachShown && coachShown.event) { var done = app.coachEvent && app.coachEvent.onDone; app.coachEvent = null; coachShown = null; renderCoach(); if (done) done(); return; }
      if (coachShown) { if (coachShown.hint) markHintSeen(coachShown.id); else coachDone[coachShown.doneKey || coachShown.id] = true; }
      coachShown = null; renderCoach();
    });
    $("coach-skip").addEventListener("click", function () {
      if (coachShown && coachShown.hint) { try { localStorage.setItem(HINTS_OFF, "1"); } catch (e) { /* private window */ } }
      else setCoachOff(true);
      coachShown = null; renderCoach();
    });
    var hintBox = $("opt-hints");
    hintBox.checked = !hintsOff();
    hintBox.addEventListener("change", function () {
      try { if (hintBox.checked) { localStorage.removeItem(HINTS_OFF); localStorage.removeItem(HINTS_SEEN); } else localStorage.setItem(HINTS_OFF, "1"); } catch (e) { /* private window */ }
      renderCoach();
    });
    var arrowBox = $("opt-coach-arrow");
    arrowBox.checked = coachArrow();
    arrowBox.addEventListener("change", function () {
      try { if (arrowBox.checked) localStorage.setItem(ARROW_KEY, "1"); else localStorage.removeItem(ARROW_KEY); } catch (e) { /* private window */ }
      renderCoach();
    });
    $("btn-primer-coach").addEventListener("click", function () {
      setCoachOff(false); coachDone = {}; coachShown = null; hidePrimer(); renderCoach();
    });
    // pieces opening/closing, dialogs and the window all move what she points at
    new MutationObserver(function () { requestAnimationFrame(renderCoach); })
      .observe(document.querySelector(".fw-stage"), { attributes: true, attributeFilter: ["hidden"], subtree: true });
    window.addEventListener("resize", function () { setTimeout(renderCoach, 150); });
  }

  // A beat's `links`: lines drawn on the map between Locations, one after
  // another, to show what connects to what. In world space, over the map.
  function lessonLinks() {
    var b = app.tutorial && app.tutorial.current();
    if (!b || !b.links) return "";
    var pairs = b.links(app.session.state) || [];
    function pt(key) {
      var p = key.split(":"), l = B.zones[+p[0] - 1].locations.filter(function (x) { return x.id === p[1]; })[0];
      return l ? [(l.x - CROP.x) / CROP.w * WORLD_W, (l.y - CROP.y) / CROP.h * WORLD_H] : null;
    }
    var out = "<svg class='pf-links' viewBox='0 0 " + WORLD_W + " " + WORLD_H.toFixed(1) + "' aria-hidden='true'>";
    pairs.forEach(function (pr, i) {
      var a = pt(pr[0]), c = pt(pr[1]);
      if (!a || !c) return;
      var len = Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]));
      out += "<line x1='" + a[0].toFixed(1) + "' y1='" + a[1].toFixed(1) + "' x2='" + c[0].toFixed(1) + "' y2='" + c[1].toFixed(1) +
        "' style='stroke-dasharray:" + len + ";stroke-dashoffset:" + len + ";animation-delay:" + (0.9 + i * 0.55) + "s'/>" +
        "<circle cx='" + a[0].toFixed(1) + "' cy='" + a[1].toFixed(1) + "' r='3.2' style='animation-delay:" + (0.9 + i * 0.55) + "s'/>" +
        "<circle cx='" + c[0].toFixed(1) + "' cy='" + c[1].toFixed(1) + "' r='3.2' style='animation-delay:" + (1.3 + i * 0.55) + "s'/>";
    });
    return out + "</svg>";
  }

  function startTutorial(id) {
    var ch = TUT.chapters.filter(function (c) { return c.id === id && c.beats; })[0] ||
             TUT.chapters.filter(function (c) { return c.beats; })[0];
    hideEnd();
    closePopups();
    var opts = { rng: FW.rng.seeded(ch.SEED) };
    app.chapter = ch; app.quizSolved = null; app.quizPick = null;
    app.outcome = null; app.debrief = []; app.lessonTries = 0;
    // the session gets its own dice: making it must not draw from the
    // chapter's stream, or the page plays a different game from the one
    // the suite verified (and the words describe)
    app.session = FW.game.session(G, {}, { rng: FW.rng.seeded(ch.SEED + "/session") });
    app.tutorial = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: opts });
    app.session.state = app.tutorial.state;
    app.controller.selected = null;
    els.log.innerHTML = "";
    document.querySelector(".fw-stage").classList.add("in-lesson");
    $("tutor").hidden = false;
    refresh(); renderBeat();
  }
  // ------------------------------------------------ the move's outcome
  // In a chapter that asks for it (Ch 4-6), a move the player makes is held
  // on its own beat before the lesson goes on: the camera stays on the fight,
  // a verdict headline says what came of it, the counters show it (a kill
  // fades out under a stamp, a miss shakes) and the guide reacts. Each
  // decision is kept for the chapter's closing debrief.
  function lessonWaits() { return !!app.tutorial && app.tutorial.waiting() && !app.outcome; }
  function piecesNow() {
    var out = {};
    if (typeof document === "undefined" || !els.board) return out;
    [].forEach.call(els.board.querySelectorAll(".pf-unit[data-uid]"), function (n) { out[n.dataset.uid] = n.outerHTML; });
    return out;
  }
  var ENEMY = { guerillas: 1, martyrs: 1, suspect: 1 }, OURS = { squad: 1, iif: 1 };
  function outcomeOf(before, after, action, recs) {
    var o = { good: [], bad: [], marks: {}, ghosts: [], zones: [], kills: 0, unmasked: [], cleared: 0, hit: 0, lost: 0, reduced: 0, pinned: 0, gained: 0 };
    var B = before.units, A = after.units;
    var fresh = Object.keys(A).filter(function (id) { return !B[id] && A[id].kind !== "suspect" && ENEMY[A[id].kind]; });
    function zoneOf(u) { var m = /^zone:(\d+)/.exec(u.posKey || ""); return m ? +m[1] : null; }
    function newly(u, v, m) { return v.markers.indexOf(m) >= 0 && u.markers.indexOf(m) < 0; }
    Object.keys(B).forEach(function (id) {
      var u = B[id], v = A[id], z = zoneOf(u);
      if (u.posKey === "off" || /^pool/.test(u.posKey)) return;
      var gone = !v || v.posKey === "off";
      if (ENEMY[u.kind]) {
        if (gone) {
          o.ghosts.push(id); if (z != null) o.zones.push(z);
          if (u.kind === "suspect") {
            if (fresh.length) o.unmasked = fresh;
            else { o.cleared += 1; o.good.push("The Suspect marker is gone: nobody dangerous was hiding there."); }
          } else { o.kills += 1; o.good.push(u.name + " is eliminated."); }
        } else if (v.cf < u.cf || newly(u, v, "reduced")) { o.hit += 1; o.marks[id] = "hit"; o.good.push(u.name + " takes a Step Loss."); }
        else if (newly(u, v, "pinned")) { o.hit += 1; o.marks[id] = "hit"; o.good.push(u.name + " is Pinned."); }
      } else if (OURS[u.kind]) {
        if (gone) { o.lost += 1; o.bad.push(u.name + " is lost."); if (z != null) o.zones.push(z); }
        // ours: only the Reduced side is a loss (a detached Security Element also lowers CF)
        else if (newly(u, v, "reduced")) { o.reduced += 1; o.marks[id] = "hurt"; o.bad.push(u.name + " takes a Step Loss."); }
        else if (newly(u, v, "pinned")) { o.pinned += 1; o.marks[id] = "hurt"; o.bad.push(u.name + " is Pinned down."); }
      }
    });
    o.unmasked.forEach(function (id) { o.marks[id] = "hit"; });
    Object.keys(after.zones).forEach(function (z) {
      var was = before.zones[z] && before.zones[z].control, now = after.zones[z].control;
      if (was !== now && now === "usmc") { o.gained += 1; o.good.push("Zone " + z + " is ours."); }
      else if (was === "usmc" && now !== "usmc") o.bad.push("Zone " + z + " is lost.");
    });
    var target = action.target != null ? action.target : null;
    var missed = (action.type === "fire" || action.type === "assault") && target && A[target] && !o.marks[target] && o.ghosts.indexOf(target) < 0;
    if (missed) o.marks[target] = "miss";
    var rolled = (recs || []).some(function (r) { return r.die != null; });
    // the headline: the biggest thing that happened, ours first when it hurt
    var h = null;
    if (o.kills) h = o.bad.length ? "Eliminated, at a cost" : (o.kills > 1 ? o.kills + " units eliminated!" : "Eliminated!");
    else if (o.unmasked.length) h = "Unmasked!";
    else if (o.hit) h = o.bad.length ? "A hit, at a cost" : "Hit!";
    else if (o.lost) h = "Squad lost";
    else if (o.reduced) h = "Step Loss";
    else if (o.cleared) h = "Cleared!";
    else if (o.gained) h = "Zone taken!";
    else if (o.pinned) h = "Pinned down";
    else if (missed) { h = "Missed"; o.bad.push(B[target].name + " is still there."); }
    else if (rolled && action.type !== "mission") {   // a mission's dice are the enemy's Reaction: the next beat tells it
      h = "Untouched"; o.good.push("The dice came up empty: nobody was hurt.");
      Object.keys(A).forEach(function (id) { if (OURS[A[id].kind] && B[id] && (id === action.uid || (recs || []).some(function (r) {
        return r.die != null && (r.context || "").indexOf(A[id].name) >= 0; }))) o.marks[id] = "safe"; });
    }
    o.headline = h;
    o.tone = o.good.length && !o.bad.length ? "good" : o.bad.length && !o.good.length ? "bad" : "mixed";
    if (o.unmasked.length && !o.bad.length && o.good.length === 0) o.tone = "news";
    return o;
  }
  function noteOutcome(asked, action, before, pieces, r) {
    var ch = app.chapter;
    if (!ch || !ch.outcomes) return;
    var after = summarizeState(app.session.state), o = outcomeOf(before, after, action, r.records);
    if (o.unmasked.length) {
      var who = o.unmasked.map(function (id) { return after.units[id].name; }).join(" and ");
      o.lead = "The Suspect was " + who + ". Now you know what you face.";
    }
    var tries = app.lessonTries; app.lessonTries = 0;
    if (action.type !== "endPhase" || o.kills || o.lost || o.reduced) {
      var s = app.session.state;
      app.debrief.push({ title: asked.title, choice: asked.choice ? asked.choice(action) : (action.label || action.type).replace(/ \([^)]*\)| \[[^\]]*\]/g, ""),
        headline: o.headline, tone: o.headline ? o.tone : "good", tries: tries,
        lesson: typeof asked.lesson === "function" ? asked.lesson(s, action, o) : (asked.lesson || "") });
    }
    if (!o.headline) return;
    o.ghostHtml = o.ghosts.map(function (id) { return pieces[id]; }).filter(Boolean);
    var units = [action.uid].concat(Object.keys(o.marks)).filter(function (id, i, all) {
      return id && app.session.state.units[id] && app.session.state.units[id].pos && all.indexOf(id) === i; });
    var vp = after.vp !== before.vp ? (after.vp > before.vp ? "+" : "") + (after.vp - before.vp) + " VP: the score is " + after.vp + "." : "";
    app.outcome = { o: o, beat: asked, index: app.tutorial.i - 1, vp: vp,
      focus: { units: units, zones: o.zones.filter(function (z, i, all) { return all.indexOf(z) === i; }) } };
  }
  var OUTCOME_POSE = { good: "laugh", bad: "grimace", mixed: "think", news: "wow" };
  function renderOutcome() {
    var h = app.outcome, o = h.o, t = app.tutorial, ch = app.chapter;
    els.board.classList.add("lesson-watch");
    document.querySelector(".fw-stage").classList.remove("lesson-chrome");
    var say = [o.lead].concat(o.good, o.bad, [h.vp]).filter(Boolean).join(" ");
    DIR().beat({ beat: { pose: OUTCOME_POSE[o.tone], cite: h.beat.cite, verdict: o.tone }, index: h.index, key: "outcome-" + t.i,
        total: t.beats ? t.beats.length : (ch ? ch.beats.length : 0),
        chapter: ch ? "Chapter " + ch.n + " · " + ch.title : "", waiting: false,
        title: o.headline, say: say, explain: null, planned: null, card: null, focus: h.focus,
        quiz: null, steps: null, ask: null, selected: null, tray: null, moves: [], loose: [], labels: null });
  }
  // the board moment: marks on the living, a ghost under a stamp for the dead
  var STAMP = { kill: "Eliminated", hit: "Hit", miss: "Missed", hurt: "Hit", safe: "Safe" };
  function outcomeMark(uid) { return app.outcome && app.outcome.o.marks[uid] ? " out-" + app.outcome.o.marks[uid] : ""; }
  function outcomeLayer() {
    if (!app.outcome) return "";
    var o = app.outcome.o, html = "";
    o.ghostHtml.forEach(function (g) {
      var style = (/style="([^"]*)"/.exec(g) || [])[1] || "";
      html += g.replace(/ data-uid="[^"]*"/, "").replace(/class="pf-unit/, 'class="pf-unit pf-ghost out-kill')
        .replace(/<button/, '<button tabindex="-1" aria-hidden="true"');
      html += "<div class='pf-stamp kill' style='" + style + "'>" + STAMP.kill + "</div>";
    });
    return html;
  }
  function outcomeStamp(uid, style) {
    var m = app.outcome && app.outcome.o.marks[uid];
    return m ? "<div class='pf-stamp " + m + "' style='" + style + "'>" + STAMP[m] + "</div>" : "";
  }

  // What the lesson shows lives in phantomfury_director.js (camera,
  // spotlight, the guide and her bubble); this hands it the beat.
  function renderBeat() {
    var t = app.tutorial, b = t && t.current();
    if (!b) return;
    if (app.outcome) { renderOutcome(); return; }
    var waiting = t.waiting(), s = app.session.state, ch = app.chapter;
    // a watch beat names the move it is about to make; its words and its
    // focus may be worked out from the game as it stands
    var plan = b.plan && !waiting ? b.plan(s) : null;
    function val(v) { return typeof v === "function" ? v(s, plan) : v; }
    app.lessonPlan = plan;
    els.board.classList.toggle("lesson-watch", !waiting);
    document.querySelector(".fw-stage").classList.toggle("lesson-chrome", !!b.chrome);
    els.board.classList.toggle("lesson-quiz", !!quizOpen());
    var solved = !!b.quiz && app.quizSolved === t.i;
    DIR().beat({ beat: b, index: t.i, total: t.beats ? t.beats.length : (ch ? ch.beats.length : 0),
        chapter: ch ? "Chapter " + ch.n + " · " + ch.title : "", waiting: waiting,
        title: val(b.title), say: val(b.say), explain: val(b.explain), planned: plan, card: b.card || null,
        focus: solved && app.quizPick ? pickFocus(app.quizPick) : val(b.focus),
        quiz: b.quiz ? { prompt: val(b.quiz.prompt), solved: solved } : null,
        steps: val(b.steps) || null, ask: val(b.ask) || null, hint: val(b.hint) || null, selected: app.controller.selected,
        debrief: b.debrief ? { rows: app.debrief || [], takeaways: b.debrief.takeaways || [], next: b.debrief.next || "" } : null,
        tray: b.tray ? trayOf(b.tray(s)) : null,
        moves: lessonFocus(), loose: lessonButtons(),
        labels: b.choice ? lessonButtons().map(function (a) { return b.choice(a); }) : null });
  }
  function tutorialAdvance() {
    if (DIR() && DIR().forward()) return;            // looking back: Next walks forward first
    if (app.outcome) { app.outcome = null; refresh(); renderBeat(); return; }
    var b = app.tutorial && app.tutorial.current();
    if (!b || app.tutorial.waiting()) return;
    if (b.done) { if (app.chapter) markChapterDone(app.chapter.id); endLesson(); return; }
    var before = summarizeState(app.session.state), was = motionSnapshot(), plan = app.lessonPlan;
    var r = app.tutorial.advance();
    app.session.state = app.tutorial.state;
    if (!r.ok) { say("The lesson could not continue: " + r.error, "bad"); return; }
    r.beforeSummary = before; r.motionWas = was;
    if (b.run) r.byPlayer = plan || { type: "watch" };   // the guide's move: its dice open the next bubble
    afterAction(r);
  }

  app.fitStage = fitStage; app.cameraTo = cameraTo; app.worldBoxOf = worldBoxOf; app.worldToStage = worldToStage; app.boardHome = function () {
    app.boardView = boardHome(); applyBoardView(true, 800); };
  app.lessonWaits = lessonWaits; app.outcomeOf = outcomeOf;
  app.lessonFocus = lessonFocus; app.lessonButtons = lessonButtons; app.leaveLesson = leaveLesson; app.quizAnswers = quizAnswers; app.quizSelector = quizSelector;
  app.boot = boot; app.newMatch = newMatch; app.startTutorial = startTutorial; app.tutorialAdvance = tutorialAdvance;
  app.summarizeState = summarizeState; app.describeChanges = describeChanges;
  app.actionActor = actionActor; app.zoomTo = zoomTo; app.zoomStep = zoomStep; app.levelScales = levelScales;
  app.panBy = function (dx, dy) { app.boardView.x += dx; app.boardView.y += dy; applyBoardView(); }; app.saveGame = saveGame; app.loadGame = loadGame;
  global.PhantomFuryApp = app;
})(typeof window !== "undefined" ? window : globalThis);
