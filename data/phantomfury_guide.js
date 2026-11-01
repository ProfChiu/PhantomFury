/* phantomfury_guide.js — the play guide: where you are in the turn, what to
 * do now, and what comes next. The page shows it in the status card over the
 * map, and the "Ready to play" dialog uses `ready` when no game is under way.
 *
 * Written from rules-digest.md in the player's words; each phase cites the
 * rule it summarises.
 */
(function (global) {
  "use strict";

  global.PhantomFuryGuide = {
    // the order of a game: Setup once, then six phases every turn
    track: ["setup", "support", "reinforce", "fire", "movement", "assault", "reorg"],
    phases: {
      setup: { short: "Setup", name: "Setup", cite: "[6.3]",
        now: "Put your company on the map: one squad in each Start Zone, then a CAAT on four of them.",
        steps: [
          "Pick a drawn squad in the tray at the top of the map.",
          "Click a glowing Start Zone to place it. One squad per Start Zone.",
          "Then pick a CAAT in the tray and click a placed squad to attach it."
        ],
        next: "Turn 1 starts by itself once every squad is placed and every CAAT attached." },
      support: { short: "Support", name: "Support Phase", cite: "[9.3]",
        now: "Spend air support, or save it: take Dragon Eye, Super Cobra or Hornet from the tray at the top of the map, then click a lit Zone.",
        empty: "No air support to spend. End the phase." },
      reinforce: { short: "Reinf.", name: "Reinforcements Phase", cite: "[10.1]",
        now: "Bring in reserves: pick a squad in the tray at the top of the map, then click a USMC-held Start Zone.",
        empty: "No reinforcements this turn (they start on Turn 2). End the phase." },
      fire: { short: "Fire", name: "Fire Combat Phase", cite: "[11]",
        now: "Click a squad, then an enemy it can hit in an Adjacent or Neighbouring Zone. A squad that fires is done for the turn.",
        empty: "No squad has a target. End the phase." },
      movement: { short: "Move", name: "Movement Phase", cite: "[12.3.1]",
        now: "Click a squad, then a highlighted Location or Street. Each squad has 4 MP.",
        empty: "No squad can move. End the phase." },
      assault: { short: "Assault", name: "Assault Phase", cite: "[13.4.2]",
        now: "Click a squad, then an enemy in an Adjacent Location. Both sides roll.",
        empty: "No squad is next to an enemy. End the phase." },
      reorg: { short: "Reorg", name: "Reorganisation", cite: "[14.1]",
        now: "Done for you when the Assault Phase ends: Zones change Control, neighbours activate, Insurgents infiltrate." }
    },
    // The first-game coach: Walsh beside the exact control for each step of
    // Setup and Turn 1. The page shows the first step whose `when` holds and
    // that has not been done. Setup steps follow the table's state; a `once`
    // step is done when its `when` stops holding (the phase moved on), and a
    // `gotIt` step when "Got it" is pressed. `at` is what she points at.
    coach: [
      { id: "take-squad", when: "setupTakeSquad", at: "#reserve-tray", pose: "point", title: "Your company",
        say: "Your nine drawn squads wait in the tray at the top of the map. Click one to take it in hand." },
      { id: "place-squad", when: "setupSquadInHand", at: "#hand", pose: "point", title: "Place it",
        say: "It is in your hand. The Start Zones it may go to glow green on the map. Click one." },
      { id: "more-squads", when: "setupSomePlaced", at: "#reserve-tray", pose: "talk", gotIt: true, title: "The rest of the company",
        say: "One squad per Start Zone. The tray stays open: pick the next one, or press Auto setup to finish for you." },
      { id: "take-caat", when: "setupTakeCaat", at: "#reserve-tray", pose: "talk", title: "Now the CAATs",
        say: "A CAAT has no CF of its own: it rides with one squad and adds a fire bonus while its Ammo lasts. Take one from the tray." },
      { id: "caat-hand", when: "setupCaatInHand", at: "#hand", pose: "talk", title: "Attach it",
        say: "Click a lit squad. The CAAT rides with it for the rest of the game." },
      { id: "support", once: true, when: "early:support",
        say2: "Turn 2, Support again. Each mission is a d10 roll; a failed roll triggers an Insurgent Reaction and ends the phase, so you may stop while you are ahead.", at: "#reserve-tray", pose: "point", gotIt: true, title: "Turn 1: Support", title2: "Turn 2: Support",
        say: "Air support waits in the tray at the top of the map: take a mission, then click a lit Zone. Or save it. When you are done, press the End button in the status card." },
      { id: "reinforce", once: true, when: "early:reinforce",
        say2: "Reinforcements are open now: the Company squads go to a USMC-Controlled Start Zone, the Abrams to a Street on the north edge. Take them from the tray.", at: "#phase-track li.now", pose: "talk", gotIt: true, title: "Reinforcements",
        say: "None on Turn 1; from Turn 2 they wait in the tray at the top of the map. End the phase." },
      { id: "fire", once: true, when: "early:fire",
        say2: "Fire again. A squad fires at an enemy in an Adjacent or Neighbouring Zone, and is done for the turn. The report card shows every roll.", at: "#phase-track li.now", pose: "point", gotIt: true, title: "Fire",
        say: "Click one of your squads: every enemy it can hit lights up. Click one to shoot." },
      { id: "movement", once: true, when: "early:movement",
        say2: "Movement. Careful: entering a C or OG Location in an Insurgent Zone draws Defensive Fire from every Insurgent there.", at: "#phase-track li.now", pose: "point", gotIt: true, title: "Movement",
        say: "Click a squad: the places it may step to light up. Each squad has 4 MP." },
      { id: "assault", once: true, when: "early:assault",
        say2: "Assault. Both sides roll against their CF, and Bottom-Up or Top-Down changes the odds. Watch the report card for each roll.", at: "#phase-track li.now", pose: "point", gotIt: true, title: "Assault",
        say: "A squad next to an enemy can go in: click it, then the lit enemy. Both sides roll." },
      { id: "solo", once: true, when: "turn3", at: "#statusbar", pose: "grin", gotIt: true, title: "On your own",
        say: "Two full turns done. From here the status card always says the phase, what to do and what comes next, and I will still speak up in the tricky moments." }
    ],
    // Walsh's hints for the tricky moments of any game (owner, 2026-10-31):
    // each shows when its moment comes up, until the player has seen it
    // through once ("Got it", or the moment resolved). Rules from the digest.
    // Walsh on the date wheel when a new turn starts (the camera pans to it).
    // {n} is the turn, {left} the turns still to play after this one.
    turnTalk: {
      2: { title: "Turn 2", say: "The marker moves on. From now on the Company squads and the Abrams may come on in the Reinforcements Phase.", cite: "[10.1] [10.2]" },
      9: { title: "Turn 9", say: "Battalion squads are available from this turn, at −2 VP each.", cite: "[10.3]" },
      16: { title: "The last turn", say: "Turn 16. If any Zone is still not USMC-Controlled when it ends, the Insurgents win.", cite: "[7.1]" },
      any: { title: "Turn {n}", say: "Turn {n} of 16, {left} more after this one. Every turn left unplayed when the district is cleared is worth +5 VP.", cite: "[7.2.1]" }
    },
    hints: [
      { id: "dragon-eye", when: "dragonEyePick", at: "#board .pf-zone.pick", pose: "point", title: "Dragon Eye: the second Zone", cite: "[9.3]",
        say: "Now click an Adjacent or Neighbouring Insurgent Zone clear of Marines to Activate both, or this Zone again to Activate only it. Their Suspects are revealed." },
      { id: "caat-loss", when: "pending:caatLoss", at: "#decision-panel", pose: "think", title: "Who takes the hit?", cite: "[5.1.1.2]",
        say: "The squad has a CAAT, so you choose. The squad flips (CF −1), or the CAAT is withdrawn and its fire bonus goes with it. Either costs 2 VP." },
      { id: "ied-sniper", when: "pending:iedChoice", at: "#decision-panel", pose: "think", title: "IED or Sniper?", cite: "[5.3.5]",
        say: "In a Normal Zone you choose before any roll. IED: the squad rolls d10, at or under its CF it is only Pinned, over it takes a Step Loss. Sniper: a Sniper Attack on the squad." },
      { id: "flood", when: "pending:flood", at: "#decision-panel", pose: "point", title: "Flood the Zone?", cite: "[13.4.8]",
        say: "Flooding assaults every enemy left in the Zone, one after another. It stops when one survives, the Zone is clear, or the squad's CF is 4 or less." },
      { id: "def-fire", when: "pending:dfChoice", at: "#decision-panel", pose: "think", title: "Defensive Fire ahead", cite: "[12.3.2] [12.7]",
        say: "Every Insurgent in the Zone will fire at the squad as it enters. Detaching the Security Element first (1 MP) gives +1 to their rolls, but the squad's CF drops by 1 and it cannot leave the Zone until it regroups." },
      { id: "abrams", when: "abramsInHand", at: "#hand", pose: "talk", title: "Placing the Abrams", cite: "[10.2]",
        say: "The Abrams comes on in a Street Section along the north edge, next to a USMC-Controlled Zone, at no VP cost. The lit Streets are the ones it may take." }
    ],
    ready: {
      kicker: "Ready to play?",
      head: "Your company is waiting at the edge of the Jolan district",
      body: "Setup puts nine squads on the map, one in each Start Zone, and attaches the four CAATs. " +
            "Do it yourself, or let Auto setup do it and start Turn 1. The card at the top left " +
            "always says which phase you are in, what to do, and what comes next.",
      setup: "Set up my company",
      auto: "Auto setup",
      learn: "Learn to play first",
      title: "Title screen"
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
