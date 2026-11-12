#!/usr/bin/env bash
# Workspace hook: when a table.json is saved, run `bones check` on every app table so a gap
# or conflict is reported with an example the moment it appears.
cd "$(dirname "$0")/../.." || exit 0
[ -f skeleton/cli/bones.ts ] || { scripts/hooks/log-fire.sh check-table skipped=no-cli; exit 0; }
rc=0
for t in apps/*/table.json; do
  [ -f "$t" ] || continue
  echo "== $t"; npm run -s bones -- check "$t" 2>&1 | tail -n 8; r=${PIPESTATUS[0]}
  [ "$r" -ne 0 ] && rc=1
done
scripts/hooks/log-fire.sh check-table exit=$rc
exit $rc
