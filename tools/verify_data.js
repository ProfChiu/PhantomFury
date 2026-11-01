// Phantom Fury — board data verification (Phase 1).
// Run: node tools/verify_data.js   (standalone; not part of run_tests.sh yet)
'use strict';
const D = require('../data/phantomfury_board.js');
let fails = 0, warns = 0;
const fail = m => { fails++; console.log('FAIL:', m); };
const warn = m => { warns++; console.log('warn:', m); };

const zones = new Map(D.zones.map(z => [z.id, z]));
if (D.zones.length !== 61) fail('expected 61 zones, got ' + D.zones.length);
for (let i = 1; i <= 61; i++) if (!zones.has(i)) fail('missing zone ' + i);

const starts = D.zones.filter(z => z.circle === 'start').map(z => z.id);
if (JSON.stringify(starts) !== JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]))
  fail('start zones should be 1-9, got ' + starts);

for (const z of D.zones) {
  if (z.id === 27) {
    if (z.locations.length !== 0) fail('zone 27 must have no locations');
    continue;
  }
  if (z.locations.length < 4) fail('zone ' + z.id + ' has only ' + z.locations.length + ' locations');
  for (const l of z.locations)
    if (!['OG', 'C', '1', '2', 'R'].includes(l.type)) fail('zone ' + z.id + ' bad location type ' + l.type);
  // egress targets must be Adjacent or Neighbouring [4.1.7]
  for (const e of z.egress) {
    if (e === 'EXIT') {
      if (z.id < 52) fail('zone ' + z.id + ' has EXIT egress but is not on the exit edge');
      continue;
    }
    if (!z.adjacent.includes(e) && !z.neighbouring.includes(e))
      fail('zone ' + z.id + ' egress target ' + e + ' is neither Adjacent nor Neighbouring');
  }
  if (z.id >= 52 && JSON.stringify(z.egress) !== '["EXIT"]')
    fail('zone ' + z.id + ' should have EXIT as its only egress');
  // symmetry
  for (const a of z.adjacent) if (!zones.get(a).adjacent.includes(z.id)) fail('adjacency not symmetric: ' + z.id + '/' + a);
  for (const n of z.neighbouring) if (!zones.get(n).neighbouring.includes(z.id)) fail('neighbouring not symmetric: ' + z.id + '/' + n);
  // location links reference real locations
  const ids = new Set(z.locations.map(l => l.id));
  for (const [a, b] of z.locationLinks)
    if (!ids.has(a) || !ids.has(b)) fail('zone ' + z.id + ' location link ' + a + '-' + b + ' references a missing location');
}
const z26 = zones.get(26);
if (z26.locations.length !== 6) fail('zone 26 should have 6 locations, got ' + z26.locations.length);
if (z26.egress.length !== 0) fail('zone 26 should have no egress routes (Guerillas there never retreat)');

if (D.streets.length !== 80) fail('expected 80 street sections, got ' + D.streets.length);
for (const s of D.streets) {
  if (s.polygon.length < 3) fail('street ' + s.id + ' polygon too small');
  if (s.adjacentZones.length === 0) warn('street ' + s.id + ' has no adjacent zones within threshold');
}
// every zone touches at least one street section or a neighbouring zone
for (const z of D.zones) {
  if (z.id === 27) continue;
  const touches = D.streets.some(s => s.adjacentZones.includes(z.id));
  if (!touches && z.neighbouring.length === 0) warn('zone ' + z.id + ' touches no street section');
}
console.log('verify_data: ' + (fails ? fails + ' FAILURES' : 'all checks passed') + ' (' + warns + ' warnings)');
process.exit(fails ? 1 : 0);
