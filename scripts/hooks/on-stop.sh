#!/usr/bin/env bash
# Builder agent Stop hook: typecheck and the whole vitest suite when the agent finishes.
# The summary line goes to the agent and to the hook log.
cd "$(dirname "$0")/../.." || exit 0
[ -f package.json ] || { scripts/hooks/log-fire.sh on-stop skipped=no-package.json; exit 0; }
npm run -s typecheck >/dev/null 2>&1; tc=$?
out="$(npx vitest --run 2>&1)"; rc=$?
summary="$(echo "$out" | grep -E '^ *(Test Files|Tests) ' | tr -s ' ' | tr '\n' ';')"
echo "$out" | tail -n 15
echo "[on-stop] typecheck exit $tc; vitest exit $rc; $summary"
scripts/hooks/log-fire.sh on-stop typecheck=$tc vitest=$rc "$summary"
[ $tc -eq 0 ] && [ $rc -eq 0 ]
