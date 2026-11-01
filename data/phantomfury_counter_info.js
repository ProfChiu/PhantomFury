// Phantom Fury — what each counter and marker is, for the hover card the
// page shows beside it. Plain words from rules-digest.md, each note with its
// rule. The page adds the live state (CF now, markers, where it stands);
// numbers that live in the board data (mission ranges and maxima) are
// filled in by the page from PhantomFuryBoard.counters, never typed here.
var PhantomFuryCounterInfo = {
  squad: {
    title: "Marine squad", side: "USMC",
    notes: [
      ["Combat Factor 4–6 printed, Movement Capacity 4.", "[5.1.1]"],
      ["Fires from a USMC-Controlled Zone at an Adjacent or Neighbouring Zone, moves Location to Location, and Assaults an Adjacent Location.", "[11] [12] [13]"],
      ["A Step Loss flips it (CF −1, −2 VP); a second eliminates it (−5 VP).", "[5.1.1] [7.2.1]"]
    ]
  },
  iif: {
    title: "IIF squad", side: "USMC (Iraqi Intervention Force)",
    notes: [
      ["CF 4. Treated as a Marine squad, but may only enter Insurgent-Controlled Zone 26, one per Location there.", "[5.1.6.1]"],
      ["Uses the common IIF Events table in Zone 26; Phantom Fury Events do not affect it; cannot detach a Security Element.", "[5.1.6]"],
      ["Eliminated: −2 VP. Reduced: no VP.", "[7.2.1]"]
    ]
  },
  caat: {
    title: "CAAT support", side: "USMC",
    notes: [
      ["No CF of its own; always stacked with its Marine squad and shares its Fired / Pinned state.", "[5.1.4.1]"],
      ["Ammo marker: 4 uses, each +2 CF to its squad in Fire Combat only.", "[11.1.2]"],
      ["Explosives marker: one use per game.", "[13.7]"],
      ["Eliminated: −2 VP.", "[7.2.1]"]
    ]
  },
  abrams: {
    title: "M1A1 Abrams support", side: "USMC",
    notes: [
      ["CF 8. Moves only in Street Sections and into OG Locations.", "[12.6.2]"],
      ["Movement Capacity is rolled each Movement Phase: 0–1 → 4, 2–5 → 3, 6–8 → 2, 9 → 1.", "[12.6.1]"],
      ["Enters from Turn 2 in a north-edge Street Section Adjacent to a USMC-Controlled Zone.", "[10.2]"]
    ]
  },
  guerillas: {
    title: "Insurgents — Guerillas", side: "Insurgents",
    notes: [
      ["CF 1–4 with an ID symbol; no Movement Capacity of its own.", "[5.2.1]"],
      ["A Step Loss eliminates it: +1 VP.", "[5.2.1] [7.2.1]"],
      ["Survives an Assault? It Retreats — except in Zone 26 or under Fanaticism.", "[13.4.7]"]
    ]
  },
  martyrs: {
    title: "Insurgents — Martyrs", side: "Insurgents",
    notes: [
      ["CF 1–4 with an ID symbol; the other side of an Insurgents counter.", "[5.2.1]"],
      ["Never Retreats: a surviving Martyrs unit stays. Eliminating it scores no VP.", "[13.4.7] [7.2.1]"],
      ["Suicide Bomber Event: it and the assaulting Marine squad are both eliminated.", "[13.4.3]"]
    ]
  },
  suspect: {
    title: "Suspect marker", side: "Insurgents (hidden)",
    notes: [
      ["A face-down placeholder: it may be a Dummy, an Insurgents unit, or an IED / Sniper.", "[5.3]"],
      ["Fire, Assault, Defensive Fire or a Dragon Eye report Activates it: roll d10 and reveal.", "[5.3.3] [5.3.4]"],
      ["Its printed list gives the Location types it is placed in, in order of priority.", "[5.3.2.2]"]
    ]
  },
  turn: {
    title: "Game Turn marker", side: "Track marker",
    notes: [
      ["Marks the current turn on the date wheel, 1 to 16.", "[8]"],
      ["Advances at the end of each Reorganisation Phase; the game ends after Turn 16.", "[14] [7.1]"]
    ]
  },
  vp: {
    title: "Victory Points — units", side: "Track marker",
    notes: [
      ["Sits on the outer ring of the VP wheel: the units digit of the score.", "[7.2.1]"],
      ["The tens marker in the centre points at 0, 10, 20 or 30; its face shows + or −.", "[7.2.1]"],
      ["Above 10 VP: major victory. 0–10: minor. Below 0: costly.", "[7.2.2]"]
    ]
  },
  vp10: {
    title: "Victory Points — tens", side: "Track marker",
    notes: [
      ["Points at the tens of the score: 0, 10, 20 or 30. Its + or − face is the sign.", "[7.2.1]"],
      ["Above 10 VP: major victory. 0–10: minor. Below 0: costly.", "[7.2.2]"]
    ]
  },
  dragonEye: {
    title: "Dragon Eye UAV Report", side: "Mission marker", mission: "dragonEye",
    notes: [
      ["Activates two Adjacent / Neighbouring Insurgent-Controlled Zones clear of Marines, then their Suspects (Normal Zones).", "[9.3]"],
      ["Advances one space after each successful Mission; a failed roll is postponed and does not count.", "[9.2.1]"]
    ]
  },
  superCobra: {
    title: "AH-1W Super Cobra CAS", side: "Mission marker", mission: "superCobra",
    notes: [
      ["Removes up to 2 Insurgents units and / or Suspects in one Insurgent-Controlled Zone (not 26) clear of Marines.", "[9.3]"],
      ["Advances one space after each successful Mission; a failed roll is postponed and does not count.", "[9.2.1]"]
    ]
  },
  hornet: {
    title: "F/A-18 Hornet CAS", side: "Mission marker", mission: "hornet",
    notes: [
      ["Strikes an Insurgent-Controlled Zone (not 26) away from the Marines: all its Insurgents and Suspects are eliminated and it becomes Ruins.", "[9.3]"],
      ["Advances one space after each successful Mission; a failed roll is postponed and does not count.", "[9.2.1]"]
    ]
  }
};
if (typeof module !== "undefined" && module.exports) module.exports = PhantomFuryCounterInfo;
