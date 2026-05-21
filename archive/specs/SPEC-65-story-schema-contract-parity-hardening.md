# SPEC-65 — Story Schema↔Contract Parity Hardening

**Status:** COMPLETED
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline schemas/validators)
**Source:** `reports/stchar-audit-second-iteration.md` §8 (identifier-set matrix), §9 (same-concept-different-union drift), §17 Critical #2/#3/#6; triage `docs/triage/2026-05-21-stchar-audit-second-iteration-triage.md`
**Depends on:** none — operates on already-landed schemas (SPEC-58 reconciliation is upstream history, not a build dependency)

## 1. Context

The shared story-state contract (`.claude/skills/_shared-templates/story-record-schemas.md` §4,
authoritative per FOUNDATIONS §5b Schema-Minimalism: "skills must not add fields to those schemas
without amending the contract first") is the single source of truth for story-record class unions.
Verification against `main` found three surfaces where the **JSON schema is broader than the
contract** — the schema's enforcement drifted wider than the contract it enforces. Because the
contract is authoritative, narrowing the schema to match is a *correctness* fix, not speculative
hardening. (This is distinct from the first-iteration triage's rejected I2, which proposed narrowing
unions *against* the contract by excluding STCHAR.)

This spec does **not** introduce the report's proposed story-record-registry framework (§17 Critical
#1). The contract is already the prose source of truth, the divergences are few and fixed directly
below, and a cross-layer registry module + generator is the over-engineering the report's own §18 and
FOUNDATIONS §5b warn against. Where cheap, a contract-vs-schema parity snapshot test is added inline
(§2.4) — not a new package.

### Verified drift

- **`SE.state_delta.create/supersede/close`** (`tools/validators/src/schemas/story-event.schema.json`
  lines ~307–318): pattern allows
  `STENT|STCHAR|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|STPLAN|STEMO|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT`.
  The contract (`story-record-schemas.md` §4.3, `story-state-contract.md` §5a commentary) restricts
  state_delta to the **lifecycle-managed active-state class set** — the same 18 classes as
  `PG.state_snapshot.active_records`. `SE`, `PG`, `BR`, `CHC`, `SLT` are not lifecycle-managed
  active state and must not appear in an event delta.
- **`SE.commitment.alias_bindings`** (same file, lines ~51–58): binding-value pattern allows the same
  over-broad union including `STCHAR`, `SE`, `PG`, `BR`, `CHC`, `SLT`. The contract (`story-record-schemas.md`
  §4.3, lines ~223) restricts alias-bindable values to the precondition-bindable classes plus the five
  existential-predicate-bindable classes `CLK`, `STSEC`, `STQ`, `STPLAN`, `STEMO`. Aliases are values
  bound by the closed predicate DSL, not a generic record bag.
- **`PG.state_snapshot.active_records`** (`tools/validators/src/schemas/story-page.schema.json`
  lines ~49–73): `required: ["STCHAR"]` (SPEC-58 C4) with `additionalProperties: true`. The contract
  (`story-record-schemas.md` §4.2) enumerates exactly 18 active-state keys. `additionalProperties: true`
  lets a typo key (e.g. `STEN` for `STENT`) silently pass — a silent state-loss vector.

## 2. Changes

### 2.1 Narrow `SE.state_delta` to the active-state union

**Files:** `tools/validators/src/schemas/story-event.schema.json`;
`tools/validators/src/structural/state-delta-class-integrity.ts` — specifically the validator's
`STATE_DELTA_CLASSES` set (the allowed-class set, currently 23 entries; SPEC-58 added STCHAR to both
the schema regex and this set, and they must move in lockstep). Do **not** edit the file's separate
`STORY_RECORD_NODE_TYPES` set — that is a resolution set, not the state_delta allow-list.

- Narrow the `create`/`supersede`/`close` item pattern to the 18 lifecycle-managed active-state
  classes: `STENT|STCHAR|STSTAT|STINT|SF|BEL|OBL|CNSQ|THR|CLK|STSEC|STQ|STPLAN|STEMO|SREL|STLOC|STOBJ|DA`.
- Remove `SE`, `PG`, `BR`, `CHC`, `SLT` from the pattern and from the validator's `STATE_DELTA_CLASSES` set.
- Confirm the validator and schema enumerate the identical set (no two-list drift introduced by this
  change itself).

**Acceptance:** an `SE.state_delta` referencing `PG-1`, `SE-2`, `BR-1`, `CHC-3`, or `SLT-1` fails both
schema validation and `state_delta_class_integrity`; a delta referencing only active-state classes
passes; the schema regex and validator allowed-set are byte-for-byte the same class list.

### 2.2 Narrow `SE.commitment.alias_bindings`

**Files:** `tools/validators/src/schemas/story-event.schema.json` only — the
`commitment.alias_bindings.additionalProperties` value pattern. The `alias_bindings` value-class
restriction is **schema-only**: there is no validator allow-set for alias classes to narrow (unlike
`state_delta`, which has `STATE_DELTA_CLASSES`). `tools/validators/src/structural/alias-binding-utils.ts`
and its consumers (`observer-firewall.ts`, `chc-slt-selected-commitment-trace.ts`,
`audit-only-se-shape.ts`) *resolve* already-schema-validated bindings and need **no** change — a binding
whose value fails the narrowed pattern is rejected at schema validation before resolution runs.

- Narrow the `additionalProperties` value pattern for `alias_bindings` to the alias-bindable class set
  defined by `story-record-schemas.md` §4.3 — the precondition-bindable classes plus
  `CLK|STSEC|STQ|STPLAN|STEMO`. Derive the exact closed enum from the contract and the predicate DSL's
  existential predicates; do **not** invent classes not named by the contract.
- The set must **exclude** `STCHAR`, `SE`, `PG`, `BR`, `CHC`, `SLT` (none are bound by an existential
  predicate). `STCHAR` exclusion is doubly load-bearing: STCHAR is authoring authority, never an alias
  payload (FOUNDATIONS §6.1; report §18).

**Acceptance:** an alias binding to `STCHAR-1`, `PG-1`, `SE-1`, `CHC-1`, or `SLT-1` fails; a binding to
a class the contract names as existential-predicate-bindable passes; the implementer has cited the
contract line that fixes the positive enum (no fabricated union).

### 2.3 Close `PG.state_snapshot.active_records`

**Files:** `tools/validators/src/schemas/story-page.schema.json`.

- Set `additionalProperties: false` on the `active_records` object.
- Keep the closed 18-key property set and `required: ["STCHAR"]` (per SPEC-58 C4) unchanged.
- **Do not** make all 18 keys required. Empty-required-arrays are author boilerplate with no
  validation signal and tension FOUNDATIONS §5b; the typo-prevention value comes entirely from
  `additionalProperties: false`, not from presence-forcing.

**Acceptance:** an `active_records` object carrying an unknown key (e.g. `STEN: []` or `FOO: []`) fails
schema validation; an object omitting any optional key (e.g. only `STCHAR` present) still passes;
`STCHAR` remains required.

### 2.4 Parity snapshot test (lightweight, no registry)

**Files:** a test under `tools/validators/tests/` (co-locate with the existing story-schema tests).

- Add a snapshot/equality test asserting the `PG.active_records` property-key set equals the active-state
  class list, and that `SE.state_delta` and `state_delta_class_integrity` enumerate the identical set.
- The test reads the schema/validator constants directly; it does **not** introduce a registry module.
  Its purpose is to fail loudly if a future edit re-widens one surface without the others.
- The parity test deliberately omits `alias_bindings`: its class restriction is schema-only (per §2.2),
  so there is no second list to cross-check — nothing for a parity test to guard.

**Acceptance:** the parity test passes on the post-§2.1–2.3 state and fails if any one of the three
surfaces is edited to diverge from the others.

### 2.5 Folded doc cleanup (report §10, §13, §15)

**Files:** `.claude/skills/_shared-templates/story-state-contract.md`;
`reports/stchar-audit-first-iteration.md`, `reports/stchar-audit-second-iteration.md`,
`docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md` (header only).

- **§10 packet-authority boundary (one line):** in the §16a contract, state explicitly that a verified
  §16a packet is sufficient authority for prose/prose-attach validation but **not** the default
  authority for new character-dependent state creation (which requires full/projected STCHAR section
  retrieval). This codifies existing skill behavior; it is a clarification, not a behavior change.
- **§13/§15 historical headers:** add a "Historical — superseded by the merged SPEC-58/59/60/63 STCHAR
  contracts; retained for audit trail" header to the first-iteration STCHAR report and triage and to
  this second-iteration report, so no active report reads as current operational
  guidance on `bound_char_id` or direct `CHAR-*` runtime use. Do **not** alter the
  `story-kernel-cast-bind-list-integrity` validator's `bound_char_id` references — those are current
  enforcement.

**Acceptance:** the §16a contract carries the packet-authority sentence; the named reports/triage carry
historical headers; no validator code changed.

## 3. Out of scope

- The story-record-registry framework (report §17 Critical #1) — rejected; the contract is the source
  of truth and §2.4 provides the minimal parity guard.
- Narrowing `SLT.effects`/`likely_effects` (report §8 row, §17 Important): verification shows the
  `effectReference` pattern is `^(?:bound:[a-z][a-z0-9_-]*|[A-Z]+-[0-9]+)$`, which already permits any
  world ID by the generic `[A-Z]+-\d+` arm. Tightening this to the active-state union is a *defensible*
  follow-on but has no demonstrated misuse and is lower-value than §2.1–2.3 (SLT effects resolve
  through preconditions at authoring time). Deferred pending a concrete misuse case.
- `STCHAR.superseded_by` requiredness (report §8 row): handled as a world-index edge in SPEC-67; the
  schema field stays optional (a never-superseded STCHAR legitimately has no `superseded_by`).

## Outcome

Completed: 2026-05-21

SPEC-65 landed through four archived tickets:

1. `archive/tickets/SPEC65STOSCHCON-001.md` narrowed `SE.state_delta` and `SE.commitment.alias_bindings`, keeping `STATE_DELTA_CLASSES` in lockstep with the schema for state deltas.
2. `archive/tickets/SPEC65STOSCHCON-002.md` closed `PG.state_snapshot.active_records` to the known 18-key active-state set while keeping only `STCHAR` required.
3. `archive/tickets/SPEC65STOSCHCON-003.md` added the active-state parity test without introducing the rejected registry module.
4. `archive/tickets/SPEC65STOSCHCON-004.md` added the §16a packet-authority clarification and historical headers on the STCHAR audit report surfaces.

Final verification:

1. `npm test` from `tools/validators` — passed, 826/826 tests.
2. `grep -n "not the default authority\|new character-dependent state" .claude/skills/_shared-templates/story-state-contract.md` — returned the §16a authority sentence.
3. `grep -rl "Historical — superseded by the merged SPEC-58/59/60/63" reports/ docs/triage/` — returned the three target report/triage files.
4. `git diff --stat tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts` — produced no output; `bound_char_id` enforcement stayed untouched.

Deviations: none for the accepted SPEC-65 scope. `SLT.effects`/`likely_effects` narrowing and `STCHAR.superseded_by` requiredness remain explicitly out of scope as recorded above.
