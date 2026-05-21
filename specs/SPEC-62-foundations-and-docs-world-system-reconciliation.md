# SPEC-62 — FOUNDATIONS & Docs World-System Reconciliation

**Status:** proposed
**Date:** 2026-05-21
**Classification:** canon-related (FOUNDATIONS amendments + canon-pipeline skill/doc reconciliation; no code-semantics change)
**Source:** `reports/world-system-consolidation-first-iteration.md` Faults 1/3/4/9 (verified, narrowed) + §7 FOUNDATIONS recommendations — reassessed against `main`
**Depends on:** none — independent of SPEC-61; may proceed in parallel
**Companion:** `docs/triage/2026-05-21-world-system-consolidation-triage.md`

## 1. Context

The world-system pipeline is structurally disciplined (Hook 3 engine-only `_source/` guard, schemas on
every mature surface, documented approval semantics), but verification surfaced a small set of genuine
**documentation/drift** defects and two cheap FOUNDATIONS clarifications that close real boundary
ambiguities without code or data migration. This spec is the lightweight, authoritative-doc complement
to SPEC-61's executable coverage. Per user direction during triage, the report's elaborate
"World Artifact Maturity Ladder" shared-reference and its mass story-term renames are **replaced** by
concise FOUNDATIONS paragraphs (§2.1, §2.2) — single source of truth, no per-skill citation churn, no
schema/data migration.

## 2. Changes

### 2.1 FOUNDATIONS — add §Artifact Authority and Maturity (after §Canon Layers)

**File:** `docs/FOUNDATIONS.md`

**Verified gap:** FOUNDATIONS defines Canon Layers but never states that **a file may discuss canon
without being canon** — the proposal/diegetic/audit/canon authority boundary lives only in scattered
skill prose and `skill-audit/references/cross-skill-consistency.md` skill-category classification.

Insert a concise section (≈8–12 lines) stating: canon is record authority, not file existence or
review approval; enumerate the maturity classes already in play — pre-world proposal (`NWP`), candidate
canon proposal (`PR`/`RP`/EPE-sidecar), candidate character proposal (`NCP`), realized canon-reading
hybrid (`CHAR`/`DA`), accepted world canon (`_source/` records), adjudication/provenance (`PA`), audit
(`AU`), pressure affordance (`EPE`), downstream story record. Close with: only accepted world-canon
records claim world-canon authority; proposal review, artifact-write, and audit-recommendation approval
are not canon acceptance. Adapt the report's §7.1 text, trimming to a paragraph rather than a 9-level
ladder. Cross-reference (do not duplicate) the §Canon Fact Record Schema `direct_user_approval`
reservation already at lines 355–361.

### 2.2 FOUNDATIONS — add §World Generativity vs Story-Bundle State

**File:** `docs/FOUNDATIONS.md`

**Verified context:** `Natural Story Engines` is already a FOUNDATIONS §World Kernel template field
(line 146) and is legitimate world-generativity language. But `intended_narrative_role`,
`desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, and EPE `story_fuel` are
story-facing terms used on world-system artifacts with no FOUNDATIONS statement of where world
generativity ends and story-bundle execution state begins.

Add a paragraph (per report §7.5, trimmed) stating: worldbuilding may describe the kinds of conflicts,
procedures, pressures, and revelations a world structurally produces; world-canon and world-proposal
artifacts must **not** encode downstream story-bundle execution state — page ids, choice ids, storylet
ids, act beats, plot destiny, companion quests, or story-local clocks. This **fences the existing
terms as sanctioned world-generativity language** (no renames — per triage decision) while drawing the
bright line that forbids true story-bundle leakage. Name `Natural Story Engines` / `Native Story
Procedures` as the sanctioned generativity vocabulary.

> **No renames.** Triage rejected renaming `intended_narrative_role` → `world_affordance_role` etc.:
> the terms were deliberately introduced by the just-landed protagonist-grade character pipeline
> (SPEC-52–55), carry no functional bug, and a rename would churn schemas + existing CHAR/NCP/CH
> records with no validator consumer. This paragraph supplies the authority that those terms describe
> world generativity, which is what the report actually needed.

### 2.3 FOUNDATIONS — document `passive_depth` mystery status

**File:** `docs/FOUNDATIONS.md` §Mystery Reserve (around line 95)

**Verified drift:** `MYSTERY_STATUS_ENUM` in `tools/world-index/src/public/canonical-vocabularies.ts`
and `mystery-reserve.schema.json` both define **four** statuses — `active`, `passive`, `passive_depth`,
`forbidden` — and `create-base-world/SKILL.md:171` references all four, but FOUNDATIONS line 95
documents only `active` / `passive` / `forbidden`. Add `passive_depth` to the resolution-safety
semantics note: like `active`/`passive` it takes `future_resolution_safety: low | medium | high`
(per `mysteryResolutionSafetyForStatus` in `canonical-vocabularies.ts`). Pure documentation — the
validator already enforces this coupling.

### 2.4 FOUNDATIONS — relax forbidden-mystery absolutism + skill change

**Files:** `docs/FOUNDATIONS.md` (Rule 7 / §Mystery Reserve note), `.claude/skills/propose-new-worlds-from-preferences/SKILL.md`, `.claude/skills/propose-new-worlds-from-preferences/templates/proposal-card.md`

**Verified:** `propose-new-worlds-from-preferences/SKILL.md:244` requires **every** card to declare at
least one `forbidden` mystery (Phase 11b enforces it). FOUNDATIONS Rule 7 mandates *deliberate, bounded
unknowns* — it does **not** require a forbidden (permanently-unresolvable) mystery in every world.
Discovery-driven worlds (an explicit target posture) are crippled by an absolute forbidden mandate.

- Add a sentence to FOUNDATIONS §Mystery Reserve: a forbidden mystery is a **strong default**, not a
  universal law; a world should preserve at least one bounded unknown, but when a central mystery is
  intended for eventual revelation, the world records the policy explicitly rather than forcing a
  permanent lock.
- In `propose-new-worlds-from-preferences`, change the Phase 11b rule from "every card MUST declare at
  least one `forbidden` mystery" to: every card MUST declare at least one **bounded** mystery; a
  `forbidden` mystery is strongly recommended, and when omitted the card MUST populate
  `forbidden_mystery_absence_rationale` explaining why discovery/eventual-revelation is structurally
  necessary. Update the template's `mystery_reserve_seeds` block accordingly.

> **Narrowed from report.** The report's 7-value `resolution_intent` enum + `mystery_policy_validator`
> are **dropped** (YAGNI — no current consumer; the existing `status` + `future_resolution_safety`
> coupling already carries the discovery-vs-forbidden distinction once the mandate relaxes). If a
> downstream consumer for finer-grained resolution intent emerges, add it then.
- `create-base-world` is **unchanged**: verified it requires "at least one of each" status
  symmetrically (`SKILL.md:43,93`), not forbidden-as-uniquely-mandatory. Seeding one forbidden mystery
  at genesis is a reasonable default for a freshly authored world and is not the reported defect; the
  absolute mandate lives only in the world-proposal skill.

### 2.5 REPOSITORY-MAP — add world-level proposal/pressure surfaces

**File:** `docs/REPOSITORY-MAP.md`

**Verified gap:** `pressure-events/` has zero mentions in REPOSITORY-MAP; `world-proposals/` and the
proposal/audit surfaces are under-documented as standard world directories. Add `pressure-events/`,
`world-proposals/`, `proposals/`, and `audits/` to the world-directory layout, and add a one-line note
that EPE base cards are **allocator-tracked but intentionally not retrieval-indexed** (file-scanned
until canonized via sidecar) so the asymmetry is documented rather than read as a bug.

### 2.6 diegetic-artifact-generation — prose precision fix

**Files:** `.claude/skills/diegetic-artifact-generation/SKILL.md` (lines ~106, ~178)

**Verified:** the skill says a DA's claims are "contested canon (FOUNDATIONS §Canon Layers) at their
strongest." This conflates a DA's raw in-world assertions with the **accepted** Contested Canon layer
(`status: contested_canon` on a CF). Replace with precise wording: a DA's claims are **in-world
assertions**, not canon; the artifact may exist as a world artifact and may cite or distort accepted
CFs, but its statements become world truth only if a later `canon-addition` accepts a CF about their
existence, circulation, belief, disputed status, or truth.

> **Narrowed from report.** The report's `claim_map.canon_status` → `claim_relation_to_canon` rename is
> **rejected**: verified the field's enum is `canonically_true | canonically_false | partially_true |
> contested | mystery_adjacent | prohibited_for_this_artifact` — it never uses `contested_canon`, the
> name is already precise, and the skill's Phase 7 firewall already prevents claim→canon laundering.
> Only the prose above is imprecise.

### 2.7 ID-ALLOCATION — document the `EPE` / `NWP` / `NWB` prefixes

**File:** `docs/ID-ALLOCATION.md`

**Verified gap (surfaced by SPEC-61 reassessment; SPEC-61 §6 routes it here):** `docs/ID-ALLOCATION.md`
§Per-class registry → §World-scoped hybrid / pipeline artifacts (lines 25–33) documents
`PA` / `CHAR` / `DA` / `PR` / `BATCH` / `NCP` / `NCB` / `AU` / `RP`, but `EPE`, `NWP`, and `NWB` are
absent (verified: zero hits each) even though they are live allocator-tracked prefixes. This is the
same docs-gap class as §2.5's REPOSITORY-MAP omission, on a different doc surface.

Add three entries to that list:

- `EPE-<integer>` — pressure-event cards and their `EPE-*.proposal.md` sidecars (`worlds/<slug>/pressure-events/`)
- `NWP-<integer>` — world-proposal cards (root-level `world-proposals/`, a pre-world surface)
- `NWB-<integer>` — world-proposal batch manifests (root-level `world-proposals/batches/`)

`NWP` / `NWB` are root-scoped pre-world artifacts, **not** under `worlds/<slug>/`; note the root-level
path so they are not mistaken for world-scoped classes. Pure documentation — no allocator or schema
change (the allocator already supports these prefixes; this records them in the registry).

## 3. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Canon Layers (Contested Canon) | aligns | §2.1/§2.6 sharpen the boundary between accepted Contested Canon and raw DA assertions without changing the layer definition |
| Rule 7 — Preserve Mystery Deliberately | aligns | §2.4 keeps mystery deliberate/bounded while removing an absolute that exceeds the rule and blocks discovery-driven worlds |
| §Mystery Reserve resolution-safety semantics (line 95) | aligns | §2.3 documents `passive_depth` to match the validator-enforced coupling |
| §World Kernel — Natural Story Engines (line 146) | aligns | §2.2 promotes the existing sanctioned term to an explicit generativity-vs-execution boundary |
| §Canon Fact Record Schema — `direct_user_approval` (355–361) | aligns | §2.1 cross-references rather than duplicates the reservation |

## 4. Acceptance

- FOUNDATIONS contains the new §Artifact Authority and Maturity and §World Generativity vs Story-Bundle
  State sections; `passive_depth` appears in the §Mystery Reserve resolution-safety note; the
  forbidden-mystery relaxation sentence is present.
- `propose-new-worlds-from-preferences` no longer hard-requires a forbidden mystery; a card omitting one
  must carry `forbidden_mystery_absence_rationale` (template + Phase 11b updated consistently).
- REPOSITORY-MAP lists `pressure-events/`, `world-proposals/`, `proposals/`, `audits/` with the EPE
  indexing-asymmetry note.
- `docs/ID-ALLOCATION.md` §World-scoped hybrid / pipeline artifacts lists `EPE-<integer>`,
  `NWP-<integer>`, and `NWB-<integer>` (closing the gap SPEC-61 §6 routes here).
- `diegetic-artifact-generation` SKILL.md no longer equates DA claims with the Contested Canon layer;
  the `canon_status` field and Phase 7 firewall are unchanged.
- No schema, validator, or world-data changes in this spec (all such work is SPEC-61); a
  `git grep` confirms no `_source/` or schema file is touched.

## 5. Out of Scope

- Any field rename (story terms or approval fields) — rejected at triage.
- `resolution_intent` enum + `mystery_policy_validator` — dropped (YAGNI).
- A separate shared-reference maturity-ladder file every skill cites — replaced by the FOUNDATIONS
  paragraph (§2.1) per user direction.
- All executable validator/schema work — that is SPEC-61.
