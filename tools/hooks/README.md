# hooks

Claude Code hooks that make retrieval and mutation discipline structural rather than prose-asserted. Compiled from TypeScript in `src/` to `dist/` (gitignored); registered via `.claude/settings.json`.

**Design**: `specs/SPEC-05-hooks-discipline.md`
**Phase**: 1 (Hooks 1, 2, 4) + Phase 2 (Hooks 3, 5)
**Status**: Hooks 1, 2, and 4 implemented on 2026-04-24 in `src/`; Hooks 3 and 5 remain Phase 2 work. Built hook entrypoints land at `dist/src/*.js`.

## Hook inventory

| # | Hook event | Purpose | Phase |
|---|---|---|---|
| 1 | `UserPromptSubmit` | Inject context preface (world slug, relevant nodes, size warnings) | 1 |
| 2 | `PreToolUse:Read` | Block wasteful reads of large world files; redirect to MCP | 1 |
| 3 | `PreToolUse:Edit\|Write` | Block direct mutation of engine-only surfaces; redirect to `submit_patch_plan` | 2 |
| 4 | `SubagentStart` | Bootstrap localization sub-agents with retrieval discipline | 1 |
| 5 | `PostToolUse:submit_patch_plan` | Auto-run structural validators after successful write | 2 |

## Graceful degrade

If world index missing or MCP server unavailable, hooks pass through silently (with optional logging). No hook breaks Claude.

## Override

Hook 2 has an `ALLOW_FULL_READ` prompt-level override for human-driven review. Hook 3 has no override — engine writes bypass naturally via `fs.writeFile`.

## Logs

`tools/hooks/logs/` (gitignored). Decisions logged at info; failures at error.

## Testing

`npm test` builds the package and runs compiled-script tests for Hooks 1, 2, and 4 against synthetic hook payloads and fixture worlds.
