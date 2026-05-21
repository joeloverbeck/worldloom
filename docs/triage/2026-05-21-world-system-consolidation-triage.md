# Triage — World-System Consolidation (first iteration)

**Date:** 2026-05-21
**Source report:** `reports/world-system-consolidation-first-iteration.md` (ChatGPT-Pro)
**Method:** every load-bearing claim verified against `main` via parallel codebase exploration before triage.
**Deliverables:** `specs/SPEC-61-proposal-surface-schema-and-approval-enforcement.md`, `specs/SPEC-62-foundations-and-docs-world-system-reconciliation.md`

## Headline

The world system is **not** riddled with massive problems. It is fairly disciplined: Hook 3 enforces
engine-only `_source/` writes, every mature surface (CF/CH/INV/M/OQ/ENT/SEC, CHAR/DA/PA, NCP/NCB, all
story classes) is JSON-schema-backed and structurally validated, and approval semantics are documented.
The genuine gap is exactly where the user's intuition pointed: the **least-iterated, least-validated
proposal/audit/pressure surfaces**, plus a few documentation-drift items. The warranted work is two
tight specs — not the report's 11-fault / 10-validator / 12-rename program.

## Verification corrections (report claims that were wrong or overstated)

| Claim | Verdict | Ground truth |
|---|---|---|
| Approval semantics are overloaded across many fields | **overstated** | Only two fields exist: `user_approved` (all pre-acceptance, documented as "kept in batch, NOT canonized") and `direct_user_approval` (accepted CFs + RP). The 12-name rename describes non-existent vocabulary. |
| RP cards misuse `direct_user_approval` | **verified** | `continuity-audit/templates/retcon-proposal-card.md:104` + `SKILL.md:138` set the CF-reserved field `true`. Real FOUNDATIONS (355–361) violation. |
| DA `claim_map.canon_status` uses canon-like `contested_canon` status | **refuted** | Enum is `canonically_true / canonically_false / partially_true / contested / mystery_adjacent / prohibited_for_this_artifact`. Never `contested_canon`. Phase 7 firewall already prevents laundering. |
| DA "contested canon at strongest" prose | **verified (minor)** | Exists at SKILL.md:106,178; imprecise but not a blocker. |
| MCP vocabulary drift (`canon_fact` vs `canon_fact_record`) | **refuted** | `node_type` vs `record_type` are intentionally distinct; skills use both correctly. |
| `create-base-world` mandates forbidden mystery uniquely | **refuted** | Requires "at least one of each" status symmetrically (`SKILL.md:43,93`). |
| `propose-new-worlds-from-preferences` mandates forbidden mystery | **verified** | `SKILL.md:244` — "every card MUST declare at least one forbidden mystery." Exceeds Rule 7. |
| Proposal/audit/pressure/world-proposal surfaces lack schemas | **verified (strongest finding)** | PR/BATCH/EPE/EPE-sidecar/AU/RP/NWP/NWB have zero schemas; absent from `RECORD_TYPE_TO_SCHEMA` and node-type enumeration. |
| `passive_depth` status assumed to exist | **verified** | In `MYSTERY_STATUS_ENUM` + schema, but undocumented in FOUNDATIONS (drift). |
| `pressure-events/` missing from REPOSITORY-MAP | **verified** | Zero mentions. |
| EPE under-mapped; should be indexed | **partially verified / over-reach** | Allocator-tracked + task_type supported, but non-indexing is deliberate (file-scanned until canonized). |
| "23 baseline domains / 14-layer world essence" | **refuted** | Canonical domains = 27; no 14-layer essence (only a 7-layer character essence). |
| No artifact-maturity reference exists | **verified** | `_shared-references/` holds only `protagonist-grade-character-engine.md`. |

## Verdicts

### ACCEPT → SPEC-61 (executable coverage)
- **A1** Schema coverage for PR/BATCH/EPE/EPE-sidecar/AU/RP/NWP/NWB (Fault 5). Mechanical, verified gap.
- **A2** Hard-fail non-CF `direct_user_approval`; fix the RP collision (genuine sliver of Fault 2).

### ACCEPT → SPEC-62 (FOUNDATIONS + docs)
- **A3** Document `passive_depth` (Fault, drift); add `pressure-events/`+`world-proposals/`+EPE
  indexing-asymmetry note to REPOSITORY-MAP (Fault 9, narrowed); fix DA "contested canon" prose (Fault 3, prose only).
- **A4** Relax forbidden-mystery mandate in `propose-new-worlds-from-preferences` to strong-default +
  `forbidden_mystery_absence_rationale` (Fault 4, narrowed — `resolution_intent` enum dropped).
- **A5** FOUNDATIONS §Artifact Authority and Maturity paragraph (Fault 1, replaces the ladder file — user-directed).
- **A6** FOUNDATIONS §World Generativity vs Story-Bundle State paragraph (Fault 6, fences existing terms; no renames — user-directed).

### REJECT
- **R1** 12-name approval-rename taxonomy (Fault 2 bulk) — YAGNI; non-existent vocabulary; large blast radius; no consumer. A2 covers the real defect.
- **R2** DA `canon_status` → `claim_relation_to_canon` rename (Fault 3) — premise refuted; name precise; firewall exists.
- **R3** MCP contract-drift program / `mcp_contract_validator` (Fault 8) — drift refuted; nothing to catch.
- **R4** Make EPE schema-backed/indexed-for-retrieval (Fault 9 over-reach) — non-indexing is by design.

### DEFER (no current consumer / dependent on ACCEPT work landing)
- **D1** Mass story-term rename → superseded by A6 (FOUNDATIONS boundary paragraph) per user direction.
- **D2** 9/10-level maturity-ladder shared-reference file → superseded by A5 (FOUNDATIONS paragraph) per user direction.
- **D3** `taxonomy_authority_validator` (Fault 7) — low value, heavy; mostly a labeling task.
- **D4** CF-1 sibling-genesis-CF split (Fault 10) — reasonable flexibility, not urgent; skill-prose only.
- **D5** continuity-audit compatibility checks / `world_compatibility_validator` (Fault 11) — depends on SPEC-61 schemas existing first.
- **D6** Routing proposal direct-writes through the patch engine (report §9.5) — explicitly deferred there.

## Open questions resolved with user (2026-05-21)
- Story-facing terminology → **FOUNDATIONS boundary paragraph only** (A6); no renames.
- Maturity ladder ambition → **FOUNDATIONS §Artifact Authority paragraph** (A5); no shared-reference file.
