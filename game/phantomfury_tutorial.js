/* phantomfury_tutorial.js — the lesson, as beats replayed through the engine.
 *
 * The rulebook has no complete sample game (rules-digest.md, Part III), so
 * this lesson is scripted from the finished engine itself, and the test
 * labels it as such: Setup is played legally by the AI's autoSetup, one
 * Suspect is planted by a run beat so the Fire Phase always has a target
 * and one Guerillas so the Assault Phase always has a fight, and every
 * decision that matters — the Support mission, the shot, the move, the
 * assault — is handed to the player. The seed is fixed (SEED) so the
 * board and the dice on screen are the ones in the text.
 * Beat: { say, explain, cite, action | run, spot, expect(state) -> true|"why", done }
 * Staging, read only by the page's Director (phantomfury_director.js):
 *   title, pose (the guide's face: talk grin wow focus point think drone),
 *   view: "city" (the whole map) or focus: { units: [uid] } | { zones: [id] }.
 *   A beat that waits for a move needs no focus: the camera finds the piece.
 */
(function (global) {
  "use strict";

  var SEED = "lesson-3";   // verified: replays clean on the model answers AND on the moves the page rings
                           // (lesson-2 sent the ringed Dragon Eye into a CAAT decision the lesson never taught)

  function setup(opts) { return global.PhantomFury.create({}, opts); }

  function autoSetupBeat(state, opts) {
    var before = state;
    global.PhantomFuryAI.autoSetup(global.PhantomFury, state, opts);
    return { state: before, events: ["Setup played: nine squads drawn, one per Start Zone; four CAAT supports attached [6.3]"] };
  }

  // Plant one Suspect in a Zone next to a Start Zone, so the Fire Phase
  // always offers a shot. The Zone's other enemies are cleared: this is
  // the lesson's scripted deal, not a rule.
  function plantSuspect(state) {
    var G = global.PhantomFury;
    var squads = G.units(state).filter(function (u) { return u.kind === "squad" && u.pos; });
    for (var i = 0; i < squads.length; i++) {
      var ns = G.adjOrNei(squads[i].pos.zone);
      for (var j = 0; j < ns.length; j++) {
        var z2 = ns[j];
        if (z2 === 27 || G.marinesInZone(state, z2).length) continue;
        G.units(state).forEach(function (u) {
          if (u.pos && u.pos.zone === z2 && (G.isInsurgent(u) || u.kind === "suspect")) { u.alive = false; u.pos = null; }
        });
        var loc = G.locExists(state, z2, "R") ? "R" : G.entryLoc(state, z2);
        state.units.susLesson = { uid: "susLesson", kind: "suspect", marker: 0, pos: { zone: z2, loc: loc }, alive: true };
        return { events: ["Lesson: a Suspect marker is spotted in Zone " + z2 + ", Location " + loc + "."] };
      }
    }
    return {};
  }

  // Plant one Guerillas unit in reach of a squad that can still assault,
  // so the Assault Phase always offers a fight. Squads without a CAAT go
  // first: a step loss there cannot open the CAAT choice [5.1.1.2] and
  // stall the lesson on a decision it has not taught yet.
  function plantAssault(state) {
    var G = global.PhantomFury;
    function crossSpots(zid, loc) {
      var l0 = G.ZD[zid].locations.filter(function (x) { return x.id === loc; })[0];
      if (!l0 || (l0.type !== "C" && l0.type !== "OG" && l0.type !== "R")) return [];
      var out = [];
      G.ZD[zid].adjacent.forEach(function (z2) {
        G.ZD[z2].locations.forEach(function (l) {
          var same = l0.type === "R" ? l.type === "R" : (l.type === "C" || l.type === "OG");
          if (same && G.locExists(state, z2, l.id)) out.push({ zone: z2, loc: l.id });
        });
      });
      return out;
    }
    var squads = G.units(state).filter(function (u) {
      return u.kind === "squad" && u.alive && u.pos && u.pos.loc != null && !u.fired && !u.pinned && !u.assaulted;
    });
    squads.sort(function (a, b) { return (a.caat ? 1 : 0) - (b.caat ? 1 : 0); });
    for (var i = 0; i < squads.length; i++) {
      var inReach = G.assaultTargets(state, squads[i].uid).filter(function (t) { return t.kind !== "suspect"; });
      if (inReach.length) return { events: ["Lesson: an Insurgents unit is already in reach of " + G.unitName(state, squads[i]) + "."] };
    }
    for (var j = 0; j < squads.length; j++) {
      var s = squads[j];
      var spots = G.locLinks(state, s.pos.zone, s.pos.loc).map(function (loc) { return { zone: s.pos.zone, loc: loc }; })
        .concat(crossSpots(s.pos.zone, s.pos.loc));
      for (var k = 0; k < spots.length; k++) {
        if (G.atLoc(state, spots[k].zone, spots[k].loc).length === 0) {
          state.units.insLesson = { uid: "insLesson", kind: "guerillas", counter: 1, cf: 2, sym: "circle",
            pos: { zone: spots[k].zone, loc: spots[k].loc }, alive: true };
          return { events: ["Lesson: a Guerillas unit (CF 2) is placed in Zone " + spots[k].zone + ", Location " +
            spots[k].loc + ", in reach of " + G.unitName(state, s) + "."] };
        }
      }
    }
    return {};
  }

  // One idea per beat, the pace of Chapters 2-4; rule detail behind "Why?".
  // Only the run and await beats touch the game, in the order the seed was
  // verified on; the beats between them only talk.
  var beats = [
    { title: "The mission", view: "city", pose: "point",
      say: "You've set up a battle, met the pieces, read the board and solved the drills. Now play a whole turn yourself: Turn 1, from the very start.",
      cite: "[7.2]" },
    { title: "Six phases", view: "city", pose: "talk",
      say: "A turn has six phases, always in this order: Support, Reinforcements, Fire Combat, Movement, Assault, Reorganisation.",
      cite: "[8]" },
    { title: "The other side", view: "city", pose: "think",
      say: "You play the Marines. The game plays the Insurgents: their Suspects, their Reactions and the Events.",
      cite: "[8]" },
    { title: "Your Marines", focus: { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, pose: "talk",
      say: "I've set the company up the way you learned in Chapter 1: one squad in each Start Zone, four CAATs handed out.",
      explain: "Each squad starts inside an Insurgent Zone, and it can't simply walk out: it has to win the Zone, or take a Step Loss and fall back to ground we hold [12.4.3].",
      run: autoSetupBeat, cite: "[6.3]",
      expect: function (s) { return s.phase === "support" || "setup should be complete"; } },

    // Support
    { title: "Support Phase", pose: "drone",
      say: "Turn 1 opens with the Support Phase: air support.",
      cite: "[9]" },
    { title: "Your air support", pose: "talk",
      say: "For the whole battle you have four Dragon Eye flights, two Super Cobras and one Hornet. Spend them with care.",
      cite: "[9.1]" },
    { title: "Dragon Eye", pose: "drone",
      say: "A Dragon Eye is a small drone. It Activates two Zones and turns their Suspects face up.",
      explain: "Activating a Zone places its Suspects; the drone's report reveals them [9.3].",
      cite: "[9.3]" },
    { title: "They react", pose: "wow",
      say: "After every mission, the Insurgents react: the game rolls on the Reactions table.",
      cite: "[9.4]" },
    { title: "Eyes in the sky", pose: "drone",
      say: "Your turn. Fly a Dragon Eye.",
      ask: "Make a decision: where do the eyes go?",
      lesson: "A Dragon Eye shows you what waits in two Zones before a squad walks in.",
      hint: "Pick a Dragon Eye mission from the action list (or click two unactivated Zones on the board).",
      await: { type: "mission" }, cite: "[9.3]",
      wrong: "Spend a Support mission first — the Dragon Eye shows you what is waiting in two Zones.",
      expect: function (s) { return (s.support.dragonEye + s.support.cobra + s.support.hornet) > 0 || "a mission should have been spent"; } },
    { title: "Phase over", pose: "talk",
      say: "One mission is enough for now. End the Support Phase.",
      ask: "The drone has looked. What do you do next?",
      hint: "End the Support Phase.",
      await: { type: "endPhase" }, cite: "[10.1]",
      wrong: "End the phase to move on to Reinforcements.",
      expect: function (s) { return s.phase === "reinforce" || "it should be the Reinforcements Phase"; } },

    // Reinforcements
    { title: "Reinforcements", pose: "think",
      say: "Reinforcements. Company squads land from Turn 2, in Start Zones you hold. On Turn 1, nothing arrives.",
      cite: "[10.1]" },
    { title: "Something to shoot", pose: "talk",
      say: "So you have a target, I'll put a Suspect within reach of your line (the lesson places it).",
      run: plantSuspect, cite: "[10]" },
    { title: "Contact", focus: { units: ["susLesson"] }, pose: "wow",
      say: "There it is. End the Reinforcements Phase and go to Fire Combat.",
      ask: "A target is in sight. What do you do next?",
      hint: "End the Reinforcements Phase.",
      await: { type: "endPhase" }, cite: "[11]",
      wrong: "End the phase to reach Fire Combat.",
      expect: function (s) { return s.phase === "fire" || "it should be the Fire Combat Phase"; } },

    // Fire Combat
    { title: "Fire Combat", focus: { units: ["susLesson"] }, pose: "focus",
      say: "Fire Combat. A hit on a Suspect Activates it, and you find out what it was.",
      cite: "[11.2]" },
    { title: "Fired means done", pose: "think",
      say: "Choose the shooter with care: a squad that fires is done for the turn. No moving, no assault.",
      explain: "Firing can also draw a Sniper Attack back [11.3, 11.4.1].",
      cite: "[11.3]" },
    { title: "Take the shot", pose: "focus",
      say: "Your turn. Shoot at the Suspect. Remember the modifiers from the drills.",
      ask: "Make a decision: who shoots, and at what?",
      lesson: "Fire first at what you can reach; a hit on a Suspect shows you what it was.",
      hint: "Click a squad, then click the Suspect or Insurgents unit it can hit.",
      await: { type: "fire" }, cite: "[11.2]",
      wrong: "Fire at a Suspect or Insurgents unit in a neighbouring Zone first.",
      expect: function (s) {
        return Object.keys(s.units).some(function (k) { return s.units[k].fired; }) || "a squad should have fired";
      } },
    { title: "Phase over", pose: "talk",
      say: "End the Fire Phase. The squad that fired is done; the others can still move.",
      ask: "Your shot is taken. What do you do next?",
      hint: "End the Fire Phase.",
      await: { type: "endPhase" }, cite: "[12]",
      wrong: "End the phase to reach Movement.",
      expect: function (s) { return s.phase === "movement" || "it should be the Movement Phase"; } },

    // Movement
    { title: "Movement", pose: "talk",
      say: "Movement. Each squad has 4 Movement Points: one per step along an arrow.",
      cite: "[12.3.1]" },
    { title: "Mind the Courtyards", pose: "wow",
      say: "Remember Defensive Fire: step into a Courtyard or Open Ground in an Insurgent Zone and every Insurgents unit there shoots.",
      explain: "A squad may leave an Insurgent Zone only after a Step Loss, and only toward ground we hold [12.7, 12.4.3].",
      cite: "[12.7]" },
    { title: "One step", pose: "focus",
      say: "Your turn. Take one step with the ringed squad.",
      ask: "Make a decision: where does it go?",
      lesson: "Every step costs a Movement Point, and a Courtyard in their Zone draws fire.",
      hint: "Click a squad that has not fired, then click one of its highlighted Locations.",
      await: { type: "moveStep" }, cite: "[12.3.1]",
      wrong: "Move a squad one Location — click the squad, then a highlighted Location.",
      expect: function (s) {
        return Object.keys(s.units).some(function (k) { var u = s.units[k]; return u.mp > 0 && u.mp < 4; }) || "a squad should have spent Movement Points";
      } },
    { title: "Phase over", pose: "talk",
      say: "End Movement. The Assault Phase is next: the close fight the whole turn builds toward.",
      ask: "Your squad has stepped. What do you do next?",
      hint: "End the Movement Phase.",
      await: { type: "endPhase" }, cite: "[13]",
      wrong: "End the phase to reach the Assault Phase.",
      expect: function (s) { return s.phase === "assault" || "it should be the Assault Phase"; } },

    // Assault
    { title: "Close quarters", pose: "wow",
      say: "A Guerillas unit is in reach of one of your squads (the lesson placed it, or the fighting did).",
      run: plantAssault, cite: "[13.4.2]" },
    { title: "Both sides roll", pose: "talk",
      say: "In an Assault both sides roll at once. Whoever rolls their Combat Factor or less inflicts a Step Loss.",
      cite: "[13.4.2]" },
    { title: "A roll of 0", pose: "think",
      say: "An unmodified 0 on either side draws an Event, for good or ill.",
      cite: "[13.4.3]" },
    { title: "Assault", pose: "focus",
      say: "Your turn. Assault it.",
      explain: "From above it's Top-Down, from below Bottom-Up [13.1–13.3]. Surviving Guerillas Retreat; Martyrs never do [13.4.7].",
      ask: "Make a decision: go in.",
      lesson: "In an Assault both sides roll; height decides who has the edge.",
      hint: "Click a squad that has not fired, then click the Insurgents unit next to it.",
      await: { type: "assault" }, cite: "[13.4.2]",
      wrong: "Assault the Insurgents unit in an Adjacent Location first.",
      expect: function (s) {
        return Object.keys(s.units).some(function (k) { return s.units[k].assaulted; }) || "a squad should have assaulted";
      } },

    // Reorganisation
    { title: "Reorganisation", pose: "think",
      say: "Last comes Reorganisation. The game does the bookkeeping for you.",
      cite: "[14]" },
    { title: "Zones change hands", pose: "point",
      say: "A Zone with only Marines in it becomes ours, and the Zones next to it wake up.",
      explain: "Watch for infiltration: an empty Zone you hold can be infiltrated behind you [14.4].",
      cite: "[14.1]" },
    { title: "Rally and reset", pose: "talk",
      say: "Pinned squads try to rally, and the Fired marks clear for next turn.",
      cite: "[14]" },
    { title: "Victory Points", pose: "think",
      say: "And the score moves: −2 VP for a reduced squad, −5 for a lost one, +1 for each Guerillas unit eliminated.",
      cite: "[7.2.1]" },
    { title: "End the turn", pose: "focus",
      say: "End the Assault Phase and watch it happen.",
      ask: "The fight is over. What do you do next?",
      hint: "End the Assault Phase.",
      await: { type: "endPhase" }, cite: "[14.1]",
      wrong: "End the phase to run Reorganisation.",
      expect: function (s) { return (s.turn === 2 && s.phase === "support") || "Turn 2 should begin after Reorganisation"; } },
    // Victory recap: where the turn left the score, then how the game ends.
    { title: "Turn 1 done", pose: "grin",
      focus: { tracks: ["vp", "vp10"] },
      say: function (s) {
        var n = heldZones(s).length;
        return "That's one turn of sixteen. We hold " + n + (n === 1 ? " Zone" : " Zones") +
          ", and the score stands at " + s.vp + " VP. Every other Zone is still theirs.";
      },
      cite: "[7.2.1]" },
    { title: "How it ends", pose: "point",
      focus: { tracks: ["turn"] },
      say: "Hold every Zone at the end of any turn and you win on the spot, with +5 VP for each turn you didn't need. Still short after Turn 16, and the Insurgents win.",
      explain: "Your VP then sets the size of the win: above 10 is a major victory, 0 to 10 a minor one, below 0 a costly one [7.2.2]. Zone 27 never counts [4.1.4]. If only Zone 26 is left, empty of Suspects and Insurgents, it is still your win, at −5 VP [7.1].",
      cite: "[7]" },
    // Your controls: the lesson has hidden the game's own chrome; before the
    // player meets it in a real game, it comes back one piece at a time.
    // `chrome: true` shows it (looking only: it does not answer clicks), and
    // focus.ui names the page elements to ring.
    { title: "Your controls: the menu", pose: "point", chrome: true,
      focus: { ui: ["#menubar"] },
      say: "Before you play for real: the controls I've been hiding. Along the top: New match, Save and Load, Undo, How to play and Learn to play.",
      cite: "[8]" },
    { title: "Zoom", pose: "talk", chrome: true,
      focus: { ui: ["#zoom-seg"] },
      say: "Zoom runs from City, the whole district, to Close, one Zone. Drag the map to look around.",
      explain: "The mouse wheel, the keys 1 to 4, or a double-click on the map zoom too.",
      cite: "[8]" },
    { title: "The status card", pose: "talk", chrome: true,
      focus: { ui: ["#statusbar"] },
      say: "This card keeps score: the turn and phase, Victory Points, Zones held, and the air support you have left.",
      cite: "[7.2.1]" },
    { title: "What it's waiting for", pose: "point", chrome: true,
      focus: { ui: ["#statusbar"] },
      say: "Under the score, one line always tells you what the game is waiting for right now.",
      cite: "[8]" },
    { title: "The side buttons", pose: "talk", chrome: true,
      focus: { ui: ["#dock"] },
      say: "Down the right side are four buttons. A red dot on one means something new is waiting there.",
      cite: "[8]" },
    { title: "Decide", pose: "point", chrome: true,
      focus: { ui: ["#dock-decisions"] },
      say: "Decide lists every piece that can act and what it can do, the decisions the game stops for, and End phase at the bottom.",
      cite: "[8]" },
    { title: "Changes", pose: "talk", chrome: true,
      focus: { ui: ["#dock-changes"] },
      say: "Changes says what just happened.",
      cite: "[8]" },
    { title: "Pieces", pose: "talk", chrome: true,
      focus: { ui: ["#dock-pieces"] },
      say: "Pieces holds your reserves, the pieces not yet on the map.",
      cite: "[8]" },
    { title: "Log", pose: "talk", chrome: true,
      focus: { ui: ["#dock-log"] },
      say: "And Log keeps every die roll of the game.",
      cite: "[8]" },
    { title: "Hover for the card", pose: "point", chrome: true,
      focus: function (s) { return { units: G_().units(s).filter(function (u) { return u.pos && u.pos.zone != null && G_().isMarineSquad(u); }).slice(0, 1).map(function (u) { return u.uid; }) }; },
      say: "And the most useful habit of all: rest the mouse on any counter and its card opens, with its state right now and the rules that apply to it.",
      cite: "[5.1.1]" },
    { title: "One turn done", view: "city", pose: "grin",
      say: "That was a whole turn, all six phases, and every decision was yours.",
      debrief: {
        takeaways: ["Each turn runs Support, Reinforcements, Fire, Movement, Assault, Reorganisation, always in that order.",
                    "A squad that fires is done for the turn: choose your shooters before you plan your moves.",
                    "You win by holding every Zone at the end of a turn; losses cost VP, so spend Marines carefully."],
        next: "Chapter 7 · A fight already under way: watch me play Turn 4 at full speed." },
      done: true, cite: "[8]" }
  ];

  // ------------------------------------- Chapter 6 (last): watch a fight
  // A real game, three turns in: Setup played by the AI's autoSetup, then the
  // AI plays the Marines through Turns 1-3 holding its air support back (a
  // mission it would fly is an End phase instead) so a Dragon Eye is left to
  // show. In Turn 4 the guide plays the moves worth seeing — the AI's own
  // best of each kind (PhantomFuryAI.bestOf) — and says why; the AI plays the
  // rest of each phase. Nothing waits for the player: a watch chapter.
  // Beat `plan(state)` names the move a beat is about to make (the page rings
  // it); `say`, `title` and `focus` may be functions of (state, plan).
  var FIGHT_SEED = "fight-177";  // verified by the suite: the shot hits, the assault wins, a Zone is gained, VP rise
  var fight = { held: [], vp: 0 };      // what the chapter remembers between beats (reset by its setup)

  function G_() { return global.PhantomFury; }
  function AI_() { return global.PhantomFuryAI; }
  function heldZones(state) {
    return G_().board.zones.filter(function (z) { return state.zones[z.id].control === "usmc"; }).map(function (z) { return z.id; });
  }
  function endPhaseOf(state) { return G_().legalActions(state).filter(function (a) { return a.type === "endPhase"; })[0]; }
  function playAI(state, opts, stop, holdAir) {
    var G = G_(), records = [], events = [], n = 0;
    while (!stop(state) && !G.isOver(state) && n++ < 400) {
      var a = AI_().chooseAction(G, state, opts).action;
      if (holdAir && a.type === "mission") a = endPhaseOf(state);
      var r = global.FW.game.run(G, state, a, opts);
      state = r.state; records = records.concat(r.records); events = events.concat(r.events);
    }
    return { state: state, records: records, events: events };
  }
  function fightSetup(opts) {
    var G = G_(), state = G.create({}, opts);
    AI_().autoSetup(G, state, opts);
    state = playAI(state, opts, function (s) { return s.turn === 4 && s.phase === "support"; }, true).state;
    fight.held = heldZones(state);
    fight.vp = state.vp; fight.shot = ""; fight.assault = ""; fight.droneOk = false;
    return state;
  }
  function squadMove(type) {
    return function (state) {
      return AI_().bestOf(G_(), state, function (a) {
        if (a.type !== type) return false;
        var u = state.units[a.uid];
        return !!u && G_().isMarineSquad(u) && (type !== "moveStep" || a.to.street == null);
      });
    };
  }
  function planDragonEye(state) {
    return AI_().bestOf(G_(), state, function (a) { return a.type === "mission" && a.mission === "dragonEye" && !!a.zone2; });
  }
  function playPlan(plan) {
    return function (state, opts) {
      var a = plan(state);
      if (!a) return {};
      var r = global.FW.game.run(G_(), state, a, opts);
      return { state: r.state, records: r.records, events: r.events };
    };
  }
  function aiUntil(stop) {
    return function (state, opts) { return playAI(state, opts, stop, false); };
  }
  function name(state, uid) { return G_().unitName(state, state.units[uid]); }
  function onBoard(state, test) {
    return G_().units(state).filter(function (u) { return u.pos && u.pos.zone != null && test(u); }).map(function (u) { return u.uid; });
  }

  // the pieces a planned move will use, for the beats that talk before it
  function ringOf(plan) {
    return function (s) {
      var a = plan(s);
      if (!a) return null;
      if (a.zone2) return { zones: [a.zone, a.zone2] };
      return { units: [a.uid].concat(a.target ? [a.target] : []) };
    };
  }
  // play a planned move and remember what its dice said (key: fight[key])
  function playAndNote(plan, key) {
    return function (state, opts) {
      var a = plan(state), r = playPlan(plan)(state, opts);
      fight[key + "By"] = a ? a.uid : null;
      fight[key] = (r.records || []).map(function (x) { return x.context + " -> " + x.result; }).join(" | ");
      return r;
    };
  }
  function gainedZones(s) {
    var now = heldZones(s), gained = now.filter(function (z) { return fight.held.indexOf(z) < 0; });
    return gained.length ? gained : now;
  }
  var FIRE = squadMove("fire"), STEP = squadMove("moveStep"), ASSAULT = squadMove("assault");

  // One idea per beat, the pace of Chapters 2-5; rule detail behind "Why?".
  // Only the run beats move the game, in the order the seed was verified on.
  var fightBeats = [
    { title: "A fight already under way", view: "city", pose: "point",
      say: "Last chapter. You know every rule you need. Here's a battle three turns in.",
      explain: "Press Next for each move. Nothing to decide this time: just watch the reasons.",
      cite: "[8]" },
    { title: "Watch me play", view: "city", pose: "talk",
      say: "Watch me play Turn 4 at full speed. I'll ring each piece before I use it, and tell you why.",
      cite: "[8]" },
    { title: "What we hold", pose: "talk",
      focus: function () { return { zones: fight.held }; },
      say: function () { return "These " + fight.held.length + " Zones are ours. Marines cleared them, and a small blue mark shows each one."; },
      cite: "[14.1]" },
    { title: "Everything else", view: "city", pose: "think",
      say: "Every other Zone still belongs to the Insurgents.",
      explain: "We win by holding every Zone except 27 at the end of a turn, within 16 turns [7.2].",
      cite: "[7.2]" },

    // Support
    { title: "Look before you go in", pose: "think", focus: ringOf(planDragonEye),
      say: function (s) { var a = planDragonEye(s); return a ? "Support Phase. I'd rather see what's waiting in Zones " + a.zone + " and " + a.zone2 + " before my Marines walk in." : "Support Phase."; },
      cite: "[9]" },
    { title: "Eyes first", pose: "drone", plan: planDragonEye,
      say: function (s, a) { return a ? "So I fly a Dragon Eye drone over them." : "No drone flight this turn."; },
      explain: "A Dragon Eye Activates two Zones and turns their Suspects face up. After every mission the Insurgents react: a roll on the Reactions table [9.3, 9.4].",
      run: function (state, opts) {
        var r = playPlan(planDragonEye)(state, opts);
        fight.droneOk = (r.records || []).some(function (x) { return /Dragon Eye/.test(x.context) && x.result === "success"; });
        return r;
      }, cite: "[9.3]" },
    { title: "What it found", pose: "wow",
      say: function () {
        return fight.droneOk ? "Both Zones are Activated, and their Suspects are face up."
          : "The drone came back with nothing: its roll missed. That happens, and the Insurgents still got to react.";
      },
      cite: "[9.3]" },
    { title: "One mission only", pose: "talk",
      say: "That's my only mission this turn. Air support has to last all 16 turns.",
      cite: "[9.1]" },
    { title: "Reinforcements", pose: "talk",
      say: "Next, Reinforcements: from Turn 2, fresh squads arrive in Start Zones we hold.",
      run: function (state, opts) {   // the rest of Support is an End phase: no more missions
        return playAI(state, opts, function (s) { return s.phase === "fire"; }, true);
      }, cite: "[10.1]",
      expect: function (s) { return s.phase === "fire" || "the Fire Combat Phase should have begun"; } },

    // Fire Combat
    { title: "A target", pose: "point", focus: ringOf(FIRE),
      say: function (s) { var a = FIRE(s); return a ? "Fire Combat. " + name(s, a.uid) + " has a target: " + name(s, a.target) + ", in range in the next Zone." : "Fire Combat. No squad has a target this turn."; },
      explain: "A squad fires at an Adjacent or Neighbouring Zone with no Marines in it [11.1].",
      cite: "[11.1]" },
    { title: "The number to beat", pose: "think", focus: ringOf(FIRE),
      say: "I need its Combat Factor or less on the die, after the modifiers.",
      cite: "[11.2]" },
    { title: "Take the shot", pose: "focus", plan: FIRE,
      say: function (s, a) { return a ? name(s, a.uid) + " fires." : "No shot this turn."; },
      explain: "A squad that fires is done for the turn: it may not move or assault afterwards [11.3]. Firing can also draw a Sniper Attack back [11.4.1].",
      run: playAndNote(FIRE, "shot"), cite: "[11.2]" },
    { title: "The result", pose: "grin",
      focus: function (s) { return fight.shotBy && s.units[fight.shotBy].pos ? { units: [fight.shotBy] } : null; },
      say: function () { return /^Fire: .* -> hit/.test(fight.shot || "") ? "A hit. That squad is done for the turn now, and it was worth it." : "A miss. That squad is done for the turn anyway: that's the price of firing."; },
      cite: "[11.3]" },
    { title: "Everyone else", pose: "talk",
      say: "The other squads with a target take their shots too. I'll skip ahead.",
      run: aiUntil(function (s) { return s.phase === "movement"; }), cite: "[11]" },

    // Movement
    { title: "Free to move", pose: "talk", focus: ringOf(STEP),
      say: function (s) { var a = STEP(s); return a ? "Movement. " + name(s, a.uid) + " didn't fire, so it can still move." : "Movement. Nobody needs to move this turn."; },
      cite: "[11.3]" },
    { title: "One step at a time", pose: "focus", plan: STEP,
      say: function (s, a) {
        if (!a) return "Nobody moves.";
        var from = s.units[a.uid].pos.zone;
        return "It steps to Location " + a.to.loc + (a.to.zone !== from ? " in Zone " + a.to.zone + ", into the next Zone toward the enemy." : " in its own Zone, working toward the enemy.");
      },
      explain: "A squad has 4 Movement Points. Each step goes to an Adjacent Location: up the stairs, onto the roof, or through a door into the next Zone [12.3.1].",
      run: playPlan(STEP), cite: "[12.3.1]" },
    { title: "Into position", pose: "talk",
      say: "The rest of the company moves up the same way.",
      run: aiUntil(function (s) { return s.phase === "assault"; }), cite: "[12]" },

    // Assault
    { title: "Close quarters", pose: "wow", focus: ringOf(ASSAULT),
      say: function (s) { var a = ASSAULT(s); return a ? "Assault Phase. " + name(s, a.uid) + " is right next to " + name(s, a.target) + "." : "Assault Phase. Nothing is in reach this turn."; },
      cite: "[13]" },
    { title: "Both sides roll", pose: "think", focus: ringOf(ASSAULT),
      say: "Both sides roll at once. Each one that rolls its Combat Factor or less inflicts a Step Loss.",
      explain: "Assaulting from above (Top-Down) or from below (Bottom-Up) shifts the odds [13.1–13.3].",
      cite: "[13.4.2]" },
    { title: "Assault", pose: "focus", plan: ASSAULT,
      say: function (s, a) { return a ? "In it goes." : "No assault this turn."; },
      run: playAndNote(ASSAULT, "assault"), cite: "[13.4.2]" },
    { title: "The fight", pose: "grin",
      say: function () { return /Insurgents suffer a Step Loss/.test(fight.assault || "") ? "The Insurgents took the Step Loss." : "Not this time. The dice decide; the odds are what I control."; },
      cite: "[13.4.2]" },

    // Reorganisation
    { title: "End of the turn", pose: "think",
      say: "The rest of the assaults go in. Then Reorganisation does the bookkeeping.",
      run: aiUntil(function (s) { return s.turn === 5; }), cite: "[14]",
      expect: function (s) { return s.turn === 5 || "Turn 5 should have begun"; } },
    { title: "Ground taken", pose: "grin",
      focus: function (s) { return { zones: gainedZones(s) }; },
      say: function (s) {
        var now = heldZones(s), gained = now.filter(function (z) { return fight.held.indexOf(z) < 0; });
        return gained.length ? "Zone " + gained.join(" and ") + " is ours: at the end of the turn it held only Marines." : "No new ground this turn. We still hold " + now.length + " Zones.";
      },
      cite: "[14.1]" },
    { title: "The score", pose: "talk",
      say: function (s) { return "We hold " + heldZones(s).length + " Zones now, and the Victory Points went from " + fight.vp + " to " + s.vp + "."; },
      cite: "[7.2.1]" },
    { title: "Yours to take", view: "city", pose: "grin",
      say: "That's how I play it. You're ready: close this list, press New match, and the district is yours to take.",
      done: true, cite: "[8]" }
  ];

  // ------------------------------------------------ Chapter 2: the pieces
  // The Turn-4 battlefield of the last chapter (its setup and seed), looked at
  // piece by piece. A beat may carry a `card` — a counter shown large in the
  // guide's bubble, flipping from one side to the other (art file names from
  // assets/counters/) — and a `quiz`: a tap-to-check question answered by
  // clicking a piece on the map. A quiz is the page's check, not a game move:
  // it never changes the state, and Next opens once it is answered.
  //   quiz: { prompt, answers(state) -> [uid], right, wrong }
  function squadsOnBoard(s) { return onBoard(s, function (u) { return G_().isMarineSquad(u); }); }
  function suspectsNearUs(s) {
    var G = G_(), near = {};
    G.units(s).forEach(function (u) {
      if (G.isMarineSquad(u) && u.pos && u.pos.zone != null) G.adjOrNei(u.pos.zone).forEach(function (z) { near[z] = true; });
    });
    return onBoard(s, function (u) { return u.kind === "suspect" && near[u.pos.zone]; });
  }

  // A quiz rings a small neighbourhood, so the camera comes in close enough
  // to read the counters (owner: a ring across several Zones zoomed out too
  // far): a right answer's own Zone, then one Adjacent Zone at a time until
  // a wrong answer is in the ring too. The tightest such ring wins; at most
  // QUIZ_RING pieces, right answer kept.
  var QUIZ_RING = 6;
  function around(s, answers, test, seeds) {
    var G = G_();
    function ring(uid) {
      var a = s.units[uid];
      if (!a || !a.pos || a.pos.zone == null) return null;
      var zs = [a.pos.zone], next = G.ZD[a.pos.zone].adjacent.slice(), r;
      for (;;) {
        r = onBoard(s, function (u) { return test(u) && zs.indexOf(u.pos.zone) >= 0; });
        if (r.some(function (u) { return answers.indexOf(u) < 0; }) || !next.length) break;
        zs.push(next.shift());
      }
      // (the wrong answers before the other right ones, so a cut keeps the question)
      r = [uid].concat(r.filter(function (u) { return answers.indexOf(u) < 0; }),
        r.filter(function (u) { return u !== uid && answers.indexOf(u) >= 0; }));
      return r.slice(0, QUIZ_RING);
    }
    var rings = (seeds || answers).map(ring).filter(Boolean);
    // the tightest neighbourhood that also holds a wrong answer: a real question
    var asks = rings.filter(function (r) { return r.some(function (u) { return answers.indexOf(u) < 0; }); });
    asks.sort(function (x, y) { return x.length - y.length; });
    return asks[0] || rings[0] || answers;
  }
  function isSquad(u) { return G_().isMarineSquad(u); }
  function wounded(s) { return onBoard(s, function (u) { return isSquad(u) && u.reduced; }); }
  function withCaat(s) { return onBoard(s, function (u) { return isSquad(u) && !!u.caat; }); }
  function suspects(s) { return onBoard(s, function (u) { return u.kind === "suspect"; }); }
  function martyrs(s) { return onBoard(s, function (u) { return u.kind === "martyrs"; }); }
  function anyPiece() { return true; }
  function pinned(s) { return G_().units(s).filter(function (u) { return u.pos && u.pinned; }).map(function (u) { return u.uid; }); }
  function withSecurity(s) { return onBoard(s, function (u) { return isSquad(u) && u.security; }); }
  // the pinned piece and what stands around it (a piece on a Street rings the
  // Zones that line that Street)
  function aroundPinned(s) {
    var p = pinned(s)[0], u = p && s.units[p];
    if (!u) return [];
    var zs = u.pos.street != null ? G_().board.streets[u.pos.street - 1].adjacentZones : [u.pos.zone];
    return [p].concat(onBoard(s, function (x) { return isSquad(x) && zs.indexOf(x.pos.zone) >= 0; })).slice(0, QUIZ_RING);
  }

  function fired(s) { return onBoard(s, function (u) { return u.fired; }); }
  function ringIf(list) { return list.length ? { units: list } : null; }
  var SQUAD_CARD = { front: { art: "marine-6.png", label: "Marine squad: CF 6" } };
  var STEP_CARD = { front: { art: "marine-6.png", label: "Full strength: CF 6, in a white circle" }, back: { art: "marine-6-reduced.png", label: "Reduced: CF 5, on a red square" } };
  var CAAT_CARD = { front: { art: "caat.png", label: "CAAT: no CF of its own" } };
  var SUSPECT_CARD = { front: { art: "suspect-12r.png", label: "Face down: we don't know yet" } };
  var FIGHTER_CARD = { front: { art: "guerillas-2-circle.png", label: "Guerillas side" }, back: { art: "martyrs-2-circle.png", label: "Martyrs side" } };
  var MARTYRS_CARD = { front: { art: "martyrs-3-triangle.png", label: "Martyrs: they never Retreat" } };

  // One idea per beat, the pace of Chapter 1: say one thing, ring it, then
  // let the player find one. The rule detail waits behind "Why?" (explain).
  var pieceBeats = [
    { title: "Know your pieces", view: "city", pose: "point",
      say: "Chess starts with the pieces, so we will too. Here's a battle three turns further on, at Turn 4, with every kind of piece in play.",
      explain: "Later, in a real game, hover over any counter and its card opens with everything in this chapter.",
      cite: "[5.1.1]" },
    { title: "Look, then find", view: "city", pose: "talk",
      say: "I'll show you one piece at a time. After each one, you find it on the map.",
      cite: "[5.1.1]" },

    // Marine squads
    { title: "Marine squad", pose: "talk",
      focus: function (s) { return { units: squadsOnBoard(s) }; },
      card: SQUAD_CARD,
      say: "This is a Marine squad, the piece you'll use most. These ringed counters are all squads.",
      cite: "[5.1.1]" },
    { title: "Combat Factor", pose: "point",
      focus: function (s) { return { units: squadsOnBoard(s) }; },
      card: SQUAD_CARD,
      say: "The big number is its Combat Factor, CF for short. The higher it is, the harder the squad hits.",
      explain: "Marine squads are CF 4 to 6 [5.1.1].",
      cite: "[5.1.1]" },
    { title: "Rolling to hit", pose: "focus",
      focus: function (s) { return { units: squadsOnBoard(s) }; },
      card: SQUAD_CARD,
      say: "To hit, a squad rolls a ten-sided die and needs its CF or less. A CF 6 squad hits on 1 to 6.",
      explain: "Some targets add to the roll: a Suspect +1, a Fortified Zone +2. An unmodified 9 always misses [11.2, 11.2.4].",
      cite: "[11.2]" },
    { title: "Moving", pose: "talk",
      focus: function (s) { return { units: squadsOnBoard(s) }; },
      say: "A squad moves up to 4 Locations a turn. Chapter 3 shows what a Location is.",
      cite: "[5.1.1]" },
    { title: "Step Loss", pose: "think",
      focus: function (s) { return { units: squadsOnBoard(s) }; },
      card: STEP_CARD,
      say: "When a squad is hit, it takes a Step Loss: the counter flips over, its CF drops by 1, and the number now sits on a red square.",
      explain: "A Step Loss costs 2 VP. A second Step Loss eliminates the squad and costs 5 more, 7 in all [5.1.1, 7.2.1].",
      cite: "[5.1.1]" },
    { title: "Your turn: find the wounded squad", pose: "focus",
      focus: function (s) { return { units: around(s, wounded(s), isSquad) }; },
      card: STEP_CARD,
      say: "One of these squads has already taken a Step Loss. Find it: its number sits on a red square.",
      quiz: { prompt: "Click the squad that has taken a Step Loss.",
        answers: wounded,
        right: "That's the one. One more Step Loss and it's gone, so I'd keep it out of the hottest fights.",
        wrong: "Not that one; it's still at full strength." },
      cite: "[5.1.1]" },

    // CAATs
    { title: "CAAT support", pose: "talk",
      focus: function (s) { return { units: withCaat(s) }; },
      card: CAAT_CARD,
      say: "Four squads carry a CAAT, a support team in armoured vehicles. Look for its small badge in the corner of the squad's counter.",
      cite: "[5.1.4.1]" },
    { title: "What a CAAT does", pose: "point",
      focus: function (s) { return { units: withCaat(s) }; },
      card: CAAT_CARD,
      say: "A CAAT has no CF of its own. It rides with its squad and makes that squad hit harder.",
      explain: "Ammo: 4 times a game, +2 CF to its squad's shot [11.1.2]. Explosives: once a game, an assault at CF 8 with no modifiers [13.7.1].",
      cite: "[5.1.4.1]" },
    { title: "Your turn: find a CAAT", pose: "focus",
      focus: function (s) { return { units: around(s, withCaat(s), isSquad) }; },
      say: "Find a squad in the ring that has a CAAT riding with it.",
      quiz: { prompt: "Click a squad with the CAAT badge.",
        answers: withCaat,
        right: "Right. That squad hits harder than its number shows, until its Ammo runs out.",
        wrong: "That squad has no CAAT. Look for the small badge in the corner of the counter." },
      cite: "[5.1.4.1]" },

    // The Abrams and the IIF
    { title: "M1A1 Abrams", pose: "point",
      focus: { units: ["abrams"] },
      card: { front: { art: "abrams.png", label: "Abrams: CF 8" } },
      say: "The Abrams tank: CF 8, the strongest piece we have.",
      explain: "It joins the fight from Turn 2 [10.2].",
      cite: "[12.6.2]" },
    { title: "Where the Abrams goes", pose: "talk",
      focus: { units: ["abrams"] },
      say: "The Abrams can't go into the buildings. It drives along the Streets between Zones, and into Open Ground.",
      explain: "Its Movement Points are rolled each turn: anywhere from 1 to 4 [12.6.1].",
      cite: "[12.6.2]" },
    { title: "IIF squads", pose: "think",
      card: { front: { art: "iif-4.png", label: "IIF squad: CF 4" } },
      say: "IIF squads, the Iraqi Intervention Force, arrive later in the battle. They fight just like Marine squads.",
      cite: "[5.1.6]" },
    { title: "The Mosque", pose: "point",
      focus: { zones: [26] },
      card: { front: { art: "iif-4.png", label: "IIF squad: CF 4" } },
      say: "One big difference: only IIF squads may enter Zone 26, the Mosque.",
      explain: "The Mosque is fortified and held hardest; leave it to the IIF [5.1.6.1].",
      cite: "[5.1.6.1]" },

    // Suspects
    { title: "Suspect markers", pose: "wow",
      focus: function (s) { return { units: suspectsNearUs(s) }; },
      card: SUSPECT_CARD,
      say: "Suspect markers are the fog of war. Something might be hiding under each one, and we don't know what yet.",
      cite: "[5.3.3]" },
    { title: "Revealing a Suspect", pose: "talk",
      focus: function (s) { return { units: suspectsNearUs(s) }; },
      card: { front: SUSPECT_CARD.front, back: { art: "guerillas-2-circle.png", label: "Revealed: this time, Guerillas" } },
      say: "Fire at one, assault it, or fly a Dragon Eye over its Zone, and it flips over to show what it was.",
      cite: "[5.3.3]" },
    { title: "Often nothing", pose: "grin",
      focus: function (s) { return { units: suspectsNearUs(s) }; },
      say: "In a normal Zone, half of them turn out to be nothing at all.",
      explain: "Roll 1–5: a Dummy, nothing there. 6–8: Guerillas. 9: Martyrs. 0: an IED or a Sniper [5.3.3].",
      cite: "[5.3.3]" },
    { title: "Your turn: find a Suspect", pose: "focus",
      focus: function (s) { return { units: around(s, suspects(s), anyPiece, suspectsNearUs(s)) }; },
      say: "Our squads, a fighter or two, and Suspects, all mixed together. Find a Suspect.",
      quiz: { prompt: "Click a Suspect marker.",
        answers: suspects,
        right: "Yes. Until something reveals it, assume it could shoot back.",
        wrong: "That isn't a Suspect: a Suspect shows its placement list and no number." },
      cite: "[5.3.3]" },

    // Insurgents units
    { title: "Guerillas", pose: "talk",
      focus: function (s) { return { units: onBoard(s, function (u) { return u.kind === "guerillas"; }) }; },
      card: FIGHTER_CARD,
      say: "A revealed fighter is an Insurgents counter, CF 1 to 4. Guerillas on one side, Martyrs on the other.",
      cite: "[5.2.1]" },
    { title: "One hit is enough", pose: "point",
      focus: function (s) { return { units: onBoard(s, function (u) { return u.kind === "guerillas"; }) }; },
      card: FIGHTER_CARD,
      say: "Unlike our squads, an Insurgents unit has no second chance: a single Step Loss eliminates it.",
      explain: "Guerillas that survive an assault Retreat. Each one eliminated gains us 1 VP [13.4.7, 7.2.1].",
      cite: "[5.2.1]" },
    { title: "Martyrs", pose: "wow",
      focus: function (s) { return { units: martyrs(s) }; },
      card: MARTYRS_CARD,
      say: "Martyrs are the dangerous side. They never Retreat, and eliminating them scores nothing.",
      cite: "[13.4.7]" },
    { title: "Suicide Bomber", pose: "think",
      focus: function (s) { return { units: martyrs(s) }; },
      card: MARTYRS_CARD,
      say: "An assault on Martyrs can set off a Suicide Bomber: it and the squad that went in are both lost.",
      explain: "That's the Suicide Bomber Event [13.4.3]. Weaken Martyrs with fire before you assault [13.4.7].",
      cite: "[13.4.3]" },
    { title: "Your turn: find the Martyrs", pose: "focus",
      focus: function (s) { return { units: around(s, martyrs(s), anyPiece) }; },
      say: "Somewhere in this ring is a Martyrs unit. Their counters carry the word MARTYRS.",
      quiz: { prompt: "Click the Martyrs unit.",
        answers: martyrs,
        right: "That's it. That one will stay and fight to the end.",
        wrong: "Not that one. Look for MARTYRS printed on the counter." },
      cite: "[5.2.1]" },

    // What has happened to a piece
    { title: "Marks on the counters", pose: "talk",
      focus: function (s) { return ringIf(pinned(s).concat(withSecurity(s), fired(s)).slice(0, 8)); },
      say: "A counter also shows what has happened to it this turn. There are three marks to know.",
      cite: "[11.5]" },
    { title: "Greyed out: Fired", pose: "point",
      focus: function (s) { return ringIf(fired(s).slice(0, 8)); },
      say: "Greyed out means it has Fired this turn. It can't move or assault until next turn.",
      explain: "Fired clears at the end of the turn [11.3, 14.3.3].",
      cite: "[11.3]" },
    { title: "Red edge: Pinned", pose: "wow",
      focus: function (s) { return ringIf(pinned(s)); },
      say: "A red edge means it's Pinned: pinned down, unable to fire, move or assault until it rallies.",
      explain: "A Pinned squad rallies on a roll of its CF or less [11.5, 14.3.4].",
      cite: "[11.5]" },
    { title: "Badge: Security Element", pose: "talk",
      focus: function (s) { return ringIf(withSecurity(s)); },
      card: { front: { art: "security.png", label: "Security Element: CF −1, stays in its Zone" } },
      say: "A Security Element badge means the squad has left a team behind to hold its spot.",
      explain: "With its Security Element out, a squad fights at CF −1 and can't leave the Zone [12.3.2].",
      cite: "[12.3.2]" },
    { title: "Your turn: find the Pinned piece", pose: "focus",
      focus: function (s) { return { units: aroundPinned(s) }; },
      say: "One piece in the ring is Pinned: it can't do anything this turn.",
      quiz: { prompt: "Click the Pinned piece (look for the red edge).",
        answers: pinned,
        right: "That's it. Pinned pieces still count for holding ground, but they can't act until they rally.",
        wrong: "That one is free to act. Look for the red edge." },
      cite: "[11.5]" },
    { title: "Pieces done", view: "city", pose: "grin",
      say: "Those are the pieces. Next chapter: the board itself, with its Zones and Locations, and how a piece gets from one to the next.",
      done: true, cite: "[5.1.1]" }
  ];

  // ------------------------------------------------ Chapter 3: the board
  // The same Turn-4 battlefield, read as terrain. Zone 24 is the classroom:
  // empty, every Location type but Open Ground free, and Zone 25 shares its
  // Block (a door and a roof between them); Streets part it from Zone 14.
  // A beat may carry `links(state) -> [["24:1", "24:2"], ...]`: lines the page
  // draws on the map between Locations, one after another. A quiz may ask
  // for a place: quiz.kind "loc" answers "zone:loc" keys, "zone" answers Zone
  // numbers (a click anywhere in a Zone counts as that Zone).
  var HOME = 24, NEXT = 25, ACROSS = 14;
  function locKeys(z) { return G_().ZD[z].locations.map(function (l) { return z + ":" + l.id; }); }
  function inZoneLinks(z) { return G_().ZD[z].locationLinks.map(function (p) { return [z + ":" + p[0], z + ":" + p[1]]; }); }
  function crossLinksOf(s, z) {
    var out = [];
    G_().ZD[z].locations.forEach(function (l) {
      G_().crossLinks(s, z, l.id).forEach(function (c) { out.push([z + ":" + l.id, c.zone + ":" + c.loc]); });
    });
    return out;
  }
  function stepsFrom(s, z, loc) {
    return G_().locLinks(s, z, loc).map(function (l) { return z + ":" + l; })
      .concat(G_().crossLinks(s, z, loc).map(function (c) { return c.zone + ":" + c.loc; }));
  }
  function held(s) { return heldZones(s).map(String); }

  function doorsTo(s, from, to, loc) {
    return crossLinksOf(s, from).filter(function (p) { return p[0] === from + ":" + loc && p[1].indexOf(to + ":") === 0; });
  }
  // a held Zone and the Zones beside it that are not ours: two or three
  // Zones, close enough to read (owner: wide rings zoomed out too far)
  function groundRing(s) {
    var G = G_(), h = heldZones(s), best = null;
    h.forEach(function (z) {
      var not = G.ZD[z].adjacent.filter(function (a) { return h.indexOf(a) < 0 && a !== 27; }).slice(0, 2);
      if (not.length && (!best || not.length > best.length - 1)) best = [z].concat(not);
    });
    return best || h.slice(-1);
  }
  var HOME_ZONE = { zones: [HOME], locs: locKeys(HOME) };
  var BLOCK = { zones: [HOME, NEXT], locs: locKeys(HOME).concat(locKeys(NEXT)) };

  // One idea per beat, the pace of Chapter 1; rule detail behind "Why?".
  var boardBeats = [
    { title: "The battlefield", view: "city", pose: "point",
      say: "Now the board. The Jolan district is cut into 61 Zones, each one a block of buildings.",
      cite: "[4.1.1]" },
    { title: "Zone numbers", pose: "talk",
      focus: { zones: [HOME] },
      say: "Each Zone has its number printed in a green box. This one is Zone " + HOME + ", empty for now.",
      cite: "[4.1.1]" },
    { title: "Locations", pose: "point",
      focus: HOME_ZONE,
      say: "Pieces never just stand in a Zone. They stand on a Location inside it: one of these ringed places.",
      cite: "[4.2.1]" },
    { title: "The Courtyard", pose: "talk",
      focus: { locs: [HOME + ":C"] },
      say: "The Courtyard, marked C, is at street level.",
      cite: "[4.2.1]" },
    { title: "The stories", pose: "talk",
      focus: { locs: [HOME + ":1", HOME + ":2"] },
      say: "Above it are the 1st Story, marked 1, and the 2nd Story, marked 2.",
      explain: "Some Zones have a second room on one floor, marked with a prime: 1', 2'. Some also have Open Ground (OG) [4.2.1].",
      cite: "[4.2.1]" },
    { title: "The Rooftop", pose: "point",
      focus: { locs: [HOME + ":R"] },
      say: "And on top, the Rooftop, marked R.",
      cite: "[4.2.1]" },
    { title: "One to a Location", pose: "think",
      focus: HOME_ZONE,
      say: "A Location is small. It holds at most one Insurgents unit or Suspect, and never an enemy and a Marine squad together.",
      cite: "[12.2.1.2]" },
    { title: "Your turn: find the roof", pose: "focus",
      focus: HOME_ZONE,
      say: "Rooftops matter: a squad attacking from above gets the better of the fight.",
      quiz: { kind: "loc", prompt: "Click the Rooftop of Zone " + HOME + ".",
        answers: function () { return [HOME + ":R"]; },
        right: "That's the roof. From there a squad can assault the floor below with the odds on its side.",
        wrong: "That's not the Rooftop. Look for the R on the map." },
      cite: "[4.2.1]" },

    // Moving inside a Zone
    { title: "The arrows", pose: "point",
      focus: HOME_ZONE,
      links: function () { return inZoneLinks(HOME); },
      say: "Printed arrows join the Locations inside a Zone. Watch: Courtyard to 1st Story, 1st to 2nd, 2nd to the Rooftop.",
      cite: "[4.2.2]" },
    { title: "Only along the arrows", pose: "talk",
      focus: HOME_ZONE,
      links: function () { return inZoneLinks(HOME); },
      say: "A piece moves only along the arrows, and each step costs one Movement Point. A squad has 4 a turn.",
      explain: "No arrow, no step: the Courtyard does not reach the roof directly [4.2.2, 12.3.1].",
      cite: "[12.3.1]" },

    // Moving to the next Zone
    { title: "Adjacent Zones", pose: "talk",
      focus: { zones: [HOME, NEXT] },
      say: "Zones " + HOME + " and " + NEXT + " share a wall. They're Adjacent: in the same Block.",
      cite: "[4.1.1]" },
    { title: "Doors", pose: "point",
      focus: BLOCK,
      links: function (s) { return doorsTo(s, HOME, NEXT, "C"); },
      say: "A Courtyard opens through a door into the next Zone's Courtyard.",
      explain: "Matching door symbols in two Adjacent Zones make those Locations Adjacent [4.2.2].",
      cite: "[4.2.2]" },
    { title: "Roofs", pose: "grin",
      focus: BLOCK,
      links: function (s) { return doorsTo(s, HOME, NEXT, "R"); },
      say: "And a Rooftop jumps across to the next Zone's Rooftop.",
      explain: "Matching roof symbols work the same way as doors [4.2.2].",
      cite: "[4.2.2]" },
    { title: "Your turn: one step", pose: "focus",
      focus: BLOCK,
      say: "Picture a squad standing in the Courtyard of Zone " + HOME + ". It has one Movement Point left.",
      quiz: { kind: "loc", prompt: "Click a Location it could step to.",
        answers: function (s) { return stepsFrom(s, HOME, "C"); },
        right: "Yes. From the Courtyard it can go up into the 1st Story, or through the door into Zone " + NEXT + "'s Courtyard.",
        wrong: "Not in one step: there's no arrow or door from the Courtyard to there." },
      cite: "[12.3.1]" },

    // Streets
    { title: "Streets", pose: "wow",
      focus: { zones: [HOME, ACROSS] },
      say: "Between the Blocks run the Streets. Zones " + HOME + " and " + ACROSS + " face each other across one: they're Neighbouring, not Adjacent.",
      cite: "[4.1.2]" },
    { title: "Crossing a Street", pose: "think",
      focus: { zones: [HOME, ACROSS] },
      say: "To cross, a squad steps out of a door onto the Street, then in at the far side. Out there it's exposed.",
      explain: "Out on the Street, if any Zone beside it holds Insurgents or Suspects, the squad draws a Street Sniper Attack: a Step Loss or a Pin [11.4.2].",
      cite: "[11.4.2]" },
    { title: "Your turn: next door", pose: "focus",
      focus: { zones: [HOME].concat(G_().ZD[HOME].adjacent, [ACROSS]) },
      say: "Adjacent means the same Block, wall to wall. Neighbouring means across a Street.",
      quiz: { kind: "zone", prompt: "Click a Zone Adjacent to Zone " + HOME + ".",
        answers: function () { return G_().ZD[HOME].adjacent.map(String); },
        right: "Right: Zone " + NEXT + " shares Zone " + HOME + "'s Block, and a squad can walk straight in.",
        wrong: "That Zone is across a Street from it, or further away: Neighbouring at best." },
      cite: "[4.1.1]" },

    // Control
    { title: "Who holds what", view: "city", pose: "talk",
      say: "Every Zone starts in Insurgent hands. Winning means taking them, one by one.",
      cite: "[4.1.4]" },
    { title: "Taking a Zone", pose: "point",
      focus: function (s) { return { zones: heldZones(s) }; },
      say: "A Zone becomes ours when, at the end of a turn, it holds Marines and no Insurgents or Suspects.",
      cite: "[14.1]" },
    { title: "The blue mark", pose: "grin",
      focus: function (s) { return { zones: heldZones(s) }; },
      say: "A small blue mark shows each Zone we control. These are the ones we've taken so far.",
      explain: "The printed circle tells a Zone's kind: black for a Start Zone, red for a Fortified Zone [4.1.4, 4.1.5].",
      cite: "[14.1]" },
    { title: "Your turn: our ground", pose: "focus",
      focus: function (s) { return { zones: groundRing(s) }; },
      say: "Some of the Zones in the ring are ours, and some are not.",
      quiz: { kind: "zone", prompt: "Click a Zone we control.",
        answers: held,
        right: "That one's ours. Hold every Zone but 27 at the end of a turn and the battle is won.",
        wrong: "That Zone is still the Insurgents'. Look for the blue mark." },
      cite: "[7.2]" },

    // Two special Zones
    { title: "The Mosque", pose: "think",
      focus: { zones: [26] },
      say: "Zone 26, the Mosque, is fortified and held hardest. Only IIF squads may go in.",
      explain: "You still need Zone 26 to win [5.1.6.1, 7.2].",
      cite: "[5.1.6.1]" },
    { title: "Zone 27", pose: "wow",
      focus: { zones: [27] },
      say: "Zone 27 beside it is open ground that no piece may ever enter.",
      explain: "It is the one Zone you don't need to win [7.2, 12.4.2].",
      cite: "[12.4.2]" },
    { title: "Board done", view: "city", pose: "grin",
      say: "You know the pieces and the ground. Next chapter, you put them together: moving, firing and assaulting, one small puzzle at a time.",
      done: true, cite: "[4.2.2]" }
  ];

  // ------------------------------------------- Chapter 4: what you can do
  // Three practice positions, like chess puzzles: the lesson sets the pieces
  // (a scripted deal, said so on screen, as Chapter 5's planted Suspect is),
  // and every move the player makes runs through the engine. Each puzzle
  // rings every legal choice for one squad; `accept(state, action)` says
  // which of them answers the puzzle (true, or the guide's reason why not),
  // and the page refuses the rest before the engine sees them.
  //   1. Fire: four targets, one with the best odds (the fewest modifiers).
  //   2. Move: into the next Zone by the roof, not the door (Defensive Fire).
  //   3. Assault: Top-Down on Guerillas, not even odds on Martyrs.
  // The model answer (`action`, for headless replay) is the first accepted
  // move in the state the previous beat left; every beat records it.
  var DRILL_SEED = "drill-1";
  var drill = { state: null, f: null, fz: [], m: null, A: 19, B: 29, C: 38 };
  var NO_FIRE_ZONES = [19, 29, 38];

  function clearZone(state, z) {
    G_().units(state).forEach(function (u) {
      if (u.pos && u.pos.zone === z && !G_().isMarineSquad(u)) { u.alive = false; u.pos = null; }
    });
  }
  function plant(state, uid, kind, cf, sym, z, loc) {
    state.units[uid] = { uid: uid, kind: kind, counter: 1, cf: cf, sym: sym, pos: { zone: z, loc: loc }, alive: true };
  }
  function drillSetup(opts) {
    var G = G_(), state = G.create({}, opts);
    AI_().autoSetup(G, state, opts);
    while (state.phase !== "fire") state = global.FW.game.run(G, state, endPhaseOf(state), opts).state;
    drill.state = state; drill.f = null; drill.m = null;
    return state;
  }
  // Puzzle 1: a squad with no CAAT in a Start Zone, two Zones beside it
  // (Adjacent first: they sit closest) cleared, and four targets planted in
  // them, two to a Zone, so the ring stays close enough to read.
  function stageFire(state) {
    var G = G_(), plain = G.units(state).filter(function (u) { return G.isMarineSquad(u) && u.pos && !u.caat; });
    for (var i = 0; i < plain.length; i++) {
      var z0 = plain[i].pos.zone;
      var adj = G.ZD[z0].adjacent;
      var ring = G.adjOrNei(z0).sort(function (a, b) { return (adj.indexOf(b) >= 0) - (adj.indexOf(a) >= 0); }).filter(function (z) {
        return z !== 27 && z !== 26 && NO_FIRE_ZONES.indexOf(z) < 0 && !G.marinesInZone(state, z).length && !state.zones[z].fortified &&
          ["1", "2", "R"].every(function (l) { return G.locExists(state, z, l); });
      });
      if (ring.length < 2) continue;
      ring.slice(0, 2).forEach(function (z) { clearZone(state, z); });
      plant(state, "drillSus", "suspect", null, null, ring[0], "R"); state.units.drillSus.marker = 0;
      plant(state, "drillG1", "guerillas", 2, "circle", ring[0], "1");
      plant(state, "drillM", "martyrs", 2, "triangle", ring[1], "2");
      plant(state, "drillG2", "guerillas", 2, "diamond", ring[1], "R");
      drill.f = plain[i].uid; drill.fz = ring.slice(0, 2);
      return { events: ["Practice position: four targets around " + G.unitName(state, plain[i]) + " (the lesson placed them)."] };
    }
    return { events: ["No practice position could be set."] };
  }
  function drms(state, a) {
    return G_().fireDrms(state, state.units[a.uid], state.units[a.target]).reduce(function (t, d) { return t + d.value; }, 0);
  }
  function acceptFire(state, a) {
    var best = Math.min.apply(null, G_().legalActions(state).filter(function (x) { return x.type === "fire" && x.uid === a.uid; })
      .map(function (x) { return drms(state, x); }));
    if (drms(state, a) === best) return true;
    var list = G_().fireDrms(state, state.units[a.uid], state.units[a.target]).map(function (d) { return d.label + " +" + d.value; }).join(", ");
    return "Harder than it needs to be: " + list + ". Every modifier is added to your die. Find the target with the fewest.";
  }
  // Puzzle 2: a second squad (no CAAT) set on the 2nd Story of Zone A; Zone B
  // next door holds Guerillas on its 2nd Story and Martyrs wait on Zone C's roof.
  function stageMove(state, opts) {
    var G = G_(), r = global.FW.game.run(G, state, endPhaseOf(state), opts);
    state = r.state;
    [drill.A, drill.B, drill.C].forEach(function (z) { clearZone(state, z); });
    var m = G.units(state).filter(function (u) { return G.isMarineSquad(u) && u.pos && !u.caat && u.uid !== drill.f && !u.fired; })[0];
    m.pos = { zone: drill.A, loc: "2" };
    // Zone A is ours: a squad may only go out of ground we hold [12.4.3]
    state.zones[drill.A].control = "usmc";
    plant(state, "drillT", "guerillas", 2, "circle", drill.B, "2");
    plant(state, "drillX", "martyrs", 3, "triangle", drill.C, "R");
    drill.m = m.uid;
    return { state: state, records: r.records,
      events: r.events.concat(["Practice position: " + G.unitName(state, m) + " on the 2nd Story of Zone " + drill.A + ", which we hold (the lesson placed it)."]) };
  }
  function stepAccept(want, why) {
    return function (state, a) {
      if (a.uid !== drill.m) return "Move the ringed squad.";
      return a.to && a.to.zone + ":" + a.to.loc === want ? true : why;
    };
  }
  function acceptAssault(state, a) {
    if (a.target === "drillT" && !a.explosives) return true;
    return a.target === "drillX" ? "Martyrs on the next roof: roof to roof is a Normal assault with no edge, they never Retreat, and a Suicide Bomber could take your squad with them. The Guerillas below you are the better fight."
      : "Not that one. Look below you.";
  }
  function stash(b) {
    var e = b.expect;
    b.expect = function (s) { drill.state = s; return e ? e(s) : true; };
    if (b.accept) {
      Object.defineProperty(b, "action", { enumerable: true, get: function () {
        var s = drill.state;
        return G_().legalActions(s).filter(function (a) { return a.type === b.await.type && (!b.await.uid || a.uid === b.await.uid) && b.accept(s, a) === true; })[0];
      } });
    }
    return b;
  }

  // One idea per beat, the pace of Chapters 2 and 3; rule detail behind "Why?".
  // A `run` happens as the player leaves its beat, so each position is set
  // on the beat that announces it and the next beats ring what it placed.
  function shooter() { return { units: [drill.f] }; }
  function climber() { return { units: [drill.m] }; }
  var TARGETS = ["drillSus", "drillG1", "drillM", "drillG2"];
  var drillBeats = [
    { title: "Your hands on it", view: "city", pose: "point",
      say: "You know the pieces and the ground. Now you make the moves.",
      explain: "Every move you make goes through the real rules. A move that breaks them won't happen, and a legal but poor one, I'll talk you out of.",
      cite: "[8]" },
    { title: "Three puzzles", view: "city", pose: "talk",
      say: "I'll set up three small practice positions, like chess puzzles. Each one has a best answer.",
      explain: "The lesson places these pieces itself, so the puzzle is the same every time.",
      cite: "[8]", run: stageFire },

    // Puzzle 1: the shot
    { title: "Your shooter", pose: "point",
      focus: shooter,
      say: function (s) { return "First, Fire Combat. This is " + name(s, drill.f) + ", ready to shoot."; },
      cite: "[11]" },
    { title: "Four targets", pose: "wow",
      focus: function () { return { units: [drill.f].concat(TARGETS) }; },
      say: "I've placed four enemies around it, all in range.",
      explain: "A squad fires at a Zone next door or across a Street: Adjacent or Neighbouring [11.1].",
      cite: "[11.1]" },
    { title: "The roll", pose: "talk",
      focus: shooter,
      say: function (s) { var u = s.units[drill.f]; return "To hit, it rolls a ten-sided die and needs its CF or less. CF " + u.cf + ": a " + u.cf + " or less hits."; },
      cite: "[11.2]" },
    { title: "Modifiers", pose: "think",
      focus: shooter,
      say: "But some targets add to the roll. Every +1 makes a hit harder.",
      cite: "[11.2.1]" },
    { title: "A Suspect: +1", pose: "point",
      focus: { units: ["drillSus"] },
      say: "Shooting at a Suspect marker adds 1.",
      cite: "[11.2.1]" },
    { title: "Off the roof: +1", pose: "point",
      focus: { units: ["drillG1", "drillM"] },
      say: "Insurgents anywhere but a Rooftop add 1.",
      cite: "[11.2.1]" },
    { title: "Martyrs: +1 more", pose: "wow",
      focus: { units: ["drillM"] },
      say: "And Martyrs add 1 more. These are off the roof too, so that's +2.",
      explain: "+1 for Martyrs in a normal Zone, on top of +1 for not being on a Rooftop [11.2.1].",
      cite: "[11.2.1]" },
    { title: "Pick your shot", pose: "focus",
      await: { type: "fire", get uid() { return drill.f; } },
      accept: acceptFire,
      say: "Your turn. Pick the target that gives you the best odds.",
      explain: "+1 for a Suspect marker, +1 if Insurgents are not on a Rooftop, +1 for Martyrs in a normal Zone [11.2.1].",
      ask: "Make a decision: which target?",
      lesson: "Count the modifiers before you shoot: Guerillas on a Rooftop add nothing, the best odds here.",
      hint: "Click the ringed squad, then the target you want.",
      wrong: "Fire with the ringed squad.",
      cite: "[11.2.1]" },
    { title: "The clean shot", pose: "grin",
      focus: function () { return { zones: [drill.fz[1]] }; },
      say: "Guerillas on a roof: nothing added. That's the best odds this squad can get.",
      explain: "Hit or miss, the die decides. Good odds are the part you control.",
      cite: "[11.2]" },

    // Puzzle 2: the way in
    { title: "Next: Movement", view: "city", pose: "talk",
      say: "Second puzzle: Movement. I'll set up the position.",
      run: stageMove, cite: "[12]" },
    { title: "Your climber", pose: "point",
      focus: climber,
      say: function (s) { return name(s, drill.m) + " is on the 2nd Story of Zone " + drill.A + "."; },
      cite: "[12]" },
    { title: "Our ground", pose: "talk",
      focus: { zones: [drill.A] },
      say: "Zone " + drill.A + " is ours. Squads move out from ground we hold.",
      explain: "A squad can't just walk out of an Insurgent Zone [12.4.3].",
      cite: "[12.4.3]" },
    { title: "The goal", pose: "focus",
      focus: { zones: [drill.A, drill.B] },
      say: "Zone " + drill.B + " next door, in the same Block, is held by Guerillas. Get your squad into it.",
      cite: "[12.4]" },
    { title: "Defensive Fire", pose: "wow",
      focus: { units: ["drillT"] },
      say: "Careful. Step into an enemy Zone's Courtyard or Open Ground and every Insurgents unit there gets a free shot at you.",
      explain: "That's Defensive Fire. A roof or a building's floors don't draw it [12.7].",
      cite: "[12.7]" },
    { title: "Two ways in", pose: "think",
      focus: { zones: [drill.A, drill.B] },
      links: function (s) { return doorsTo(s, drill.A, drill.B, "C").concat(doorsTo(s, drill.A, drill.B, "R")); },
      say: "Two ways lead in: down to the door between the Courtyards, or up and across the roofs.",
      cite: "[4.2.2]" },
    { title: "Step one", pose: "focus",
      await: { type: "moveStep", get uid() { return drill.m; } },
      focus: { zones: [drill.A, drill.B] },
      accept: stepAccept(drill.A + ":R", "That heads down to the door, and the door opens into Zone " + drill.B + "'s Courtyard, where every Insurgents unit inside gets a free shot. Go over the top."),
      say: "Your turn. It has 4 Movement Points. Choose its first step.",
      ask: "Make a decision: which way in?",
      lesson: "Go up, not through the door: only a Courtyard or Open Ground in their Zone draws Defensive Fire.",
      hint: "Click the ringed squad, then where it should step.",
      wrong: "Move the ringed squad.",
      cite: "[12.3.1]" },
    { title: "Step two", pose: "focus",
      await: { type: "moveStep", get uid() { return drill.m; } },
      focus: { zones: [drill.A, drill.B] },
      accept: stepAccept(drill.B + ":R", "From the roof, jump across to Zone " + drill.B + "'s Rooftop. That's the way in that nobody is watching."),
      say: "On the roof. Now across.",
      ask: "Now the second step. Where to?",
      lesson: "Across the roofs and into their Zone without drawing a single shot.",
      hint: "Click the squad, then Zone " + drill.B + "'s Rooftop.",
      wrong: "Move the ringed squad.",
      cite: "[4.2.2]" },
    { title: "In, unseen", pose: "grin",
      focus: climber,
      say: "You're in Zone " + drill.B + " without drawing a single shot.",
      cite: "[12.7]" },

    // Puzzle 3: the fight
    { title: "Right below you", pose: "wow",
      focus: function () { return { units: [drill.m, "drillT"] }; },
      say: "And look what's right below you: the Guerillas, on the 2nd Story.",
      run: function (state, opts) { var r = global.FW.game.run(G_(), state, endPhaseOf(state), opts); return { state: r.state, records: r.records, events: r.events }; },
      cite: "[13]" },
    { title: "Assault", pose: "talk",
      focus: function () { return { units: [drill.m, "drillT"] }; },
      say: "Now the Assault Phase: close combat with an enemy in a Location next to yours. Both sides roll.",
      explain: "Each side needs its own CF or less to inflict a Step Loss, and the hits land at the same time [13.4.2].",
      cite: "[13.4.2]" },
    { title: "Top-Down", pose: "point",
      focus: function () { return { units: [drill.m, "drillT"] }; },
      say: "From the Rooftop onto the floor below is a Top-Down assault: −1 to your roll.",
      explain: "If the enemy survives, its roll gets −1 too [13.4.5].",
      cite: "[13.4.5]" },
    { title: "The other fight", pose: "think",
      focus: function () { return { units: [drill.m, "drillX"] }; },
      say: "The Martyrs on Zone " + drill.C + "'s roof are in reach too. Roof to roof is a Normal assault, and Martyrs add 1 to your roll.",
      explain: "Martyrs never Retreat, and a Suicide Bomber could take your squad with them [13.4.4, 13.4.7].",
      cite: "[13.4.4]" },
    { title: "Choose your fight", pose: "focus",
      await: { type: "assault", get uid() { return drill.m; } },
      accept: acceptAssault,
      say: "Your turn. Pick your fight.",
      explain: "Top-Down on the Guerillas: −1 to your roll [13.4.5]. Martyrs: +1 to your roll, and they never Retreat [13.4.4, 13.4.7].",
      ask: "Make a decision: which fight do you pick?",
      lesson: "Fight from above: Top-Down takes 1 off your roll, and Guerillas can Retreat.",
      hint: "Click your squad, then the enemy to assault.",
      wrong: "Assault with your squad.",
      cite: "[13.4.5]" },
    { title: "Drills done", view: "city", pose: "grin",
      say: "That's how this game is won: pick the shot with the best odds, come in where they aren't watching, and fight from above.",
      debrief: {
        takeaways: ["Count the modifiers before every roll: the same squad can need a 3 or a 7.",
                    "Courtyards and Open Ground in their Zones draw Defensive Fire; roofs and floors do not.",
                    "Assault from above: Top-Down favours you, Bottom-Up favours them."],
        next: "Chapter 5 · Your tools: when to spend Ammo, the Security Element and the Explosives." },
      done: true, cite: "[8]" }
  ].map(stash);

  // ------------------------------------------- Chapter 5: your tools
  // Four practice positions, set the way Chapter 4's are, each on a tool the
  // player decides when to spend. Puzzles 1 and 4 are answered with the
  // lesson's button (app.lessonButtons): a click on the target plays the
  // plain move, and the guide says why that is not the answer.
  //   1. Fire: Martyrs off the roof (+2); the CAAT's Ammo gives +2 CF.
  //   2. IED or Sniper: the lesson's own shot, on loaded dice (a die tape,
  //      said so on screen), turns a Suspect into an IED/Sniper; one enemy
  //      nearby, so the Sniper is the smaller risk.
  //   3. Movement: the guide walks a squad through a door into an enemy
  //      Courtyard; detach the Security Element first (+1 to Defensive Fire).
  //   4. Assault: Bottom-Up on Martyrs (+2); Explosives fight at CF 8, no DRMs.
  var TOOLS_SEED = "tools-1";
  var tool = { state: null, a: null, b: null, c: null, d: null, z1: null, z2: null, D: 38 };

  function toolsSetup(opts) {
    var G = G_(), state = G.create({}, opts);
    AI_().autoSetup(G, state, opts);
    while (state.phase !== "fire") state = global.FW.game.run(G, state, endPhaseOf(state), opts).state;
    tool.state = state; tool.a = tool.b = tool.c = tool.d = null; tool.z1 = tool.z2 = null;
    return state;
  }
  // Zones beside z0 a squad there may fire into, away from the Zones the
  // other puzzles use
  function openBeside(state, z0, avoid) {
    var G = G_();
    return G.adjOrNei(z0).filter(function (z) {
      return z !== 26 && z !== 27 && NO_FIRE_ZONES.indexOf(z) < 0 && avoid.indexOf(z) < 0 &&
        !G.marinesInZone(state, z).length && !state.zones[z].fortified &&
        ["1", "R"].every(function (l) { return G.locExists(state, z, l); });
    });
  }
  function clearAround(state, z0) { G_().adjOrNei(z0).forEach(function (z) { clearZone(state, z); }); }
  function nearby(state, z0) {
    var G = G_();
    return G.adjOrNei(z0).reduce(function (t, z) { return t + G.insurgentsInZone(state, z).length + G.suspectsInZone(state, z).length; }, 0);
  }
  function cfOf(state, uid) { return G_().effCF(state.units[uid]); }

  // Puzzle 1: a squad with a CAAT, on its Rooftop, and one Martyrs unit off
  // the roof in the Zone beside it; nothing else around, so no sniper waits.
  function stageAmmo(state) {
    var G = G_(), list = G.units(state).filter(function (u) {
      return G.isMarineSquad(u) && u.pos && u.caat && G.locExists(state, u.pos.zone, "R");
    });
    for (var i = 0; i < list.length; i++) {
      var u = list[i], z = openBeside(state, u.pos.zone, [])[0];
      if (!z) continue;
      clearAround(state, u.pos.zone);
      u.pos = { zone: u.pos.zone, loc: "R" };
      plant(state, "toolM", "martyrs", 2, "triangle", z, "1");
      tool.a = u.uid; tool.z1 = z;
      return { events: ["Practice position: " + G.unitName(state, u) + " and its CAAT on a Rooftop, Martyrs in Zone " + z + " (the lesson placed them)."] };
    }
    return { events: ["No practice position could be set."] };
  }
  function acceptAmmo(state, a) {
    if (a.uid !== tool.a) return "Fire with the ringed squad.";
    if (a.caat === true) return true;
    var cf = cfOf(state, tool.a);
    return "Without the CAAT, CF " + cf + " against +2 needs a " + (cf - 2) + " or less. Spend one Ammo and it's CF " + (cf + 2) + ": a " + cf + " or less. Fire with the CAAT.";
  }

  // Puzzle 2: a second squad (no CAAT, so a Step Loss opens no choice
  // [5.1.1.2]) with a Suspect on the roof beside it and one Guerillas unit
  // further round. The lesson fires on a die tape: a 0 hits (+1, Suspect),
  // and the Activation rolls a 0, an IED or Sniper [5.3.3].
  function stageIED(state) {
    var G = G_(), list = G.units(state).filter(function (u) {
      return G.isMarineSquad(u) && u.pos && u.pos.loc != null && !u.caat && !u.fired && !u.pinned;
    });
    for (var i = 0; i < list.length; i++) {
      var u = list[i], zs = openBeside(state, u.pos.zone, [tool.z1]);
      if (zs.length < 2 || state.zones[zs[0]].fortified) continue;
      clearAround(state, u.pos.zone);
      plant(state, "toolS", "suspect", null, null, zs[0], "R"); state.units.toolS.marker = 0;
      plant(state, "toolG", "guerillas", 2, "circle", zs[1], "1");
      var shot = G.legalActions(state).filter(function (a) { return a.type === "fire" && a.uid === u.uid && a.target === "toolS" && !a.caat; })[0];
      if (!shot) continue;
      var r = global.FW.game.run(G, state, shot, { rng: global.FW.rng.tape([1, 1], { sides: 10 }) });
      tool.b = u.uid; tool.z2 = zs[0];
      return { state: r.state, records: r.records,
        events: ["Practice position: " + G.unitName(state, u) + " fires at a Suspect in Zone " + zs[0] + ", on the lesson's loaded dice."].concat(r.events) };
    }
    return { events: ["No practice position could be set."] };
  }
  // the chances, in tens, of a Step Loss and of a Pin from each choice
  function iedRisk(state, choice) {
    var cf = Math.min(cfOf(state, tool.b), 9), t = nearby(state, state.units[tool.b].pos.zone);
    if (choice === "ied") return { loss: 9 - cf, pin: cf + 1 };       // [13.5]
    return t ? { loss: 1, pin: Math.min(t, 9) } : { loss: 0, pin: 0 }; // [11.4.1]
  }
  function acceptIED(state, a) {
    var me = iedRisk(state, a.choice), other = iedRisk(state, a.choice === "ied" ? "sniper" : "ied");
    if (me.loss < other.loss || (me.loss === other.loss && me.pin <= other.pin)) return true;
    var cf = cfOf(state, tool.b), t = nearby(state, state.units[tool.b].pos.zone);
    return a.choice === "ied"
      ? "An IED costs a Step Loss on anything above your CF " + cf + ": " + (9 - cf) + " chances in 10. The Sniper needs a " + t + " or less, and only a 0 costs a Step. Count the enemies around you."
      : "With " + t + " enemies around you the Sniper is likely to land. The IED only tests your CF " + cf + ".";
  }

  // Puzzle 3: a third squad in Zone A's Courtyard (ours), Guerillas in Zone
  // B next door; the guide steps it through the door, and Defensive Fire
  // waits on the Security Element choice [12.3.2.1].
  function stageDoor(state, opts) {
    var G = G_(), r = global.FW.game.run(G, state, endPhaseOf(state), opts), recs = r.records, evs = r.events;
    state = r.state;
    [drill.A, drill.B].forEach(function (z) { clearZone(state, z); });
    var u = G.units(state).filter(function (x) {
      return G.isMarineSquad(x) && x.pos && !x.caat && !x.fired && !x.pinned && !x.security && x.uid !== tool.b;
    })[0];
    u.pos = { zone: drill.A, loc: "C" };
    state.zones[drill.A].control = "usmc";
    plant(state, "toolT", "guerillas", 2, "circle", drill.B, "2");
    tool.c = u.uid;
    var step = G.legalActions(state).filter(function (a) { return a.type === "moveStep" && a.uid === u.uid && a.to.zone === drill.B && a.to.loc === "C"; })[0];
    r = global.FW.game.run(G, state, step, opts);
    return { state: r.state, records: recs.concat(r.records),
      events: evs.concat(["Practice position: " + G.unitName(state, u) + " in Zone " + drill.A + "'s Courtyard (the lesson placed it), and the guide steps it through the door."], r.events) };
  }
  function acceptDoor(state, a) {
    return a.type === "dfDetach" ? true
      : "As it stands, no +1. Detach the Security Element first: 1 MP, and every Insurgents roll gets +1, so they hit less often.";
  }

  // Puzzle 4: a squad with a CAAT (Explosives unspent) on the 1st Story of
  // Zone D, Martyrs above it on the 2nd: Bottom-Up, +1, and +1 for Martyrs.
  function stageBlast(state, opts) {
    var G = G_(), r = global.FW.game.run(G, state, endPhaseOf(state), opts);
    state = r.state;
    clearZone(state, tool.D);
    var u = G.units(state).filter(function (x) {
      return G.isMarineSquad(x) && x.pos && x.caat && state.units[x.caat].explosives > 0 && !x.fired && !x.pinned;
    })[0];
    u.pos = { zone: tool.D, loc: "1" };
    plant(state, "toolX", "martyrs", 3, "triangle", tool.D, "2");
    tool.d = u.uid;
    return { state: state, records: r.records,
      events: r.events.concat(["Practice position: " + G.unitName(state, u) + " on the 1st Story of Zone " + tool.D + ", Martyrs on the 2nd (the lesson placed them)."]) };
  }
  function acceptBlast(state, a) {
    if (a.uid !== tool.d) return "Assault with the ringed squad.";
    if (a.target !== "toolX") return "Not that one. The Martyrs above you.";
    if (a.explosives === true) return true;
    var cf = cfOf(state, tool.d);
    return "From below and against Martyrs, CF " + cf + " needs a " + (cf - 2) + " or less. With Explosives it's CF 8, nothing added: an 8 or less. Use the Explosives.";
  }
  function stashTool(b) {
    var e = b.expect;
    b.expect = function (s) { tool.state = s; return e ? e(s) : true; };
    if (b.accept) {
      Object.defineProperty(b, "action", { enumerable: true, get: function () {
        var s = tool.state;
        return G_().legalActions(s).filter(function (a) { return (!b.await.type || a.type === b.await.type) && (!b.await.uid || a.uid === b.await.uid) && b.accept(s, a) === true; })[0];
      } });
    }
    return b;
  }

  // One idea per beat, the pace of Chapter 4; rule detail behind "Why?".
  var toolBeats = [
    { title: "Your tools", view: "city", pose: "talk",
      say: "Your squads carry tools that run out. The skill is knowing when to spend them.",
      explain: "Ammo and Explosives ride with a CAAT; every squad has a Security Element [5.1.4, 5.1.6].",
      cite: "[5.1.4]" },
    { title: "Four puzzles", view: "city", pose: "point",
      say: "Four more practice positions. In each, the question is: is this the moment?",
      explain: "The lesson places these pieces itself, so each puzzle is the same every time.",
      cite: "[8]", run: stageAmmo },

    // Puzzle 1: the Ammo
    { title: "A squad with a CAAT", pose: "point",
      focus: function () { return { units: [tool.a] }; },
      card: CAAT_CARD,
      say: function (s) { return name(s, tool.a) + " has a CAAT with it: a support team with heavy weapons."; },
      explain: "A CAAT has no CF of its own. It rides with its squad and shares its Fired and Pinned marks [5.1.4.1].",
      cite: "[5.1.4.1]" },
    { title: "Ammo", pose: "talk",
      focus: function () { return { units: [tool.a] }; },
      say: "The CAAT carries 4 uses of Ammo for the whole battle. Spend one on a shot and the squad fires at CF +2.",
      explain: "Fire Combat only, and only from a Rooftop, a Courtyard or Open Ground [11.1.2].",
      cite: "[11.1.2]" },
    { title: "A hard target", pose: "wow",
      focus: function () { return { units: [tool.a, "toolM"] }; },
      say: "Martyrs, off the roof: +2 to your roll.",
      explain: "+1 for Insurgents not on a Rooftop, +1 for Martyrs in a normal Zone [11.2].",
      cite: "[11.2]" },
    { title: "Is it worth it?", pose: "think",
      focus: function () { return { units: [tool.a, "toolM"] }; },
      say: function (s) { var cf = cfOf(s, tool.a); return "CF " + cf + " without the CAAT: you need a " + (cf - 2) + " or less. With it, a " + cf + " or less."; },
      cite: "[11.2]" },
    { title: "Take the shot", pose: "focus",
      focus: function () { return { units: [tool.a, "toolM"] }; },
      await: { type: "fire", get uid() { return tool.a; } },
      accept: acceptAmmo,
      choice: function (a) { return a.caat ? "Fire with the CAAT: CF +2, one Ammo" : "Fire without the CAAT"; },
      say: "Your turn. Take the shot, and decide about the Ammo.",
      explain: "A click on the target fires without the CAAT, the same as the first button.",
      ask: "Make a decision: spend the Ammo on this shot?",
      lesson: "Spend Ammo on the hard shots that matter: +2 CF is two more chances in 10.",
      hint: "Fire with the CAAT, or save the Ammo.",
      wrong: "Fire with the ringed squad.",
      cite: "[11.1.2]" },
    { title: function (s) { return s.units.toolM && s.units.toolM.alive ? "Still the right call" : "Ammo well spent"; },
      pose: "grin",
      focus: function () { return { units: [tool.a] }; },
      say: function (s) {
        return (s.units.toolM && s.units.toolM.alive ? "A miss, but the odds were with you: the Ammo gave you two more chances in 10. Dice are dice. " : "") +
          "Four uses, the whole battle. Spend them on the shots that are hard and that matter.";
      },
      explain: "Each use turns the Ammo marker; at 0 it is removed [11.1.2].",
      cite: "[11.1.2]" },

    // Puzzle 2: IED or Sniper
    { title: "Next: a surprise", view: "city", pose: "talk",
      say: "Second puzzle. Not every Suspect is a fighter. I'll take this shot myself, on loaded dice.",
      explain: "A Suspect hides an IED or a Sniper on a roll of 0, one time in ten. The lesson loads the dice so you see one [5.3.3].",
      cite: "[5.3.3]", run: stageIED },
    { title: "IED or Sniper", pose: "wow",
      focus: function () { return { units: [tool.b], zones: [tool.z2] }; },
      say: "It hit, and the Suspect was a bomb or a sniper. You choose which, before any dice.",
      explain: "In a Fortified Zone it is always an IED [5.3.5].",
      cite: "[5.3.5]" },
    { title: "An IED", pose: "point",
      focus: function () { return { units: [tool.b] }; },
      say: function (s) { var cf = cfOf(s, tool.b); return "An IED tests your squad: roll its CF, " + cf + ", or less and it's only Pinned. Above that, a Step Loss."; },
      cite: "[13.5]" },
    { title: "A Sniper", pose: "point",
      focus: function () { return { units: [tool.b, "toolG"] }; },
      say: function (s) { var t = nearby(s, s.units[tool.b].pos.zone); return "A Sniper counts the enemies around you: here, " + t + ". Roll " + t + " or less and you're Pinned. Only a 0 also costs a Step."; },
      explain: "Enemies means Insurgents units and Suspect markers in the Zones Adjacent and Neighbouring yours [11.4.1].",
      cite: "[11.4.1]" },
    { title: "Bomb or sniper?", pose: "focus",
      focus: function () { return { units: [tool.b, "toolG"] }; },
      await: { type: "iedChoice" },
      accept: acceptIED,
      choice: function (a) { return a.choice === "ied" ? "Make it an IED" : "Make it a Sniper"; },
      say: "Your turn. Which will it be?",
      ask: "Make a decision: bomb or sniper?",
      lesson: "Count the enemies around you before you choose: few nearby makes the Sniper the smaller risk.",
      hint: "Choose IED or Sniper.",
      wrong: "Choose IED or Sniper.",
      cite: "[5.3.5]" },
    { title: "Count first", pose: "grin",
      focus: function () { return { units: [tool.b] }; },
      say: "With few enemies around, the Sniper is the smaller risk. In a crowded street, the IED can be.",
      cite: "[5.3.5]" },

    // Puzzle 3: the Security Element
    { title: "Next: a door", view: "city", pose: "talk",
      say: "Third puzzle: Movement. I'll walk a squad through a door into an enemy Courtyard.",
      cite: "[12]", run: stageDoor },
    { title: "Into the Courtyard", pose: "wow",
      focus: function () { return { units: [tool.c, "toolT"] }; },
      say: function (s) { return name(s, tool.c) + " is in Zone " + drill.B + "'s Courtyard. The Guerillas inside are about to shoot."; },
      explain: "Defensive Fire: every Insurgents unit in the Zone rolls once [12.7].",
      cite: "[12.7]" },
    { title: "The Security Element", pose: "point",
      focus: function () { return { units: [tool.c] }; },
      say: "Every squad has a Security Element: a few Marines it can leave behind to cover a Location.",
      explain: "It has no CF and is never a target [5.1.6].",
      cite: "[5.1.6]" },
    { title: "Leave it here", pose: "think",
      focus: function () { return { units: [tool.c] }; },
      say: "Leave it in the Courtyard, for 1 MP, and every Insurgents roll gets +1. They have to roll under their CF to hit.",
      explain: "While it is detached the squad is CF −1 and can't leave the Zone [12.3.2.2].",
      cite: "[12.7.2]" },
    { title: "Before they shoot", pose: "focus",
      focus: function () { return { units: [tool.c, "toolT"] }; },
      await: {},   // the Defensive Fire choice is pending: its two answers are the only legal moves
      accept: acceptDoor,
      choice: function (a) { return a.type === "dfDetach" ? "Detach it first (1 MP)" : "Take the fire as we are"; },
      say: "Your turn. Detach it first, or take the fire as you are?",
      ask: "They're about to shoot. What do you do?",
      lesson: "Detach the Security Element before Defensive Fire: every roll against you gets +1.",
      hint: "Detach the Security Element, or take the fire as you are.",
      wrong: "Choose before the Defensive Fire.",
      cite: "[12.3.2.1]" },
    { title: "Covered", pose: "grin",
      focus: function () { return { units: [tool.c] }; },
      say: "That's the rulebook's own example: detach in the Courtyard, then take the fire.",
      explain: "It rejoins the squad at Reorganisation once the Zone is ours [14.3.1].",
      cite: "[12.3.2.1]" },

    // Puzzle 4: the Explosives
    { title: "Next: a bad fight", view: "city", pose: "talk",
      say: "Last puzzle: the Assault Phase. I've set a squad right below some Martyrs.",
      cite: "[13]", run: stageBlast },
    { title: "From below", pose: "point",
      focus: function () { return { units: [tool.d, "toolX"] }; },
      say: "Up from the floor below is Bottom-Up: +1 to your roll. Martyrs add 1 more.",
      explain: "If the Martyrs survive, Bottom-Up gives their roll +1 too [13.4.4–13.4.6].",
      cite: "[13.4.6]" },
    { title: "Explosives", pose: "wow",
      focus: function () { return { units: [tool.d] }; },
      say: "Its CAAT carries Explosives, once per battle. The squad fights at CF 8 and nothing is added to the roll.",
      explain: "Not during Flooding [13.7.2].",
      cite: "[13.7.1]" },
    { title: "Is it worth it?", pose: "think",
      focus: function () { return { units: [tool.d, "toolX"] }; },
      say: function (s) { var cf = cfOf(s, tool.d); return "Without them, CF " + cf + " needs a " + (cf - 2) + " or less. With them, an 8 or less."; },
      cite: "[13.7.1]" },
    { title: "Make the assault", pose: "focus",
      focus: function () { return { units: [tool.d, "toolX"] }; },
      await: { type: "assault", get uid() { return tool.d; } },
      accept: acceptBlast,
      choice: function (a) { return a.explosives ? "Assault with Explosives: CF 8" : "Assault without them"; },
      say: "Your turn. Assault, and decide about the Explosives.",
      explain: "A click on the target assaults without the Explosives, the same as the first button.",
      ask: "Make a decision: is this the fight for the Explosives?",
      lesson: "Explosives are once a battle: spend them on the fight you cannot win without them.",
      hint: "Assault with the Explosives, or without them.",
      wrong: "Assault with the ringed squad.",
      cite: "[13.7.1]" },
    { title: "Tools done", view: "city", pose: "grin",
      say: "Ammo for the hard shots, count before you choose, cover the door, and save the Explosives for the fight you can't win without them.",
      debrief: {
        takeaways: ["A tool that runs out is a decision: ask whether this is the moment before you spend it.",
                    "Turn the odds into words: 'a 4 or less' is 5 in 10; every +1 is one more in 10.",
                    "The Security Element costs 1 MP and makes every Defensive Fire roll against you harder."],
        next: "Chapter 6 · A whole turn: all six phases, every decision yours." },
      done: true, cite: "[8]" }
  ].map(stashTool);

  // ------------------------------------------- Chapter 1 (first): setting up
  // A real Setup on its own seed: the nine Start Zones are Activated before
  // anything is placed, so the player sees where the fight will start [6.2].
  // Two decisions are the player's, each a puzzle (`accept`): the strongest
  // squad into the hottest Start Zone (most Insurgent CF), then a CAAT to a
  // squad already in contact. The guide places the rest by the same reasoning.
  // A beat's `tray(state) -> [uid]` shows off-map pieces (the draw, the CAATs)
  // as counters in the bubble: click one, then its place on the map.
  var SETUP_SEED = "setup-6";
  var setupInfo = { state: null };

  function startZones() { return G_().board.zones.filter(function (z) { return z.circle === "start"; }).map(function (z) { return z.id; }); }
  function heat(s, z) {
    return G_().units(s).filter(function (u) { return u.pos && u.pos.zone === z && G_().isInsurgent(u); })
      .reduce(function (t, u) { return t + u.cf; }, 0);
  }
  function hottest(s) {
    var zs = startZones(), max = Math.max.apply(null, zs.map(function (z) { return heat(s, z); }));
    return zs.filter(function (z) { return heat(s, z) === max; });
  }
  function contactZones(s) { return startZones().filter(function (z) { return heat(s, z) > 0; }); }
  function drawn(s) { return s.setupQueue.filter(function (uid) { return !s.units[uid].pos; }); }
  function strongestCf(s) { return Math.max.apply(null, drawn(s).map(function (uid) { return s.units[uid].cf; })); }
  function enemiesIn(s, z) {
    return G_().units(s).filter(function (u) { return u.pos && u.pos.zone === z && G_().isInsurgent(u); })
      .map(function (u) { return u.kind === "martyrs" ? "Martyrs CF " + u.cf : "Guerillas CF " + u.cf; });
  }
  function acceptPlace(s, a) {
    var u = s.units[a.uid], hot = hottest(s);
    if (u.cf < strongestCf(s)) return "That's a CF " + u.cf + " squad. Your strongest are CF " + strongestCf(s) + ": send one of those where the fight is hardest.";
    if (hot.indexOf(a.zone) < 0) {
      var here = enemiesIn(s, a.zone);
      return "Zone " + a.zone + (here.length ? " holds " + here.join(" and ") : " turned up nothing") + ". Zone " + hot[0] + " is hotter: " + enemiesIn(s, hot[0]).join(" and ") + ".";
    }
    return true;
  }
  function acceptCaat(s, a) {
    var u = s.units[a.uid];
    if (heat(s, u.pos.zone) > 0) return true;
    return G_().unitName(s, u) + " is in Zone " + u.pos.zone + ", where nothing turned up. Give the CAAT to a squad that's already in contact.";
  }
  // the guide places the rest: strongest squads to the hottest Zones left
  function placeRest(state, opts) {
    var G = G_(), records = [], events = [];
    while (drawn(state).length) {
      var used = {};
      state.setupQueue.forEach(function (uid) { var u = state.units[uid]; if (u.pos) used[u.pos.zone] = true; });
      var uid = drawn(state).slice().sort(function (x, y) { return state.units[y].cf - state.units[x].cf; })[0];
      var z = startZones().filter(function (q) { return !used[q]; }).sort(function (x, y) { return heat(state, y) - heat(state, x) || x - y; })[0];
      var r = global.FW.game.run(G, state, { type: "setupPlace", uid: uid, zone: z }, opts);
      state = r.state; records = records.concat(r.records); events = events.concat(r.events);
    }
    return { state: state, records: records, events: events };
  }
  // ...and the other CAATs: to squads in contact, hottest first, then the strongest
  function attachRest(state, opts) {
    var G = G_(), records = [], events = [], n = 0;
    while (state.phase === "setup" && n++ < 10) {
      var c = G.units(state).filter(function (u) { return u.kind === "caat" && !u.attachedTo; })[0];
      if (!c) break;
      var sq = state.setupQueue.map(function (uid) { return state.units[uid]; }).filter(function (u) { return u.pos && !u.caat; })
        .sort(function (x, y) { return heat(state, y.pos.zone) - heat(state, x.pos.zone) || y.cf - x.cf; })[0];
      var r = global.FW.game.run(G, state, { type: "setupCaat", caat: c.uid, uid: sq.uid }, opts);
      state = r.state; records = records.concat(r.records); events = events.concat(r.events);
    }
    return { state: state, records: records, events: events };
  }
  function setupStash(b) {
    var e = b.expect;
    b.expect = function (s) { setupInfo.state = s; return e ? e(s) : true; };
    if (b.accept) {
      Object.defineProperty(b, "action", { enumerable: true, get: function () {
        var s = setupInfo.state;
        return G_().legalActions(s).filter(function (a) { return a.type === b.await.type && b.accept(s, a) === true; })[0];
      } });
    }
    return b;
  }
  function setupStart(opts) { var s = G_().create({}, opts); setupInfo.state = s; return s; }

  var setupBeats = [
    { title: "The mission", view: "city", pose: "point",
      say: "Fallujah, November 2004. I'm Specialist Walsh. You command a company of US Marines, and your job is to clear this district, one block at a time.",
      explain: "The Insurgents are played by the game itself: you only ever decide for the Marines.",
      cite: "[7]" },
    { title: "How you win", pose: "talk",
      focus: { tracks: ["turn"] },
      say: "You win by holding every Zone on the map at the end of a turn. You have 16 turns, and this marker on the turn wheel counts them.",
      explain: "Zone 27 is the one exception: nobody may ever enter it [7.2, 12.4.2].",
      cite: "[7.2]" },
    { title: "Victory Points", pose: "talk",
      focus: { tracks: ["vp", "vp10"] },
      say: "This wheel keeps your Victory Points. Losing Marines costs points; wiping out Guerillas wins a few back.",
      explain: "A squad reduced: −2. A squad lost: −5. Each Guerillas unit eliminated: +1 [7.2.1].",
      cite: "[7.2.1]" },
    { title: "The district", view: "city", pose: "talk",
      say: "The map is cut into 61 numbered blocks called Zones. Right now, every one of them belongs to the Insurgents.",
      explain: "At the start the Insurgents Control every Zone [4.1.4].",
      cite: "[4.1.4]" },
    { title: "Start Zones", pose: "point",
      focus: function () { return { zones: startZones() }; },
      say: "Your Marines come in along the south edge, through these nine Start Zones. Each has a black circle printed by its number.",
      cite: "[4.1.4]" },
    { title: "Looking inside", pose: "wow",
      focus: function () { return { zones: startZones() }; },
      say: "Before you place anyone, the game looks inside each Start Zone: two hidden Suspect markers in each, flipped over at once.",
      explain: "Start Zones are Activated first, and their Suspects are Activated straight away [6.2].",
      cite: "[6.2]" },
    { title: "Where the fight is", pose: "talk",
      focus: function (s) { return { zones: contactZones(s) }; },
      say: function (s) { return "These " + contactZones(s).length + " Start Zones turned out to hold Guerillas or Martyrs. A squad you put here is in a fight from the very first turn."; },
      cite: "[6.2]" },
    { title: "The hottest Zone", pose: "focus",
      focus: function (s) { return { zones: hottest(s).slice(0, 1) }; },
      say: function (s) { var z = hottest(s)[0]; return "Zone " + z + " is the hottest: " + enemiesIn(s, z).join(" and ") + " are waiting inside."; },
      cite: "[6.2]" },
    { title: "Your squads", pose: "talk",
      tray: function (s) { return drawn(s); },
      say: "Nine Marine squads came out of the box. They're in the tray below. The big number on each is its Combat Factor, CF for short: the higher, the harder it hits.",
      explain: "Squads are CF 4 to 6 [5.1.1]. Chapter 2 shows every piece in detail.",
      cite: "[5.1.1]" },
    { title: "Decision 1: your strongest", pose: "focus",
      await: { type: "setupPlace" },
      accept: acceptPlace,
      tray: function (s) { return drawn(s); },
      focus: function (s) { return { zones: hottest(s).slice(0, 1) }; },
      say: "Your first decision: put your strongest squad where the enemy is strongest.",
      steps: function (s) { return ["click one of the CF " + strongestCf(s) + " squads in the tray below.", "click inside Zone " + hottest(s)[0] + " on the map."]; },
      hint: "Click a squad in the tray, then click inside its Start Zone on the map.",
      wrong: "Place a squad from the tray in a Start Zone.",
      cite: "[6.3]" },
    { title: "The rest of the company", pose: "talk",
      say: "Well done. I'll place the other eight the same way: stronger squads to hotter Zones, the weakest where nothing turned up.",
      run: placeRest, cite: "[6.3]" },
    { title: "CAATs", pose: "talk",
      card: { front: { art: "caat.png", label: "CAAT: +2 to its squad's shots" } },
      say: "Four CAATs come with the company: support teams in armoured vehicles. Each one rides with a single squad and adds +2 to its shots.",
      explain: "Each CAAT also carries one charge of Explosives, for one powerful assault [6.3, 13.7.1].",
      cite: "[6.3]" },
    { title: "Decision 2: a CAAT", pose: "focus",
      await: { type: "setupCaat" },
      accept: acceptCaat,
      tray: function (s) { return G_().units(s).filter(function (u) { return u.kind === "caat" && !u.attachedTo; }).map(function (u) { return u.uid; }); },
      focus: function (s) { return { zones: contactZones(s) }; },
      say: "Your second decision: give the first CAAT to a squad that will be fighting on Turn 1.",
      steps: ["click a CAAT in the tray below.", "click a squad standing in one of the ringed Zones, where the enemy is."],
      hint: "Click a CAAT in the tray, then the squad that should get it.",
      wrong: "Attach a CAAT from the tray to a squad.",
      cite: "[6.3]" },
    { title: "Ready", pose: "talk",
      say: "I'll hand the other three CAATs to squads in contact as well. With the last one on, setup is done and Turn 1 begins.",
      explain: "Three squads stay in the box as Company reinforcements, from Turn 2; three more are the Battalion's [10.1, 10.3].",
      run: attachRest, cite: "[6.3]",
      expect: function (s) { return s.phase === "support" || "setup should be over"; } },
    { title: "Battle set", view: "city", pose: "grin",
      say: "That's how a battle begins. Next chapter: the pieces you just placed, and the ones you'll meet, one at a time.",
      done: true, cite: "[8]" }
  ].map(setupStash);

  // The chapters, in the order a newcomer learns them (docs/LESSON_PLAN.md).
  // A chapter without beats is announced but not yet built.
  var chapters = [
    { id: "setup", n: 1, title: "Setting up", mode: "You play", blurb: "The mission, then a battle's first moves: the Start Zones, your squads, the CAATs.",
      beats: setupBeats, setup: setupStart, SEED: SETUP_SEED },
    { id: "pieces", n: 2, title: "The pieces", mode: "Look and try", blurb: "Marine squads, CAATs, the Abrams; Suspects, Guerillas, Martyrs.",
      beats: pieceBeats, setup: fightSetup, SEED: FIGHT_SEED },
    { id: "board", n: 3, title: "The board", mode: "Look and tap", blurb: "Zones, Locations, doors and roofs, Streets, who controls what.",
      beats: boardBeats, setup: fightSetup, SEED: FIGHT_SEED },
    { id: "afford", outcomes: true, n: 4, title: "What the board lets you do", mode: "Your turn", blurb: "Move, fire and assault: one small puzzle each.",
      beats: drillBeats, setup: drillSetup, SEED: DRILL_SEED },
    { id: "tools", outcomes: true, n: 5, title: "Your tools", mode: "Your turn", blurb: "CAAT Ammo, IED or Sniper, the Security Element, Explosives: when to spend each.",
      beats: toolBeats, setup: toolsSetup, SEED: TOOLS_SEED },
    { id: "turn", outcomes: true, n: 6, title: "A whole turn", mode: "You play", blurb: "Every phase of Turn 1, with your hands on the moves.",
      beats: beats, setup: setup, SEED: SEED },
    { id: "fight", n: 7, title: "A fight already under way", mode: "Watch",
      blurb: "Walsh plays Turn 4 at full speed and tells you why, move by move.",
      beats: fightBeats, setup: fightSetup, SEED: FIGHT_SEED }
  ];

  global.PhantomFuryTutorial = { setup: setup, beats: beats, SEED: SEED, chapters: chapters,
    fight: { beats: fightBeats, setup: fightSetup, SEED: FIGHT_SEED, held: function () { return fight.held.slice(); } } };
  if (typeof module !== "undefined" && module.exports) module.exports = global.PhantomFuryTutorial;
})(typeof window !== "undefined" ? window : globalThis);
