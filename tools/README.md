# tools/

Machine-facing layer for worldloom. Empty scaffold in Phase 0; populated progressively in Phases 1–2 per `specs/IMPLEMENTATION-ORDER.md`.

## Sub-packages

| Package | Purpose | Spec | Phase |
|---|---|---|---|
| `world-index/` | SQLite-backed world parser + builder + CLI | `specs/SPEC-01-world-index.md` | 1 |
| `world-mcp/` | MCP retrieval server (context packets, patch plan submission) | `archive/specs/SPEC-02-retrieval-mcp-server.md` | 1 |
| `patch-engine/` | Deterministic patch applier (13 typed ops, two-phase commit) | `specs/SPEC-03-patch-engine.md` | 2 |
| `validators/` | Executable Rule 1–7 + structural validators; `world-validate` CLI | `specs/SPEC-04-validator-framework.md` | 2 |
| `hooks/` | Claude Code hooks (read guards, edit guards, subagent bootstrap, post-write validation) | `specs/SPEC-05-hooks-discipline.md` | 1 (read/subagent) + 2 (edit/post-write) |

## Language & runtime

TypeScript on Node.js. Each sub-package has its own `package.json`, `tsconfig.json`, and `src/`. Compiled output lands in `dist/` (gitignored).

## Current status

`world-index/`, `world-mcp/`, and the read/subagent portions of `hooks/` are now implemented Phase 1 packages. `patch-engine/` is in active Phase 2 implementation: typed op modules and the `submitPatchPlan` package entrypoint exist, while the world-mcp rewire, acceptance suites, validators, and edit/post-write hooks remain Phase 2 work per `specs/SPEC-08-migration-and-phasing.md`.
