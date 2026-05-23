# FOUNDATIONS-006: Add `STCHAR` / `story_character_authority_record` to Canonical Storage Layer read-discipline enumeration

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` only (no code or schema change).
**Deps**: `archive/tickets/FOUNDATIONS-002.md` (worked precedent — same per-class enumeration discipline at the Canonical Storage Layer §ID-format paragraph).

## Problem

At intake, `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline enumerated hybrid records as `(CHAR-<integer>, DA-<integer>, PA-<integer>, NCP-<integer>, NCB-<integer>)` retrievable via `get_record(record_id)` with optional `section_path` projection, and listed the whole-class enumeration `list_records(record_type='character_record'|'diegetic_artifact_record'|'adjudication_record'|'character_proposal_card'|'character_proposal_batch')`. Both enumerations omitted `STCHAR-<integer>` / `story_character_authority_record`, even though SPEC-56 added STCHAR as a hybrid story-bundle authority artifact (shared contract `.claude/skills/_shared-templates/story-state-contract.md` §3 lists it as a hybrid record class) AND the pipeline already supports it:

- `tools/world-mcp/src/tools/get-record.ts:119` — `HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|STCHAR|DA|PA|NCP|NCB)-\d+$/` accepts STCHAR ids.
- `tools/world-mcp/src/tools/get-record.ts:187` — the tool description enumerates STCHAR among hybrid retrievables.
- `tools/world-mcp/src/tools/list-records.ts` — the `record_type` enum includes `story_character_authority_record`.

At intake, the contract semantics ("hybrid records retrievable via `get_record` with `section_path` projection; whole-class enumeration via `list_records`") already implicitly covered STCHAR — the pipeline behavior was correct. Only the per-class enumeration list in FOUNDATIONS §Canonical Storage Layer §Read discipline was incomplete.

Session evidence (`commitment-block-authoring direct_batch` on red-bunny, this Claude session): for two STCHAR profiles whose persona, voice, and pressure behavior were load-bearing for SLT-22 (Jon-side recovery) and SLT-24 (Ane-led negotiation) beat authoring, the operator defaulted to Bash `grep` (find section headers) + `Read` (with offset/limit) instead of `mcp__worldloom__get_record(record_id='STCHAR-1', section_path='body.<section>')` despite the MCP tool supporting STCHAR projection at HEAD. The skill prose at `.claude/skills/commitment-block-authoring/SKILL.md` §Pre-flight step 6 said "retrieve the relevant full or projected STCHAR sections" without naming `get_record`, and FOUNDATIONS — the contract source — did not enumerate STCHAR among the projectable hybrid classes; both surfaces converged to leave the MCP path unsignposted at the point of retrieval choice.

This is a per-class enumeration completeness gap parallel to FOUNDATIONS-002's ID-format-convention enumeration discipline (which explicitly named the rule that hybrid + pipeline + story-bundle classes share the unpadded-natural-integer format). Adding STCHAR to both the get_record example list and the list_records record_type enum aligns the contract documentation with the pipeline's existing capability.

## Assumption Reassessment (2026-05-23)

1. At intake, grep against `docs/FOUNDATIONS.md` confirmed line 584's hybrid-record enumeration was `(CHAR-<integer>, DA-<integer>, PA-<integer>, NCP-<integer>, NCB-<integer>)` and the `list_records` record_type enum example was `character_record|diegetic_artifact_record|adjudication_record|character_proposal_card|character_proposal_batch`. Independently, grep against `tools/world-mcp/src/tools/get-record.ts` confirmed `HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|STCHAR|DA|PA|NCP|NCB)-\d+$/` AND `tools/world-mcp/src/tools/list-records.ts` carries `story_character_authority_record` in the record_type enum at HEAD. The pipeline supports STCHAR hybrid retrieval and section_path projection; FOUNDATIONS' per-class enumeration was stale. The live shared contract path is `.claude/skills/_shared-templates/story-state-contract.md`, not root `_shared-templates/story-state-contract.md`; §3 correctly lists `STCHAR` as a hybrid story-bundle authority artifact. **Rule 6 retcon attribution**: existing behavior — FOUNDATIONS' hybrid-retrieval enumeration named five classes; new behavior — it names six (the five existing plus STCHAR); the warrant is SPEC-56's addition of STCHAR as a hybrid record class whose retrieval the pipeline already supports but whose enumeration in the contract document was not updated to match.
2. Doc reassessment: this is purely a `docs/FOUNDATIONS.md` enumeration completeness fix; no code, schema, hook, or test change is in scope. The shared contract `.claude/skills/_shared-templates/story-state-contract.md` §3 already lists STCHAR correctly, so cross-document consistency is the convergence direction (FOUNDATIONS to match the contract + the pipeline, not the other way). No skill-prose change is in this ticket's scope; if the operator-discipline gap in `commitment-block-authoring`'s STCHAR retrieval guidance warrants its own correction, that routes through `/skill-audit .claude/skills/commitment-block-authoring` separately.
3. Shared boundary under audit: the per-class enumeration contract between (a) FOUNDATIONS §Canonical Storage Layer §Read discipline (the prose enumeration authors read), (b) the MCP retrieval surface in `tools/world-mcp/src/tools/get-record.ts` + `list-records.ts` (the implementation authority for hybrid retrieval), and (c) the shared contract `.claude/skills/_shared-templates/story-state-contract.md` §3 (the story-bundle record class inventory). The pipeline (b) is authoritative on capability; the shared contract (c) is already correctly updated for STCHAR; this ticket updates (a) to match both.
4. **FOUNDATIONS principle restatement**: §Canonical Storage Layer §Read discipline's enumeration rule — "hybrid records are retrievable via `get_record(record_id)` with optional `section_path` projection" — must enumerate every hybrid class the pipeline supports, so authors and skill operators reading the contract can route to typed retrieval without inferring class support from absence. Per-class enumeration completeness is the FOUNDATIONS-002 discipline applied at this enumeration site: the contract names every class explicitly to prevent silent gaps between contract scope and pipeline capability. The §Tooling Recommendation ("LLM agents should never operate on prose alone… current World Kernel… relevant canon fact records…") is the load-bearing principle this enumeration serves; an author who relies on FOUNDATIONS' enumerated list of projectable classes makes the right retrieval choice only when the enumeration is complete.

## Architecture Check

1. **Documentation-side fix.** The pipeline behavior is correct; no code or schema change is needed. The contract document is the divergent artifact and the only file modified. Adding `STCHAR-<integer>` to the hybrid-record enumeration example list (parenthetical at line 584) AND adding `story_character_authority_record` to the `list_records` record_type enum example list is a two-token expansion. This is cleaner than the alternative of leaving the enumeration partial — the implicit "any hybrid class works" interpretation requires authors to know which classes are hybrid, which requires reading the shared contract §3, which defeats the purpose of FOUNDATIONS being the load-bearing entry-point document.
2. **No backwards-compatibility aliasing/shims introduced.** The change is additive — two existing class enumerations gain one item each. No retired-doc-form is introduced; no two-form-acceptance shim is added; no deprecation marker is needed.

## Verification Layers

1. Per-class enumeration completeness → FOUNDATIONS alignment check: grep `docs/FOUNDATIONS.md` for `Hybrid records` and `list_records(record_type=` and confirm STCHAR / `story_character_authority_record` appear in both enumerations.
2. Contract-pipeline parity → codebase grep-proof: cross-reference `docs/FOUNDATIONS.md` line 584 against `tools/world-mcp/src/tools/get-record.ts:119` (HYBRID_RECORD_ID_PATTERN) and against `tools/world-mcp/src/tools/list-records.ts` (record_type enum) — every hybrid class one document names must appear in the others.
3. Shared-contract consistency → manual review: confirm `.claude/skills/_shared-templates/story-state-contract.md` §3 record-class inventory matches the updated FOUNDATIONS enumeration (STCHAR present in both).

## Landed Changes

### 1. FOUNDATIONS §Canonical Storage Layer §Read discipline — add STCHAR to both enumerations

In `docs/FOUNDATIONS.md` at the **Read discipline** paragraph of §Canonical Storage Layer:

- **Hybrid-record enumeration** now lists `STCHAR-<integer>` alongside `CHAR-<integer>`, `DA-<integer>`, `PA-<integer>`, `NCP-<integer>`, and `NCB-<integer>`.
- **`list_records` record_type enum example** now lists `story_character_authority_record` alongside the existing hybrid record types.

Order preserves the existing convention (`CHAR` listed first as the original world-canon class; `STCHAR` inserted next as the story-local extension; the rest unchanged).

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)
- `archive/tickets/FOUNDATIONS-006.md` (modify — closeout truthing)

## Out of Scope

- Any code or schema change in `tools/world-mcp/`, `tools/world-index/`, or `tools/validators/` — the pipeline already supports STCHAR hybrid retrieval and section_path projection; this is a documentation-completeness fix only.
- Any change to `.claude/skills/_shared-templates/story-state-contract.md` — §3 already correctly lists STCHAR as a hybrid story-bundle class.
- Any correction to skill prose that omits naming `get_record` for STCHAR retrieval — that's a skill-audit concern (`/skill-audit .claude/skills/commitment-block-authoring`), not a FOUNDATIONS amendment.
- Any retroactive update of other FOUNDATIONS sections to enumerate STCHAR — only §Canonical Storage Layer §Read discipline has the per-class enumeration; other sections refer to hybrid records generically.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'STCHAR-<integer>' docs/FOUNDATIONS.md` — STCHAR appears in the §Canonical Storage Layer §Read discipline hybrid-record enumeration at line ~584.
2. `grep -n "story_character_authority_record" docs/FOUNDATIONS.md` — `story_character_authority_record` appears in the §Canonical Storage Layer §Read discipline `list_records` record_type enum example at line ~584.
3. `grep -niE 'Hybrid records.*STCHAR|story_character_authority_record|STCHAR.*hybrid markdown artifact' docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md` — both documents enumerate STCHAR among hybrid/story-character-authority records (FOUNDATIONS §Canonical Storage Layer; shared contract §3).

### Invariants

1. Every hybrid record class supported by `tools/world-mcp/src/tools/get-record.ts` HYBRID_RECORD_ID_PATTERN appears in FOUNDATIONS §Canonical Storage Layer §Read discipline's hybrid-record enumeration.
2. Every story-bundle hybrid class supported by `tools/world-mcp/src/tools/list-records.ts` record_type enum appears in FOUNDATIONS §Canonical Storage Layer §Read discipline's `list_records` example.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n 'STCHAR-<integer>' docs/FOUNDATIONS.md` — confirms STCHAR appears in the hybrid-record enumeration.
2. `grep -n 'story_character_authority_record' docs/FOUNDATIONS.md` — confirms `story_character_authority_record` appears in the `list_records` record_type enum example.
3. `grep -niE 'Hybrid records.*STCHAR|story_character_authority_record|STCHAR.*hybrid markdown artifact' docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md` — confirms the updated docs align with the live shared story-state contract.
4. `grep -niE 'HYBRID_RECORD_ID_PATTERN' tools/world-mcp/src/tools/get-record.ts && grep -niE 'story_character_authority_record' tools/world-mcp/src/tools/list-records.ts` — confirms the documentation enumeration matches the pipeline's actual hybrid-record support at HEAD (no code change in this ticket, but the parity check is the verification surface for the contract-pipeline alignment invariant).

## Outcome

Completed: 2026-05-23.

FOUNDATIONS-006 is implemented. `docs/FOUNDATIONS.md` §Canonical Storage Layer §Read discipline now enumerates `STCHAR-<integer>` as a projectable hybrid record and includes `story_character_authority_record` in the `list_records(record_type=...)` hybrid enumeration.

## Verification Result

- `grep -n 'STCHAR-<integer>' docs/FOUNDATIONS.md` passed: the read-discipline hybrid-record enumeration includes `STCHAR-<integer>`.
- `grep -n 'story_character_authority_record' docs/FOUNDATIONS.md` passed: the read-discipline `list_records(record_type=...)` example includes `story_character_authority_record`.
- `grep -niE 'Hybrid records.*STCHAR|story_character_authority_record|STCHAR.*hybrid markdown artifact' docs/FOUNDATIONS.md .claude/skills/_shared-templates/story-state-contract.md` passed: FOUNDATIONS and the live shared story-state contract both name STCHAR in the relevant hybrid/story-character-authority surfaces.
- `grep -niE 'HYBRID_RECORD_ID_PATTERN' tools/world-mcp/src/tools/get-record.ts && grep -niE 'story_character_authority_record' tools/world-mcp/src/tools/list-records.ts` passed: the docs enumeration matches the existing MCP retrieval and listing surfaces.
- `git diff --check` passed.

## Deviations

- The ticket's drafted shared-contract path `_shared-templates/story-state-contract.md` did not exist at repo root. The live authority is `.claude/skills/_shared-templates/story-state-contract.md`; the ticket and proof command were corrected to that path during reassessment.
- No package tests were run because this was a documentation-only enumeration completeness fix and live source grep confirmed the MCP code already supports STCHAR retrieval/listing.
