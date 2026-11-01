#!/bin/bash
# Every check this project has: syntax, the headless suite, the live drive.
# Exits nonzero on the first failure. Run it at the start and end of a session.
set -e
cd "$(dirname "$0")/.."
for f in fw/core/*.js fw/*/*.js data/*.js game/*.js tools/*.js; do node --check "$f"; done
node tools/verify_data.js
for f in tools/test_*.js; do node "$f"; done
python3 tools/live_check.py "$@"
