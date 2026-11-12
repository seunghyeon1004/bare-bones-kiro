#!/usr/bin/env bash
# Appends one line per hook firing to docs/kiro-evidence/hook-fires.log, so "did the hook
# fire?" is answered by a file. Usage: log-fire.sh <hook> <result...>
cd "$(dirname "$0")/../.." || exit 0
printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> docs/kiro-evidence/hook-fires.log
