<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-32 — Story Contract Hardening IV

**Status**: PROPOSED
**Date**: 2026-05-15
**Supersedes**: none (extends `archive/specs/SPEC-31-story-contract-hardening-iii.md` D10 and D14 — see §Cross-iteration context)
**Companion triage**: `docs/triage/2026-05-15-story-related-improvements-sixth-iteration-triage.md`

## Problem Statement

`reports/story-related-improvements-sixth-iteration.md` is the sixth external review (ChatGPT-Pro, no codebase access) of the branching-story pipeline. It evaluated 8 numbered findings (1 P0, 4 P1, 3 P2) plus 5 proposed amendments (A1–A5), a 28-item validator/test plan (§8), and a no-redesign anti-recommendations list (§10). The corpus was limited to `docs/FOUNDATIONS.md` + the four shared contract docs (`docs/CONTEXT-PACKET-CONTRACT.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and the shared story-state contract uploaded under `_shared-templates/`) + the seven story-pipeline SKILL.md files. No code, schemas, validators, patch-engine ops, MCP retrieval code, fixtures, or tests were inspectable.

Codebase verification reframed two findings: F1 ("implementation evidence gap" — P0, framed as production-blocking) is REFUTED — actual implementation exists (`tools/validators` ships 45 test files, `tools/patch-engine` ships 26 test files plus all required story-record ops in `tools/patch-engine/src/ops/create-story-record.ts`, `tools/world-mcp` ships 70 test files plus `get_firewall_content` / `get_context_packet` / `get_record` / `get_records` registered tools). F8 (`reports/prose-quality-instructions.md` missing) is REFUTED — the file exists at that exact path. Both findings are upload-limitation artifacts, not codebase gaps.

The remaining six findings hold up under codebase verification: F2/A1 (prose-attach references a Mystery Reserve field `denial_patterns` that exists nowhere in the codebase), F3/A2 (turn-cycle pre-flight seed-node wording is ambiguous about story-local vs world-scope IDs), F4/A3 (closeout FOUNDATIONS Alignment row contradicts the Pre-flight retrieval discipline), F5/A4 (page-plan markdown is written after PG commit without post-write hash re-verification before INDEX update), F6/A5 (eight-gates scope wording is broad enough to mislead non-PG implementers), F7 (stale MCPENH/PEENH/VALENH integration-debt notes in 4 of 7 skills).

Six findings reach this spec as D1–D6. F1 and F8 are noted as refuted in the companion triage with no spec action. The verification surfaced no substantive out-of-report findings.

Production-readiness window remains pre-greenfield: zero `_source/` story bundles exist in the repository. The blast radius (mapped via parallel verification) touches the seven story-pipeline skills and the shared story-state contract; no schema-field additions, no patch-engine op changes, no MCP retrieval surface changes, and no migration of existing story bundles are required.

### Key design decisions

- **Considered adding a `denial_patterns` field to the Mystery Reserve schema so prose-attach's existing wording would become implementable; chose to delete the wording and derive deterministic patterns from existing firewall fields (`disallowed_cheap_answers[]`, `unknowns[]`, plan §11 `forbidden_resolutions[]`) instead, because FOUNDATIONS Rule 5 (no fields without mechanical consumers) forbids adding a schema field whose only consumer is a single deterministic check.** The existing firewall fields are sufficient: each `disallowed_cheap_answers[]` entry already names an exact resolution string the prose must not assert, and `unknowns[]` plus plan §11 already enumerate the protected questions.

- **Considered making D2 (turn-cycle pre-flight seed resolution) a skill-side preflight check that rejects story-local seed IDs before the MCP call; chose to make it a prose discipline that requires resolving STENT/STLOC to world-scope ENT/CHAR/SEC IDs before invoking `get_context_packet`, because SPEC-31 D14 already added the MCP-server-side `story_local_seed_nodes_ignored` warning** (verified at `tools/world-mcp/src/tools/get-context-packet.ts:29-40`). A skill-side prefilter would duplicate the server check; the documented prose discipline is the missing piece. The warning becomes the audit trail when a future caller skips the discipline.

- **Considered extending `tools/world-mcp/src/cli/compute-pg-hashes.ts` with a `--verify` subcommand for D4's post-write hash check; chose to use the existing CLI directly (skill invokes the existing CLI on the written file, compares the returned `plan_hash` to the committed `PG.plan.plan_hash`), `(pragmatic)` because the existing tool already emits the hash and the comparison is a one-line skill prescription.** A `--verify` subcommand is structurally cleaner (single CLI call with exit-code semantics) but would require a tool change plus its own CI test; using the existing CLI keeps the change boundary inside the skill prose plus a fixture-driven validator test. Under no-blast-radius-constraint conditions, the `--verify` subcommand likely wins.

- **Considered grouping F7 (integration-debt-note reconciliation) as a janitorial sweep "after code inspection"; chose to make it a per-ticket-ID reconciliation pass that names each MCPENH/PEENH/VALENH ID currently referenced and prescribes the explicit "still open" / "now landed" / "superseded" verdict per ID**, because the existing notes already mix "Now landed" markers with open references (e.g., `story-promotion-closeout/SKILL.md` declares PEENH-007 "Now landed" while sibling skills still flag the same ID as open debt). A blanket sweep without per-ID adjudication risks repeating the same drift.

- **Considered splitting this spec into SPEC-32 (P1, four deliverables) and SPEC-33 (P2, two deliverables); chose a single SPEC-32 covering all six because the P2 items are small** (D5 is a two-paragraph wording sharpening, D6 is a per-skill audit of named ticket IDs with no schema implications) and the verification context is freshest now. If the implementer prefers reviewer-grain finer than spec-grain, each deliverable is independent enough to land as its own ticket.

---

## Approach

Each deliverable targets a single named contradiction, drift, or stale reference. None of the six requires a new schema field, a new patch-engine op, a new MCP retrieval surface, or a new validator-rule. D4 adds one new fixture-driven validator test pattern (`plan_hash_postwrite_mismatch`) by exercising the existing `compute-pg-hashes.ts` CLI from a skill-prescribed shape; D1, D2, D3 each add one fixture-level test on existing structural-validator surfaces; D5 and D6 add no tests.

Cross-iteration discipline: D2 is a skill-prose follow-on to SPEC-31 D14 (the MCP-server warning landed; the skill prose discipline is the next layer). D3 is a residue-cleanup follow-on to SPEC-31 D10 (the Pre-flight prose was converted to MCP retrieval; the FOUNDATIONS Alignment row at line 357 wasn't updated to match). Both relationships are noted in the deliverables and traced in the companion triage.

---

## Deliverables

Deliverables are grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Replace `denial_patterns` with firewall-field-derived patterns in prose-attach (P1, intake F2 / A1)

**Implementation note (2026-05-16)**: `archive/tickets/SPEC32STOCONHAR-005.md` landed the live skill-prose correction by replacing the undocumented `denial_patterns` source in `branching-story-prose-attach` Phase 3 check 3 with firewall-field-derived matching from `get_firewall_content`, `disallowed_cheap_answers[]`, `unknowns[]`, and page-plan §11. The same skill's Rule 7 and Mystery Reserve alignment rows were kept consistent. The accepted proof surface is grep/manual review of the live SKILL.md plus the existing validators package regression check; the validator-fixture directories drafted below remain historical intake context unless a later testing-hardening ticket introduces a structural-validator integration point for this skill-local deterministic check.

**Problem**: `.claude/skills/branching-story-prose-attach/SKILL.md:185` (Phase 3 deterministic check 3) says:

> 3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — regex-scan the prose for surface-level resolutions of any mystery in plan §11 `forbidden_resolutions[]`. Use deterministic patterns derived from each mystery's `denial_patterns` (per the world's Mystery Reserve record format). Any pattern match is `FAIL` and routes to `repair_recommendation: revise_prose`.

The `denial_patterns` field exists nowhere in the codebase:
- Mystery Reserve schema (`tools/validators/src/schemas/mystery-reserve.schema.json`) defines `id`, `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `future_resolution_safety`, `extensions` — no `denial_patterns`.
- `tools/world-mcp/src/tools/get-firewall-content.ts` (the `FirewallContent` interface, lines 14–20) projects `title`, `status`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers` — no `denial_patterns`.
- Existing M records (e.g., `worlds/animalia/_source/mystery-reserve/M-1.yaml`) carry no `denial_patterns` field.
- Repo-wide grep for `denial_patterns` returns matches only in this skill and the archived brainstorm `archive/brainstorming/branching-story-prose-attach.md`.

The deterministic `forbidden_mystery_resolution` check is currently un-implementable as written. Either the field must be added to the schema (which would violate FOUNDATIONS Rule 5 — no fields without mechanical consumers other than this one check) or the wording must be replaced with firewall-field-derived patterns. This spec chooses the latter (see §Key design decisions).

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-prose-attach/SKILL.md` §Phase 3 deterministic check 3, replace line 185 with):

   ```
   3. **`forbidden_mystery_resolution`** (`PASS | FAIL`) — retrieve firewall fields
      for every `M-<integer>` named in plan §11 via
      `mcp__worldloom__get_firewall_content(world_slug, m_ids=<plan §11 ids>)`,
      unless the page plan already inlines the same fields. Derive deterministic
      patterns from `disallowed_cheap_answers[]` (each entry is a forbidden
      resolution string and is compared by case-insensitive substring match) and
      from `unknowns[]` collapsed to plan §11 `forbidden_resolutions[]` (each
      entry names a protected question whose surface-level resolution is
      forbidden).

      Any direct assertion matching a `disallowed_cheap_answers[]` entry is
      `FAIL` and routes to `repair_recommendation: revise_prose`. Cumulative
      semantic narrowing of a protected `unknowns[]` entry that does not match a
      `disallowed_cheap_answers[]` string is recorded as a judgment-assisted
      note in `notes[]` and routed to `branching-story-health-audit`
      mystery-accretion review (see Phase 2e); do not fail the receipt for
      cumulative narrowing alone.

      Do not reference an undocumented `denial_patterns` field; no Mystery
      Reserve schema field by that name exists.
   ```

2. **Archived brainstorm** (`archive/brainstorming/branching-story-prose-attach.md`): leave as-is. Archived brainstorms are historical records; the canonical skill is the live source.

3. **Validator/test** (new fixture-driven test):
   - Add `tools/validators/tests/fixtures/branching-story-prose-attach/disallowed_cheap_answer_match/` with a minimal prose file + plan §11 + M record carrying `disallowed_cheap_answers: ["the king is the murderer"]` + prose asserting "The king is the murderer." The expected receipt has `forbidden_mystery_resolution: FAIL`.
   - Add a sibling fixture `disallowed_cheap_answer_clean/` with the same M record and a prose file that does not match. Expected `forbidden_mystery_resolution: PASS`.
   - The receipt-validator path that interprets the receipt's check result is unchanged; only the fixture coverage is new.

**Files touched**:
- `.claude/skills/branching-story-prose-attach/SKILL.md` (`:185`)
- `tools/validators/tests/fixtures/branching-story-prose-attach/disallowed_cheap_answer_match/` (new)
- `tools/validators/tests/fixtures/branching-story-prose-attach/disallowed_cheap_answer_clean/` (new)

**Verification**:
- Fixture test: prose with disallowed-cheap-answer match → receipt FAIL on `forbidden_mystery_resolution`.
- Fixture test: prose with no match → receipt PASS with one-line rationale referencing the firewall fields consulted.
- Repo-wide grep for `denial_patterns` returns matches only in `archive/brainstorming/` after this lands.

**Migration impact**: None. No production stories exist; no prose receipts are stored.

---

### D2 — Resolve story-local seed IDs to world-scope in turn-cycle pre-flight (P1, intake F3 / A2; follow-on to SPEC-31 D14)

**Problem**: `.claude/skills/branching-story-turn-cycle/SKILL.md:147` (World-State Prerequisites / Pre-flight) says:

> World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', seed_nodes=<active cast + active location + parent's unresolved mystery claims>, token_budget=<default>)`.

The phrases "active cast" and "active location" are ambiguous. In story state, the active cast lives as `STENT` records and the active location lives as `STLOC` records — story-local IDs that the context-packet contract (`docs/CONTEXT-PACKET-CONTRACT.md:157`) and `docs/MACHINE-FACING-LAYER.md` both forbid as `seed_nodes` for story-pipeline task types.

SPEC-31 D14 landed the MCP-server-side defense: when story-local IDs are passed as `seed_nodes` for a story-pipeline task, the packet returns `task_header.warnings: ["story_local_seed_nodes_ignored"]` (verified at `tools/world-mcp/src/tools/get-context-packet.ts:29-40`, regex `STORY_LOCAL_SEED_NODE_PATTERN` matches `STENT|STLOC|SF|BEL|SE|...`). The contract docs were also updated. But the skill prose was not updated to instruct the caller to pre-resolve `STENT.bound_char_id` to world `ENT`/`CHAR` IDs and `STLOC.bound_ent` (or governing SEC/CF ids) to world-scope IDs before the call. The warning currently fires when a turn-cycle skill author misreads "active cast" as "STENT ids."

**Change**:

1. **Skill prose** (`.claude/skills/branching-story-turn-cycle/SKILL.md` World-State Prerequisites bullet, replace line 147 with):

   ```
   World canon context packet via
   `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle',
   story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>,
   token_budget=<default>)`.

   Derive `seed_nodes` from the parent snapshot by resolving story-local state to
   world-scope anchors:
   - active `STENT` → resolved world `CHAR-<integer>` / `ENT-<integer>` ids via
     `STENT.bound_char_id` (when bound to a character) or `STENT.bound_ent_id`
     (when bound to a non-character named entity);
   - active `STLOC` → resolved governing world `SEC-<prefix>-<integer>` /
     `CF-<integer>` / `ENT-<integer>` ids via `STLOC.bound_ent` or
     `STLOC.governing_section_id`;
   - parent's unresolved mystery claims → `M-<integer>` ids from
     `PG.state_snapshot.unresolved_mystery_claims[]`;
   - active-period anchors → `CH-<integer>` / `SEC-<integer>` / `CF-<integer>`
     ids when known.

   Do not pass `STENT`, `STLOC`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`,
   `CNSQ`, `THR`, `SREL`, `STINT`, `STOBJ`, `STSTAT`, `BR`, `SLB`, `SAU`, `SP`,
   or `RSP` ids as context-packet `seed_nodes`; passing any story-local id triggers
   the MCP server's `story_local_seed_nodes_ignored` warning (see
   `tools/world-mcp/src/tools/get-context-packet.ts`) and the seed is discarded.
   Story-local records are loaded through `story_slug` + `story_bundle_context`,
   `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)`, or
   `mcp__worldloom__list_records(record_type=..., story_slug=<story_slug>)`.
   ```

2. **Validator/test** (new fixture exercising the MCP-server contract path):
   - Add `tools/world-mcp/tests/get-context-packet/story_local_seed_warns.test.ts` (or extend the existing test file for `get-context-packet`) covering: `task_type='story_turn_cycle'` + `seed_nodes=['STENT-1']` returns the warning. This test likely already exists from SPEC-31 D14; confirm coverage and only add if missing.
   - Optional: add a doctest-shaped fixture under `tools/validators/tests/fixtures/branching-story-turn-cycle/` if the validator suite covers skill-prose conformance (currently it does not — skill prose is not validator-checked). Skip unless a future ticket adds skill-prose linting.

**Files touched**:
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (`:147`)
- `tools/world-mcp/tests/get-context-packet/story_local_seed_warns.test.ts` (extend or new — depends on SPEC-31 D14 coverage)

**Verification**:
- Re-read of turn-cycle SKILL.md shows the bullet enumerates `STENT`, `STLOC`, `STINT`, `STSTAT`, etc. as forbidden seed types with explicit world-scope resolution instructions.
- MCP test confirms that passing `STENT-<integer>` as `seed_nodes` for `task_type='story_turn_cycle'` emits `story_local_seed_nodes_ignored` and the seed is dropped from the packet.

**Migration impact**: None.

---

### D3 — Fix closeout FOUNDATIONS Alignment retrieval residue (P1, intake F4 / A3; follow-on to SPEC-31 D10)

**Implementation note (2026-05-16)**: `archive/tickets/SPEC32STOCONHAR-004.md` landed this cleanup by replacing the stale `story-promotion-closeout` FOUNDATIONS Alignment Tooling Recommendation row with MCP retrieval wording that matches Pre-flight step 5. The accepted proof surface is grep/manual review of the live SKILL.md; the optional validator-fixture idea below remains historical intake context because this is a skill-prose pre-flight contract, not a structural-validator surface.

**Problem**: `.claude/skills/story-promotion-closeout/SKILL.md` contains two passages whose retrieval semantics contradict:

- Pre-flight (`:48` HARD-GATE list, `:154` Pre-flight step 5): "linked CF / CH / PA records existence-verified through MCP retrieval" — invokes `mcp__worldloom__get_records(record_ids=<linked_cf_ids + linked_ch_ids>)` and `mcp__worldloom__get_record(record_id=<linked_pa_id>)`.
- FOUNDATIONS Alignment / Tooling Recommendation row (`:357`): "Linked canon-addition records loaded via **direct file reads** (CF / CH / PA paths); no `get_context_packet` retrieval needed since closeout works against direct record paths."

The Pre-flight wording is correct (SPEC-31 D10 converted Phase 1 / pre-flight to MCP retrieval). The FOUNDATIONS Alignment row is residue from before D10 — it was not updated when the Pre-flight prose was rewritten. The phrasing "direct file reads" reads naturally as filesystem reads of `_source/canon/CF-<integer>.yaml` etc., which is exactly what SPEC-31 D10 rejected. Future implementers reading the FOUNDATIONS Alignment table for the canonical retrieval shape will see the wrong wording.

FOUNDATIONS.md §Tooling Recommendation requires MCP retrieval for story-pipeline skills reading world-canon (the row at `:528`: "Story-pipeline skills (Skill Category 2c) depend on this same MCP retrieval surface for world-canon reads"). Closeout is the defense against fake canon-addition outputs; a documentation loophole authorizing filesystem reads weakens that defense.

**Change**:

1. **Skill prose** (`.claude/skills/story-promotion-closeout/SKILL.md` FOUNDATIONS Alignment table, replace the Tooling Recommendation row at line 357 with):

   ```
   | Tooling Recommendation | Linked canon-addition records are loaded read-only
   through `mcp__worldloom__get_records(record_ids=<linked_cf_ids +
   linked_ch_ids>, world_slug=<world_slug>)` and per-PA
   `mcp__worldloom__get_record(record_id=<linked_pa_id>,
   world_slug=<world_slug>)`. No `get_context_packet` retrieval is needed
   because the accepted-output ids are known. Direct filesystem reads of
   `_source/canon/`, `_source/change-log/`, or `adjudications/` are not used for
   linked-output verification (see Pre-flight step 5). |
   ```

2. **No FOUNDATIONS.md change** — FOUNDATIONS already requires MCP retrieval for story-pipeline skills (`:528`); no amendment needed.

3. **Validator/test** (new fixture-driven test): `tools/validators/tests/fixtures/story-promotion-closeout/linked_record_not_found/` covers the case where one of `linked_cf_ids` cannot be retrieved via `get_records` (e.g., references `CF-999` that doesn't exist). Expected behavior: closeout aborts with a `linked-record-not-found` error before any patch plan is built or submitted. This test likely already exists from SPEC-31 D10; confirm coverage and only add if missing.

**Files touched**:
- `.claude/skills/story-promotion-closeout/SKILL.md` (`:357`)
- `tools/validators/tests/fixtures/story-promotion-closeout/linked_record_not_found/` (extend or new — depends on SPEC-31 D10 coverage)

**Verification**:
- Re-read of closeout SKILL.md shows the FOUNDATIONS Alignment row prescribes MCP retrieval.
- Repo-wide grep for `direct file reads` in `story-promotion-closeout/` returns no matches after this lands.
- Fixture test confirms the abort path on missing linked CF / CH / PA.

**Migration impact**: None.

---

### D4 — Add post-write plan-hash verification in bootstrap and turn-cycle (P1, intake F5 / A4)

**Implementation note (2026-05-16)**: `archive/tickets/SPEC32STOCONHAR-002.md` landed the D4 contract through shared story-state contract §10 step 5a, matching Phase 10 prose in `branching-story-bootstrap` and `branching-story-turn-cycle`, and `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`. The codebase-aligned proof surface is the existing `compute-pg-hashes` CLI test, not the validator fixture directories drafted below; the fixture references remain historical intake context unless a later testing-hardening ticket introduces a validator integration point for skill prose.

**Problem**: The PG record's `plan.plan_hash` is computed over the future page-plan bytes during Phase 9 (validation) and committed when the patch plan is accepted (Phase 10). The page-plan markdown is then written directly to `pages-prose-plans/PG-<integer>.md`. The shared write order at `.claude/skills/_shared-templates/story-state-contract.md` §10 specifies:

> 1. Build patch plan for story-bundle _source/<class>/*.yaml records
> 2. Dry-run validate via mcp__worldloom__validate_patch_plan
> 3. Obtain approval token when execution mode requires it
> 4. Submit patch plan via mcp__worldloom__submit_patch_plan
> 5. Write direct-markdown artifacts: page plan (pages-prose-plans/PG-<integer>.md)
> 6. Update bundle INDEX.md last

Between steps 5 and 6 there is no re-hash verification. If a formatting glitch, encoding anomaly, editor auto-format, or file-write error changes the page-plan bytes after step 4 (when the PG record committed with its hash), the committed `PG.plan.plan_hash` no longer proves the renderer prompt actually stored. `branching-story-prose-attach` catches the drift later (when prose is attached) at its hash-integrity check, but the bundle `INDEX.md` already advertises the page as healthy.

`compute-pg-hashes.ts` (at `tools/world-mcp/src/cli/compute-pg-hashes.ts`) is the canonical helper used in Phase 9 to compute the hash; it takes the prospective plan file and emits the hash. It has no `--verify` mode — but the skill can invoke the same CLI on the just-written file and compare the emitted hash to the committed `PG.plan.plan_hash`.

Affected skills:
- `branching-story-bootstrap/SKILL.md:370` (Phase 10 final write order): writes `STORY_KERNEL.md` → `pages-prose-plans/PG-1.md` → bundle `INDEX.md`. No re-hash step.
- `branching-story-turn-cycle/SKILL.md:460` (Phase 10): writes `pages-prose-plans/PG-<integer>.md` → bundle `INDEX.md`. No re-hash step.

**Change**:

1. **Shared contract** (`.claude/skills/_shared-templates/story-state-contract.md` §10 write order, insert after step 5 and before step 6):

   ```
   5a. Post-write plan-hash verification. Immediately re-read the bytes of
       `pages-prose-plans/PG-<integer>.md` and recompute its `plan_hash` using
       the canonical helper at `tools/world-mcp/src/cli/compute-pg-hashes.ts`.
       The recomputed `plan_hash` MUST equal the committed
       `PG.plan.plan_hash` (the value the patch plan accepted in step 4) before
       step 6 runs. If the values differ, this is a direct-artifact partial
       failure: do not update `INDEX.md`; surface the mismatch with both the
       committed and recomputed hashes; repair the file to the
       already-approved bytes or re-run approval with the corrected bytes. The
       step 4 patch plan and its committed PG record are unchanged; the disk
       state is being reconciled to them.
   ```

2. **Bootstrap** (`.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10, insert after the `pages-prose-plans/PG-1.md` write and before the bundle `INDEX.md` update):

   ```
   - Post-write plan-hash verification (shared contract §10 step 5a). Run
     `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js
     --plan pages-prose-plans/PG-1.md --state <PG-1 record file>` and confirm
     the emitted `plan_hash` equals the committed `PG-1.plan.plan_hash`. If
     they differ: do not update `INDEX.md`; surface the mismatch and the two
     hashes; treat as a direct-artifact partial failure per HARD-GATE
     discipline (see `docs/HARD-GATE-DISCIPLINE.md`). The patch plan is not
     re-submitted; only the disk artifact is reconciled.
   ```

3. **Turn-cycle** (`.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10, same insertion pattern with `PG-<integer>` substituted).

4. **Validator/test** (new fixture-driven tests):
   - `tools/validators/tests/fixtures/branching-story-bootstrap/plan_hash_postwrite_mismatch/`: simulate a bootstrap dry-run where the page-plan file on disk has been altered after the PG record committed. Expected: post-write verification fails; INDEX.md is not updated.
   - `tools/validators/tests/fixtures/branching-story-turn-cycle/plan_hash_postwrite_mismatch/`: same shape for turn-cycle.
   - Both tests exercise the `compute-pg-hashes.ts` CLI against the canonical plan file and assert the hash inequality is detected before INDEX.md is touched.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§10 write order)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (Phase 10)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (Phase 10)
- `tools/validators/tests/fixtures/branching-story-bootstrap/plan_hash_postwrite_mismatch/` (new)
- `tools/validators/tests/fixtures/branching-story-turn-cycle/plan_hash_postwrite_mismatch/` (new)

**Verification**:
- Bootstrap dry-run with a deliberately altered post-commit plan file: post-write verification fails; bundle `INDEX.md` is not updated; error surfaces both hashes.
- Turn-cycle dry-run with the same setup: same outcome.
- Bootstrap dry-run with a clean post-commit plan file: post-write verification passes; INDEX.md is updated normally.
- Prose-attach's existing hash-integrity check (`branching-story-prose-attach/SKILL.md:157-166`) remains in place as a downstream redundant guard.

**Migration impact**: None — applies only to new page writes. Existing test fixtures with already-committed pages are unaffected because they were written with matching hashes.

**Optional follow-up**: A `--verify` subcommand on `compute-pg-hashes.ts` would make the verification a single CLI call with clean exit-code semantics. This spec defers that change because the existing CLI suffices; if a future ticket adds the subcommand, the skill prose would update to use it and the validator fixtures would migrate to the new shape.

---

### D5 — Clarify eight-gates scope wording (P2, intake F6 / A5)

**Problem**: `.claude/skills/_shared-templates/story-state-contract.md` §7 opens with:

> "Every state-changing skill validates against these eight gates at page-plan commit."

The phrasing scopes the gates to "at page-plan commit," which implicitly restricts them to PG-authoring skills. But the leading "every state-changing skill" can mislead implementers of non-PG state-changing skills (`branching-story-prose-attach` emits receipts and optional audit-only SE events; `story-fact-promotion-to-canon` writes a proposal package; `story-promotion-closeout` writes a ledger and supersedes story-local records; `branching-story-health-audit` writes audit reports). None of these author PG records; none of them produce `PG.validation_trace`; each enforces the same Mystery Reserve / invariant / branch-isolation invariants through its own skill-local validation phases.

FOUNDATIONS.md Rule 7 (Mystery Reserve preservation) mentions the eight gates in the firewall paragraph. Sharpening the contract wording aligns the FOUNDATIONS reference with the contract.

This is a wording sharpening only — no behavioral change, no schema change, no validator change. Implementers reading the sharpened text should reach the same operational conclusion they would reach today, but without the ambiguity.

**Change**:

1. **Contract** (`.claude/skills/_shared-templates/story-state-contract.md` §7 opening sentence, replace with):

   ```
   Every PG-authoring story skill (`branching-story-bootstrap` and
   `branching-story-turn-cycle`) validates these eight hard gates at
   page-plan commit; gate results are recorded in
   `PG.validation_trace.gates[]` and gate FAIL produces a direct-artifact
   partial failure under HARD-GATE discipline. Non-PG story skills
   (`branching-story-prose-attach`, `branching-story-health-audit`,
   `commitment-block-authoring`, `story-fact-promotion-to-canon`,
   `story-promotion-closeout`) preserve the same invariants — branch
   isolation, Mystery Reserve firewall, observer firewall, schema
   compliance, replay consistency, choice-set non-collapse, motivation
   grounding, terminal proof — through their own skill-local validation
   phases and HARD-GATE discipline. When non-PG skills emit audit-only SE
   records, §4.3a applies.
   ```

2. **FOUNDATIONS** (`docs/FOUNDATIONS.md` Rule 7 firewall paragraph, replace the sentence referencing the eight gates with):

   ```
   For PG-authoring state changes, the authoritative Mystery Reserve /
   invariant firewall is gate 3 of the shared eight hard gates (see
   `.claude/skills/_shared-templates/story-state-contract.md` §7). Non-PG
   story skills enforce the same firewall through their own named
   validation phases; the deterministic `forbidden_mystery_resolution`
   check inside `branching-story-prose-attach` is a redundant downstream
   guard on rendered prose, not a second authoritative state-transition
   gate.
   ```

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§7 opening)
- `docs/FOUNDATIONS.md` (Rule 7 firewall paragraph — locate via grep for "eight hard gates")

**Verification**:
- Re-read of contract §7 opening shows PG-authoring vs non-PG scope is explicit.
- Re-read of FOUNDATIONS Rule 7 firewall paragraph confirms gate-3 reference for PG-authoring and skill-local-phase reference for non-PG.
- No validator changes; no fixture changes.

**Migration impact**: None.

---

### D6 — Cross-skill integration-debt-note reconciliation pass (P2, intake F7)

**Problem**: Four of the seven story-pipeline skills carry "Known integration debt" sections referencing MCPENH / PEENH / VALENH ticket IDs:

- `.claude/skills/branching-story-health-audit/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/commitment-block-authoring/SKILL.md` — references MCPENH-041.
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, MCPENH-041.
- `.claude/skills/story-promotion-closeout/SKILL.md` — references MCPENH-040, PEENH-007, VALENH-011, PEENH-008, MCPENH-041. Notably, closeout already marks PEENH-007 as "Now landed (verified... op is present in `tools/patch-engine/src/envelope/schema.ts`)".

The same ticket ID appears across sibling skills with inconsistent "landed" status — closeout marks PEENH-007 landed; sibling skills (story-fact-promotion-to-canon, branching-story-health-audit) still list it as open. Operators encountering one skill's note and not its siblings cannot tell whether the debt is still active or already resolved.

The remaining three story skills (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`) carry no integration-debt notes.

**Change**:

1. **Per-ticket-ID adjudication**: for each of the five named IDs (MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, VALENH-011), determine current status by inspecting the named code surface:
   - MCPENH-040 / MCPENH-041 — check `tools/world-mcp/src/tools/` for the named tool/argument/profile changes the IDs describe.
   - PEENH-007 / PEENH-008 — check `tools/patch-engine/src/envelope/schema.ts` and `tools/patch-engine/src/ops/` for the named op or schema changes.
   - VALENH-011 — check `tools/validators/src/structural/` and `tools/validators/src/schemas/` for the named validator-rule or schema changes.

2. **Reconciliation outcomes per ID**: classify each as `landed` (op/tool/schema is present and the integration-debt note should be deleted or rewritten as a historical reference), `still open` (the note remains accurate and the debt should be tracked as a pending ticket), or `superseded` (the named ticket has been replaced by a newer ID or the underlying need was eliminated; the note should be updated to point at the superseding work).

3. **Edit the four skills**: apply the per-ID outcomes consistently across all four skills. The same ID gets the same verdict everywhere it appears. Mark verified-landed IDs identically (`Now landed (verified at <file:line>)`); delete genuinely stale notes; preserve still-open IDs with the same one-line description across siblings.

4. **Reconciliation log**: at the end of the implementation work, capture a short adjudication table in the implementation ticket's verification section: ID → verdict → file:line evidence. The companion triage (this spec's `docs/triage/` file) cross-references this audit but does not duplicate it.

**Files touched**:
- `.claude/skills/branching-story-health-audit/SKILL.md` (Guardrails §Known integration debt)
- `.claude/skills/commitment-block-authoring/SKILL.md` (Guardrails §Known integration debt)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (Guardrails §Known integration debt)
- `.claude/skills/story-promotion-closeout/SKILL.md` (Guardrails §Known integration debt)

**Verification**:
- Repo-wide grep for each of MCPENH-040, MCPENH-041, PEENH-007, PEENH-008, VALENH-011 returns consistent landed/open/superseded status across all four skills.
- Each "Now landed" marker carries a file:line evidence citation.
- Each "still open" reference describes one piece of debt with a one-line specification.

**Migration impact**: None.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 5 — No fields without mechanical consumers | aligns | D1 deletes the `denial_patterns` reference instead of adding the field; firewall-field-derived patterns use existing schema fields with existing consumers. |
| Rule 7 — Mystery Reserve preservation | aligns | D1 strengthens the deterministic forbidden-resolution check (it becomes implementable); D5 clarifies that the prose-attach check is a redundant downstream guard, with gate 3 of the eight gates remaining authoritative for PG-authoring. |
| §Tooling Recommendation (MCP retrieval discipline) | aligns | D3 closes a documentation loophole that authorized "direct file reads" — every closeout linked-record load now routes through MCP per `docs/FOUNDATIONS.md:528`. |
| §Story Bundles §4a — Plan-Authority Boundary | aligns | D4 protects the committed PG snapshot against post-commit disk drift; the PG record remains authoritative and the disk artifact must reconcile to it (never the other way around). |
| §Schema Minimalism | aligns | No new schema fields. No new patch-engine ops. No new MCP retrieval surfaces. Every change is prose, validator-fixture, or wording. |
| §HARD-GATE discipline | aligns | D4 explicitly classifies post-write mismatch as a direct-artifact partial failure and routes through HARD-GATE discipline. |
| CONTEXT-PACKET-CONTRACT §story-pipeline seed nodes | aligns | D2 brings turn-cycle skill prose into compliance with the contract that SPEC-31 D14 already sharpened in the contract docs and MCP server. |

---

## Verification

Implementation order (each deliverable is independent; the listed order is recommended to minimize churn in the shared contract file):

1. **D5** (wording sharpening in shared contract + FOUNDATIONS). No tests; no fixture changes. Lands first because D4 also edits the shared contract — landing D5 first avoids merge conflicts.
2. **D4** (post-write hash verification). Edits the shared contract §10 + bootstrap + turn-cycle + two new validator fixtures. The biggest cross-skill change in this spec.
3. **D2** (turn-cycle seed resolution). Skill-prose-only; optional MCP test if SPEC-31 D14 coverage is incomplete.
4. **D3** (closeout retrieval residue). Skill-prose-only; optional validator-fixture if SPEC-31 D10 coverage is incomplete.
5. **D1** (prose-attach `denial_patterns` replacement). Skill-prose + two new validator fixtures.
6. **D6** (integration-debt reconciliation). Touches four skills; depends on a code-inspection pass for the five named IDs. Lands last so the reconciliation log can cite the most current state.

Per-deliverable verification commands and acceptance criteria are listed in each deliverable's `Verification` sub-section above. The cross-cutting acceptance criteria:

- Repo-wide grep for `denial_patterns` returns matches only in `archive/brainstorming/` (after D1).
- Repo-wide grep for `direct file reads` in `.claude/skills/story-promotion-closeout/` returns no matches (after D3).
- `tools/validators` test suite passes including the new `disallowed_cheap_answer_match`, `disallowed_cheap_answer_clean`, `plan_hash_postwrite_mismatch` (bootstrap), and `plan_hash_postwrite_mismatch` (turn-cycle) fixtures (after D1 and D4).
- All MCPENH/PEENH/VALENH references across the four affected skills carry consistent landed/open/superseded verdicts (after D6).
- Re-read of `.claude/skills/_shared-templates/story-state-contract.md` §7 opening and §10 step 5a shows the sharpened scope and the new post-write verification step.

---

## Out of Scope

- **F1 (P0 implementation-evidence gap)** — refuted by codebase verification. No spec action.
- **F8 (prose-quality-instructions.md missing)** — refuted; file exists. No spec action.
- **The 28-item validator/test plan in the audit's §8** — this spec includes only the 4 fixture-tests specifically required by D1, D3 (optional), and D4 (×2). Broader test-suite expansion (saliency-starvation fixtures, multi-branch replay, cross-story contradiction tests, mystery-accretion chain tests, social-propagation fixtures, observer-firewall fixtures, branch-isolation fixtures, choice-set-noncollapse fixtures, etc.) is deferred to a follow-up testing-hardening spec. None of these blocks the proposed amendments.
- **Compute-pg-hashes.ts `--verify` subcommand** — deferred. D4 uses the existing CLI directly per §Key design decisions. A future ticket may add the subcommand for cleaner exit-code semantics.
- **Mystery Reserve schema additions** — explicitly rejected for D1 per FOUNDATIONS Rule 5.
- **MCP retrieval surface changes** — none required by any of the six deliverables.
- **Patch-engine op changes** — none required.
- **Story-bundle migration** — no existing `_source/` story bundles exist.
- **The audit's anti-recommendations list (§10)** — confirms-existing-position; no spec action. Each item in the list (acts/midpoints/climax; global drama manager; word counts; prose-as-state; LLM narrator memory; auto-reconvergence; global rumor graph as new layer; schema bloat; widening story canon; bypassing HARD-GATE; adding `denial_patterns`) confirms an established FOUNDATIONS rejection or this spec's D1 rejection of the field-addition path.

---

## Risks & Open Questions

- **D4 hash-verification mechanism** `(pragmatic)` — using the existing `compute-pg-hashes.ts` CLI versus extending it with `--verify` is a pragmatic call. The existing-CLI approach lands smaller but produces slightly noisier skill prose (the skill describes a multi-step compare-and-error path); a future `--verify` subcommand would clean that up.
- **D2 MCP test coverage from SPEC-31 D14** — open question whether the `story_local_seed_warns` MCP test already exists from D14. If yes, no test work; if no, one test is added. Resolve at implementation time.
- **D3 fixture coverage from SPEC-31 D10** — same as above for the closeout `linked_record_not_found` fixture.
- **D6 reconciliation outcomes per ticket ID** — the implementation work depends on inspecting the named code surfaces. The five-ID list is exhaustive of what's currently referenced, but the per-ID verdict is implementation-time work; the spec cannot pre-determine the verdicts without performing the inspection.
- **F6 / D5 wording specificity** — the proposed replacement text enumerates the five non-PG skills by name and the eight invariants by name. If a new story skill is added in the future, the contract §7 text must be updated. Alternative: phrase the contract abstractly ("PG-authoring skills" vs "other state-changing story skills") without enumeration. The enumerated form is preferred for now because the seven-skill set is canonical per FOUNDATIONS §Skill Categories and unlikely to change.
