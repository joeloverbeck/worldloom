# FOUNDATIONS-002: Canonicalize per-class ID padding format in Canonical Storage Layer

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (§Canonical Storage Layer and/or §Mandatory World Files); paired schema updates across `tools/validators/src/schemas/*.json` and `tools/world-index/src/public/canonical-vocabularies.ts`; optional migration of existing world records depending on the canonical decision.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-029-emit-warning-on-world-index-skip-of-schema-failed-records.md`

## Problem

The engine's story-bundle JSON schemas require `^M-[0-9]{4}$` (4-digit zero-padded) for every mystery-reserve reference from a story-bundle record — `mystery_policy.forbidden_resolutions[]` on SLT records and `state_snapshot.unresolved_mystery_claims[].mystery_id` on PG records. The actual on-disk mystery records in every world use the 1-digit form: `worlds/erotica-world/_source/mystery-reserve/M-1.yaml` through `M-6.yaml` (with `id: M-1`, `id: M-2`, etc.); `worlds/animalia/_source/mystery-reserve/M-1.yaml` through `M-N.yaml` similarly. The two forms diverge.

The branching-story-bootstrap session of 2026-05-13 hit this directly: the red-bunny bundle's seed SLT records declare `forbidden_resolutions: [M-0003, M-0004]` (to satisfy the 4-digit-padded schema pattern), and PG-0001's `unresolved_mystery_claims[]` declares 6 entries `[M-0001, M-0002, M-0003, M-0004, M-0005, M-0006]`. None of those id strings match an extant mystery record file (which are `M-3.yaml`, `M-4.yaml`, etc., with `id: M-3`, `id: M-4`). The validator only checked the pattern shape, not the existence of the referenced record. The bundle committed with broken cross-references — every mystery-policy reference in the bundle points to a non-existent record.

Operator at submission knew the discrepancy and disclosed it in the deliverable summary as a "transparent disclosure" — but the underlying contract gap is real and routes to FOUNDATIONS: the storage layer is silent on whether per-class id ids carry zero padding (and how many digits), with the result that engine schemas and on-disk world canon have diverged silently.

FOUNDATIONS.md §Canon Fact Record Schema uses `CF-0001` (4-digit zero-padded) as the genesis example but pins no padding rule. §Mandatory World Files names the per-class storage forms as `M-NNNN.yaml`, `OQ-NNNN.yaml`, `CF-NNNN.yaml`, `CH-NNNN.yaml`, `ENT-NNNN.yaml` — the literal `NNNN` notation suggests 4-digit but is ambiguous (it could be a schema-comment placeholder for "the natural-ascending-integer suffix"). CLAUDE.md's "ID Allocation Conventions" section lists `M-NNNN` for Mystery Reserve entries — same ambiguity. The canonical decision has never been made; the two layers diverged accordingly.

This ticket asks FOUNDATIONS to MAKE the canonical decision and propagate consequences across the engine pipeline.

## Assumption Reassessment (2026-05-13)

1. Current FOUNDATIONS state (HEAD): `docs/FOUNDATIONS.md` §Canon Fact Record Schema uses `id: CF-0001` (zero-padded 4-digit) as the schema example; §Mandatory World Files names atomized storage forms as `_source/mystery-reserve/M-NNNN.yaml`, `_source/open-questions/OQ-NNNN.yaml`, `_source/canon/CF-NNNN.yaml`, etc. The literal `NNNN` is ambiguous between (a) "4-digit zero-padded; right-justify natural number with leading zeros" and (b) "natural-ascending integer; the N letters are placeholder, not literal width". Verified by Read at the §Canonical Storage Layer + §Mandatory World Files sections. CLAUDE.md ID Allocation Conventions section restates the `M-NNNN` literal without disambiguation.
2. Current engine schema state (HEAD): `tools/validators/src/schemas/story-storylet.schema.json:173` (`mystery_policy.forbidden_resolutions[]`) and `tools/validators/src/schemas/story-page.schema.json:57` (`unresolved_mystery_claims[].mystery_id`) both pin `^M-[0-9]{4}$` — strictly 4 digits. `tools/world-mcp/src/tools/allocate-next-id.ts` returns `M-0001` (zero-padded) when allocating against a fresh mystery-reserve directory (per the post-MCPENH-011 + later normalization commits). World records on disk use 1-digit form (`M-1.yaml`, `id: M-1`); the bootstrap directory and the genesis CF / CH allocator emit unpadded (`CF-1`? checked the file: `worlds/erotica-world/_source/mystery-reserve/M-1.yaml` has `id: M-1`).
3. Shared boundary under audit: the canonical storage layer's per-class id format as the contract between (a) the allocator (which decides what next-id to mint), (b) the JSON-schema patterns (which decide what references are accepted at submit time), (c) the world-index (which decides what records get indexed and resolved by id-lookups), and (d) FOUNDATIONS.md (which is supposed to canonicalize the storage form but is currently silent on padding). Today these four layers each interpret the format differently for at least the M / OQ / ENT / SEC classes.
4. FOUNDATIONS principle restated: §Tooling Recommendation requires LLM agents to receive canonical retrieval surfaces "directly or via the documented context-packet + targeted-retrieval pattern" — when on-disk records use one id format and schema references use another, retrieval surfaces break silently (a get_record(M-0003) call against a world where the record is M-3.yaml returns a not-found, but the validator already accepted the M-0003 reference). The principle is non-negotiable; padding canonicalization is required.
5. HARD-GATE / Canon Safety Check surface: this ticket touches §Rule 7 enforcement infrastructure (mystery_policy.forbidden_resolutions IS the firewall mechanism on every SLT). The change cannot weaken Mystery Reserve firewall behavior — the M ids referenced from SLT records must resolve to real M records. Today they don't; this ticket is the load-bearing fix.
6. Schema extension classification: the canonical decision (1-digit unpadded vs 4-digit zero-padded vs free-form integer suffix) has consumers in (a) every CF/CH/M/OQ/ENT/SEC id reference in atomic-source files, (b) every story-bundle record's references to world-canon ids, (c) every CHC/SLT/PG record's references to world-canon ids, (d) every adjudication PA record's CF references, (e) every character / diegetic artifact frontmatter's CF references, (f) every world-index node-id. The extension is BREAKING if it forces existing world data to migrate. Recommended path: canonicalize on the form that requires LEAST migration (1-digit unpadded matches all existing world data; only the engine schemas need to relax the pattern). Mismatch + correction (below) names the operative direction.
7. Rename / removal blast radius: no field is renamed; the pattern strings (`^M-[0-9]{4}$` etc.) are relaxed to `^M-[0-9]+$` (or equivalent) across all engine schemas. Blast radius: `tools/validators/src/schemas/` (~all *.schema.json files mentioning ID patterns), `tools/world-mcp/src/` (the MCP allocator + id-validation), `tools/world-index/src/` (id-extraction regexes), `tools/patch-engine/src/` (envelope schema's pattern fields), `tools/world-index/src/public/canonical-vocabularies.ts` (any id-class pattern declarations).
8. Adjacent contradictions surfaced during reassessment: (a) CLAUDE.md's "ID Allocation Conventions" list uses `M-NNNN` literal; the canonical decision must reach CLAUDE.md too (or CLAUDE.md gets updated to match the FOUNDATIONS decision). (b) The skill SKILL.md files across the story pipeline echo the `M-NNNN` form in their schema documentation; those route through `/skill-audit` post-FOUNDATIONS-amendment. (c) Test fixtures using one form or the other need to be aligned. Classification: (a) is a required consequence of this ticket (CLAUDE.md is a near-mirror of FOUNDATIONS conventions); (b) and (c) are future cleanup, route separately. Mismatch + correction: the FOUNDATIONS-002 amendment must canonicalize on the form that requires least migration. Current evidence strongly favors 1-digit unpadded (or "any-positive-integer-suffix") because (i) every existing world record on disk uses that form, (ii) the allocator's MCPENH-011 / MCPENH-018 / MCPENH-040 work appears to have allocated unpadded ids for years before the schema pattern was tightened to 4-digit, (iii) migrating existing world data to 4-digit form requires renaming every M-N.yaml → M-NNNN.yaml AND updating every reference (CF.derived_from, CH.affected_cf_ids, etc.) across the world bundle. Recommended canonical decision: relax engine schema patterns to `^<CLASS>-[0-9]+$` and codify FOUNDATIONS §Canonical Storage Layer to specify "id suffix is the unpadded natural integer; filenames match the id field exactly".

## Architecture Check

1. The proposed decision (relax patterns to `^<CLASS>-[0-9]+$`; codify "unpadded natural integer" as canonical) is cleaner than alternatives because: (a) it requires zero migration of existing world data; (b) it preserves the human-readable file-tree (e.g., `M-1.yaml` is a more legible filename than `M-0001.yaml`); (c) it preserves natural sort-order semantics (`ls _source/mystery-reserve/` shows `M-1.yaml`, `M-2.yaml`, ..., `M-10.yaml` and natural-sort tools handle that); (d) it eliminates the silent-divergence-failure-mode where validator-accepted references don't resolve to real records.
2. The alternative (force 4-digit padding) would require: renaming every M / OQ / ENT / SEC / CF / CH file across every world; updating every CF.derived_from, CH.affected_cf_ids, OQ.related_canon_facts, ENT.appears_in_canon_facts, and SEC.touched_by_cf cross-reference; updating every adjudication/character/diegetic-artifact frontmatter's CF references; running a one-time migration script per world. Disruption ratio is too high.
3. No backwards-compatibility aliasing: the relaxed pattern accepts existing unpadded forms AND would technically also accept padded forms; per FOUNDATIONS §Story Bundles §5b schema-minimalism, the recommendation is to specify the canonical form (unpadded, natural integer) in FOUNDATIONS prose so that operators and LLMs MINT new ids unpadded going forward, even though the schema pattern alone tolerates either.

## Verification Layers

1. FOUNDATIONS.md §Canonical Storage Layer adds the per-class id-format paragraph; codifies "unpadded natural integer suffix; filenames match id field exactly" → manual review against FOUNDATIONS text.
2. All engine schemas with `^<CLASS>-[0-9]{4}$` patterns are relaxed to `^<CLASS>-[0-9]+$` (or, if the class is documented as padded — like CF / CH if the canonical decision goes the other way — to the codified form) → grep across `tools/validators/src/schemas/*.json`, `tools/patch-engine/src/envelope/schema.ts`, `tools/world-index/src/public/canonical-vocabularies.ts`.
3. Allocator emits the canonical form for every id class → grep `tools/world-mcp/src/tools/allocate-next-id.ts` for the id-formatting logic; assert single canonical form per class.
4. Existing world data (every `worlds/<slug>/_source/<subdir>/<ID>.yaml` file's filename and `id` field) is unchanged AND continues to validate → run `world-validate` against `worlds/erotica-world` and `worlds/animalia`; assert clean.
5. Future bootstraps emit refs in the canonical form (mystery_policy.forbidden_resolutions, unresolved_mystery_claims, etc.) and the refs RESOLVE to real records → end-to-end `branching-story-bootstrap` dry-run + targeted-retrieval check via `mcp__worldloom__get_record(M-3)` returning the actual record.

## What to Change

### 1. FOUNDATIONS.md amendment

Add a new sub-section to `docs/FOUNDATIONS.md` §Canonical Storage Layer (or extend §Mandatory World Files) titled "Per-class ID format conventions" that:

- Codifies the unpadded natural-integer suffix as the canonical form for every per-world atomic-source record class (CF, CH, INV, M, OQ, ENT, SEC, PA, CHAR, DA, PR, BATCH, AU, RP, AVT, EPE, NWB, NWP, NCP, NCB) and every story-bundle record class (STENT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, BR, SE, PG, CHC, SLT, SLB, SAU, SP, RSP).
- Explicitly states: "Filenames match the id field exactly; ids are unpadded natural integers (e.g., `M-1.yaml` with `id: M-1`, not `M-0001.yaml` with `id: M-0001`). Engine schemas use `^<CLASS>-[0-9]+$` patterns."
- Names the exception classes (if any). On current evidence there are no exceptions — every existing world uses unpadded for every class.
- Names the rationale: human-readability, natural-sort tools, zero-migration of existing world data.
- Cites this ticket as the canonicalization audit-trail entry.

### 2. Relax engine schema patterns

Across the engine pipeline, replace every `^<CLASS>-[0-9]{4}$` pattern with `^<CLASS>-[0-9]+$` (or the codified canonical-pattern variant if FOUNDATIONS specifies different per-class).

Specific files (initial enumeration; grep at implementation time to find all):

- `tools/validators/src/schemas/story-storylet.schema.json:173` — `mystery_policy.forbidden_resolutions[]`.
- `tools/validators/src/schemas/story-page.schema.json:57` — `unresolved_mystery_claims[].mystery_id`.
- `tools/patch-engine/src/envelope/schema.ts` — any expected_id_allocations validation that pins 4-digit format.
- Every other `tools/validators/src/schemas/*.schema.json` file that pins `[0-9]{4}` for any id class.
- `tools/world-index/src/public/canonical-vocabularies.ts` — any id-class regex constants.
- `tools/world-index/src/` — id-extraction utilities that assume fixed-width suffix.

### 3. Update allocator's id-emission

Confirm `tools/world-mcp/src/tools/allocate-next-id.ts` emits unpadded natural-integer suffixes. If it currently emits zero-padded (`M-0001`), update to unpadded (`M-1`). Verify by reviewing the existing emit-format code path; the existing world data suggests it has always emitted unpadded for M / OQ / ENT / SEC / etc., but verify for STORY / BR / SE / PG / CHC / SLT etc. (the per-bundle classes I emitted into red-bunny used `-0001` padded; check whether that was operator-supplied or allocator-emitted).

### 4. Update CLAUDE.md's ID Allocation Conventions

Update CLAUDE.md's "ID Allocation Conventions" section to reflect the canonical decision — replace `M-NNNN`, `OQ-NNNN`, etc., literals with `M-<integer>` form notation and a short pointer to the FOUNDATIONS-002 codification.

### 5. Migrate red-bunny bundle's broken references

The already-committed `red-bunny` bundle declares `forbidden_resolutions: [M-0003, M-0004]` and `unresolved_mystery_claims[].mystery_id: M-0001..M-0006` — all unpadded forms. After this ticket lands and schemas are relaxed, emit a one-time supersession patch (or in-place correction documented as a Rule 6 retcon) to update those references to `M-1..M-6` so they actually resolve to extant records. This sub-task is OPTIONAL within this ticket's scope but should be tracked as a follow-up; it is the only data-integrity casualty of the silent-divergence-bug.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — add Per-class ID format conventions sub-section)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/src/schemas/*.schema.json` (modify — every file with `^<CLASS>-[0-9]{4}$` patterns)
- `tools/patch-engine/src/envelope/schema.ts` (modify — relax any fixed-width id patterns)
- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — relax id-class regex constants)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — verify and align id-emission to canonical form)
- `CLAUDE.md` (modify — update ID Allocation Conventions section)

## Out of Scope

- Migration of existing world data (`worlds/<slug>/_source/<subdir>/<ID>.yaml` filenames and id fields) — they ALREADY use the canonical (unpadded) form per the decision; no migration needed.
- Migration of already-committed story-bundle records that emitted padded refs against unpadded canon (`red-bunny` is the immediate example) — tracked as an OPTIONAL follow-up in §What to Change item 5; not blocking this ticket.
- Updating story-pipeline skill SKILL.md / references prose to use the canonical id-format notation — route via `/skill-audit` per-skill after this lands.
- Changing the natural-sort tools / file-tree presentation tooling — natural-sort handles `M-1, M-2, ..., M-10` correctly already; no tooling change needed.

## Acceptance Criteria

### Tests That Must Pass

1. `world-validate worlds/erotica-world` returns clean (no `record_schema_compliance` failures on existing M / OQ / CF / CH / etc. records).
2. `world-validate worlds/animalia` returns clean (same).
3. A fresh `branching-story-bootstrap` dry-run emitting `forbidden_resolutions: [M-3, M-4]` and `unresolved_mystery_claims: [{mystery_id: M-1}, ..., {mystery_id: M-6}]` validates clean; references resolve via `get_record(M-3)`.
4. The existing `red-bunny` bundle's records continue to validate at schema-shape level (relaxed patterns accept both padded and unpadded forms during the transition).
5. FOUNDATIONS.md §Canonical Storage Layer "Per-class ID format conventions" sub-section exists and codifies the unpadded canonical form.

### Invariants

1. Engine schemas, allocator, world-index, and on-disk world canon all agree on the canonical id format per class.
2. The id format pinned by FOUNDATIONS is the SINGLE source of truth — schemas, allocator, and index reference the same form.
3. Existing world data is preserved as-is; the canonical decision is chosen to require zero migration.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance.test.ts` — verify schema-pattern relaxation for M / OQ / CF / CH / ENT / SEC / etc. cross-references.
2. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — verify allocator emits canonical unpadded form for every id class.
3. `tools/world-index/tests/` — verify id-extraction regexes handle unpadded form (existing M-1, M-2, ..., M-N data).
4. `None — documentation-only ticket items 1 + 4 (FOUNDATIONS.md and CLAUDE.md amendments) have manual-review verification; the codebase-test items above cover the engine-change layer.`

### Commands

1. Targeted: `cd tools/validators && pnpm test -- record-schema-compliance` AND `cd tools/world-mcp && pnpm test -- allocate-next-id`
2. Full-pipeline: `node tools/validators/dist/src/cli/world-validate.js worlds/erotica-world` AND same for `worlds/animalia`; assert clean.
3. End-to-end retrieval: `mcp__worldloom__get_record(record_id="M-3", world_slug="erotica-world")` returns the actual record from `_source/mystery-reserve/M-3.yaml`; same for every world canon record class.
