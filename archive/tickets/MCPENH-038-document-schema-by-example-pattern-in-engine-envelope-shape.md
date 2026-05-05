# MCPENH-038: Document schema-by-example pattern in engine-envelope-shape.md

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — three parallel reference docs at `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `.claude/skills/create-base-world/references/engine-envelope-shape.md`. No code changes.
**Deps**: none

## Problem

At intake, each of the three engine-routing skills (`branching-story-bootstrap`, `canon-addition`, `create-base-world`) carried a parallel `references/engine-envelope-shape.md` file whose opening schema-discovery prose enumerated only two patterns for envelope construction:

1. **Live retrieval**: `mcp__worldloom__get_record_schema` and `mcp__worldloom__describe_envelope_schema` MCP tools.
2. **Offline / debugging fallback**: direct `Read` of schema files at `tools/validators/src/schemas/` and `tools/patch-engine/src/envelope/schema.ts`.

The docs did not name a third pattern that operators routinely use during envelope construction: **schema-by-example via direct Read of an existing world or story-bundle record under `_source/<class>/<ID>.yaml`**. This pattern provides both schema and realistic field-population in one read, which is more useful during envelope construction than a bare JSON schema when a representative record exists.

## Assumption Reassessment (2026-05-05)

1. **Codebase reassessment** — the intake grep `grep -niE 'schema.by.example|schema-by-example|existing record.*template|existing record.*as.*reference' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md tools/world-mcp/README.md tools/patch-engine/README.md` returned zero matches across all five surfaces. That confirmed the pattern was genuinely undocumented before this ticket's edit. The two existing patterns were documented in the opening prose of `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, and `.claude/skills/create-base-world/references/engine-envelope-shape.md`.
2. **Doc reassessment** — the opening prose in the target files framed schema discovery around live MCP retrieval and direct schema-file reads. The phrasing implied a binary primary/fallback choice and did not acknowledge a third operationally useful pattern. The change had to apply to all three target reference docs to keep the parallel surfaces aligned.
3. **Cross-skill / shared-boundary identification** — the shared boundary under audit is the parallel `engine-envelope-shape.md` reference doc surface across the three engine-routing skills (`branching-story-bootstrap`, `canon-addition`, `create-base-world`). Each is the canonical envelope-construction reference for its skill; their §1 sections cover the same schema-discovery primary/fallback contract by intent. The change landed on all three simultaneously to preserve cross-skill parity. Adjacent skills like `branching-story-page-cycle` consume the bootstrap reference by pointer (per `branching-story-page-cycle/SKILL.md` Phase 11 §1a citation), so they pick up the change transitively without needing their own edits.
4. **HARD-GATE discipline reassessment** — `docs/HARD-GATE-DISCIPLINE.md` keeps live MCP schema retrieval and patch-plan validate/submit as the formal machine-facing validation paths. This ticket does not weaken approval-token handling, validate/submit behavior, pre-apply validation, or canon-write ordering; it only documents a read-only operator aid for field-population when a representative committed record already exists.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Doc enumeration of three patterns (chosen)**: explicitly acknowledge the operational reality — operators have three valid paths and should pick by ergonomic fit. Schema-by-example via existing records is the right tool when envelope construction needs realistic field-population alongside schema; live MCP retrieval is the right tool when the operator wants the formal JSON schema; direct schema-file Read is the right tool when the MCP server is unavailable or debugging the schema itself.
   - **Add a new MCP tool returning field-populated examples (rejected, separate concern)**: this would be an MCP feature ticket (separate MCPENH), not a docs ticket. The existing `get_record` MCP tool already returns field-populated records when given an existing id; pointing operators at it is the cheap intervention.
   - **Deprecate schema-by-example (rejected)**: the pattern is operationally useful and harmless — Hook 2 does not block single-file Reads of `_source/<class>/<ID>.yaml`, so existing-record reads are first-class operations. Deprecating would push operators back to reinventing field-population from a bare schema, which is strictly worse.
   - **Leave the doc silent (intake state)**: would have encouraged operators to reinvent the pattern without documented endorsement; surfaced in this audit's session evidence.
2. **No backwards-compat shims**: pure documentation clarification. No code paths, schemas, or operator workflows change beyond the doc reading.

## Verification Layers

1. **Doc-prose enumerates three patterns with rationale per pattern** → manual review of post-edit content of `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` §1, `.claude/skills/canon-addition/references/engine-envelope-shape.md` §1, and `.claude/skills/create-base-world/references/engine-envelope-shape.md` §1.
2. **Cross-skill parity preserved** → grep-proof: `grep -niE 'schema.by.example|schema-by-example' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/create-base-world/references/engine-envelope-shape.md` returns at least one match per file.
3. **Single-layer documentation ticket** — additional verification layer mapping is not applicable; the change is doc-only and verifiable by manual prose review.

## Landed Changes

### 1. Add the schema-by-example pattern to bootstrap's engine-envelope-shape.md §1

`.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` now names schema-by-example via direct `Read` of a representative story-bundle record under `worlds/<world-slug>/stories/<story-slug>/_source/<class>/<ID>.yaml`, states the schema + realistic-field-population rationale, and notes that a committed target-class record or close same-world example must exist.

### 2. Apply the same edit to canon-addition's parallel reference

`.claude/skills/canon-addition/references/engine-envelope-shape.md` now names schema-by-example via direct `Read` of a representative world `_source` record or indexed hybrid record that the plan will mirror, with the same rationale and existing-record constraint.

### 3. Apply the same edit to create-base-world's parallel reference

`.claude/skills/create-base-world/references/engine-envelope-shape.md` now names schema-by-example via direct `Read` of a representative record from another world and makes the genesis caveat explicit: the new target world usually has no same-class record yet, so live MCP schema retrieval or schema-file fallback remains the path when no representative example exists.

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

### Tests That Passed

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

## Outcome

Completed on 2026-05-05. The three parallel engine-envelope-shape reference docs now document schema-by-example as a third valid operator pattern alongside live MCP schema retrieval and offline schema-file reads. Each doc states the rationale, keeps live MCP/schema files as formal authorities, and names the existing-record constraint with skill-appropriate framing.

## Verification Result

1. `grep -niE 'schema.by.example|schema-by-example' .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/create-base-world/references/engine-envelope-shape.md` returned one match in each target file.
2. `git diff -- .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/create-base-world/references/engine-envelope-shape.md` was manually reviewed and confirmed that only the intended reference-doc paragraphs changed.

## Deviations

None.
