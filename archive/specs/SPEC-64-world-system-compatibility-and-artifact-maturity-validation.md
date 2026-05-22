# SPEC-64 — World-System Compatibility & Artifact-Maturity Validation

**Status:** completed
**Date:** 2026-05-21
**Classification:** canon-related (executable validators over world-system proposal/audit/pressure/hybrid surfaces; no canon-record semantics change)
**Source:** `archive/reports/world-system-consolidation-first-iteration.md` §10 Validation-and-incompatibility plan (§10.1 `world_compatibility_validator`, §10.2 `artifact_maturity_validator`) + §9.5 steps 2–3 + Fault 11 — the deferred items (triage **D5**) now unblocked by SPEC-61's landed schemas + `approval-semantics` validator.
**Companion:** `docs/triage/2026-05-21-world-system-consolidation-triage.md` (D5)
**Depends on:**
- **SPEC-61** (landed; `archive/specs/SPEC-61-proposal-surface-schema-and-approval-enforcement.md`) — the proposal/audit/pressure/world-proposal JSON schemas and the `approval-semantics` structural validator this spec builds on. **Substrate landed.**
- **SPEC-62 §2.1** (`archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`; FOUNDATIONS §Artifact Authority and Maturity) — landed by `archive/tickets/SPEC62FOUANDDOC-001.md`. D1's maturity-class vocabulary derives its authoritative tier list from that FOUNDATIONS section.

**Implementation:** completed by `archive/tickets/SPEC64WORSYSCOM-001.md`, `archive/tickets/SPEC64WORSYSCOM-002.md`, `archive/tickets/SPEC64WORSYSCOM-003.md`, `archive/tickets/SPEC64WORSYSCOM-004.md`, and `archive/tickets/SPEC64WORSYSCOM-005.md`.

## 1. Context

SPEC-61 closed the strongest world-system gap — every proposal/audit/pressure/world-proposal surface (PR/BATCH/EPE/EPE-sidecar/EPE-batch/AU/RP/NWP/NWB) is now JSON-schema-backed and structurally validated, and non-CF `direct_user_approval` misuse hard-fails via `tools/validators/src/structural/approval-semantics.ts`. SPEC-62 (archived at `archive/specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`) added the FOUNDATIONS §Artifact Authority and Maturity boundary that names each artifact's authority tier (proposal vs realized hybrid vs accepted canon vs adjudication vs audit vs pressure affordance).

What remains from the consolidation report's §10 validation plan is the **compatibility layer** the triage deferred as D5 (Fault 11, major): a world cannot currently be checked, as a whole, for *maturity confusion* (an artifact claiming an authority tier its path/prefix doesn't grant) or for index drift between an `INDEX.md` and the artifacts on disk, and `continuity-audit` has no first-class compatibility reporting for these defect classes. The substrate the triage said D5 "depends on" — SPEC-61's schemas and the approval-semantics validator — has landed. This spec adds the maturity + compatibility validation layer on top of it.

This spec deliberately does **not** re-implement the approval-semantics check (SPEC-61 owns it; the compatibility layer *runs* the already-registered `approval_semantics` validator), and deliberately does **not** route proposal direct-writes through the patch engine (report §9.5 explicitly defers that until direct-write recovery proves painful — no such pain signal exists).

## 2. Deliverables

### D1 — `artifact_maturity_validator` (structural validator)

**File:** `tools/validators/src/structural/artifact-maturity.ts` (+ registry append in `tools/validators/src/public/registry.ts`).

A structural validator that confirms each world-system artifact's claimed authority tier is consistent with its path and ID prefix, per the FOUNDATIONS §Artifact Authority and Maturity map (SPEC-62 §2.1). Maturity is **derived from path + ID-prefix** against the authority map — this spec adds **no** `maturity_level` frontmatter field to any schema (the path+prefix already determines the tier; a mandatory field would force a schema migration across every surface for no consumer benefit — YAGNI, and the report's §10.2 `maturity_level` inspection is satisfied by derivation).

Detects maturity collapse: e.g., a file under `character-proposals/` with id `NCP-9` may not present itself (in prose framing, frontmatter, or INDEX entry) as a realized character dossier — that tier belongs to `CHAR-*` under `characters/`. Code `artifact_maturity.collapse` names the path, the prefix-implied tier, and the correct routing skill. (Validator `code` fields follow the codebase's lower-snake, dot-namespaced convention — e.g. `approval_semantics.direct_user_approval_reserved`; the human-readable message may surface an `ARTIFACT_MATURITY_COLLAPSE`-style label.)

The maturity-class enum is sourced from FOUNDATIONS §Artifact Authority and Maturity (landed by `archive/tickets/SPEC62FOUANDDOC-001.md`).

### D2 — World-compatibility CLI mode (validator-subset orchestration)

**File:** a CLI mode on the existing `tools/validators/src/cli/` surface (e.g. a `world-validate <slug> --compatibility` flag, or a sibling `world-compatibility` entry), reusing the registered validator set; **no new registered meta-validator is added for D2 itself.**

The report's §10.1 `world_compatibility_validator` is realized as a **CLI mode**, not a registered meta-validator: the validator framework (`tools/validators/src/framework/run.ts`) runs each registered `Validator` independently and flat, and the consolidated verdict / summary is the run-loop's job (`aggregateSeverity`, surfaced by `tools/validators/src/cli/world-validate.ts`). A validator whose `run()` internally invoked other registered validators would either double-count verdicts (if those validators are also registered) or re-implement the framework's aggregation and lose per-validator execution reporting. The compatibility mode instead **selects** the compatibility-relevant validator subset — `approval_semantics` (SPEC-61, already registered), `artifact_maturity` (D1), the index-consistency validator (D3), and `record_schema_compliance` (already registered) — and runs them through `runValidators` over a world's root files, `_source/`, `characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/`, `pressure-events/`, and `world-proposals/`, reporting the aggregated compatibility verdict.

Posture per report §10: **fail-fast with detailed incompatibility messages and manual repair** — no migration / backwards-compatibility shim. The block-vs-warn split follows the framework's `run_mode` (`pre-apply | full-world | incremental`, per `tools/validators/src/framework/types.ts`): under `pre-apply` (the patch-engine pre-write gate) compatibility defects block; under `full-world` (the standalone read-only CLI, and D4's continuity-audit phase) they warn rather than block. Block-vs-warn is expressed through run_mode-conditional verdict severity — the pattern `tools/validators/src/structural/compatibility-drift.ts` already uses — not a bespoke run mode.

### D3 — Index-consistency checks (report §9.5 step 3)

**File:** `tools/validators/src/structural/index-disk-consistency.ts` (+ registry append; included in D2's compatibility subset).

A registered validator performing `INDEX.md`-to-disk reconciliation for the proposal/audit/pressure/character-proposal surfaces: every artifact on disk is listed in its `INDEX.md` and vice versa; code `index_disk_drift` names the missing/orphaned entry. Because `INDEX.md` files are derived renderings — **not** indexed as records — the validator reads each `INDEX.md` from the world root on disk (as `compatibility-drift.ts` reads `worldRoot` via `existsSync`) and diffs its entries against the indexed `proposal_card` / `audit_record` / `pressure_event_card` / `character_proposal_card` records. This is the §9.5 step-3 "index consistency checks" prerequisite that the report places *before* any future consideration of engine-routing (step 4, deferred).

### D4 — `continuity-audit` compatibility reporting hook

**File:** `.claude/skills/continuity-audit/SKILL.md` (+ relevant reference file).

Add an optional, **read-only** compatibility-reporting phase to `continuity-audit` that runs the D2 world-compatibility CLI mode in `full-world` (read-only, warn) mode and surfaces maturity/index/approval findings as a compatibility appendix in the `AU-<integer>` report. This is Fault 11's "optional continuity-audit reporting" — it does not let `continuity-audit` mutate any surface (it remains audit-only, writing to `worlds/<slug>/audits/`); compatibility *enforcement* (blocking) stays in the `pre-apply` gate (D2).

### D5 — Capstone integration test

**File:** `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts` (modeled on `spec61-proposal-surface-coverage.test.ts`).

Fixture-world copy (never mutates real `worlds/<slug>/`); asserts: maturity collapse is caught; a non-CF `direct_user_approval` is still caught (no regression on SPEC-61's check via the compatibility CLI path); index drift is caught; `full-world` read-only mode warns rather than blocks; a clean world passes.

## 3. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Artifact Authority and Maturity (SPEC-62 §2.1) | aligns | D1 enforces the maturity-tier boundary the new FOUNDATIONS section defines; path/prefix-derived maturity is the executable counterpart of the prose authority map. |
| §Canon Fact Record Schema — `source_basis.direct_user_approval` | aligns | The D2 compatibility mode surfaces non-CF `direct_user_approval` misuse across all surfaces by running SPEC-61's landed `approval_semantics` validator; no re-implementation. |
| Rule 6 — No Silent Retcons | aligns | Fail-fast validation + manual repair (report §10); no silent migration or backwards-compatibility shim that would mutate artifacts without an audit trail. |
| §Tooling Recommendation / §Machine-Facing Layer | aligns | Validators + CLI are the executable enforcement layer the machine-facing layer prescribes (Validator Framework, item 4). |
| Rule 7 — Preserve Mystery Deliberately | N/A | This spec adds maturity/compatibility validators that touch no Mystery Reserve firewall; the report's `mystery_policy_validator` (§10.4) stays dropped (YAGNI, per SPEC-62 §2.4). Listed defensively because the report's §10 plan bundled it adjacent. |

## 4. Acceptance

- `artifact_maturity_validator` is registered in `tools/validators/src/public/registry.ts` and flags `artifact_maturity.collapse` for a `character-proposals/NCP-*` file presenting as a realized dossier; maturity is path/prefix-derived (no new `maturity_level` frontmatter field is added to any schema).
- The world-compatibility CLI mode runs as a `pre-apply` gate (blocks) and a standalone `full-world` read-only CLI (warns), running the validator subset {`record_schema_compliance` + `approval_semantics` (SPEC-61) + `artifact_maturity` (D1) + index-consistency (D3)} through the framework's `runValidators` aggregation; block-vs-warn follows `run_mode`-conditional severity.
- `index_disk_drift` is raised for an artifact present on disk but missing from its `INDEX.md` (and vice versa) on the proposal/audit/pressure/character-proposal surfaces.
- `continuity-audit` can emit a read-only compatibility appendix without mutating any non-`audits/` surface.
- The SPEC-64 capstone test passes, including the no-regression assertion on SPEC-61's `direct_user_approval` check via the compatibility CLI path.
- No proposal direct-write surface is converted to a patch-engine op (D6 stays deferred); no `taxonomy_authority_validator` (D3 triage) or `mystery_policy_validator` is added.

## 5. Out of Scope

- **`approval_semantics_validator`** (report §10.3) — already landed by SPEC-61 (`approval-semantics.ts`); SPEC-64 runs it from the compatibility subset, never re-implements it.
- **Engine-routing of proposal direct-writes** (report §9.5 step 4 / triage D6) — explicitly deferred by the report until direct-write recovery proves painful; no pain signal exists. Index-consistency checks (D3) are the §9.5 prerequisite; revisit engine-routing only if drift recurs after SPEC-64.
- **`taxonomy_authority_validator`** (report §10.5 / Fault 7 / triage D3) — deferred: low value, heavy, no consumer, and its closed-list authority-class convention does not exist.
- **`write_surface_validator`** (report §10.6) — deferred: write-surface enforcement ("writes occur only on allowed surfaces and through the correct mechanism") is already provided by Hook 3 (engine-only `_source/` mutation guard) plus the deferred engine-routing (D6) for the proposal direct-write surfaces; a standalone validator would duplicate existing enforcement, and no pain signal warrants it.
- **`story_leakage_linter`** (report §10.7) — deferred: the story-bundle-state-leakage boundary is already documented as prose (FOUNDATIONS §World Generativity vs Story-Bundle State, added by SPEC-62 / triage A6); the executable linter has no current consumer (YAGNI), consistent with the report's other dropped linters.
- **CF-1 sibling-genesis-CF split / create-base-world genesis-shape changes** (Fault 10 / triage D4) — deferred: no pain signal; SPEC-62 §2.4 already ruled genesis forbidden-seeding an acceptable default.
- **A mandatory `maturity_level` frontmatter field** (report §9.2 / §8.7) — rejected in favor of path/prefix derivation (no schema migration).
- **`mystery_policy_validator`** (report §10.4) — dropped (YAGNI), consistent with SPEC-62 §2.4.
