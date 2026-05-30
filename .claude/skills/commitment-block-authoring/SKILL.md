---
name: commitment-block-authoring
description: "Use when creating compact reusable commitment blocks (SLT records) for the author pool of a branching-story bundle. Two modes: direct_batch (fresh batch addressing coverage gaps) or audit_repair (consumes RSP cards from branching-story-health-audit). Produces: SLT-<integer> records via patch engine + storylet-batches/SLB-<integer>.md batch manifest + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: mode
    description: "direct_batch | audit_repair. direct_batch creates a fresh batch addressing coverage gaps in the current SLT pool. audit_repair consumes RSP-<integer> cards from a named branching-story-health-audit report."
    required: true
  - name: target_count
    description: "direct_batch only — integer; default 6, max 12. Number of SLT records to create. Matches bootstrap's minimal-seed growth increment."
    required: false
  - name: focus
    description: "direct_batch only — natural-language hint guiding which move families / action families the batch should emphasize (e.g., 'post-violence recovery', 'investigation coverage'). The Phase 4 diversity gate enforces minimum spread regardless."
    required: false
  - name: audit_id
    description: "audit_repair only — SAU-<integer> of the source branching-story-health-audit report supplying the RSP cards."
    required: false
  - name: finding_ids
    description: "audit_repair only — list of RSP-<integer> ids to address. One SLT block is created per RSP card; cards with repair_kind != commitment_block are skipped with a sibling-handoff recommendation."
    required: false
---

# Commitment Block Authoring

Create compact reusable commitment blocks (`SLT` records) for the author pool of a branching-story bundle — causal moves with preconditions, beats, effects, exit options, and saliency, NOT dramatic acts or arcs.

<HARD-GATE>
Do NOT write `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-<integer>.md` or update `worlds/<world_slug>/stories/<story_slug>/INDEX.md`, AND do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, until:

(a) Pre-flight Check has completed:

- bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`;
- mode validated;
- for `direct_batch`: latest committed parent `PG-<integer>` resolved; pool-wide SLT inventory loaded as projection records keyed by `move_family`, the dotted `grounding.compatible_turn_drivers` response key, and the parent objects needed to compute predicate-class and action-family coverage for Phase 1 coverage-gap diagnosis (full retrieval call: see `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 4); when existing-block mutation planning is in scope, per-page eligibility shortlist additionally loaded for `replace` / `extend` mutation targeting (full retrieval call: see `references/pre-flight-and-prerequisites.md` §Pre-flight Check step 4);
- for `audit_repair`: audit + RSP cards loaded from `audits/<audit_id>-*.md` + `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`;
- active STCHAR summaries loaded from `story_bundle_context.active_story_characters`; full/projected STCHAR sections retrieved via `mcp__worldloom__get_record(record_id='STCHAR-<integer>', section_path='body.<section-name>')` when a block's eligibility, beats, effects, pressure behavior, relationship conduct, persona, or voice depends on a specific character;
- SLT ids and one SLB id allocated via `mcp__worldloom__allocate_next_id`;
- per-block firewall authority loaded whole-class via `mcp__worldloom__list_records(record_type='invariant_record', include_full_body=true)` (world INV bodies) and `mcp__worldloom__list_records(record_type='mystery_record', include_full_body=true)` (forbidden Mystery Reserve bodies) — this is unconditional, because `get_context_packet` returns these classes at `"reserve"` priority (no bodies) for this task type;
- world canon context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='commitment_block_authoring', ...)` for governing rules, seed-graph context, and the `story_bundle_context` surface.

(b) Phases 1-5 have completed in working memory: coverage gaps diagnosed (`direct_batch`) OR RSP cards loaded with non-commitment-block `repair_kind` cards skipped (`audit_repair`); per-block drafts authored per shared contract §4.4 schema + §5 predicate DSL, with STCHAR-conditioned eligibility following the Character-Fit Selection Contract branch-scope discipline; 6-gate per-block validation complete (schema completeness, predicate parse, branch-scope legality including STCHAR exact-id limits, mystery/invariant firewall, effect legality, exit-option grounding); 4-check batch-diversity validation complete (`direct_batch` only — move-family diversity, recovery coverage, belief-or-relationship coverage, no branch-local dependencies in global-author-pool blocks); SLB-<integer> batch manifest drafted.

(c) The user has explicitly approved the deliverable summary (mode + source, SLT inventory by move_family, per-block one-line summary, per-block validation traces, batch-diversity result for `direct_batch`, skipped RSP cards for `audit_repair`, SLB manifest preview).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  validate mode; load current SLT pool [direct_batch] OR RSP cards
  [audit_repair]; allocate SLT + SLB ids; load world canon context
  packet)
        |
        v
Phase 1: Diagnose coverage gaps (direct_batch) OR load RSP cards
                                (audit_repair)
        |
        v
Phase 2: Draft commitment blocks against gaps / RSP cards
        |
        v
Phase 3: Per-block validation (6 gates per shared contract §4.4 + §5)
        |
        v
Phase 4: Batch-diversity validation (direct_batch only; 4 checks)
        |
        v
Phase 5: Author SLB-<integer> batch manifest
        |
        v
Phase 6: HARD-GATE fires → atomic patch (create_slt_record per block)
                          + SLB manifest write + INDEX update
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `mode` — enum — `direct_batch | audit_repair`

### Mode-specific

For `direct_batch`:

- `target_count` — integer; default `6`, max `12`. Number of new SLT records to create.
- `focus` — optional natural-language hint guiding move-family / action-family emphasis.

For `audit_repair`:

- `audit_id` — `SAU-<integer>` of the source health-audit report.
- `finding_ids` — list of `RSP-<integer>` ids to address.

## Output

- `SLT-<integer>` records — Always (`target_count` for `direct_batch`; `len(finding_ids)` minus skipped RSP cards for `audit_repair`); written via `create_slt_record` patch op
- `storylet-batches/SLB-<integer>.md` — Always (batch manifest; direct-write markdown after patch submission)
- Bundle `INDEX.md` — Always (updated last)

All SLT records in a batch share the same `provenance.origin` value: `author_batch` for `direct_batch`, `audit_repair` for `audit_repair`. The other valid `provenance.origin` values (`bootstrap_seed`, `manual_authoring`, `runtime_jit`) are reserved for bootstrap, one-off manual authoring, and turn-cycle's inlined JIT block creation.

## Procedure

1. Pre-flight: load FOUNDATIONS + shared contract, resolve bundle, validate mode, load SLT inventory or RSP cards, allocate IDs, then load story-local context and the world canon packet. Load `references/pre-flight-and-prerequisites.md` for the World-State Prerequisites list and the 6 pre-flight steps.

2. Phase 1: diagnose coverage gaps (`direct_batch`) or load RSP cards (`audit_repair`). Load `references/phase-1-coverage-diagnosis.md` for the 17 coverage targets, predicate-selection rules, and per-mode output shapes.

3. Phase 2: draft commitment blocks against gaps / RSP cards. Load `references/phase-2-draft-blocks.md` for the SLT skeleton, predicate-DSL discipline, alias-binding rules, beat discipline, schema-minimalism rules, and the `allowed_authority` default heuristic.

4. Phases 3-4: per-block validation (6 gates) and batch-diversity validation (4 checks, `direct_batch` only). Load `references/phase-3-4-validation.md`. `audit_repair` runs Phase 3 only.

5. Phase 5: author the SLB-<integer> batch manifest content in working memory (no disk write yet; the manifest writes at Phase 6 step 6 after HARD-GATE approval). Load `references/phase-5-batch-manifest.md` for the manifest template.

6. Phase 6: Commit / Write — HARD-GATE fires.

   1. Build the patch plan covering all surviving SLT records as a single envelope: one `create_slt_record` op per block. Each op requires a `target_file` field naming the on-disk write path (`worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-<integer>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` for the full envelope and per-op payload schemas, or invoke `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` at pre-flight for the machine-readable shape. For a copy-pasteable, validate-clean envelope skeleton — fixing the three values the schema alone does not prescribe (`verdict: "approve"`, the `approval_token: "PENDING"` dry-run placeholder, and `expected_id_allocations: { slt_ids: [...] }` with **no** `slb_ids` entry) — load `references/phase-6-envelope-skeleton.md`.
   2. Dry-run via `mcp__worldloom__validate_patch_plan` (exercises `record_schema_compliance` for each SLT record). **Validate-path selection by envelope shape**: commitment-block-authoring envelopes are built from disk YAML files by construction, and inline JSON pasted into the MCP tool call is a separate buffer from `envelope.json` on disk — any divergence between the two produces a dry-run that passes the inline version while the disk version is what actually submits. For any envelope whose JSON exceeds a few KB the inline-paste-drift risk is real; prefer the equivalent CLI path that reads `envelope.json` directly: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js [--world-root <path>] <plan-path>`. The CLI path is functionally equivalent — same engine code, same `{ status, verdicts, validators_run }` response shape, same validator coverage — and is the dry-run analogue of the submit-path CLI named in step 5. The CLI path also serves as the fresh-process escape valve when the running MCP server holds a pre-rebuild `@worldloom/validators` bundle in memory. It resolves the world root by explicit flag, `WORLDLOOM_ROOT`, then marker auto-discovery from cwd. Like the submit-path and sign-path CLIs documented at sub-step 5 below, `validate-patch-plan.js` emits the `[world-root]` trace to stderr on success; when piping its stdout to `jq` or another JSON consumer, redirect stderr separately (`2>/dev/null` or `2>err.log`) rather than combining with `2>&1`, which contaminates the JSON parse. See `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan and `docs/MACHINE-FACING-LAYER.md` §troubleshooting matrix for the equivalent submit-path treatment.
   3. Present the complete deliverable summary to the user:
      - Mode + source (focus hint OR audit_id + finding_ids).
      - SLT inventory by `move_family` value (Phase 1 + Phase 4 diagnosis preserved).
      - Coverage-depth signal (`direct_batch`): any targets reported **under-represented** (covered but `soft_only` with an active triggering class, or single-block coverage of a high-salience active lane — see `references/phase-1-coverage-diagnosis.md` §Grounding-strength and under-representation), and — when the pool is target-saturated with no `focus` hint — the **pool-saturation advisory** recommending a `focus` hint or reduced `target_count`. Label each authored block as an absent-target fill vs. an under-representation addition (criterion `(a)` / `(b)` / cast-role gap) vs. a depth addition (`action_family_combo` / `specific_pressure_shape` / `single_block_move_family` / `action_family_single_block` / `paired_pressure_shape` / `hard_grounding_lane`), or — when none apply — explicitly flag the block as `no documented lane; authorial judgment` and state the rationale. The depth-criteria lane vocabulary is enumerated at `references/phase-1-coverage-diagnosis.md` §Depth-criteria checklist for saturated-pool authoring.
      - Per-block one-line summary (id, move_family, title, beat count, exit-option count).
      - Per-block validation trace (6 gates → PASS / rationale).
      - Batch-diversity validation result (`direct_batch` only).
      - Any skipped RSP cards (`audit_repair` only, with `repair_kind` + recommended sibling + skip reason).
      - The SLB manifest path + contents preview.
   4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
   5. On approval:
      - **Persist and sign**: persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`); invoke the canonical signer to issue the `approval_token` via `node tools/world-mcp/dist/src/cli/sign-approval-token.js [--world-root <path>] <plan-path>` (see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token). Persist the signed token to a text file for the submit CLI's `<token-path>` argument. Like `submit-patch-plan.js`, `sign-approval-token.js` emits a `[world-root]` trace to stderr that contaminates `> file 2>&1` capture, so redirect stderr separately: `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path> 2>/dev/null > <token-path>`. Then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Approval tokens are single-use, plan-bound, default-20-minute-expiry.
      - **Submit-path selection by envelope size**: commitment-block-authoring envelopes scale with batch size (one `create_slt_record` op per block; a `standard` 8-14-block batch is typically 15-30KB, but `audit_repair` batches consuming many RSP cards or `direct_batch` calls authoring widely-cast SLTs may exceed 50KB). For envelopes >50KB submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js [--world-root <path>] <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Validating and submitting the plan. For sub-50KB envelopes where the dry-run was CLI-routed (sub-step 2's default for any envelope exceeding a few KB), submitting via the same CLI path is the sanctioned consistency pattern — both the dry-run and the submit consume the same `envelope.json` on disk, eliminating any buffer-paste-drift surface. MCP submit at sub-50KB is also lawful and faster for routine cases; the choice is operator preference.
      - **Reading CLI output**: the CLI submit emits a `PatchReceipt` to **stdout** on success (exit code 0) and an `[world-root] ...` trace plus `EngineError` / `McpError` object to **stderr** on failure (exit code 1) — confirmed by `tools/world-mcp/src/cli/submit-patch-plan.ts` stream separation. The success-case JSON is a `PatchReceipt` with NO `ok` field; it starts with `plan_id`, `applied_at`, `files_written`, etc. The failure-case JSON has `ok: false` and `code: ...` after the trace. The success/fail discriminator is exit code OR stream separation OR top-line key presence (`plan_id` on success vs `code` / `ok: false` on failure) — NOT the absent-on-success `ok` field. Inspect success via `echo $?`, `jq -r .plan_id` (returns the plan id on success, `null` on failure), or capture stdout and stderr to separate buffers. Do not use `jq -r .ok` for success detection — the missing key returns `null`, which an operator may misread as a failure signal. Validator-PASS rows appear in both success and pre-apply-failure responses, so do not tail-truncate the output and infer status from the validator dump alone; the top-line keys (or the exit code) are the discriminator.
      - **Replay protection**: if the success header may have been missed, do not re-run submit just to recover a receipt. Reusing the same consumed token returns `approval_replayed`; a genuinely fresh token over an already-applied plan is not the replay gate and may attempt duplicate writes or hit later engine protections — inspect the target story `_source/` records and receipt/log output before any further submit attempt.
   6. On patch success: write the markdown artifacts in shared contract §10 write order: `storylet-batches/SLB-<integer>.md` → update bundle `INDEX.md`. Create `storylet-batches/` if it does not already exist (idempotent `mkdir -p` — `branching-story-bootstrap` does not pre-create the directory, so the first SLB write in a bundle's lifetime needs to make it). INDEX.md update shape per shared contract §10: append a row per new SLT to the bundle's `## Commitment Block Pool` table (columns: SLT id, title, move_family, compatible_turn_drivers); also extend the `## Commitment Block Pool` descriptor line above the table to catalog the new batch's SLT id range and SLB id. The descriptor line takes the form: `` All `global_author_pool`. SLT-<lo>..<hi> are `bootstrap_seed`; SLT-<lo>..<hi> are `author_batch` (SLB-N); ... `` — `branching-story-bootstrap` initializes it with the bootstrap-seed range, and each subsequent batch's authoring step appends `` ; SLT-<new-lo>..<new-hi> are `author_batch` (SLB-<new>) `` to the existing descriptor line. This keeps the descriptor metadata consistent with the table content. Worked example (red-bunny SLB-4): the line before SLB-4 reads `` All `global_author_pool`. SLT-1..7 are `bootstrap_seed`; SLT-8..13 are `author_batch` (SLB-1); SLT-14..19 are `author_batch` (SLB-2); SLT-20..25 are `author_batch` (SLB-3). ``; after SLB-4 it reads `` ... SLT-20..25 are `author_batch` (SLB-3); SLT-26..31 are `author_batch` (SLB-4). ``. Then add a `## Storylet Batches` section (or append to it when it already exists) with a row per new SLB manifest (columns: SLB id, mode, records, manifest path). Match the table conventions established at bundle bootstrap; `branching-story-bootstrap` is the canonical INDEX initializer.
   7. Report SLT ids + SLB id + bundle INDEX state to the user. Do NOT `git commit`.

   **Failure behavior**: patch fail → write nothing; surface the failed per-block gate and corrective action. Patch success + markdown fail → story-bundle `_source/` records authoritative; the SLB manifest can be repaired directly; surface partial-failure to user. Per-block rejections in Phase 3 → blocks removed from batch with logged reason; surface the per-block rejection summary at sub-step 3 even on overall success.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md` (canonical prose form); the machine-readable JSON Schema for the SLT body is also retrievable via `mcp__worldloom__get_record_schema(node_type='storylet_record')`, parallel to how Phase 6 sub-step 1 retrieves the envelope shape via `describe_envelope_schema`:

- `SLT` (§4.4) — commitment block schema (this skill's primary output).
- Predicate DSL (§5) — closed predicate language for `preconditions.hard | soft`, including the existential predicates and `bound:<alias>` effect references.
- The SLB manifest is a markdown direct-write artifact (not an atomic `_source/` record); its shape is defined inline in this skill's `references/phase-5-batch-manifest.md` template.

For per-predicate arg-name lookup when authoring a predicate without an in-pool exemplar, `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` returns a `referenced_schemas` payload that includes `predicate-dsl-grammar.schema.json`, which enumerates each predicate's `required` field list (e.g., `record_age` requires `record` / `comparator` / `pages`) and per-arg JSON Schema.

## FOUNDATIONS Alignment & Guardrails

Load `references/governance-and-foundations.md` for the full FOUNDATIONS alignment table and the complete Guardrails list.

Load-bearing guardrails to keep in mind during execution:

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle SLTs under `worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-*.yaml` are the exclusive write surface, routed through the patch engine.
- **Never write rendered prose.** Commitment-block-authoring writes record schemas, not narrative text. Beat instructions are inputs to the external renderer later.
- **Commitment blocks are causal moves, not dramatic acts.** Schema explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version > 1`, and `shape:` discriminators (Phase 3 gate 1 enforces).
- **Predicate DSL is closed** (per shared contract §5). No free-form predicate prose; every `bound:<alias>` reference must be backed by a same-block existential predicate.
- **STCHAR is story-local character authority, not a new predicate family.** Follow the Character-Fit Selection Contract for exact-STCHAR predicate discipline; do not invent persona-state predicates.
- **Skills do not chain.** This skill never invokes turn-cycle, prose-attach, health-audit, story-fact-promotion, or story-promotion-closeout. When `audit_repair` skips a non-commitment-block RSP card, the SLB manifest records the sibling-handoff recommendation for the user to invoke separately.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.

## Final Rule

Commitment-block-authoring creates compact reusable causal moves — preconditions, beats, effects, exit options, saliency — and rejects every legacy field (`arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, shape discriminators) at schema completeness; blocks are not acts, arcs, or mini-stories.
