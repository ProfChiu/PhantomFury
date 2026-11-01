/* phantomfury_primer.js — the first screen a newcomer reads.
 *
 * Someone who has never played this game opens the page. Before the first
 * move they need three things, in this order: what they are trying to do, what
 * a turn looks like, and what the decisions are. Everything else can wait for
 * the lesson. This file is that, as data: the page shows it on the first visit
 * and behind "How to play" after that.
 *
 * Written from rules-digest.md, in the player's words. Every turn step cites
 * the rule it summarises; tools/test_phantomfury.js checks the shape.
 */
(function (global) {
  "use strict";

  global.PhantomFuryPrimer = {
    goal: "Clear the Jolan district of Fallujah: bring every Zone (except the open ground of Zone 27) under USMC Control by the end of a turn, within 16 turns, and keep your Victory Points positive doing it.",
    turn: [
      { step: "Support: spend your limited air support — a Dragon Eye drone activates two Zones, a Super Cobra removes up to two Insurgents or Suspects, a Hornet levels a Zone. After each mission the Insurgents react.", cite: "[9.3]" },
      { step: "Reinforcements: from Turn 2, Company squads and the Abrams arrive in USMC-held Start Zones; Battalion squads from Turn 9 cost 2 VP each; IIF squads unlock once you hold a Zone next to the Mosque.", cite: "[10.1]" },
      { step: "Fire Combat: a squad fires at a Suspect or Insurgents unit in an Adjacent or Neighbouring Zone with no Marines in it. Roll a d10 with modifiers; at or under the squad's Combat Factor it hits. Firing spends the squad for the turn, and snipers may answer.", cite: "[11.2]" },
      { step: "Movement: squads move Location to Location (4 MP), cross Streets under sniper fire, and take Defensive Fire entering a Courtyard or Open Ground in an Insurgent Zone.", cite: "[12.3.1]" },
      { step: "Assault: a squad attacks an enemy in an Adjacent Location — both sides roll, low rolls wound. Clear a building top-down and a strong squad Floods through the rest.", cite: "[13.4.2]" },
      { step: "Reorganisation: Zones holding only Marines change Control, neighbouring Zones activate, pinned squads try to shake it off, and Insurgents infiltrate any Zone you left empty.", cite: "[14.1]" }
    ],
    decisions: [
      "Which Zones to activate, and when. An unactivated Zone holds no Suspects — but you cannot control the district without waking it, and Contact activates its neighbours.",
      "Fire, move, or assault — each squad does only some of these per turn. A squad that Fires cannot move or assault; a squad that enters a Courtyard under fire may not survive to assault.",
      "When a squad with a CAAT support takes a Step Loss, you choose who takes it: the squad (and its Combat Factor) or the CAAT (and its firepower). The same care with VP: every reduced squad costs 2, every eliminated squad 5."
    ],
    terms: {
      "Zone": "One city block of the map, numbered 1 to 61. Zones contain Locations; Zone 26 is the Mosque, Zone 27 is open ground no one may enter.",
      "Location": "A place inside a Zone: Open Ground, Courtyard, 1st Story, 2nd Story or Rooftop. Units assault between Adjacent Locations.",
      "Suspect marker": "A possible enemy. When activated — by fire, assault, or a drone — it proves a Dummy, becomes Guerillas or Martyrs, or is an IED or a sniper.",
      "CF (Combat Factor)": "How well a unit fights. Roll a d10 at or under it to succeed. A Step Loss lowers it by 1; a second eliminates the unit.",
      "Control": "A Zone is Insurgent-Controlled until a Reorganisation Phase finds it holding only Marine squads. Control is how you win — and how reinforcements find a way in.",
      "Pinned": "A squad under fire that can neither fire, move nor assault until it regroups. Snipers and IEDs pin squads."
    },
    firstGame: "Learn to Play walks you through Setup and the first turn of a real game. You make the moves; the lesson explains each one."
  };
  if (typeof module !== "undefined" && module.exports) module.exports = global.PhantomFuryPrimer;
})(typeof window !== "undefined" ? window : globalThis);
