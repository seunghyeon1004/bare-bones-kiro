#!/usr/bin/env bash
# Runs one Kiro CLI session in the foreground and keeps the evidence.
#
#   scripts/kiro-run.sh <evidence-name> <prompt-file> [kiro-cli chat flags...]
#
# 1. reads the account's credit meter (/usage) before the run,
# 2. runs `kiro-cli chat --output-format stream-json` with the prompt and flags,
# 3. renders the event stream with scripts/kiro-render.mjs (agent text, every tool call,
#    every shell command with exit code and output tail, credits the session reported),
# 4. writes command, prompt, transcript and the meter after the run to
#    docs/kiro-evidence/<evidence-name>.txt (home directory replaced with ~),
# 5. appends one line to docs/kiro-evidence/credits.log.
set -u
name="$1"; prompt_file="$2"; shift 2
KIRO="${KIRO_CLI:-$HOME/.local/bin/kiro-cli}"
out="docs/kiro-evidence/${name}.txt"
here="$(cd "$(dirname "$0")" && pwd)"
meter() { "$KIRO" chat --no-interactive --trust-tools= "/usage" 2>&1 | grep -oE 'kiroween-26: [0-9.]+' | awk '{print $2}'; }
before="$(meter)"
tmp="$(mktemp)"; trap 'rm -f "$tmp" "$tmp.err"' EXIT
{
  echo "# Kiro CLI $("$KIRO" --version 2>/dev/null | awk '{print $2}'), $(date -u +%FT%TZ). Rendered from the stream-json event stream by scripts/kiro-render.mjs; nothing added or removed except the home directory prefix (~)."
  echo "\$ kiro-cli chat --output-format stream-json $* \"\$(cat ${prompt_file})\""
  echo
  echo "--- prompt ---"
  cat "$prompt_file"
  echo
  echo "--- transcript ---"
} | sed "s#${HOME}#~#g" >"$out"
"$KIRO" chat --output-format stream-json "$@" "$(cat "$prompt_file")" 2>"$tmp.err" |
  tee "$tmp" | node "$here/kiro-render.mjs" >>"$out"
code="${PIPESTATUS[0]}"
if [ "$code" != "0" ]; then
  { echo "--- kiro-cli exited ${code}; last lines of its stderr ---"; tail -15 "$tmp.err" | cut -c1-400 | sed "s#${HOME}#~#g"; } >>"$out"
fi
after="$(meter)"
echo "--- exit ${code}; account credit meter before ${before}, after ${after} (shared account) ---" >>"$out"
echo "$(date -u +%FT%TZ) ${name} exit ${code} meter ${before} -> ${after}" >>docs/kiro-evidence/credits.log
echo "exit=${code} meter ${before} -> ${after}"
tail -n "${TAILN:-40}" "$out"
