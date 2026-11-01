/* fw_harness.js — one assertion runner for every project.
 *
 * No dependencies. Prints "<suite>: N passed, N failed", exits nonzero on any
 * failure. `load()` runs plain-script files (the <script src> kind, with no
 * module.exports) in one shared sandbox so they attach to the same globals
 * exactly as they would in a page.
 *
 *   const H = require('../fw/test/fw_harness.js');
 *   const S = H.load(['core/fw_rng.js', 'core/fw_game.js', 'my_game.js'], { root: __dirname });
 *   H.suite('my game');
 *   H.ok(cond, 'message');  H.eq(actual, expected, 'message');  H.throws(fn, 'message');
 *   H.done();
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0, failed = 0, name = '';
const failures = [];

function suite(n) { name = n; }
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; failures.push(msg); console.error('  FAIL: ' + msg); }
}
function eq(a, b, msg) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  ok(same, msg + '\n    expected ' + JSON.stringify(b) + '\n    got      ' + JSON.stringify(a));
}
function near(a, b, tol, msg) { ok(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', wanted ' + b + ' ± ' + tol + ')'); }
function throws(fn, msg, match) {
  try { fn(); ok(false, msg + ' (did not throw)'); }
  catch (e) {
    if (match && !(match instanceof RegExp ? match.test(e.message) : e.message.indexOf(match) !== -1)) {
      ok(false, msg + ' (threw "' + e.message + '", wanted ' + match + ')');
    } else ok(true, msg);
  }
}
function done() {
  console.log((name || 'tests') + ': ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

/**
 * Run plain-script files in a shared sandbox. Returns the sandbox, which is
 * also `window` and `globalThis` inside it, so `window.FW`, `window.CardTable`
 * and the game's own globals are all reachable as S.FW, S.CardTable, ...
 */
function load(files, opts) {
  opts = opts || {};
  const root = opts.root || process.cwd();
  const sandbox = opts.sandbox || makeSandbox();
  files.forEach(f => {
    const p = path.isAbsolute(f) ? f : path.join(root, f);
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p });
  });
  return sandbox;
}

function makeSandbox() {
  const sandbox = {
    console, Math, Date, JSON, Object, Array, Error, String, Number, Boolean,
    RegExp, Map, Set, parseInt, parseFloat, isNaN, isFinite, setTimeout, clearTimeout
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

module.exports = { suite, ok, eq, near, throws, done, load, makeSandbox, failures: () => failures.slice() };
