# VALENH-043: Align `derived_from` cross-reference patterns across story-record schemas with FOUNDATIONS-002 actual ID prefixes

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — regex-pattern updates to 5 story-record JSON schemas in `tools/validators/src/schemas/`; extended schema-compliance tests assert the corrected pattern
**Deps**: None

## Problem

At intake, 5 story-record JSON schemas — `story-fact`, `story-thread`, `story-relationship`, `story-consequence`, `story-diegetic-artifact` — declared their `derived_from.items.pattern` as a closed alternation that included the literal token `INV` but excluded the actual prefix-tokens the world uses for invariants and entities. The pre-ticket pattern (identical across the 5 schemas, modulo the `STCHAR` inclusion on `story-relationship`):

```
^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$
```

Two failures of that pattern relative to actual world canon:

1. **`INV-` was a dead branch.** FOUNDATIONS §Canonical Storage Layer (FOUNDATIONS-002) commits invariants to category-specific prefixes (`ONT-`, `CAU-`, `DIS-`, `SOC-`, `AES-`) — *not* a generic `INV-N` form. Historical intake verification: `ls worlds/erotica-world/_source/invariants/` returned `AES-1.yaml AES-2.yaml CAU-1.yaml CAU-2.yaml DIS-1.yaml DIS-2.yaml ONT-1.yaml ONT-2.yaml SOC-1.yaml SOC-2.yaml` — zero `INV-N` files existed on the live world. Operators who attempted to cite an invariant in `derived_from` (e.g., `SOC-2` for an SF mirroring the Spanish age-of-consent law) were rejected by the `INV-`-allowing pattern that the actual invariant ID did not match.
2. **`ENT-` was omitted entirely.** The pre-ticket pattern had no token for the `ENT-N` named-entity record class even though entities are first-class world records under `_source/entities/` (FOUNDATIONS §Mandatory World Files). Operators wanting to cite a place / faction / institution entity in `derived_from` (e.g., historical intake evidence used `ENT-0002` for an SF rooted in Irun as the scene's geographic anchor) hit the same pattern-rejection failure.

Historical session evidence: during the `branching-story-bootstrap` invocation that initialized `worlds/erotica-world/stories/red-bunny/`, the first `validate-patch-plan` cycle returned `record_schema_compliance.pattern` failures on `SF-1.derived_from[1]` (`SOC-2`), `SF-4.derived_from[0]` (`SOC-1`), `SF-6.derived_from[0]` (`ENT-0002`), `SF-6.derived_from[1]` (`DIS-2`), `SF-7.derived_from[0]` (`SOC-2`), `SF-7.derived_from[1]` (`ONT-2`). The operator-side fix was to remove the invariant and entity references entirely (yielding `derived_from: []`), which was operationally correct under the pre-ticket pattern but lost the legitimate provenance chain — the SFs genuinely *do* derive from those world-canon invariants and entities; the schema could not express the chain.

A parallel inconsistency remains out of scope: `story-status.schema.json` uses a broader pattern (`^(SE-[0-9]+|[A-Z]+[A-Z0-9]*-[0-9]+)$`) that accepts most category prefixes but still does not catch `SEC-X-N` cleanly. `story-plan.schema.json` and `story-emotion.schema.json` also retain the old `$defs.recordId` surface. This ticket lands only the 5 session-visible narrow-pattern repairs.

## Assumption Reassessment (2026-05-25)

1. Verified before implementation via the pattern-enumeration script: 5 schemas share the `(...|CF|CH|M|INV|SEC)-[0-9]+$` pattern (`story-fact`, `story-thread`, `story-consequence`, `story-diegetic-artifact` exactly identical; `story-relationship` adds `STCHAR` to the alternation). `story-status` uses a different broader pattern. `story-emotion` and `story-plan` use `$ref: "#/$defs/recordId"` and have the same `INV` / bare-`SEC` / missing world-prefix gap, but this ticket keeps them out of scope as the already-drafted adjacent cleanup surface rather than widening beyond the 5 session-visible schemas.
2. FOUNDATIONS §Canonical Storage Layer documents the per-class ID format conventions, including the category-prefix expansion for invariants (`CAU-1`) and section records (`SEC-GEO-1`). FOUNDATIONS-002 is the structural source. `docs/ID-ALLOCATION.md` documents the allocator surface that emits `<CLASS>-N` ids per class.
3. Cross-skill shared boundary: every story-pipeline skill that emits `derived_from` lists on SF / THR / SREL / CNSQ / DA records (currently `branching-story-bootstrap`, `branching-story-turn-cycle`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) is affected. The skill prose currently steers operators to CF-only references in `derived_from` (e.g., `phase-3-4-facts-beliefs-da.md` in `branching-story-bootstrap`'s references says "keep `derived_from` as a non-empty list containing the parent `CF-<integer>` ids"), so the gap is latent rather than blocking — but it surfaces when an operator legitimately wants to cite the invariant or entity a story-local fact rests on.
4. FOUNDATIONS principle under audit: FOUNDATIONS-002 §Canonical Storage Layer per-class ID format conventions ("Engine schemas and allocation checks use `^<CLASS>-[0-9]+$` patterns, with the class prefix expanded as needed for section records (`SEC-GEO-1`) or invariant categories (`CAU-1`)"). The pre-ticket `derived_from` patterns violated this prefix expansion — they used the unexpanded generic `INV-` for a class whose actual IDs all use the expanded prefix form. Fixing the patterns is a direct enforcement of FOUNDATIONS-002's prefix convention.
5. Schema extension shape: this is a prefix-pattern correction rather than a structural schema change. Existing consumers reading `derived_from` as a list of strings continue to work unchanged. Existing accepted story-bundle class ids plus CF / CH / M continue to validate; bare `SEC-N` is retired in favor of the actual `SEC-X-N` section form. The live package has an explicit `contract-schema-roundtrip` regression named "story schemas accept padded legacy cross-references", so suffix strictness is outside this ticket's seam. The fix REMOVES the dead `INV` token (no current intended record class uses it) and ADDS the actually-used prefixes (`ONT`, `CAU`, `DIS`, `SOC`, `AES`, `ENT`, `OQ`, plus the `SEC-X-N` two-level form). The two implementation strategies — explicit enumeration vs broader-pattern alignment with `story-status.schema.json` — were reassessed; this ticket uses **explicit enumeration** (safer, audit-traceable, doesn't accidentally accept future never-used prefixes).
6. Adjacent contradictions surfaced during reassessment: (a) `story-relationship.schema.json` is the ONLY schema in the family whose `derived_from` pattern includes `STCHAR` — the other 4 schemas exclude it deliberately per the contract's cross-class-provenance enumeration (`phase-5-debts-and-optional-seeds.md` enumerates STCHAR for SREL/STPLAN/STEMO/STINT only). This asymmetry is intentional (different relationship-record vs. situational-record semantics) and remains correct after the ticket lands — the `INV/ENT/SEC-X` fix preserves the per-schema STCHAR-inclusion divergence. (b) `story-status.schema.json` uses the broader `[A-Z]+[A-Z0-9]*-[0-9]+` pattern which catches `ONT-N` / `CAU-N` / `ENT-N` natively but STILL doesn't catch `SEC-GEO-N` (the prefix capture stops at `SEC`, then `-GEO-N` doesn't match `-[0-9]+`). (c) `story-plan.schema.json` and `story-emotion.schema.json` `$defs.recordId` use the old narrow alternation and need a future cleanup if those schemas should accept the same world-record provenance. Out-of-scope decision: this ticket fixes the 5 narrow patterns that produced session-visible failures; aligning `story-status`, `story-plan`, and `story-emotion` is a separate cleanup.
7. Suffix strictness correction: `docs/FOUNDATIONS.md` and `docs/ID-ALLOCATION.md` define unpadded IDs (`ENT-1`, `SEC-GEO-1`), but existing validator tests intentionally preserve padded legacy cross-reference acceptance (`CF-0005`, `STENT-0001`). Therefore this ticket tests new prefixes with unpadded examples while preserving the existing `[0-9]+` suffix grammar for these `derived_from` references. A future compatibility ticket can decide whether to retire padded legacy cross-reference acceptance package-wide.

## Architecture Check

1. **Explicit enumeration over permissive regex.** The patterns explicitly enumerate the valid prefix tokens because that doubles as documentation: a reader scanning the schema sees exactly which classes are referenceable. A broader regex (`[A-Z]+(-[A-Z]+)?-[0-9]+`) saves characters but invites future never-defined-prefixes to silently pass schema validation. The FOUNDATIONS-002 principle of "engine schemas use `^<CLASS>-[0-9]+$` patterns" is best honored by listing the closed class set.
2. **No backwards-compatibility shims.** No record at HEAD uses `INV-N` in `derived_from` (zero hits via repo grep), so dropping the dead `INV` token cannot break any existing consumer. The added prefixes are net-new acceptance; no callers currently rely on those references being rejected.

## Verification Layers

1. The 5 schemas' updated patterns accept the actual invariant/entity/section prefixes -> package-local tests construct fixture SF / THR / SREL / CNSQ / DA records with unpadded examples such as `derived_from: ["ONT-1", "CAU-2", "DIS-1", "SOC-2", "AES-1", "ENT-2", "SEC-GEO-1"]` and assert `record_schema_compliance` passes.
2. The dead `INV-N` token is rejected after pattern update -> tests assert `derived_from: ["INV-1"]` produces a `record_schema_compliance.pattern` failure (the dead branch is removed, not silently accepted).
3. Existing accepted values continue to pass -> full package regression plus the existing padded-legacy cross-reference roundtrip test.
4. `story-relationship.schema.json` retains its existing `STCHAR` inclusion -> focused SREL schema test plus schema inspection.
5. `story-status.schema.json` is unmodified -> path-scoped diff inspection; the broader-pattern decision for STSTAT is intentional out-of-scope.

## Landed Changes

### 1. Updated the 5 narrow `derived_from` patterns

Replaced the existing alternation in `story-fact.schema.json`, `story-thread.schema.json`, `story-consequence.schema.json`, `story-diegetic-artifact.schema.json`, and `story-relationship.schema.json` (preserving `STCHAR` in the relationship schema):

Pre-ticket (`story-fact` as representative):
```
^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$
```

Landed:
```
^((STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|OQ|ENT|ONT|CAU|DIS|SOC|AES)-[0-9]+|SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-[0-9]+)$
```

Changes encoded:
- Drop `INV` (dead — no record uses it).
- Drop bare `SEC` (replaced by the explicit `SEC-X-` two-level form).
- Add `OQ` (open-question records — present on the file system at `_source/open-questions/OQ-N.yaml`; legitimate cross-reference target the original pattern omitted).
- Add `ENT` (named-entity records — present on the file system at `_source/entities/ENT-N.yaml`).
- Add `ONT`, `CAU`, `DIS`, `SOC`, `AES` (the actual invariant category prefixes per FOUNDATIONS-002).
- Add `SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-[0-9]+` as a separate alternation branch (the actual section-record two-level form).

For `story-relationship.schema.json`, preserve the `STCHAR` token in the alternation. The other 4 schemas remain `STCHAR`-free per the intentional cross-class-provenance asymmetry.

### 2. Updated existing structural tests

The existing per-schema record-schema-compliance tests were extended with:

- Positive test: each updated-pattern schema accepts a fixture record with `derived_from` containing at least one of each newly-added prefix (`ONT-1`, `ENT-1`, `OQ-1`, `SEC-GEO-1`).
- Negative test: each updated-pattern schema rejects `derived_from: ["INV-1"]` (the dropped dead prefix).
- Regression: each updated-pattern schema continues to accept the pre-edit-valid set (CF, CH, M, story-bundle classes).

### 3. Out-of-scope follow-up handoff

`story-status.schema.json` (broader pattern, doesn't catch `SEC-X-N`) and the `recordId` definition referenced by `story-emotion.schema.json` and `story-plan.schema.json` still need a separate cleanup ticket if they should accept the same world-record provenance. This ticket scopes to the 5 narrow patterns that produced session-visible failures.

## Files to Touch

- `tools/validators/src/schemas/story-fact.schema.json` (modify — derived_from pattern)
- `tools/validators/src/schemas/story-thread.schema.json` (modify — derived_from pattern)
- `tools/validators/src/schemas/story-consequence.schema.json` (modify — derived_from pattern)
- `tools/validators/src/schemas/story-diegetic-artifact.schema.json` (modify — derived_from pattern)
- `tools/validators/src/schemas/story-relationship.schema.json` (modify — derived_from pattern; preserve STCHAR token)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — extend cross-pattern assertions)
- `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify — assert STCHAR retention plus new prefixes)
- `archive/tickets/VALENH-043.md` (modify — reassessment and closeout)

## Out of Scope

- `story-status.schema.json` derived_from pattern (broader pattern; doesn't catch `SEC-X-N` either but isn't producing session-visible failures; separate cleanup ticket).
- The `#/$defs/recordId` reference in `story-emotion.schema.json` / `story-plan.schema.json` (separate scope; recordId definition lives in a different shared-$defs surface).
- Skill-prose updates instructing operators to USE the newly-allowed prefixes (the existing prose correctly steers to CF-only references, which is the conservative path; relaxing skill-prose to encourage invariant/entity references in `derived_from` is a separate design decision).
- World-content migration to add invariant/entity references to existing SF / THR / SREL / CNSQ / DA records (the gap is forward-looking; existing records continue working unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all existing tests plus the new pattern-coverage tests pass.
2. A fixture SF / THR / CNSQ / DA / SREL record with `derived_from: ["ONT-1", "CAU-2", "ENT-1", "SEC-GEO-1"]` validates clean (no `record_schema_compliance.pattern` failures).
3. A fixture record with `derived_from: ["INV-1"]` produces a `record_schema_compliance.pattern` failure on each of the 5 updated schemas.
4. `story-relationship.schema.json` continues to accept `derived_from: ["STCHAR-1"]` (the deliberate per-schema asymmetry is preserved).

### Invariants

1. The 5 patterns conform to FOUNDATIONS-002 §Canonical Storage Layer's expanded prefix conventions for invariants, entities, open questions, and section records.
2. No intended current record whose `derived_from` validated under the old pattern is rejected by the new pattern, modulo the dead `INV-` and bare `SEC-` branches that had no current intended world-record target.
3. The deliberate `STCHAR` inclusion on `story-relationship.schema.json` is preserved.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — extend with new-prefix acceptance and INV-rejection assertions across all 4 STCHAR-excluding schemas).
2. `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify — extend with new-prefix acceptance + STCHAR retention).

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-story-relationship.test.js`
3. `cd tools/validators && npm test`
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-fact.schema.json tools/validators/src/schemas/story-thread.schema.json tools/validators/src/schemas/story-consequence.schema.json tools/validators/src/schemas/story-diegetic-artifact.schema.json tools/validators/src/schemas/story-relationship.schema.json; then exit 1; fi` — zero hits (the dead `INV` token is dropped from all 5 patterns).

## Outcome

Implemented. The five narrow story-record `derived_from` schema patterns now accept the real world-record prefix classes `OQ`, `ENT`, `ONT`, `CAU`, `DIS`, `SOC`, `AES`, plus the two-level section form `SEC-(GEO|INS|MTS|ECR|PAS|TML|ELF)-N`. `story-relationship.schema.json` still uniquely accepts `STCHAR` in the same alternation. The dead `INV` token was removed from all five patterns.

The structural tests now prove the new world-prefix acceptance and the `INV-1` rejection across the four STCHAR-free schemas and the SREL schema.

## Verification Result

Pre-edit baseline:

1. `cd tools/validators && npm test` — PASS, 1021/1021 tests before source edits.

Post-edit verification:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-story-relationship.test.js` — PASS, 47/47 focused tests.
3. `cd tools/validators && npm test` — PASS, 1025/1025 tests.
4. `if rg -n '"INV\\|' tools/validators/src/schemas/story-fact.schema.json tools/validators/src/schemas/story-thread.schema.json tools/validators/src/schemas/story-consequence.schema.json tools/validators/src/schemas/story-diegetic-artifact.schema.json tools/validators/src/schemas/story-relationship.schema.json; then exit 1; fi` — PASS, no dead `INV` alternation branch remains in the five owned schema patterns.
5. Manual package surface review: `tools/validators/README.md` was inspected; it inventories the story schemas by class but does not document this derived-from alternation, so no README update was required.

## Deviations

1. The draft examples used padded IDs (`ENT-0001`, `SEC-GEO-001`) while `docs/FOUNDATIONS.md` and `docs/ID-ALLOCATION.md` define unpadded IDs. The implemented tests use unpadded examples (`ENT-1`, `SEC-GEO-1`) for the new prefixes, but the schemas preserve the existing `[0-9]+` suffix grammar because `contract-schema-roundtrip.test.ts` intentionally asserts legacy padded cross-reference acceptance. Retiring that compatibility is a separate package-wide decision.
2. `story-status.schema.json`, `story-plan.schema.json`, and `story-emotion.schema.json` still have adjacent derived-from / recordId pattern drift. They were left out of this ticket by the scoped reassessment; uniform story-record provenance remains follow-up cleanup.
3. Post-ticket review created `tickets/VALENH-044.md` for the adjacent `story-status`, `story-plan`, and `story-emotion` provenance-pattern cleanup.
