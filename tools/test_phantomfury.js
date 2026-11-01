/* test_phantomfury.js — everything that can be checked without a browser.
 *   node tools/test_phantomfury.js
 *
 * Sections, in the order a new engine should earn them:
 *   contract   the five functions behave, every action and refusal cites a rule
 *   hard lock  illegal actions throw with the engine's own reason
 *   map        the Zone/Location/Street data are consistent (deep checks live
 *              in tools/verify_data.js; these are the same facts via the engine)
 *   example    the rulebook's worked examples replayed on die tapes:
 *              Fire DRMs (p.11), the Assault (p.15), the Street crossing (p.13),
 *              the Support missions (p.09). Book roll N = tape face N+1.
 *   soak       100 seeded random games: 0 crashes, 0 stalls, 0 dead ends
 *   bench      the AI driver beats random on average VP, same seeds both sides
 *   tutorial   every beat replays headless
 *   board      the page's own project()/gestureOf()/controller, no DOM
 *   newcomer   the primer states the game; the lesson hands over real moves
 */
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const H = require(path.join(ROOT, 'fw/test/fw_harness.js'));

const S = H.load([
  'fw/core/fw_rng.js', 'fw/core/fw_record.js', 'fw/core/fw_game.js', 'fw/core/fw_ai.js',
  'fw/core/fw_tutorial.js', 'fw/core/fw_save.js', 'fw/test/fw_soak.js',
  'data/phantomfury_board.js', 'data/phantomfury_primer.js',
  'game/phantomfury_game.js', 'game/phantomfury_ai.js', 'game/phantomfury_tutorial.js',
  'game/phantomfury_app.js'   // the app only defines functions until boot()
], { root: ROOT });
const FW = S.FW, G = S.PhantomFury, AI = S.PhantomFuryAI,
      TUT = S.PhantomFuryTutorial, APP = S.PhantomFuryApp, B = S.PhantomFuryBoard;
H.suite('phantomfury');

// ---- helpers -------------------------------------------------------------------
function startedGame(seed) {
  const opts = { rng: FW.rng.seeded(seed) };
  return AI.autoSetup(G, G.create({}, opts), opts);
}
function run(st, action, rng) {
  if (!action) throw new Error('test setup error: the expected legal action was not offered');
  const r = FW.game.run(G, st, action, { rng });
  return { st: r.state, records: r.records, events: r.events };
}
function clearEnemies(st) {
  Object.keys(st.units).forEach(k => {
    const u = st.units[k];
    if (u.kind === 'guerillas' || u.kind === 'martyrs' || u.kind === 'suspect') { u.alive = false; u.pos = null; }
  });
}
function craft(st, uid, props) {
  st.units[uid] = Object.assign({ uid, alive: true, pos: null }, props);
  return st.units[uid];
}
function freeCaat(st, squad) {
  if (squad.caat) { const c = st.units[squad.caat]; c.alive = false; c.attachedTo = null; squad.caat = null; }
}
function rec(rs, table) { return rs.filter(r => r.table === table)[0]; }
function drmSum(st, firer, target) {
  return G.fireDrms(st, firer, target).reduce((s, d) => s + d.value, 0);
}

// ---- contract --------------------------------------------------------------------------
{
  const st = G.create({}, { rng: FW.rng.seeded('contract') });
  H.ok(G.__fw, 'the engine was registered with FW.game.define');
  H.ok(JSON.stringify(JSON.parse(JSON.stringify(st))) === JSON.stringify(st), 'state is plain JSON');
  H.eq(st.phase, 'setup', 'the game opens in the Setup phase [6]');
  const legal = G.legalActions(st);
  H.ok(legal.length > 0, 'there is something to do at the start (' + legal.length + ' actions)');
  H.ok(legal.every(a => a.type && a.cite), 'every legal action has a type and a cite');
  H.ok(G.refusals(st).every(r => r.why && r.cite), 'every refusal has a why and a cite');
  H.eq(G.isOver(st), null, 'the game is not over at the start');
  H.eq(st.setupQueue.length, 9, 'Setup draws 9 squads [6.3]');
  H.eq(st.company.length, 3, '3 squads are the Company reserve [10.1]');
  H.eq(st.battalion.length, 3, '3 squads are the Battalion reserve [10.3]');
  H.eq(st.iifPool.length, 3, '3 IIF squads wait off-map [10.4]');
  H.eq(Object.keys(st.units).filter(k => st.units[k].kind === 'squad').length, 15, '15 Marine squads in the OOB [6.3]');
  H.eq(G.suspectsInZone(st, 26).length, 3, 'Zone 26 starts with 3 Suspects [5.3.2.1]');
  H.ok([1, 2, 3, 4, 5, 6, 7, 8, 9].every(z => st.zones[z].activated), 'the nine Start Zones start Activated [6.2]');
  const white = B.zones.filter(z => z.circle === 'white').length;
  H.eq(st.pools.activation + st.pools.strong, white, 'one Activation marker per white-circle Zone [6.1.2] (' + white + ')');
  H.eq(st.pools.strong, 2, 'the default is 2 Strongpoint markers');
  const done = startedGame('contract-done');
  H.eq(done.phase, 'support', 'auto-setup completes into the Support Phase');
}

// ---- hard lock ---------------------------------------------------------------------------
{
  const opts = { rng: FW.rng.seeded('lock') };
  const st = startedGame('lock');
  st.pending = { kind: 'caatLoss', uid: 'sq1', caat: 'caat1' };
  H.throws(() => FW.game.run(G, st, { type: 'endPhase' }, opts),
    'ending the phase while a decision waits throws', 'decision is waiting');
  const fresh = G.create({}, { rng: FW.rng.seeded('lock2') });
  const sus = G.suspectsInZone(fresh, 26)[0];
  H.throws(() => FW.game.run(G, fresh, { type: 'moveStep', uid: sus.uid, to: { street: 1 } }, opts),
    'ordering an Insurgent-side marker throws', 'not by orders');
  const st3 = startedGame('lock3'); st3.phase = 'fire';
  const firer = G.squadsInZone(st3, 1)[0]; firer.fired = true;
  H.throws(() => FW.game.run(G, st3, { type: 'fire', uid: firer.uid, target: 'anything', caat: false }, opts),
    'a squad that has Fired may not fire again [11.3]', 'has Fired');
  H.throws(() => FW.game.run(G, st3, { type: 'nonsense' }, opts), 'an unknown action throws', 'Illegal action');
}

// ---- map data ------------------------------------------------------------------------------
{
  const st = G.create({}, { rng: FW.rng.seeded('map') });
  H.eq(B.zones.length, 61, 'the board has 61 Zones [4.1]');
  H.eq(st.zones[27].control, 'none', 'Zone 27 can never be Controlled [4.1.4]');
  const noEntry = B.zones.filter(z => z.id !== 27 && !G.entryLoc(st, z.id)).map(z => z.id);
  H.eq(noEntry, [], 'every Zone but 27 has an entry Location');
  const badEgress = [];
  B.zones.forEach(z => (z.egress || []).forEach(t => {
    if (t !== 'EXIT' && G.adjOrNei(z.id).indexOf(t) < 0) badEgress.push(z.id + '->' + t);
  }));
  H.eq(badEgress, [], 'every Egress route leads to an Adjacent/Neighbouring Zone or EXIT [13.6.2]');
  H.eq(B.streets.length, 80, 'the board has 80 Street Sections [4.3]');
  H.ok(B.streets.every(s => s.adjacentZones.length >= 1), 'every Street Section touches at least one Zone');
  // Location links: the Phase 3 calibration checks. Zone 26's second-prime
  // Location once reached the engine as 1'' (two apostrophes) instead of the
  // book's 1" — an orphan no squad could enter or leave. The ids are now the
  // book's, the arrow graph is symmetric, and every Location in a Zone can
  // be reached from the Zone's entry Location [4.2.2].
  const CANON = ['OG', 'C', 'R', '1', "1'", '1"', '2', "2'"];
  const oddIds = [];
  B.zones.forEach(z => z.locations.forEach(l => { if (CANON.indexOf(l.id) < 0) oddIds.push(z.id + ':' + l.id); }));
  H.eq(oddIds, [], 'every Location id is one of the book\'s (OG, C, R, 1, 1\', 1", 2, 2\')');
  let asym = 0; const stranded = [];
  B.zones.forEach(z => {
    if (z.id === 27) return;
    z.locations.forEach(l => G.locLinks(st, z.id, l.id).forEach(n => {
      if (G.locLinks(st, z.id, n).indexOf(l.id) < 0) asym++;
    }));
    const seen = new Set([G.entryLoc(st, z.id)]), q = [...seen];
    while (q.length) G.locLinks(st, z.id, q.shift()).forEach(n => { if (!seen.has(n)) { seen.add(n); q.push(n); } });
    z.locations.forEach(l => { if (!seen.has(l.id)) stranded.push(z.id + ':' + l.id); });
  });
  H.eq(asym, 0, 'every Location link runs both ways');
  H.eq(stranded, [], 'every Location can be reached from its Zone\'s entry Location');
  const byBlock = {};
  B.zones.forEach(z => { if (z.block >= 0) (byBlock[z.block] = byBlock[z.block] || []).push(z.id); });
  const splitBlocks = Object.keys(byBlock).filter(b => {
    const zs = byBlock[b]; if (zs.length < 2) return false;
    const seen = new Set([zs[0]]), q = [zs[0]];
    while (q.length) G.adjOrNei(q.shift()).forEach(n => { if (zs.indexOf(n) >= 0 && !seen.has(n)) { seen.add(n); q.push(n); } });
    return seen.size !== zs.length;
  });
  H.eq(splitBlocks, [], 'every Block is one connected cluster of Zones [4.4]');
}

// ---- worked example: Fire DRMs, rulebook p.11 ----------------------------------------------
// Example 1: a Martyrs unit in Location 1 of a Normal Zone takes +1 (not in R)
// and +1 (Martyrs in a Normal Zone) = +2. Example 2: a Suspect marker in
// Location 1 of a Fortified Zone takes +1 only — "a Suspect marker is not an
// Insurgents unit", so the not-in-R and Fortified rows do not apply.
{
  // (i) Martyrs in a Normal Zone
  let st = startedGame('ex-fire'); clearEnemies(st); st.phase = 'fire';
  const firer = G.squadsInZone(st, 1)[0]; freeCaat(st, firer);
  firer.cf = 5; firer.fired = false; firer.pinned = false;
  const tz = G.adjOrNei(1).filter(z => G.ZD[z].locations.some(l => l.id === '1'))[0];
  st.zones[tz].fortified = false; st.zones[tz].control = 'insurgent';
  const mar = craft(st, 'tstM', { kind: 'martyrs', counter: 0, cf: 3, sym: 'triangle', pos: { zone: tz, loc: '1' } });
  H.eq(drmSum(st, firer, mar), 2, 'book p.11: Martyrs in Location 1 of a Normal Zone = +2 DRM');
  const tape1 = FW.rng.tape([4, 9], { sides: 10 });   // roll 3, then Sniper roll 8
  const r1 = run(st, { type: 'fire', uid: firer.uid, target: 'tstM', caat: false }, tape1); st = r1.st;
  const fr = rec(r1.records, 'Fire Combat [11.2]');
  H.eq([fr.die, fr.modifiedDie, fr.result], [3, 5, 'hit'], 'roll 3 +2 = 5 vs CF 5: a hit');
  H.eq(st.units.tstM.cf, 2, 'the hit Martyrs unit suffers a Step Loss (CF 3 to 2) [5.2.1]');
  H.eq(rec(r1.records, 'Sniper Attack [11.4.1]').result, 'no effect', 'the Sniper Attack roll of 8 beats the total of 1');
  H.ok(firer.fired, 'the firer is marked Fired [11.3]');
  H.eq(tape1.remaining(), 0, 'the tape is fully spent — the roll sequence is the book\'s');

  // (ii) a Suspect in the Fortified Zone 26
  let st2 = startedGame('ex-fire26'); clearEnemies(st2); st2.phase = 'fire';
  const f2 = G.squadsInZone(st2, 1)[0]; freeCaat(st2, f2);
  f2.pos = { zone: 36, loc: G.entryLoc(st2, 36) }; f2.cf = 6; f2.fired = false; f2.pinned = false;
  const sus = craft(st2, 'tstS', { kind: 'suspect', marker: 0, pos: { zone: 26, loc: '1' } });
  H.eq(drmSum(st2, f2, sus), 1, 'book p.11: a Suspect in a Fortified Zone takes +1 only');
  st2.pools.draw = [7];   // counter 7 is a Martyrs CF 2
  const tape2 = FW.rng.tape([5, 4, 1, 9], { sides: 10 });   // roll 4; Activation roll 3; draw; Sniper roll 8
  const r2 = run(st2, { type: 'fire', uid: f2.uid, target: 'tstS', caat: false }, tape2); st2 = r2.st;
  H.eq([rec(r2.records, 'Fire Combat [11.2]').die, rec(r2.records, 'Fire Combat [11.2]').modifiedDie], [4, 5],
    'roll 4 +1 = 5 vs CF 6: a hit');
  H.eq(rec(r2.records, 'Fortified Zone [5.3.4]').result, 'martyrs', 'a Fortified Activation roll of 3 reveals Martyrs [5.3.4]');
  const placed = G.insurgentsInZone(st2, 26).filter(u => u.pos.loc === '1')[0];
  H.ok(placed && placed.kind === 'martyrs' && placed.cf === 2, 'the revealed Martyrs (CF 2) stands in Location 1 of Zone 26');
  H.eq(tape2.remaining(), 0, 'the tape is fully spent');
}

// ---- [11.4.1] after an IED/Sniper choice --------------------------------------------------
// A shot that turns a Suspect into an IED/Sniper leaves the player a choice
// [5.3.5]; the Fire's own Sniper Attack comes once that Activation is
// resolved, whichever way it went (it was skipped before 2026-10-19).
{
  ['ied', 'sniper'].forEach(choice => {
    let st = startedGame('ied-after-' + choice); clearEnemies(st); st.phase = 'fire';
    const firer = G.squadsInZone(st, 1)[0]; freeCaat(st, firer);
    firer.cf = 5; firer.fired = false; firer.pinned = false;
    const tz = G.adjOrNei(1).filter(z => G.ZD[z].locations.some(l => l.id === '1'))[0];
    st.zones[tz].fortified = false; st.zones[tz].control = 'insurgent';
    craft(st, 'tstS', { kind: 'suspect', marker: 0, pos: { zone: tz, loc: '1' } });
    craft(st, 'tstG', { kind: 'guerillas', counter: 0, cf: 2, sym: 'circle', pos: { zone: tz, loc: '1' } });
    const tape = FW.rng.tape([3, 1], { sides: 10 });   // Fire roll 2 +1 = 3 vs CF 5: hit; Activation 0: IED/Sniper
    const r1 = run(st, { type: 'fire', uid: firer.uid, target: 'tstS', caat: false }, tape); st = r1.st;
    H.ok(st.pending && st.pending.kind === 'iedChoice' && !rec(r1.records, 'Sniper Attack [11.4.1]'),
      choice + ': the shot turns up an IED/Sniper, and the Sniper Attack waits for the choice');
    const tape2 = FW.rng.tape([10, 10], { sides: 10 });   // 9 and 9: nothing lands, only the rolls are counted
    const r2 = run(st, { type: 'iedChoice', choice: choice }, tape2);
    const snipers = r2.records.filter(r => r.table === 'Sniper Attack [11.4.1]').length;
    H.eq(snipers, choice === 'sniper' ? 2 : 1,
      choice + ': once it is resolved, the Fire\'s own Sniper Attack follows [11.4.1]');
    H.eq(tape2.remaining(), 0, choice + ': the tape is fully spent');
  });
}

// ---- worked example: the Assault, rulebook p.15 ---------------------------------------------
// A CF 5 squad in Location 1 assaults a Suspect in Location 2 of Zone 15.
// The Suspect Activates as a Martyrs CF 1. Marine roll 4: +1 (Activation),
// +1 (vs Martyrs), +1 (Bottom-Up) = 7 — no Step Loss. Insurgent roll 1:
// +1 (Bottom-Up, not eliminated) = 2 vs CF 1 — no Step Loss. Nobody moves.
{
  let st = startedGame('ex-assault'); clearEnemies(st); st.phase = 'assault';
  const sq = G.squadsInZone(st, 1)[0]; freeCaat(st, sq);
  sq.pos = { zone: 15, loc: '1' }; sq.cf = 5; sq.fired = false; sq.pinned = false; sq.assaulted = false;
  st.zones[15].fortified = false; st.zones[15].fanaticism = false; st.zones[15].control = 'insurgent';
  craft(st, 'tstA', { kind: 'suspect', marker: 0, pos: { zone: 15, loc: '2' } });
  st.pools.draw = [2];   // counter 2 is a Martyrs CF 1
  const tape = FW.rng.tape([10, 1, 5, 2], { sides: 10 });   // Activation 9; draw; Marine 4; Insurgent 1
  const r = run(st, { type: 'assault', uid: sq.uid, target: 'tstA', explosives: false }, tape); st = r.st;
  H.eq(rec(r.records, 'Normal Zone [5.3.3]').result, 'martyrs', 'an Activation roll of 9 reveals Martyrs [5.3.3]');
  const mr = rec(r.records, 'Assault — Marine roll [13.4.2]');
  H.eq([mr.die, mr.modifiedDie], [4, 7], 'book p.15: Marine roll 4 +1 +1 +1 = 7 vs CF 5 — no Step Loss');
  const ir = rec(r.records, 'Assault — Insurgent roll [13.4.2]');
  H.eq([ir.die, ir.modifiedDie], [1, 2], 'book p.15: Insurgent roll 1 +1 = 2 vs CF 1 — no Step Loss');
  const tgt = G.insurgentsInZone(st, 15)[0];
  H.ok(tgt && tgt.kind === 'martyrs' && tgt.cf === 1 && tgt.pos.loc === '2', 'the Martyrs unit holds Location 2');
  H.ok(sq.alive && sq.pos.zone === 15 && sq.pos.loc === '1', 'the squad holds Location 1 — nobody was forced to move');
  H.eq(st.vp, 0, 'no VP changed hands');
  H.eq(tape.remaining(), 0, 'the tape is fully spent');
}

// ---- worked example: the Street crossing, rulebook p.13 --------------------------------------
// A CF 6 squad in Zone 2 fires into Zone 15 and Activates the Suspect on the
// Roof as Guerillas CF 2. In Movement, a CF 5 squad crosses from Zone 3 by
// Street into Zone 15's Courtyard, detaches its Security Element before
// Defensive Fire (roll 2, +1 = 3 vs CF 2: no effect), the second Suspect stays
// hidden (check roll 4 is not over CF 5), and the squad moves on to Location 1.
// (Zone 3 holds a Suspect marker of its own, as in the book's map art — with
// none there, [12.1.2] would oblige the squad to remain in the Zone.)
{
  let st = startedGame('ex-street'); clearEnemies(st); st.phase = 'fire';
  const A = G.squadsInZone(st, 2)[0], Bs = G.squadsInZone(st, 3)[0];
  freeCaat(st, A); freeCaat(st, Bs);
  A.cf = 6; A.fired = false; A.pinned = false; Bs.cf = 5; Bs.fired = false; Bs.pinned = false;
  craft(st, 'tstR', { kind: 'suspect', marker: 0, pos: { zone: 15, loc: 'R' } });
  craft(st, 'tst2', { kind: 'suspect', marker: 0, pos: { zone: 15, loc: '2' } });
  craft(st, 'tst3', { kind: 'suspect', marker: 0, pos: { zone: 3, loc: '1' } });
  craft(st, 'tst4', { kind: 'suspect', marker: 0, pos: { zone: 4, loc: G.entryLoc(st, 4) } });
  st.pools.draw = [1];   // counter 1 is a Guerillas CF 2
  const street = B.streets.filter(s => s.adjacentZones.indexOf(3) >= 0 && s.adjacentZones.indexOf(15) >= 0)
    .sort((a, b) => a.adjacentZones.length - b.adjacentZones.length)[0];
  H.ok(street, 'a Street Section joins Zones 3 and 15, as in the book example');

  const tapeF = FW.rng.tape([6, 7, 1, 9], { sides: 10 });   // Fire 5; Activation 6; draw; Sniper 8
  const rf = run(st, { type: 'fire', uid: A.uid, target: 'tstR', caat: false }, tapeF); st = rf.st;
  const fr = rec(rf.records, 'Fire Combat [11.2]');
  H.eq([fr.die, fr.modifiedDie, fr.result], [5, 6, 'hit'], 'roll 5 +1 (Suspect) = 6 vs CF 6: a hit');
  const gue = G.insurgentsInZone(st, 15).filter(u => u.pos.loc === 'R')[0];
  H.ok(gue && gue.kind === 'guerillas' && gue.cf === 2, 'the Roof Suspect Activates as Guerillas CF 2 [5.3.3]');
  H.eq(tapeF.remaining(), 0, 'the fire tape is fully spent');

  st = run(st, { type: 'endPhase' }, FW.rng.seeded('ex-street-mv')).st;
  H.eq(st.phase, 'movement', 'the Fire Phase ends into Movement [12]');
  const toStreet = G.legalActions(st).filter(a => a.type === 'moveStep' && a.uid === Bs.uid && a.to.street === street.id)[0];
  H.ok(toStreet, 'the Zone 3 squad may enter the Street Section');
  const tapeS = FW.rng.tape([4, 5], { sides: 10 });   // Street Sniper: Insurgents roll 3, Suspects roll 4
  st = run(st, toStreet, tapeS).st;
  H.ok(Bs.pos.street === street.id && Bs.mp === 3 && !Bs.pinned,
    'Street Sniper rolls of 3 (over 1 Insurgent) and 4 (over 3 Suspects): the crossing is clean [11.4.2]');
  H.eq(tapeS.remaining(), 0, 'the street tape is fully spent');

  const intoC = G.legalActions(st).filter(a => a.type === 'moveStep' && a.uid === Bs.uid &&
    a.to.zone === 15 && a.to.loc === 'C')[0];
  H.ok(intoC, 'from the Street the squad may enter Zone 15 Location C');
  st = run(st, intoC, FW.rng.seeded('ex-street-c')).st;
  H.ok(st.pending && st.pending.kind === 'dfChoice',
    'entering C, the Security Element choice comes before Defensive Fire [12.3.2.1]');
  const tapeD = FW.rng.tape([3, 5], { sides: 10 });   // Defensive Fire roll 2; Suspect check roll 4
  const rd = run(st, { type: 'dfDetach' }, tapeD); st = rd.st;
  const df = rec(rd.records, 'Defensive Fire [12.7.2]');
  H.eq([df.die, df.modifiedDie, df.result], [2, 3, 'no effect'],
    'book p.13: Defensive Fire roll 2 +1 (Security Element in C) = 3 vs CF 2 — no effect');
  H.ok(Bs.security && Bs.mp === 1, 'the Security Element is detached; 1 MP remains');
  H.ok(st.units.tst2.alive && st.units.tst2.kind === 'suspect', 'the second Suspect stays hidden');
  H.eq(tapeD.remaining(), 0, 'the defensive-fire tape is fully spent');
  const onTo1 = G.legalActions(st).filter(a => a.type === 'moveStep' && a.uid === Bs.uid &&
    a.to.zone === 15 && a.to.loc === '1')[0];
  st = run(st, onTo1, FW.rng.seeded('ex-street-1')).st;
  H.ok(Bs.pos.zone === 15 && Bs.pos.loc === '1' && Bs.mp === 0, 'the squad ends its move in Location 1 of Zone 15');
  H.ok(gue.alive && gue.pos.loc === 'R', 'the Guerillas unit is untouched on the Roof');
}

// ---- worked example: Support missions, rulebook p.09 -----------------------------------------
// Dragon Eye Activates Zones 32 and 41: both draw Normal markers; Zone 32's
// two Suspects are Dummies; Zone 41 reveals a Guerillas CF 1 (Location 2) and
// a Martyrs CF 4 (Roof). A Super Cobra then removes both Suspects in Zone 22.
{
  let st = startedGame('ex-support'); clearEnemies(st);   // phase: support
  [32, 41].forEach(z => { st.zones[z].activated = false; st.zones[z].fortified = false; st.zones[z].control = 'insurgent'; });
  craft(st, 'tstC1', { kind: 'suspect', marker: 0, pos: { zone: 22, loc: '1' } });
  craft(st, 'tstC2', { kind: 'suspect', marker: 0, pos: { zone: 22, loc: '2' } });
  st.pools.markers = [2, 0, 0, 4];   // placement priorities: 32 -> '1' then '2'; 41 -> '2' then 'R'
  st.pools.draw = [0, 5];            // counter 0 = Guerillas CF 1; counter 5 = Martyrs CF 4
  st.pools.strong = 0; st.pools.activation = 10;
  const de = G.legalActions(st).filter(a => a.type === 'mission' && a.mission === 'dragonEye' &&
    a.zone === 32 && a.zone2 === 41)[0];
  H.ok(de, 'Dragon Eye may target the Adjacent Zones 32 and 41 [9.3]');
  const tape = FW.rng.tape([7, 1, 1, 1, 1, 1, 1, 3, 4, 8, 1, 10, 1, 1], { sides: 10 });
  st = run(st, de, tape).st;
  H.ok(st.zones[32].activated && !st.zones[32].fortified, 'Zone 32 Activated, not Fortified');
  H.ok(st.zones[41].activated && !st.zones[41].fortified, 'Zone 41 Activated, not Fortified');
  H.eq(G.insurgentsInZone(st, 32).length + G.suspectsInZone(st, 32).length, 0,
    'both of Zone 32\'s Suspects were Dummies [5.3.3]');
  const g41 = G.insurgentsInZone(st, 41).filter(u => u.pos.loc === '2')[0];
  const m41 = G.insurgentsInZone(st, 41).filter(u => u.pos.loc === 'R')[0];
  H.ok(g41 && g41.kind === 'guerillas' && g41.cf === 1, 'Zone 41 Location 2: Guerillas CF 1 revealed');
  H.ok(m41 && m41.kind === 'martyrs' && m41.cf === 4, 'Zone 41 Roof: Martyrs CF 4 revealed');
  H.eq(tape.remaining(), 0, 'the Dragon Eye tape is fully spent');
  const cobra = G.legalActions(st).filter(a => a.type === 'mission' && a.mission === 'cobra' && a.zone === 22 &&
    a.remove.length === 2)[0];
  H.ok(cobra, 'the Super Cobra may remove both of Zone 22\'s Suspects [9.3]');
  // A postponed Mission does not use one up: only successes count [9.2, 9.2.1]
  const failed = run(st, cobra, FW.rng.tape([10, 1], { sides: 10 })).st;   // roll 9 > 6; Reaction 0
  H.eq(failed.support.cobra, 0, 'a failed Cobra Mission does not count against its maximum or move its marker [9.2.1]');
  const tapeC = FW.rng.tape([4, 1], { sides: 10 });   // mission roll 3; Reaction roll 0
  st = run(st, cobra, tapeC).st;
  H.ok(!st.units.tstC1.alive && !st.units.tstC2.alive, 'both Suspects are removed');
  H.eq([st.support.dragonEye, st.support.cobra], [1, 1], 'one Dragon Eye and one Cobra used');
  H.eq(st.vp, 0, 'no VP changed hands');
  H.eq(tapeC.remaining(), 0, 'the Cobra tape is fully spent');
}

// ---- soak -------------------------------------------------------------------------------------
{
  const R = FW.soak.run(G, { games: 100, seed: 'soak', maxSteps: 4000 });
  H.ok(R.clean, 'soak clean: ' + FW.soak.summary(R));
  if (!R.clean) console.log(R.failures.slice(0, 3));
}

// ---- bench: the AI driver against random, paired seeds -----------------------------------------
{
  function playGame(policy, seed) {
    const opts = { rng: FW.rng.seeded(seed) };
    let st = G.create({}, opts), steps = 0;
    while (!G.isOver(st) && steps++ < 5000) {
      const c = policy.chooseAction(G, st, opts);
      st = FW.game.run(G, st, c ? c.action : G.legalActions(st)[0], opts).state;
    }
    const over = G.isOver(st);
    return { vp: st.vp, winner: over ? over.winner : null };
  }
  const N = 30, rnd = FW.ai.random();
  let aiVp = 0, rndVp = 0, aiWins = 0, rndWins = 0;
  for (let i = 0; i < N; i++) {
    const a = playGame(AI, 'bench:' + i), r = playGame(rnd, 'bench:' + i);
    aiVp += a.vp; rndVp += r.vp;
    if (a.winner === 'you') aiWins++;
    if (r.winner === 'you') rndWins++;
  }
  console.log('  bench: AI avg VP ' + (aiVp / N).toFixed(1) + ' (' + aiWins + ' wins) vs random avg VP ' +
    (rndVp / N).toFixed(1) + ' (' + rndWins + ' wins) over ' + N + ' paired games');
  H.ok(aiVp / N > rndVp / N, 'the AI driver out-scores random play on the game\'s own VP scale');
}

// ---- tutorial ------------------------------------------------------------------------------------
{
  const R = FW.tutorial.replay(G, TUT.beats, { setup: TUT.setup, opts: { rng: FW.rng.seeded(TUT.SEED) } });
  H.eq(R.failed, 0, 'every tutorial beat plays: ' + (R.failures.join('; ') || 'clean'));
  H.eq(R.passed, TUT.beats.length, 'all ' + TUT.beats.length + ' beats');
}

// ---- Learn to Play v2: the chapters ---------------------------------------------------------------
// Every chapter that is built replays clean on its own seed. The fight chapter is a
// watch chapter: nothing waits for the player, every move it rings is a legal
// one, and on its seed the turn shows what its words promise — the shot it
// rings hits, the assault it rings wins, a Zone is gained, the VP do not fall.
{
  TUT.chapters.filter(c => c.beats).forEach(c => {
    const R = FW.tutorial.replay(G, c.beats, { setup: c.setup, opts: { rng: FW.rng.seeded(c.SEED) } });
    H.eq(R.failed, 0, 'chapter ' + c.n + ' (' + c.title + ') replays: ' + (R.failures.join('; ') || 'clean'));
  });
  H.eq(TUT.chapters.map(c => c.n + ':' + c.id).join(), '1:setup,2:pieces,3:board,4:afford,5:tools,6:turn,7:fight', 'seven chapters: setting up first, the fight under way last');
  // The page does not play the model answers: it rings one move (app.lessonFocus)
  // and the player makes that one. That path must reach the end too.
  TUT.chapters.filter(c => c.beats).forEach(c => {
    const t = FW.tutorial.create(G, c.beats, { setup: c.setup, opts: { rng: FW.rng.seeded(c.SEED) } });
    APP.tutorial = t;
    let stuck = null;
    while (!stuck && !t.atEnd() && !t.current().done) {
      if (t.waiting()) {
        const a = APP.lessonFocus()[0];
        const r = a ? t.offer(a) : { ok: false, why: 'nothing is rung; legal: ' + G.legalActions(t.state).map(x => x.type).join(',') };
        if (!r.ok) stuck = '#' + t.i + ' ' + (r.why || r.error);
      } else { const r = t.advance(); if (!r.ok) stuck = '#' + t.i + ' ' + r.error; }
    }
    APP.tutorial = null;
    H.ok(!stuck, 'chapter ' + c.n + ' plays through on the moves the page rings: ' + (stuck || 'clean'));
  });
  const ch = TUT.chapters.filter(c => c.id === 'fight')[0];
  H.ok(ch.beats.every(b => !b.await), 'the fight chapter never waits for the player: it is watched');
  const t = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: { rng: FW.rng.seeded(ch.SEED) } });
  const held = st => G.board.zones.filter(z => st.zones[z.id].control === 'usmc').length;
  const h0 = held(t.state), vp0 = t.state.vp, seen = {};
  let planned = 0, legalPlans = 0;
  while (!t.atEnd() && !t.current().done) {
    const b = t.current(), plan = b.plan ? b.plan(t.state) : null;
    if (b.plan) { planned++; if (plan && G.legalActions(t.state).some(a => JSON.stringify(a) === JSON.stringify(plan))) legalPlans++; }
    ['title', 'say', 'explain'].forEach(k => {
      const v = typeof b[k] === 'function' ? b[k](t.state, plan) : b[k];
      if (v != null && (typeof v !== 'string' || /undefined|NaN/.test(v))) seen.bad = (seen.bad || []).concat(b.title + '.' + k);
    });
    const r = t.advance();
    seen[b.title] = r.records.map(x => x.context + ' -> ' + x.result).join(' | ');
  }
  H.eq(legalPlans, planned, 'every move the fight chapter rings is a legal move (' + planned + ')');
  H.ok(!seen.bad, 'its words are all filled in: ' + (seen.bad || ['ok']).join(', '));
  H.ok(/^Fire: .* -> hit/.test(seen['Take the shot']), 'the shot it rings hits: ' + seen['Take the shot'].slice(0, 80));
  H.ok(/Insurgents suffer a Step Loss/.test(seen['Assault']), 'the assault it rings wins: ' + seen['Assault'].slice(0, 80));
  H.ok(held(t.state) > h0, 'the turn gains ground: Zones held ' + h0 + ' -> ' + held(t.state));
  H.ok(t.state.vp >= vp0, 'and costs no Victory Points: ' + vp0 + ' -> ' + t.state.vp);
  H.eq(t.state.turn, 5, 'and it ends with Turn 5 begun');
}

// Chapters 2 and 3 look before they ask: every piece or place they ring is
// on the board, every counter card's art exists, every line they draw joins
// two real Locations, and every quiz has a right answer and a wrong one
// inside its ring (or it is not a question). Quizzes never move the game.
['pieces', 'board'].forEach(id => {
  const fs = require('fs');
  const ch = TUT.chapters.filter(c => c.id === id)[0];
  const t = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: { rng: FW.rng.seeded(ch.SEED) } });
  const locOk = k => { const p = k.split(':'); return !!G.ZD[+p[0]] && G.ZD[+p[0]].locations.some(l => l.id === p[1]); };
  const bad = [];
  let quizzes = 0, cards = 0, lines = 0;
  while (!t.atEnd() && !t.current().done) {
    const b = t.current(), s = t.state;
    const f = typeof b.focus === 'function' ? b.focus(s) : b.focus;
    if (f && f.units && !f.units.filter(u => s.units[u] && s.units[u].pos).length) bad.push(b.title + ': rings no piece');
    if (f && f.locs && !f.locs.every(locOk)) bad.push(b.title + ': rings a Location that does not exist');
    if (b.card) [b.card.front, b.card.back].filter(Boolean).forEach(face => {
      cards++; if (!fs.existsSync(require('path').join(ROOT, 'assets/counters', face.art))) bad.push(b.title + ': no art ' + face.art);
    });
    if (b.links) b.links(s).forEach(pr => { lines++; if (!locOk(pr[0]) || !locOk(pr[1])) bad.push(b.title + ': a line to nowhere ' + pr); });
    if (b.quiz) {
      quizzes++;
      const kind = b.quiz.kind || 'unit', ans = b.quiz.answers(s).map(String);
      const ring = (kind === 'unit' ? f.units : kind === 'loc' ? f.locs : (f.zones || []).map(String)) || [];
      if (!ans.length) bad.push(b.title + ': no right answer');
      if (!ring.some(u => ans.indexOf(u) >= 0) || !ring.some(u => ans.indexOf(u) < 0))
        bad.push(b.title + ': the ring needs a right and a wrong answer (' + ring.length + ' ringed)');
      if (id === 'pieces' && ring.length > 6) bad.push(b.title + ': ring too wide to read close up (' + ring.length + ')');
      if (ring.length > 12) bad.push(b.title + ': ring too wide to read (' + ring.length + ')');
      if (!b.quiz.prompt || !b.quiz.right || !b.quiz.wrong) bad.push(b.title + ': quiz words missing');
    }
    const r = t.advance(); if (!r.ok) { bad.push(b.title + ': ' + r.error); break; }
  }
  H.ok(!bad.length, 'chapter ' + ch.n + ' rings real pieces and places, asks answerable questions: ' + (bad.join('; ') || 'ok'));
  H.ok(quizzes >= 4, 'and it has ' + quizzes + ' quizzes, ' + cards + ' counter faces, ' + lines + ' drawn links');
  H.ok(ch.beats.every(b => !b.await && !b.run && !b.action), 'and its quizzes never move the game: no beat acts');
});
// Chapter 3's Courtyard question is the engine's own answer: one step from
// Zone 24's Courtyard reaches its 1st Story and, by the door, Zone 25's Courtyard.
{
  const ch = TUT.chapters.filter(c => c.id === 'board')[0];
  const st = ch.setup({ rng: FW.rng.seeded(ch.SEED) });
  const q = ch.beats.filter(b => b.title === 'Your turn: one step')[0].quiz.answers(st).sort().join(',');
  H.eq(q, '24:1,25:C', 'one step from the Courtyard of Zone 24: ' + q);
}

// Chapter 4's practice positions are puzzles: each offers the player's squad
// more than one legal move, refuses the wrong ones with a reason, and its
// answers are the ones the guide's words name — the shot with the fewest
// modifiers, the roof route in, and a Top-Down assault on the Guerillas.
{
  const ch = TUT.chapters.filter(c => c.id === 'afford')[0];
  const t = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: { rng: FW.rng.seeded(ch.SEED) } });
  const bad = [], answers = [];
  let puzzles = 0, assaultRec = '';
  while (!t.atEnd() && !t.current().done) {
    const b = t.current();
    if (t.waiting()) {
      puzzles++;
      const m = t.matches(), verdicts = m.map(a => b.accept(t.state, a));
      if (m.length < 2) bad.push(b.title + ': only ' + m.length + ' choice');
      if (!verdicts.some(v => v === true)) bad.push(b.title + ': no answer');
      if (!verdicts.some(v => typeof v === 'string' && v.length > 20)) bad.push(b.title + ': no wrong choice with a reason');
      const a = b.action;
      answers.push(a.type === 'moveStep' ? a.to.zone + ':' + a.to.loc : a.target);
      const r = t.offer(a);
      if (!r.ok) { bad.push(b.title + ': ' + (r.why || r.error)); break; }
      if (a.type === 'assault') assaultRec = r.records.map(x => x.context).join(' | ');
    } else { const r = t.advance(); if (!r.ok) { bad.push(b.title + ': ' + r.error); break; } }
  }
  H.ok(!bad.length && puzzles === 4, 'chapter 4: ' + puzzles + ' puzzles, each with right and wrong choices: ' + (bad.join('; ') || 'ok'));
  H.eq(answers.join(','), 'drillG2,19:R,29:R,drillT', 'the answers: Guerillas on a roof, up to 19:R, across to 29:R, the Guerillas below');
  H.ok(/Top-Down/.test(assaultRec), 'and the assault is Top-Down: ' + assaultRec.slice(0, 70));
}

// Chapter 5's puzzles are the tools: each offers two choices, refuses the
// wrong one with a reason, and its answer is the one the guide's words
// name. Ammo and Explosives are answered with the lesson's button (the
// click on the target is the plain move); the IED comes from the lesson's
// own shot on a die tape, and the Sniper is the smaller risk next to it.
{
  const ch = TUT.chapters.filter(c => c.id === 'tools')[0];
  const t = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: { rng: FW.rng.seeded(ch.SEED) } });
  APP.tutorial = t;
  const bad = [], answers = [];
  let puzzles = 0;
  while (!t.atEnd() && !t.current().done) {
    const b = t.current();
    if (t.waiting()) {
      puzzles++;
      const m = t.matches(), verdicts = m.map(a => b.accept(t.state, a));
      if (m.length !== 2) bad.push(b.title + ': ' + m.length + ' choices, not 2');
      if (verdicts.filter(v => v === true).length !== 1) bad.push(b.title + ': not one answer');
      if (!verdicts.some(v => typeof v === 'string' && v.length > 20)) bad.push(b.title + ': no wrong choice with a reason');
      const a = b.action;
      const btn = APP.lessonButtons().some(x => JSON.stringify(x) === JSON.stringify(a));
      if (!btn) bad.push(b.title + ': the answer has no button');
      answers.push(a.type === 'fire' ? 'caat:' + a.caat : a.type === 'assault' ? 'explosives:' + a.explosives : a.choice || a.type);
      const r = t.offer(a);
      if (!r.ok) { bad.push(b.title + ': ' + (r.why || r.error)); break; }
    } else {
      const r = t.advance(); if (!r.ok) { bad.push(b.title + ': ' + r.error); break; }
      if (b.title === 'Next: a surprise' && !(t.state.pending && t.state.pending.kind === 'iedChoice')) bad.push('the loaded shot did not turn up an IED or Sniper');
    }
  }
  APP.tutorial = null;
  H.ok(!bad.length && puzzles === 4, 'chapter 5: ' + puzzles + ' tool puzzles, each with a right and a wrong choice, the answer on a button: ' + (bad.join('; ') || 'ok'));
  H.eq(answers.join(','), 'caat:true,sniper,dfDetach,explosives:true', 'the answers: spend the Ammo, take the Sniper, detach first, use the Explosives');
}

// Chapter 6 is a real Setup: the player's two decisions are puzzles (the
// strongest squad into the hottest Start Zone, a CAAT to a squad in contact),
// wrong choices come with a reason, the guide places the rest by the same
// reasoning, and the battle stands ready at Turn 1, Support Phase.
{
  const ch = TUT.chapters.filter(c => c.id === 'setup')[0];
  const t = FW.tutorial.create(G, ch.beats, { setup: ch.setup, opts: { rng: FW.rng.seeded(ch.SEED) } });
  const bad = [], picks = [];
  while (!t.atEnd() && !t.current().done) {
    const b = t.current();
    if (t.waiting()) {
      const m = t.matches(), v = m.map(a => b.accept(t.state, a));
      if (!v.some(x => x === true) || !v.some(x => typeof x === 'string' && x.length > 20)) bad.push(b.title + ': not a real choice');
      const a = b.action, u = t.state.units[a.uid];
      picks.push(a.type === 'setupPlace' ? u.cf + '@' + a.zone : a.uid + '@' + u.pos.zone);
      const r = t.offer(a); if (!r.ok) { bad.push(b.title + ': ' + (r.why || r.error)); break; }
    } else { const r = t.advance(); if (!r.ok) { bad.push(b.title + ': ' + r.error); break; } }
  }
  H.ok(!bad.length, 'chapter 6: each decision has right and wrong choices: ' + (bad.join('; ') || 'ok'));
  H.eq(picks.join(','), '6@7,sq3@7', 'the answers: a CF 6 squad into Zone 7 (hottest), its CAAT where the contact is');
  H.ok(t.state.phase === 'support' && t.state.turn === 1 && G.units(t.state).filter(u => u.kind === 'caat' && u.attachedTo).length === 4,
       'and the battle stands ready: Turn 1, Support Phase, four CAATs attached');
  H.ok(TUT.chapters.every(c => c.beats), 'every one of the seven chapters is built');
}

// The controls tour rings the page's own elements: each one it names exists.
{
  const html = require('fs').readFileSync(require('path').join(ROOT, 'game/index.html'), 'utf8');
  const named = [];
  TUT.chapters.forEach(c => c.beats.forEach(b => {
    const f = typeof b.focus === 'function' ? null : b.focus;
    ((f && f.ui) || []).forEach(sel => named.push(sel));
  }));
  const missing = named.filter(sel => html.indexOf('id="' + sel.replace(/^#/, '') + '"') < 0);
  H.ok(named.length >= 3 && !missing.length, 'the controls tour rings ' + named.length + ' page elements, all present: ' + (missing.join(', ') || 'ok'));
}

// ---- board: the page's own controller, headless ---------------------------------------------------
// The same clicks the page makes: select a counter, click a Location, read the
// refusal in the engine's words. No DOM — the controller is DOM-free by design.
{
  const session = FW.game.session(G, {}, { rng: FW.rng.seeded('board'), undo: true });
  const refused = [];
  const ctl = APP.createController({
    session, perform: a => session.apply(a),
    onRefuse: w => refused.push(w), onSelect: () => {}
  });
  const st = session.state;
  const proj = APP.project(st);
  H.eq(proj.zones.length, 61, 'the projection covers all 61 Zones');
  const uid = st.setupQueue[0];
  const targets = ctl.targetsOf(uid);
  H.ok(targets.length === 9 && targets.every(a => a.type === 'setupPlace'),
    'a drawn squad lights the nine Start Zones [6.3] (' + targets.length + ')');
  ctl.clickUnit(uid);
  H.eq(ctl.selected, uid, 'clicking a squad chip selects it');
  const zone = targets[0].zone;
  const r = ctl.clickLoc(zone, G.entryLoc(st, zone));
  H.ok(r.ok && st.units[uid].pos && st.units[uid].pos.zone === zone, 'clicking the Zone\'s entry Location places the squad');
  const uid2 = st.setupQueue.filter(x => !st.units[x].pos)[0];
  ctl.clickUnit(uid2);
  const bad = ctl.clickLoc(zone, G.entryLoc(st, zone));
  H.ok(!bad.ok && typeof bad.why === 'string' && bad.why.length > 5,
    'a second squad in the same Start Zone is refused in words: "' + bad.why + '"');
  ctl.clickUnit('caat1');
  const att = ctl.clickUnit(uid);
  H.ok(att.ok && st.units[uid].caat === 'caat1', 'clicking a placed squad with a CAAT selected attaches it [6.3.1]');
  H.eq(APP.gestureOf({ type: 'endPhase' }), null, 'End phase is a button, not a board gesture');
  H.eq(APP.gestureOf({ type: 'fire', uid: 'a', target: 'b' }), { uid: 'a', target: 'b' }, 'a shot is a click on the target');
  H.ok(typeof APP.resolve('sq1', 'squad').image === 'string' &&
       typeof APP.resolve('ins1', 'guerillas').image === 'string' &&
       typeof APP.resolve('sus1', 'suspect').image === 'string', 'every kind of counter has a face');
  // Phase 3: the real VASSAL counter faces. faceFor picks the printed face
  // for the counter a unit rides — a reduced squad shows the back of the
  // next-higher counter — and every file it names is in assets/counters/.
  const fs = require('fs');
  const faceCases = [
    [{ kind: 'squad', pcf: 5, markers: [] }, 'marine-5.png'],
    [{ kind: 'squad', pcf: 5, markers: ['reduced'] }, 'marine-6-reduced.png'],
    [{ kind: 'squad', pcf: 3, markers: ['reduced'] }, 'marine-4-reduced.png'],
    [{ kind: 'iif', pcf: 4, markers: [] }, 'iif-4.png'],
    [{ kind: 'iif', pcf: 3, markers: ['reduced'] }, 'iif-3.png'],
    [{ kind: 'caat', pcf: null, markers: [] }, 'caat.png'],
    [{ kind: 'abrams', pcf: 8, markers: [] }, 'abrams.png'],
    [{ kind: 'guerillas', pcf: 2, sym: 'triangle', markers: [] }, 'guerillas-2-triangle.png'],
    [{ kind: 'martyrs', pcf: 4, sym: 'diamond', markers: [] }, 'martyrs-4-diamond.png'],
    [{ kind: 'suspect', pcf: null, marker: 0, markers: [] }, 'suspect-21r.png'],
    [{ kind: 'suspect', pcf: null, marker: 5, markers: [] }, 'suspect-r12.png']
  ];
  faceCases.forEach(([u, file]) => {
    const f = APP.faceFor(u);
    H.ok(f.art === file && fs.existsSync(path.join(ROOT, 'assets', 'counters', file)),
      'the ' + u.kind + ' counter shows its real face ' + file);
  });
  H.eq(APP.faceFor({ kind: 'guerillas', pcf: 4, sym: 'triangle', markers: [] }).art, null,
    'a Guerillas CF 4 has no VASSAL face — the drawn face stands in');
  H.eq(APP.faceFor({ kind: 'suspect', pcf: null, marker: 1, markers: [] }).art, null,
    'the Suspect 2R1 marker has no VASSAL face — the drawn face stands in');
  H.eq(APP.faceFor({ kind: 'guerillas', pcf: 2, sym: 'square', markers: [] }).art, null,
    'a square-symbol unit has no VASSAL face — the drawn face stands in');
  // Refinements: the decision panel is built from actionsOf()/actionActor(),
  // and the right panel's change feed from describeChanges() — all DOM-free.
  H.eq(APP.actionActor({ type: 'setupCaat', caat: 'caat2', uid: uid }), 'caat2',
    'a CAAT attachment belongs to the CAAT, not the squad it joins');
  H.eq(APP.actionActor({ type: 'placeAbrams' }), 'abrams', 'placing the Abrams belongs to the Abrams');
  H.eq(APP.actionActor({ type: 'mission', mission: 'cobra', zone: 22 }), null,
    'a Support mission is a phase action, not a piece action');
  const uid2Acts = ctl.actionsOf(uid2);
  H.ok(uid2Acts.length >= 1 && uid2Acts.every(a => a.uid === uid2),
    'actionsOf lists everything one piece can do (' + uid2Acts.length + ' for the unplaced squad)');
  const stFeed = startedGame('change-feed');
  const beforeFeed = APP.summarizeState(stFeed);
  const rFeed = run(stFeed, { type: 'endPhase' }, FW.rng.seeded('change-feed-end'));
  const feedLines = APP.describeChanges(beforeFeed, APP.summarizeState(rFeed.st), rFeed);
  H.ok(feedLines.some(l => /Support Phase → Reinforcements Phase/.test(l)),
    'the change feed names the phase change: "' + (feedLines[0] || '') + '"');
  const beforePlace = APP.summarizeState(st);
  const placeAct = G.legalActions(st).filter(a => a.type === 'setupPlace' && a.uid === uid2)[0];
  const rPlace = run(st, placeAct, FW.rng.seeded('change-feed-place'));
  const placeLines = APP.describeChanges(beforePlace, APP.summarizeState(rPlace.st), rPlace);
  H.ok(placeLines.some(l => /moved: Setup draw → Zone \d+/.test(l)),
    'the change feed reports a piece moving onto the board: "' + (placeLines[0] || '') + '"');
}

const OPTS = () => ({ rng: FW.rng.seeded(TUT.SEED) });
// ---- the newcomer ---------------------------------------------------------------------------------
// Someone who has never played must be able to start. The primer is the first
// thing they read (the goal, one turn, the decisions, the words); the lesson
// hands them the real decisions instead of making them for them.
{
  const P = S.PhantomFuryPrimer;
  H.ok(P && typeof P.goal === 'string' && P.goal.length > 10, 'the primer states the goal in a sentence');
  H.ok(Array.isArray(P.turn) && P.turn.length >= 2 && P.turn.length <= 8, 'a turn is told in ' + (P.turn || []).length + ' steps');
  H.ok(P.turn.every(t => t.step && /^\[\d+(\.\d+)*\]$/.test(t.cite || '')), 'every turn step cites the digest rule it summarises');
  H.ok(Array.isArray(P.decisions) && P.decisions.length >= 1, 'and names the decisions the player makes');
  H.ok(P.terms && Object.keys(P.terms).length >= 1, 'and the words on the table a stranger would not know');
  const mine = TUT.beats.filter(b => b.await);
  H.ok(mine.length >= 1, 'the lesson hands at least one real decision to the player (' + mine.length + ' beats wait for their move)');
  H.ok(mine.every(b => b.hint), 'and every one of those says how to make the move');
  // the lesson refuses a move it did not ask for, and keeps waiting
  const t = FW.tutorial.create(G, TUT.beats, { setup: TUT.setup, opts: OPTS() });
  while (!t.waiting() && !t.atEnd()) t.advance();
  const want = t.matches();
  H.ok(want.length >= 1, 'at the first "your move" beat the game offers a move that fits (' + want.length + ')');
  const other = G.legalActions(t.state).filter(a => !t.wants(a))[0];
  if (other) {
    const at = t.i, r = t.offer(other);
    H.ok(!r.ok && r.refused && t.i === at, 'a different legal move is refused and the lesson waits: "' + r.why + '"');
  }
  H.ok(t.offer(want[0]).ok, 'the move the lesson asked for moves it on');
}

// ---- victory, the long game, and saving ------------------------------------------------------
// Phase 4: the game must end with a ruling both ways, a full 16-turn game
// must actually finish, and a saved game must come back identical and
// playable — the three things Phases 1–3 built toward.
{
  // A win: every Zone USMC at the end of Turn 3 banks 5 VP per unplayed turn.
  let st = startedGame('endgame-win');
  clearEnemies(st);
  B.zones.forEach(z => { st.zones[z.id].control = 'usmc'; st.zones[z.id].activated = true; });
  const vpBefore = st.vp;
  st.turn = 3; st.phase = 'assault';
  let r = run(st, { type: 'endPhase' }, FW.rng.seeded('endgame-win-reorg'));
  st = r.st;
  const over = G.isOver(st);
  H.ok(over && over.winner === 'you' && st.phase === 'done', 'holding every Zone ends the game in a win [7.2]');
  H.eq(st.vp, vpBefore + 65, 'a Turn 3 win banks 5 VP for each of the 13 unplayed turns [7.2.1] (VP ' + st.vp + ')');
  H.ok(over && /Major Victory/.test(over.why) && over.score.zones === 60,
    'the ruling reads Major Victory with 60 Zones held: "' + (over && over.why) + '"');

  // The Zone 26 exception: the Mosque empty but never Controlled still wins, at -5 VP.
  st = startedGame('endgame-mosque');
  clearEnemies(st);
  B.zones.forEach(z => { st.zones[z.id].control = z.id === 26 ? 'insurgent' : 'usmc'; st.zones[z.id].activated = true; });
  const vpM = st.vp;
  st.turn = 3; st.phase = 'assault';
  r = run(st, { type: 'endPhase' }, FW.rng.seeded('endgame-mosque-reorg'));
  st = r.st;
  const overM = G.isOver(st);
  H.ok(overM && overM.winner === 'you', 'an empty but uncontrolled Zone 26 still wins [7.2]');
  H.eq(st.vp, vpM + 60, 'the Zone 26 exception costs 5 VP against the unplayed-turn bonus (VP ' + st.vp + ')');

  // A full game: the AI plays all 16 turns to the time-expired ruling.
  const o = { rng: FW.rng.seeded('endgame-full') };
  let g = G.create({}, o), steps = 0;
  while (!G.isOver(g) && steps < 4000) { g = FW.game.run(G, g, AI.chooseAction(G, g, o).action, o).state; steps++; }
  const overF = G.isOver(g);
  H.ok(overF && steps < 4000, 'a full AI game finishes (' + steps + ' actions)');
  H.ok(overF && overF.winner === 'foe' && g.turn === 16,
    'the heuristic driver does not clear Fallujah: 16 turns to the time-expired ruling [7.1]');

  // Save / load: the page's store round-trips a mid-game state exactly,
  // and the loaded game still plays.
  const mid = startedGame('endgame-save');
  const label = 'Turn ' + mid.turn + ' · ' + APP.PHASE_NAMES[mid.phase];
  H.ok(APP.store.save(1, mid, { label: label }), 'a mid-game state saves to a slot');
  const back = APP.store.load(1);
  H.ok(back && back.meta.label === label, 'the save lists with its label: "' + label + '"');
  H.eq(JSON.stringify(back.state), JSON.stringify(mid), 'the loaded state is the saved state, field for field');
  const rr = run(back.state, { type: 'endPhase' }, FW.rng.seeded('endgame-save-play'));
  H.eq(rr.st.phase, 'reinforce', 'the loaded game plays on into the next phase');
  const exported = APP.store.exportJSON(mid, { label: label });
  H.eq(JSON.stringify(APP.store.importJSON(exported)), JSON.stringify(mid),
    'the exported save file imports back to the same state');
}

H.done();
