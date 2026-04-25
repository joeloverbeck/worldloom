<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-05: Claude Code Hooks Discipline

**Phase**: Hooks 1, 2, 4 ship in Phase 1; Hooks 3, 5 ship in Phase 2
**Depends on**: SPEC-01 (index for Hook 1 context), SPEC-02 (MCP server for redirects), SPEC-03 (Hook 3 policy), SPEC-04 (Hook 5 validators), **SPEC-13 (atomic-source contract — Hook 2/3 scope shifts to `_source/` subdirectories and primary-authored files)**
**Blocks**: SPEC-06 (skills rely on hooks to make discipline structural)
**Status**: COMPLETED 2026-04-26. All five hooks implemented. Part A landed 2026-04-24 at `tools/hooks/src/hook1-user-prompt-context.ts`, `tools/hooks/src/hook2-guard-large-read.ts`, and `tools/hooks/src/hook4-subagent-localization.ts`. Part B landed 2026-04-26 at `tools/hooks/src/hook3-guard-direct-edit.ts` and `tools/hooks/src/hook5-validate-after-patch.ts`, with paired test suites in `tools/hooks/tests/`. `.claude/settings.json.example` now wires all five hooks unconditionally.

## SPEC-13 amendment summary

- **Hook 2 (PreToolUse on Read)** block list post-SPEC-13 covers `_source/` subdirectories (oversize directory-read attempts redirect to MCP retrieval). The pre-SPEC-13 monolithic-filename guards (`CANON_LEDGER.md`, `INVARIANTS.md`, etc.) are retired because those files don't exist on migrated worlds. `WORLD_KERNEL.md` and `ONTOLOGY.md` remain freely readable (primary-authored; read cover-to-cover is the point).
- **Hook 3 (PreToolUse on Edit/Write)** block list covers `_source/` subdirectories. Any direct `Edit` or `Write` against an `_source/*.yaml` file is blocked; mutations must route through `mcp__worldloom__submit_patch_plan`. Explicitly allowed direct edits: `WORLD_KERNEL.md`, `ONTOLOGY.md`, per-subdirectory `_source/<subdir>/README.md`, `characters/*`, `diegetic-artifacts/*`, `proposals/*`, `audits/*`, `adjudications/*` (engine-only discipline on hybrid per-file artifacts is enforced via the skills' HARD-GATE patterns, not via Hook 3 filename match). Compiled-file detection machinery (the DO-NOT-EDIT-header check) is retired since no compiled files exist on migrated worlds.
- **Hook 5 (PostToolUse auto-validate)** runs `record_schema_compliance` + `id_uniqueness` + `cross_file_reference` + `touched_by_cf_completeness` on any `_source/*.yaml` write (expected only via the patch engine; direct Edit is blocked). On hybrid-file writes (characters, diegetic artifacts, adjudications), runs frontmatter schema checks only.

## Problem Statement

Current worldloom discipline ("don't over-read", "don't bypass the gate", "use grep-then-targeted-read") lives in prose: `CLAUDE.md` non-negotiables, `canon-addition/SKILL.md` Large-file method, `canon-addition/references/guardrails.md`. Compliance is probabilistic — the model may drift under pressure or in long sessions. FOUNDATIONS' "LLM agents should never operate on prose alone" cannot be structurally enforced while the only enforcement surface is more prose.

**Source context**: `brainstorming/structure-aware-retrieval.md` §7 (hooks aggressively). Brainstorm decision: make compliance structural via Claude Code's hook system; blocking is safer than nagging.

## Approach

Five hooks in `.claude/settings.json`, each a small TypeScript script under `tools/hooks/src/` compiled to `tools/hooks/dist/src/*.js`. Hooks return structured decisions (allow / deny / rewrite) per Claude Code's hook API. Graceful degrade: if the world index is missing or the MCP server is down, hooks pass through silently rather than breaking Claude.

## Deliverables

### Package location

`tools/hooks/` — TypeScript package.

```
tools/hooks/
├── package.json
├── tsconfig.json
├── src/
│   ├── hook1-user-prompt-context.ts
│   ├── hook2-guard-large-read.ts
│   ├── hook3-guard-direct-edit.ts       # Phase 2 — landed 2026-04-26
│   ├── hook4-subagent-localization.ts
│   ├── hook5-validate-after-patch.ts    # Phase 2 — landed 2026-04-26
│   └── lib/
│       ├── detect-world.ts              # infer world_slug from prompt / path
│       ├── hook-io.ts                   # stdin/stdout helpers for Claude hook JSON
│       ├── index-query.ts               # thin wrapper for hook-time index reads
│       ├── pathing.ts                   # repo/world path resolution
│       ├── size-thresholds.ts           # per-file protection thresholds
│       └── logging.ts                   # hook decisions logged to tools/hooks/logs/
├── tests/
│   ├── _shared.ts
│   ├── hook1-user-prompt-context.test.ts
│   ├── hook2-guard-large-read.test.ts
│   ├── hook3-guard-direct-edit.test.ts  # Phase 2 — landed 2026-04-26
│   ├── hook4-subagent-localization.test.ts
│   └── hook5-validate-after-patch.test.ts  # Phase 2 — landed 2026-04-26
└── dist/                                # compiled JS; gitignored
```

### Hook inventory

#### Hook 1 — UserPromptSubmit: Context Preface *(Phase 1)*

**Trigger**: every user prompt submission.

**Behavior**:
1. Detect `world_slug` from prompt keywords (explicit mention of world name; slash-command argument; `worlds/<slug>/` path in prompt)
2. If detected, query the local world index opportunistically for:
   - Structured ids explicitly named in the prompt
   - Exact named entities found in the prompt
   - Up to 5 relevant node ids from exact-id, entity-source, and lexical fallback matches
   - Size-class warnings for protected files explicitly named in the prompt
3. Inject a factual `additionalContext` preface (budget ≤500 tokens):

```
Worldloom context: world=animalia (13 files, 12111 lines total; CANON_LEDGER.md=8624 lines).
Named entities detected: Brinewick.
Top relevant nodes: CF-0038, CF-0031, M-1, PA-0017.
Size warnings: CANON_LEDGER.md is always protected; prefer mcp__worldloom__get_context_packet or targeted node reads.
```

**Graceful degrade**: if no world detected or index missing, no preface injected.

**Exit codes**: `0` pass-through (always; this hook is informational, never blocking).

#### Hook 2 — PreToolUse on Read: Block Wasteful Reads *(Phase 1)*

**Trigger**: `Read` tool call with `file_path` matching `worlds/<slug>/*.md`.

**Policy**:
- **Always protected** (deny full-file reads regardless of size): `CANON_LEDGER.md`
- **Threshold-protected** (deny when >300 lines): `MYSTERY_RESERVE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `GEOGRAPHY.md`
- **Always allowed**: reads with explicit `offset` or `limit`; reads of small mandatory files outside the protected list; reads of any file under `characters/`, `diegetic-artifacts/`, `proposals/`, `adjudications/`, `audits/`, `character-proposals/`, `briefs/`

**On block** — return `permissionDecision: deny` with message:

```
Full Read of CANON_LEDGER.md is blocked. Use instead:
  - mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget) for assembled context
  - mcp__worldloom__get_node(node_id) for a specific CF/CH/PA/M record
  - mcp__worldloom__search_nodes(query, filters) for search
  - Read with explicit offset+limit for unstructured prose regions
If you genuinely need the full file, include the token ALLOW_FULL_READ in your next prompt.
```

**Override**: if the recent transcript tail contains `ALLOW_FULL_READ`, hook passes through.

**Exit codes**: `0` on allow and on structured `permissionDecision: deny`; non-zero only on unexpected runtime failure.

#### Hook 3 — PreToolUse on Edit/Write: Block Direct Mutation *(Phase 2 — implemented 2026-04-26)*

**Trigger**: `Edit` or `Write` tool call with `file_path` matching `worlds/<slug>/`.

**Policy** (post-SPEC-13 amendment):
- **Blocked** (patch-engine-only): any direct `Edit`/`Write` against `worlds/<slug>/_source/<subdir>/*.yaml` (or `*.yml`). All atomic-source records — CF, CH, INV, M, OQ, ENT, SEC across every `_source/` subdirectory — are engine-only.
- **Allowed through**:
  - `worlds/<slug>/WORLD_KERNEL.md` (primary-authored prose)
  - `worlds/<slug>/ONTOLOGY.md` (primary-authored prose)
  - `worlds/<slug>/_source/<subdir>/README.md` (per-subdirectory documentation; never an atomic record)
  - `worlds/<slug>/characters/**`, `worlds/<slug>/diegetic-artifacts/**`, `worlds/<slug>/adjudications/**`, `worlds/<slug>/proposals/**`, `worlds/<slug>/audits/**`, `worlds/<slug>/character-proposals/**`, `worlds/<slug>/briefs/**` (engine-only discipline on hybrid per-file artifacts is enforced by the skills' HARD-GATE patterns, not via Hook 3 filename match — per SPEC-13 amendment)
  - Any path outside `worlds/<slug>/_source/`

**On block** — return `permissionDecision: deny` with message:

```
Direct Edit/Write to <path> is blocked — this surface is patch-engine-only.
Assemble a patch plan and submit via:
  mcp__worldloom__submit_patch_plan(patch_plan, approval_token)
The approval_token is issued at HARD-GATE user approval; see docs/HARD-GATE-DISCIPLINE.md.
```

**No override**: Hook 3 has no `ALLOW_DIRECT_EDIT` bypass. Engine writes bypass the hook naturally because they use `fs.writeFile` inside the MCP server process, not Claude's `Edit`/`Write` tools.

**Exit codes**: `0` always (deny is structured via `permissionDecision: deny` in stdout, not a non-zero exit).

#### Hook 4 — SubagentStart: Localization-Agent Bootstrap *(Phase 1)*

**Trigger**: `SubagentStart`.

**Behavior**: inject `additionalContext` into the sub-agent's opening context:

```
Worldloom localization subagent discipline:
1. Search exact ids first.
2. Search exact entity names second.
3. Match heading paths third.
4. Expand backlinks or dependencies fourth.
5. Use lexical search fifth; never semantic-only.
Preferred tool order: mcp__worldloom__search_nodes, then mcp__worldloom__get_node, then mcp__worldloom__get_neighbors.
Avoid wholesale reads of large world files. Return node ids and structured evidence bundles unless prose is explicitly requested.
```

**Graceful degrade**: if MCP server unavailable, fall back to instructions about `grep`-then-targeted-`Read` pattern.

**Exit codes**: `0` always (informational).

#### Hook 5 — PostToolUse: Auto-Validate on Write *(Phase 2 — implemented 2026-04-26)*

**Trigger**: `PostToolUse` after a successful tool call with `tool_name === "mcp__worldloom__submit_patch_plan"`.

**Behavior** (post-SPEC-13 amendment):
1. Decode the patch receipt from the MCP `tool_response`. The hook accepts the receipt either at `tool_response.structuredContent`, directly on `tool_response`, or parsed from `tool_response.content[0].text` JSON.
2. Walk `files_written[].file_path`. Each absolute path is normalized and split via the `worlds/<slug>/<rest>` regex into a `(world_slug, relative_path)` pair. Entries that don't match are dropped silently (graceful degrade).
3. For each affected world, run `node tools/validators/dist/src/cli/world-validate.js <slug> --structural --json` once. Exit codes `0` (all pass) and `1` (at least one `fail`) are accepted; `2`/`3` are treated as a graceful skip.
4. Filter the verdicts: keep only `severity === "fail"` whose `validator` is one of `record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, **and** whose `location.file` matches one of the relative paths from the receipt for that world. Pre-existing failures on untouched files are not surfaced (those are SPEC-04's `world-validate` surface, not a post-write incident).
5. If any failures remain, log each to `tools/hooks/logs/hook-decisions.jsonl` at `error` level and emit a single `additionalContext` block via the `PostToolUse` hook output:

```
<system-reminder>
Post-write validators detected structural drift on world '<slug>'.
This should not normally happen — the pre-apply gate should have caught it. Please investigate before further writes.
  validator: record_schema_compliance
  file: _source/canon/CF-0042.yaml
  code: record.missing_required_field
  message: Field 'fact_type' is missing.
</system-reminder>
```

**Hybrid-file scope (per SPEC-13 amendment)**: structural validators run frontmatter schema checks on hybrid-file writes (`characters/*`, `diegetic-artifacts/*`, `adjudications/*`) via the validator framework's existing `parsedBodyFor` fallback to YAML frontmatter — no separate Hook 5 codepath is needed.

**Graceful degrade**:
- Missing validator CLI under `tools/validators/dist/src/cli/world-validate.js` → log `info` and return without output.
- Validator subprocess crashes or times out → log `info` and return without output. Hook 5 never breaks Claude.
- Receipt has no `files_written` (or `tool_response.isError === true`) → return silently.

**Exit codes**: `0` always. Hook 5 is post-hoc; the write has already landed and surfacing is informational.

### `.claude/settings.json` additions

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "node tools/hooks/dist/src/hook1-user-prompt-context.js" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          { "type": "command", "command": "node tools/hooks/dist/src/hook2-guard-large-read.js" }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node tools/hooks/dist/src/hook3-guard-direct-edit.js" }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          { "type": "command", "command": "node tools/hooks/dist/src/hook4-subagent-localization.js" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "mcp__worldloom__submit_patch_plan",
        "hooks": [
          { "type": "command", "command": "node tools/hooks/dist/src/hook5-validate-after-patch.js" }
        ]
      }
    ]
  }
}
```

### Testing strategy

The landed package has compiled-script tests that:
1. Spin up a sandboxed worldloom directory with a small fixture world
2. Feed synthetic hook payloads over stdin to the compiled hook entrypoints
3. Assert hook decisions or injected context for all five hooks

Fixture worlds cover:
- No-world-detected / no-output behavior for Hook 1
- A large protected-file world shape for Hook 2 thresholds and overrides
- Allow/deny matrix for Hook 3 across `_source/<subdir>/*.yaml` records, `_source/<subdir>/README.md`, primary-authored prose, and hybrid artifact directories — plus the no-override invariant
- Subagent bootstrap output for Hook 4
- Receipt parsing, validator-CLI dispatch, and verdict filtering for Hook 5; a stub `world-validate.js` is dropped under the temp repo's `tools/validators/dist/src/cli/` to exercise the runner without a real world index

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Tooling Recommendation | Hook 1 injects context preface; Hook 4 bootstraps sub-agents with retrieval discipline |
| §Mandatory World Files | Hook 3 protects all 13 files from direct mutation |
| Rule 6 No Silent Retcons | Hook 3 forces writes through engine → attribution stamping always runs |
| Rule 7 Preserve Mystery Deliberately | Hook 2's always-protected list includes `MYSTERY_RESERVE.md` (when >300 lines) |
| CLAUDE.md Non-Negotiable: "Never bypass a HARD-GATE" | Hook 3 encodes the ban structurally |
| CLAUDE.md Non-Negotiable: "Never skip FOUNDATIONS.md" | Hook 1 preface includes FOUNDATIONS context; Hook 4 reinforces |

## Verification

- **Unit**: each hook's decision function tested in isolation
- **Integration**: `cd tools/hooks && npm test` passes on 2026-04-26 with all 17 tests green, covering Hook 1 context injection, Hook 2 deny/allow/override behavior, Hook 3 allow/deny matrix and no-override invariant, Hook 4 subagent bootstrap, and Hook 5 receipt-parsing / validator-dispatch / verdict-filtering
- **Performance**: hook execution time <100ms to avoid user-visible latency (target <20ms for Hook 1/4 since every prompt hits them)
- **Graceful degrade**: delete `_index/world.db`; verify hooks don't break Claude (pass through silently). Hook 5 also degrades gracefully when `tools/validators/dist/src/cli/world-validate.js` is absent or the subprocess returns a non-{0,1} exit code.
- **Override discipline**: `ALLOW_FULL_READ` in prompt bypasses Hook 2; no equivalent for Hook 3 (verify no backdoor exists; Hook 3 test suite explicitly asserts deny stdout contains neither `ALLOW_FULL_READ` nor `ALLOW_DIRECT_EDIT`)
- **Logging**: decisions logged at info level; failures logged at error level; log files rotate

## Out of Scope

- Telemetry dashboard for hook metrics
- Hook-bypass audit log with signed records
- Hook-configuration UI
- Per-skill hook customization (hooks are repo-wide)
- Cross-hook coordination (each hook is independent)

## Risks & Open Questions

- **Hook 2 false-positives on legitimate exploratory reads**: a user may genuinely want to read `CANON_LEDGER.md` wholesale for review. Mitigation: `ALLOW_FULL_READ` override is ergonomic enough; document in CLAUDE.md.
- **Hook 3 on sub-directory artifacts**: current design allows direct writes to `characters/`, `diegetic-artifacts/`, `adjudications/` in Phase 1 (skills still write these directly); Phase 2 tightens to engine-only. This is a **behavioral change** for skills — SPEC-06 must migrate them. Risk: Phase 2 ships before SPEC-06 Phase 2 completes → all content-generation skills break. Mitigation: sequence Hook 3 behind SPEC-06 Phase 2 in SPEC-08.
- **Hook 4 prompt injection**: injected system reminders compete with the main agent's prompt. Mitigation: short, targeted, high-signal.
- **Hook 5 post-hoc detection**: Hook 5 runs after write. Any `fail` indicates a gap in pre-apply gate. Mitigation: treat Hook 5 fails as high-priority bugs; track in an incident log.
- **Settings.json merge discipline**: these hook additions must merge with user-local settings. Mitigation: SPEC-07 documents the merge pattern; SPEC-08 Phase 0 adds a sample `.claude/settings.json.example`.

## Outcome

Completed: 2026-04-26.

SPEC-05 shipped in two parts. Part A delivered the read-side and subagent enforcement hooks (`hook1-user-prompt-context`, `hook2-guard-large-read`, `hook4-subagent-localization`) on 2026-04-24. Part B delivered direct `_source/` mutation blocking and post-patch validation surfacing (`hook3-guard-direct-edit`, `hook5-validate-after-patch`) on 2026-04-26.

The final implementation lives under `tools/hooks/` with paired tests in `tools/hooks/tests/`. `.claude/settings.json.example` wires all five hooks unconditionally.

Deviations from the original plan: SPEC-13 shifted Hook 2 and Hook 3 from monolithic world-file discipline to atomic `_source/` discipline. Hook 3 blocks direct Claude `Edit`/`Write` operations on atomic YAML records while leaving primary-authored prose and hybrid artifact directories to the skill/HARD-GATE layer. Hook 5 filters structural validator failures to the files reported by the patch receipt.

Verification: `cd tools/hooks && npm test` passed on 2026-04-26 with 17 tests green, covering Hook 1 context injection, Hook 2 deny/allow/override behavior, Hook 3 allow/deny matrix and no-override invariant, Hook 4 subagent bootstrap, and Hook 5 receipt parsing / validator dispatch / verdict filtering.
