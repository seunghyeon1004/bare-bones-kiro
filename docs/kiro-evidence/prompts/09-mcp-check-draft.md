Use the `bones` MCP server tools only (check_table and evaluate); do not run the CLI or read the engine code.

1. Call check_table on skeleton/examples/which-bin-broken.table.json and explain, in plain words, what is broken: the gap (which items fall through) and the conflict (which two rules disagree, on what).
2. Call check_table on apps/which-bin/table.json and confirm it passes.
3. Call evaluate on apps/which-bin/table.json with answers {"kind": "paper-box"} and then {"kind": "paper-box", "soiled": "yes"}: report what the page would ask next after the first, and the outcome, the rule and the source after the second.
4. Call evaluate on apps/which-licence/table.json with {"copyleft": "whole", "network": "yes"} and report the outcome and which questions were skipped.

Do not edit any file. End with a short list of the tool calls you made and what each returned.
