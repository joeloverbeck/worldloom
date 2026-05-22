# SPEC-61 — Proposal-Surface Schema Coverage & Approval-Semantics Enforcement

**Status:** COMPLETED
**Date:** 2026-05-21
**Classification:** canon-related (validator + machine-facing coverage for canon-pipeline proposal/audit/pressure surfaces; no canon-semantics change)
**Source:** `archive/reports/world-system-consolidation-first-iteration.md` Fault 5 (verified) + the genuine sliver of Fault 2 (verified) — reassessed against `main`
**Depends on:** none — foundational; SPEC-62 may proceed in parallel
**Companion:** `docs/triage/2026-05-21-world-system-consolidation-triage.md`

## 1. Context

Every **mature** world-system surface is JSON-schema-backed and structurally validated:
`CF / CH / INV / M / OQ / ENT / SEC` (world canon), `CHAR / DA / PA` (hybrid realized artifacts),
`NCP / NCB` (character proposals), and all story-bundle classes. Verified against `main`:
`tools/validators/src/schemas/` ships 38 schemas and `RECORD_TYPE_TO_SCHEMA`
(`tools/validators/src/structural/utils.ts:78–114`) drives `record-schema-compliance.ts` over every
indexed record class.

The **least-mature** surfaces are the only ones with **zero** schema coverage (verified — none appear
in `tools/validators/src/schemas/`, none in `RECORD_TYPE_TO_SCHEMA`, none enumerated as world-index
node types):

| Surface | Producer | Path | Indexed? | Schema? |
|---|---|---|---|---|
| `PR` proposal card | `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts` | `proposals/PR-*.md` | No | **No** |
| proposal `BATCH` | same | `proposals/batches/BATCH-*.md` | No | **No** |
| `EPE` pressure-event card | `emergent-pressure-events` | `pressure-events/EPE-*.md` | Allocator only | **No** |
| `EPE` sidecar proposal | `emergent-pressure-events` | `pressure-events/EPE-*.proposal.md` | No | **No** |
| pressure-event `BATCH` | `emergent-pressure-events` | `pressure-events/batches/BATCH-*.md` | No | **No** |
| `AU` audit report | `continuity-audit` | `audits/AU-*.md` | No | **No** |
| `RP` retcon proposal | `continuity-audit` | `audits/AU-*/retcon-proposals/RP-*.md` | No | **No** |
| `NWP` world proposal | `propose-new-worlds-from-preferences` | `world-proposals/NWP-*.md` | No | **No** |
| `NWB` world-proposal batch | same | `world-proposals/batches/NWB-*.md` | No | **No** |

This is the report's most defensible finding, and it sits exactly where the world-system pipeline got
the least iteration. These are the surfaces where maturity/approval confusion is most likely yet least
mechanically caught.

**Separately**, one genuine approval-semantics defect is verified: `continuity-audit`'s RP card uses
`source_basis.direct_user_approval` and sets it `true` at commit
(`templates/retcon-proposal-card.md:104`; `SKILL.md:138`). FOUNDATIONS §Canon Fact Record Schema
(lines 355–361) explicitly reserves `source_basis.direct_user_approval` for accepted CF records and
states `canon-addition` must not copy a proposal-side value into an accepted CF. An RP card is a
candidate retcon, not accepted canon — its use of the reserved field name is the one real instance of
the report's "approval laundering" concern.

**Out of scope (rejected at triage — see companion):** the report's 12-name approval-rename taxonomy
(`proposal_review_approved`, `dossier_write_approved`, `artifact_write_approved`, …). Verified: the
codebase uses exactly two approval fields — `user_approved` (every pre-acceptance surface, documented in
every template comment as "kept in batch after review, NOT canonized") and `direct_user_approval`
(accepted CFs + the RP collision). The rename adds authoring/reading cost with no validator consumer
and a large blast radius across schemas, templates, and existing world data. The narrow fix below
addresses the only genuine defect. The report's per-surface `maturity_level` frontmatter field is also
out of scope: artifact maturity is already encoded by path + ID prefix, and the §2.3 validator derives
it from path — a redundant authored field would cost tokens at every card with no added enforcement.

## 2. Changes

### 2.1 JSON schemas for the uncovered surfaces

**Implementation note (2026-05-21, SPEC61PROSURSCH-001):** the PR and EPE batch templates do not share frontmatter, so the optional split in §6 is now active. The schema set is nine files, with `pressure-event-batch.schema.json` separate from `proposal-batch.schema.json`; downstream node-type and validation tickets must include `pressure_event_batch`.

**Files:** new `tools/validators/src/schemas/*.schema.json`

Add schemas modeled on the existing `character-proposal-card.schema.json` /
`character-proposal-batch.schema.json` pair (the proven direct-write-proposal precedent):

- `proposal-card.schema.json` (PR)
- `proposal-batch.schema.json` (PR batch manifests)
- `pressure-event-card.schema.json` (EPE base card)
- `pressure-event-sidecar-proposal.schema.json` (EPE `*.proposal.md`)
- `pressure-event-batch.schema.json` (EPE batch manifests)
- `audit-report.schema.json` (AU)
- `retcon-proposal-card.schema.json` (RP)
- `world-proposal-card.schema.json` (NWP)
- `world-proposal-batch.schema.json` (NWB)

Each schema's required-field set is derived from the **current template frontmatter** of the producing
skill (authoritative — read the template, do not invent fields). Each schema:

- pins `world_slug` / `id` / `generated_date` shape consistent with sibling proposal schemas;
- declares `source_basis` as an object and (per §2.3) **forbids `direct_user_approval` as a property**
  on every non-CF surface;
- uses canonical vocabularies by `$ref` where a field is a canonical enum (e.g. EPE `origin_type`,
  PR `proposal_family`, `domains_affected`) so taxonomy values stay enforced — values sourced from
  `tools/world-index/src/public/canonical-vocabularies.ts`. Skill-local heuristic lists that are **not**
  canonical enums stay free-string (do not promote diagnostic vocabularies to enforced enums here).

### 2.2 World-index enumeration + node-type mapping

**Files:** `tools/world-index/src/enumerate.ts`, `tools/world-index/src/parse/prose.ts`

Mirror the `character-proposals` enumeration precedent (`enumerate.ts:51,182,190,221`;
`prose.ts:16,24,119,123`) for the new directories: `proposals/`, `proposals/batches/`,
`pressure-events/`, `pressure-events/batches/`, `audits/`, `audits/AU-*/retcon-proposals/`,
`world-proposals/`, `world-proposals/batches/`. Map each directory + filename pattern to a node type
(`proposal_card`, `proposal_batch`, `pressure_event_card`, `pressure_event_sidecar_proposal`,
`pressure_event_batch`, `audit_record`, `retcon_proposal_card`, `world_proposal_card`, `world_proposal_batch` — node-type
names already partially reserved in `tools/world-index/src/schema/types.ts`; reuse those that exist:
`proposal_card`, `proposal_batch`, `retcon_proposal_card`, `audit_record` are already present in
`NODE_TYPES`). The nine surfaces in §1 now map to **nine** node types because
SPEC61PROSURSCH-001 proved the PR and EPE batch frontmatter diverge; `enumerate.ts`
therefore routes `proposals/batches/` to `proposal_batch` and `pressure-events/batches/` to
`pressure_event_batch`.

> **EPE non-indexing is deliberate and preserved.** Verified: EPE base cards are allocator-tracked
> (`allocate-next-id.ts`) but file-scanned, not retrieval-indexed, by design (candidates until
> canonized via sidecar). This spec adds **schema validation** of EPE frontmatter via the structural
> path; it does NOT add EPE to `list_records` / `get_record_schema` retrieval (that was the report's
> Fault 9 over-reach, rejected at triage). The enumeration above is for validator coverage, not for a
> new retrieval surface.

### 2.3 Structural validation + approval-semantics check

**Files:** `tools/validators/src/structural/utils.ts`, `tools/validators/src/structural/record-schema-compliance.ts`, and either an extension of an existing structural validator or a new `tools/validators/src/structural/approval-semantics.ts` wired into `tools/validators/src/public/registry.ts`

- Add the nine new node-type → schema-basename rows to `RECORD_TYPE_TO_SCHEMA`
  (`utils.ts:78–114`) and add the new directories to the scan list (`utils.ts:358`).
  `record-schema-compliance.ts` then validates the new surfaces automatically (same path as NCP/NCB).
- Add an **approval-semantics check** (mechanical, blocking): on every non-CF surface, the presence of
  `source_basis.direct_user_approval` is a hard `FAIL`. CF records keep their existing
  `direct_user_approval: const true` requirement (`canon-fact-record.schema.json:69–71`). Error
  message names the reserved-field rule and points to the sibling `user_approved` field. **Primary
  mechanism: a dedicated `tools/validators/src/structural/approval-semantics.ts` validator wired into
  `tools/validators/src/public/registry.ts`, run over _every_ non-CF record class** — this is what
  satisfies §4's universal criterion. The existing NCP / NCB / CHAR / DA schemas do **not** prohibit
  `direct_user_approval` (verified: `diegetic-artifact-frontmatter.schema.json:66` declares
  `source_basis` as a permissive `{ "type": "object" }`), so a schema-only prohibition baked into the
  new schemas alone would leave those pre-existing surfaces uncovered. The §2.1 per-schema
  `"not": {"required": ["direct_user_approval"]}` prohibition is retained as **optional
  defense-in-depth** on the new schemas, not as the sole enforcement path.

### 2.4 Fix the RP `direct_user_approval` collision

**Implementation note (2026-05-21, SPEC61PROSURSCH-005):** the RP producer collision is fixed.
`continuity-audit` now writes and documents `source_basis.user_approved` on RP cards, while
`canon-addition` keeps the accepted-CF `source_basis.direct_user_approval: true` provenance path.

**Files:** `.claude/skills/continuity-audit/templates/retcon-proposal-card.md`, `.claude/skills/continuity-audit/SKILL.md`

- In the RP template, rename `source_basis.direct_user_approval` → `source_basis.user_approved`,
  matching every sibling proposal surface (PR/NCP/NWP/EPE all use `user_approved` with the
  "kept in batch after review, NOT canonized" semantics).
- In `SKILL.md`, update the Phase-8 commit instruction (line ~138) to set `user_approved: true` and
  carry the same "recommendation kept in the audit, NOT accepted as canon" comment the other proposal
  skills use.
- `canon-addition` already sets `direct_user_approval: true` only on the accepted CF after its own
  HARD-GATE (`canon-addition/SKILL.md:103`), so consuming an RP that no longer carries the field is
  safe — verify the proposal-parsing path does not read `direct_user_approval` off the RP card.

## 3. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Canon Fact Record Schema — `direct_user_approval` reservation (lines 355–361) | aligns | §2.3/§2.4 enforce the reservation mechanically and remove the one non-CF use |
| §Machine-Facing Layer — Validator Framework | aligns | Extends executable structural validation to the surfaces that lacked it; uses the existing CLI/pre-apply path |
| §Tooling Recommendation — "never operate on prose alone" | aligns | Replaces prose-only "this is not canon" warnings on proposal cards with schema enforcement |
| §Canonical Storage Layer — engine-only `_source/` | N/A | These surfaces are direct-write hybrid/markdown by design; this spec does not move them onto the engine path (the report's "consider engine ops later" is explicitly deferred) |
| Rule 6 — No Silent Retcons | aligns | RP cards remain recommendations; §2.4 keeps them out of the accepted-canon approval namespace, preserving the proposal→adjudication audit boundary |

## 4. Acceptance

- `tools/validators/src/schemas/` contains the nine new schemas; `npm test` in `tools/validators`
  passes including new fixtures (one well-formed + one malformed per surface).
- A PR/EPE/AU/RP/NWP/NWB card with a malformed/missing required frontmatter field produces a
  `record-schema-compliance` FAIL through the world-validate CLI.
- A non-CF surface carrying `source_basis.direct_user_approval` produces a blocking FAIL with a message
  citing the CF-only reservation — enforced by the `approval-semantics` validator over **every** non-CF
  record class (PR / BATCH / EPE / EPE-sidecar / EPE-batch / AU / RP / NWP / NWB **and** the pre-existing
  NCP / NCB / CHAR / DA surfaces), not only the new schemas.
- The RP template/skill no longer reference `direct_user_approval`; a freshly generated RP card carries
  `source_basis.user_approved`.
- An accepted CF still requires `direct_user_approval: true` (no regression).
- World-index build over a world containing these surfaces emits the new node types without error; EPE
  retrieval surface is unchanged (still not in `list_records`).

## 5. Out of Scope

- Approval-field rename taxonomy beyond the single RP fix (rejected — see §1 and companion triage).
- Per-card `maturity_level` frontmatter field (rejected — path/prefix already encode maturity).
- Promoting EPE to an indexed/retrievable record (rejected — Fault 9 over-reach).
- A standalone `taxonomy_authority_validator`, `mcp_contract_validator`, `world_compatibility_validator`,
  or continuity-audit compatibility appendix (deferred — see companion triage).
- Routing proposal direct-writes through the patch engine (deferred per report §9.5).

## 6. Risks & Open Questions

- **`EPE` / `NWP` / `NWB` ID prefixes are undocumented in `docs/ID-ALLOCATION.md`** (verified at
  reassessment: `PR` / `BATCH` / `AU` / `RP` are present; `EPE` / `NWP` / `NWB` return zero hits). This
  pre-existing docs-gap is not introduced by this spec, but bringing these surfaces under
  schema/node-type coverage is the natural moment to surface it. Route the documentation fix to
  **SPEC-62** (which already amends `docs/REPOSITORY-MAP.md` and the FOUNDATIONS docs); do **not** expand
  this spec's scope to edit `docs/ID-ALLOCATION.md` directly.
- **Pressure-event batch schema — split resolved.** SPEC61PROSURSCH-001 confirmed
  `proposals/batches/BATCH-*.md` and `pressure-events/batches/BATCH-*.md` frontmatter diverge, so the
  implementation uses a ninth `pressure-event-batch.schema.json` + `pressure_event_batch` node type.

## Outcome

Completed on 2026-05-21.

What changed:

1. Added JSON-schema coverage and validator wiring for the nine proposal/audit/pressure/world-proposal surfaces: PR, proposal BATCH, EPE, EPE sidecar proposal, EPE batch, AU, RP, NWP, and NWB.
2. Added world-index enumeration and node-type parsing for those proposal surfaces while preserving the intentionally absent EPE retrieval surface in `list_records`.
3. Added the `approval-semantics` structural validator so non-CF records fail if they carry `source_basis.direct_user_approval`, while accepted CFs still require that field.
4. Fixed the continuity-audit RP producer to use `source_basis.user_approved` instead of the CF-only `direct_user_approval` field.
5. Added the SPEC-61 capstone integration test proving schema coverage, approval semantics, RP template output, CF no-regression, world-index node emission, and unchanged EPE retrieval together.

Deviations:

1. SPEC61PROSURSCH-001 proved proposal batches and pressure-event batches have divergent frontmatter, so the implementation landed nine schemas/node types rather than a shared batch schema.
2. The capstone does not add a checked-in fixture subtree; it generates a minimal temp world under `/tmp` and removes it after the test.

Verification:

1. PASS — `cd tools/validators && npm test` (`808` tests passed).
2. PASS — `cd tools/world-index && npm run build`.
3. PASS — `cd tools/world-index && npm test` (`127` tests passed).
4. PASS — `cd tools/world-mcp && npm run build`.
5. PASS — `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` (`5` tests passed).
