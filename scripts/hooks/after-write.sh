#!/usr/bin/env bash
# Builder agent PostToolUse hook: typecheck after every file write. Prints the tail and the
# exit code so the agent sees a failure at once; logs the firing.
cd "$(dirname "$0")/../.." || exit 0
[ -f package.json ] || { scripts/hooks/log-fire.sh after-write skipped=no-package.json; exit 0; }
out="$(npm run -s typecheck 2>&1)"; rc=$?
echo "$out" | tail -n 12
echo "[after-write] typecheck exit $rc"
scripts/hooks/log-fire.sh after-write typecheck=$rc
exit $rc
