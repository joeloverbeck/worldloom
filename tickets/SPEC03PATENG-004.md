# SPEC03PATENG-004: Hybrid-file op modules (3 per-file writers)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds 3 per-op modules under `tools/patch-engine/src/ops/` for writing hybrid YAML-frontmatter + markdown-body per-file artifacts (characters, diegetic artifacts, adjudications). No impact on existing world-index or world-mcp code.
**Deps**: SPEC03PATENG-001

## Problem

SPEC-03's Hybrid-file ops table (post-reassessment spec lines 94–98) defines 3 op types for writing per-file artifacts: `append_adjudication_record` (adjudications), `append_character_record` (characters), `append_diegetic_artifact_record` (diegetic artifacts). Unlike atomic-record ops (tickets 002/003), these ops compose YAML frontmatter with markdown body content and write to a hybrid `.md` file whose address is a `target_file` path (not a `target_record_id`). SPEC-03 retains anchor-checksum drift handling for these hybrid files (spec lines 192–198) because their body prose can drift in ways atomic records cannot.

## Assumption Reassessment (2026-04-24)

1. Current hybrid-file formats: `CharacterDossier` frontmatter + prose body per `.claude/skills/character-generation` output; `DiegeticArtifactFrontmatter` + body per `.claude/skills/diegetic-artifact-generation` output; adjudication records per `.claude/skills/canon-addition` output. All three write to `worlds/<slug>/{characters,diegetic-artifacts,adjudications}/` directories per CLAUDE.md §Repository Layout.
2. Hybrid-file frontmatter shapes (`CharacterDossier`, `DiegeticArtifactFrontmatter`) are available as TypeScript interfaces via `@worldloom/world-index` public types after ticket 001. Adjudications use a simpler shape — currently ad-hoc per canon-addition's template; ticket 001's interface-addition scope does not cover this. This ticket introduces a lightweight `AdjudicationFrontmatter` interface colocated with the op module.
3. Shared boundary: world-index parses hybrid files in its lexical-plus-structured pipeline (`tools/world-index/src/parse/markdown.ts` handles frontmatter + body splitting). The engine writes hybrid files via direct file I/O without reading back through world-index's parser — composition is forward-only (frontmatter YAML + `---\n` + body markdown). Post-apply `world-index sync` (ticket 006) re-parses the new file into the index.
4. FOUNDATIONS principle under audit: **Rule 6 No Silent Retcons** remains enforced via engine-layer append-only discipline; hybrid files are per-file new writes (`append_*`), never in-place edits. There is no `update_character_record` or `replace_character_dossier` op.
5. Schema extension posture: the `AdjudicationFrontmatter` interface is new in this ticket (colocated with the op) rather than in world-index/types.ts. Rationale: adjudications are authored exclusively by canon-addition; no validator or MCP tool currently reads their frontmatter as a typed surface, so the interface's natural home is the op that emits it. If SPEC-04 validators later need to type adjudications, the interface can move to world-index as a follow-up ticket.

## Architecture Check

1. Separate file per op matches tickets 002/003 decomposition; each hybrid-file op is independently testable.
2. Hybrid-file ops use `op.target_file` (a full path) rather than a derived path. SPEC-03 spec line 135 declares `target_file?: string` for hybrid-file ops; this is the path the submitting skill provides (e.g., `characters/<slug>.md`) — the engine resolves it relative to `worldRoot/worlds/<target_world>/` and refuses path traversal. Skills are trusted to own the slug; the engine only validates that the resolved path falls under the expected sub-directory.
3. Anchor-checksum retention per SPEC-03 lines 192–198: each hybrid-file op accepts `expected_anchor_checksum?` alongside `expected_content_hash?`. The checksum is computed over the body prose only (after frontmatter); atomic-record ops do not populate this field (they use `target_record_id` instead).
4. No backwards-compatibility aliasing/shims introduced. Pre-SPEC-13 hybrid-file ops retained their names per SPEC-03 line 67 (they are NOT in the retired-ops list); the semantics are preserved.

## Verification Layers

1. Each hybrid-file op produces a well-formed `---\n<frontmatter>\n---\n<body>\n` file -> unit test (ticket 008 reads the written file back, splits on `---` fences, parses frontmatter YAML, verifies body equals the input markdown).
2. Each op refuses to overwrite an existing file at the target path -> unit test (ticket 008 pre-creates the target file; op returns `{code: 'file_already_exists'}`).
3. Path traversal is rejected -> unit test (ticket 008 submits `target_file: '../../etc/passwd'`; op returns `{code: 'target_file_outside_world'}`).
4. Anchor checksum mismatch on hybrid files triggers `anchor_drift` -> ticket 009 end-to-end test (apply a plan whose hybrid file was mutated between authoring and submission).

## What to Change

### 1. Create `tools/patch-engine/src/ops/append-adjudication-record.ts`

Export `stageAppendAdjudicationRecord(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_adjudication_record'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.target_file` against `<worldRoot>/worlds/<target_world>/`; reject if the resolved path escapes the world root OR does not begin with `adjudications/`.
- Reject if a file already exists at the resolved path (`file_already_exists` error).
- Compose content: `---\n` + `serializeStableYaml(op.payload.adjudication_frontmatter)` + `\n---\n` + `op.payload.body_markdown` + `\n`.
- Stage temp-file at `<resolved>.patch-engine.<plan_id>.tmp`.

Also export `AdjudicationFrontmatter`:

```typescript
export interface AdjudicationFrontmatter {
  id: string;                          // PA-NNNN
  verdict: string;                     // e.g., "ACCEPT_WITH_REQUIRED_UPDATES"
  date: string;                        // YYYY-MM-DD
  originating_skill: string;
  change_id?: string;                  // CH-NNNN on accept outcomes
  mystery_reserve_touched?: string[];
  invariants_touched?: string[];
  cf_records_touched?: string[];
  open_questions_touched?: string[];
}
```

### 2. Create `tools/patch-engine/src/ops/append-character-record.ts`

Export `stageAppendCharacterRecord(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_character_record'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.target_file`; reject if path does not begin with `characters/` or escapes world root.
- Reject if file already exists.
- Payload shape: `{char_record: CharacterDossier, body_markdown: string, filename: string}` per SPEC-03 spec line 96.
- Compose `---\n` + stable-YAML frontmatter + `\n---\n` + body + `\n`; stage temp-file.

### 3. Create `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts`

Export `stageAppendDiegeticArtifactRecord(env: PatchPlanEnvelope, op: PatchOperation & {op: 'append_diegetic_artifact_record'}, ctx: OpContext): Promise<StagedWrite>`. Steps:
- Resolve `op.target_file`; reject if path does not begin with `diegetic-artifacts/` or escapes world root.
- Reject if file already exists.
- Payload shape: `{da_record: DiegeticArtifactFrontmatter, body_markdown: string, filename: string}` per SPEC-03 spec line 97.
- Compose and stage as above.

### 4. Shared path-resolution helper

Export `resolveHybridFilePath(worldRoot: string, worldSlug: string, targetFile: string, expectedPrefix: string): string | {code: string; detail: string}` from `src/ops/types.ts` (already introduced in ticket 002). Shared by all three hybrid-file ops for path-traversal rejection + sub-directory validation.

## Files to Touch

- `tools/patch-engine/src/ops/append-adjudication-record.ts` (new)
- `tools/patch-engine/src/ops/append-character-record.ts` (new)
- `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts` (new)
- `tools/patch-engine/src/ops/types.ts` (modify — add `resolveHybridFilePath` helper; already introduced in ticket 002)

## Out of Scope

- Create ops (ticket 002).
- Update/append atomic-record ops (ticket 003).
- Anchor-checksum verification against the target file's current state — that is the orchestrator's Phase A step 3 responsibility in ticket 006. This ticket's ops stage the write; the orchestrator performs the pre-apply drift check.
- Mutation of existing hybrid files (e.g., in-place edit of a character dossier) — SPEC-03 §Out of Scope line 306 (post-reassessment spec) lists these as future work; no `update_character_record` op exists.
- `AdjudicationFrontmatter` migration to `tools/world-index/src/schema/types.ts` — only if a future validator needs it; not in this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with all 3 new files compiled.
2. `grep -c "^export function stageAppend" tools/patch-engine/src/ops/append-adjudication-record.ts tools/patch-engine/src/ops/append-character-record.ts tools/patch-engine/src/ops/append-diegetic-artifact-record.ts` returns 3.
3. `grep -c "^export function resolveHybridFilePath\|^export interface AdjudicationFrontmatter" tools/patch-engine/src/ops/types.ts tools/patch-engine/src/ops/append-adjudication-record.ts` returns 2.

### Invariants

1. Each hybrid-file op rejects path-traversal inputs (resolved path must fall under `<worldRoot>/worlds/<target_world>/`).
2. Each hybrid-file op rejects writes to paths outside its expected sub-directory prefix (`adjudications/`, `characters/`, `diegetic-artifacts/`).
3. Each hybrid-file op rejects overwrites (per-file artifacts are append-only at the filesystem level).
4. Composed content uses exactly the `---\n<frontmatter>\n---\n<body>\n` layout; trailing newline preserved.
5. `AdjudicationFrontmatter` field names use the canonical forms from SPEC-04's `adjudication_discovery_fields` validator (`mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`) per `specs/SPEC-04-validator-framework.md` line 91 — ad-hoc names like `Critics dispatched` or `New CF` are rejected at type level.

## Test Plan

### New/Modified Tests

1. `None — op modules only; behavioral testing consolidated in ticket 008 (per-op unit tests with fixture before/after snapshots).`

### Commands

1. `cd tools/patch-engine && npm run build` (targeted: confirms all 3 hybrid-file op modules + helper compile).
2. `grep -c "target_file" tools/patch-engine/src/ops/append-*.ts` should equal 3 (confirms all three use `target_file`, not `target_record_id`).
3. `grep -c "expected_anchor_checksum" tools/patch-engine/src/ops/append-*.ts` should equal ≥0 — anchor-checksum verification is delegated to the orchestrator; op modules accept the field on the input type but do not check it themselves.
