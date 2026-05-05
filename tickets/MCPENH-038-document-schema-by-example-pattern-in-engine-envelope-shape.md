# MCPENH-038: Document schema-by-example pattern in engine-envelope-shape.md

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — three parallel reference docs at `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `.claude/skills/create-base-world/references/engine-envelope-shape.md`. No code changes.
**Deps**: none

## Problem

Each of the three engine-routing skills (`branching-story-bootstrap`, `canon-addition`, `create-base-world`) carries a parallel `references/engine-envelope-shape.md` file. Each file's §1 enumerates only two patterns for envelope-construction schema discovery:

1. **Live retrieval**: `mcp__worldloom__get_record_schema` and `mcp__worldloom__describe_envelope_schema` MCP tools.
2. **Offline / debugging fallback**: direct `Read` of schema files at `tools/validators/src/schemas/` and `tools/patch-engine/src/envelope/schema.ts`.

The doc does not name a third pattern that operators routinely use during envelope construction: **schema-by-example via direct Read of an existing world record under `_source/<class>/<ID>.yaml`**. This pattern provides both schema AND realistic field-population in one read, which is more useful during envelope construction than a bare JSON schema — a representative existing record carries every operationally-required field (including the soft-required ones the JSON schema marks as optional but operator-discipline expects), and is single-file lightweight versus the persisted overflow path the schema-discovery MCP tools sometimes return on big enums. The doc-omission leaves operators improvising in unfamiliar territory and risks one operator using `get_record_schema` + reinventing field-population while another uses schema-by-example without any documented endorsement.

## Assumption Reassessment (2026-05-05)

1. **Codebase reassessment** — `grep -niE 'schema.by.example|schema-by-example|existing record.*template|existing record.*as.*reference' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md tools/patch-engine/README.md` returns zero matches across all five surfaces. Phase 5 verification confirms the pattern is genuinely undocumented at HEAD. The two existing patterns are documented at `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md:5` (the §1 prose explicitly framing the binary primary/fallback choice).
2. **Doc reassessment** — the §1 prose at `engine-envelope-shape.md:5` reads: *"operationally use the MCP `get_record_schema` and `describe_envelope_schema` tools for live retrieval — direct `Read` of the schema files is a fallback for offline / debugging contexts only."* The phrasing implies a binary primary/fallback choice; it does not acknowledge a third operationally-useful pattern. The cross-skill reference at `engine-envelope-shape.md:5` confirms the doc is parallel across three skills (*"The parallel references for sibling engine-routing skills are `.claude/skills/canon-addition/references/engine-envelope-shape.md` and `.claude/skills/create-base-world/references/engine-envelope-shape.md`"*). The change must apply to all three to keep the parallel surfaces aligned.
3. **Cross-skill / shared-boundary identification** — the shared boundary under audit is the parallel `engine-envelope-shape.md` reference doc surface across the three engine-routing skills (`branching-story-bootstrap`, `canon-addition`, `create-base-world`). Each is the canonical envelope-construction reference for its skill; their §1 sections cover the same schema-discovery primary/fallback contract verbatim by intent. The change must land on all three simultaneously to preserve the cross-skill parity. Adjacent skills like `branching-story-page-cycle` consume the bootstrap reference by pointer (per `branching-story-page-cycle/SKILL.md` Phase 11 §1a citation) — they pick up the change transitively without needing their own edits.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Doc enumeration of three patterns (chosen)**: explicitly acknowledge the operational reality — operators have three valid paths and should pick by ergonomic fit. Schema-by-example via existing records is the right tool when envelope construction needs realistic field-population alongside schema; live MCP retrieval is the right tool when the operator wants the formal JSON schema; direct schema-file Read is the right tool when the MCP server is unavailable or debugging the schema itself.
   - **Add a new MCP tool returning field-populated examples (rejected, separate concern)**: this would be an MCP feature ticket (separate MCPENH), not a docs ticket. The existing `get_record` MCP tool already returns field-populated records when given an existing id; pointing operators at it is the cheap intervention.
   - **Deprecate schema-by-example (rejected)**: the pattern is operationally useful and harmless — Hook 2 does not block single-file Reads of `_source/<class>/<ID>.yaml`, so existing-record reads are first-class operations. Deprecating would push operators back to reinventing field-population from a bare schema, which is strictly worse.
   - **Leave the doc silent (current state)**: encourages operators to reinvent the pattern without documented endorsement; surfaced in this audit's session evidence.
2. **No backwards-compat shims**: pure documentation clarification. No code paths, schemas, or operator workflows change beyond the doc reading.

## Verification Layers

1. **Doc-prose enumerates three patterns with rationale per pattern** → manual review of post-edit content of `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` §1, `.claude/skills/canon-addition/references/engine-envelope-shape.md` §1, and `.claude/skills/create-base-world/references/engine-envelope-shape.md` §1.
2. **Cross-skill parity preserved** → grep-proof: `grep -niE 'schema.by.example|schema-by-example' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/create-base-world/references/engine-envelope-shape.md` returns at least one match per file.
3. **Single-layer documentation ticket** — additional verification layer mapping is not applicable; the change is doc-only and verifiable by manual prose review.

## What to Change

### 1. Add the schema-by-example pattern to bootstrap's engine-envelope-shape.md §1

`.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify §1). After the existing prose enumerating live MCP retrieval and offline schema-file Read fallback, add a sentence (or short paragraph) that:

- Names the third pattern: schema-by-example via direct Read of an existing record under `_source/<class>/<ID>.yaml`.
- Names the rationale: schema + realistic field-population in one read; preferred when envelope construction needs both the structural shape and a working example of all soft-required-by-discipline fields populated.
- Names the constraint: requires a representative existing record of the target class to exist in the world / story bundle (always true for skills extending an existing world; may fail at genesis bootstrap when no record of the target class yet exists, in which case live MCP retrieval or schema-file Read is the right path).

### 2. Apply the same edit to canon-addition's parallel reference

`.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify §1). Identical addition.

### 3. Apply the same edit to create-base-world's parallel reference

`.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify §1). Identical addition. Note that the constraint clause ("requires a representative existing record of the target class to exist") binds harder for create-base-world (genesis bootstrap), so the prose should make the constraint explicit rather than implicit.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify)

## Out of Scope

- Implementing a new MCP tool that returns field-populated examples (would be a separate MCPENH ticket; current `get_record(record_id)` already covers this case for any existing-record id).
- Touching schema files at `tools/validators/src/schemas/` or `tools/patch-engine/src/envelope/schema.ts`. The JSON schemas are correct; only the doc enumeration of operator-pragma patterns is incomplete.
- Updating `docs/MACHINE-FACING-LAYER.md` or per-package READMEs at `tools/world-mcp/README.md`, `tools/patch-engine/README.md`. These docs cover the formal MCP / engine API surfaces; schema-by-example is an operator-pragma layered above the API and lives in skill-reference docs, not in pipeline-level package docs.
- Skill-prose updates in any of the three engine-routing skills' SKILL.md files. The §1 reference doc is the right surface for the addition; SKILL.md files point at the reference and pick up the change transitively.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -cE 'schema.by.example|schema-by-example' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` returns at least 1 match.
2. `grep -cE 'schema.by.example|schema-by-example' .claude/skills/canon-addition/references/engine-envelope-shape.md` returns at least 1 match.
3. `grep -cE 'schema.by.example|schema-by-example' .claude/skills/create-base-world/references/engine-envelope-shape.md` returns at least 1 match.

### Invariants

1. The three engine-envelope-shape.md docs each enumerate three patterns for schema discovery (live MCP retrieval, offline schema-file Read, schema-by-example via existing record).
2. Each doc names the rationale for picking schema-by-example over the other two patterns (schema + realistic field-population in one read).
3. The constraint clause (target-class record must exist) is explicit in each doc, with the create-base-world variant making the genesis-bootstrap caveat extra-explicit.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -niE 'schema.by.example|schema-by-example' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/create-base-world/references/engine-envelope-shape.md` — confirm the new pattern is enumerated in all three docs (3+ matches expected).
2. `git diff -- .claude/skills/*/references/engine-envelope-shape.md` — manual review confirms cross-skill parity (the same paragraph addition lands in each of the three docs with appropriate per-skill framing for create-base-world's genesis-bootstrap caveat).
