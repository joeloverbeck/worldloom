# SPEC-57 — STCHAR Pipeline Integration

**Status:** COMPLETED
**Created:** 2026-05-20
**Depends on:** SPEC-56 — STCHAR Machine-Facing Foundation (must land first)

Triage note: this spec is the skill-integration half of the warranted slice of
`reports/stchar-implementation-first-iteration.md` (ChatGPT-Pro). It assumes SPEC-56 has
landed the `STCHAR` schema, validators, patch-engine ops, world-index node/edges, and MCP
retrieval surfaces. It applies the same trims (M1–M3, see SPEC-56 §Out of Scope) and the same
supersession of `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md`. The
prior triage's accepted Option A (targeted CHAR retrieval) is realized here as the one-time
STCHAR distillation; Option D (drift audit) as the optional health-audit source-drift mode.

---

## Context

SPEC-56 makes `STCHAR` storable, retrievable, indexable, and validatable. This spec wires
`STCHAR` through the **seven existing story-pipeline skills (Skill Category 2c)** and adds a new
authoring skill. The skills **produce** STCHAR (bootstrap and the new `story-character-profile`
skill) and **consume** it (turn-cycle, commitment-block-authoring, prose-attach, health-audit,
promotion), and the page-plan packet carries voice authority to the external prose renderer.
The new `story-character-profile` skill becomes an eighth Skill Category 2c member (see
§Definition of Done for the FOUNDATIONS §7 enumeration update).

The governing rule across all of these: **after `STCHAR` exists for a story, normal story
runtime must not read world `CHAR-*` for characterization** (enforced by SPEC-56's
`no_char_authority_in_story_runtime` validator). The only `CHAR`-reading surfaces are bootstrap
during STCHAR creation, the new authoring skill, and explicit promotion/adjudication flows where
world provenance is the subject.

---

## Phase 1 — New skill: `story-character-profile`

**File:** `.claude/skills/story-character-profile/SKILL.md` (+ optional templates).

A canon-reading content-generation skill (mutates only the story bundle's `story-characters/`
via engine ops). It is the only general-purpose surface allowed to read `CHAR` for
characterization.

**Modes (M2 — trimmed to 3 for v1):**
- `create_from_world_char` — distill a new STCHAR from a world `CHAR-*` dossier.
- `create_story_local` — author a new STCHAR from story-local inputs (no source CHAR).
- `regenerate` — supersede an existing STCHAR with a from-zero rebuild (carries
  `supersedes`), reading old STCHAR + bound STENTs + relevant story records + optional source
  CHAR + supplied fidelity-failure notes.

(Deferred: `retire`, `supersede_from_story_evidence` as distinct modes — fold into `regenerate`
or add when a concrete trigger appears. See SPEC-56 §Out of Scope M2.)

**Inputs:** `world_slug`, `story_slug`, `mode`, `source_char_id?`, `target_stchar_id?`,
`target_stent_ids[]?`, `emergence_context_records[]?`, `story_local_brief?`,
`regeneration_reason?`.

**Outputs:** `story-characters/STCHAR-<n>.md`; optional supersession lifecycle update to the
old STCHAR; bundle `INDEX.md` update; optional repair note when page plans should be rebuilt.

**HARD-GATE + hard gates (mirror sibling story skills):** load FOUNDATIONS + shared story
contract + STCHAR schema; resolve the bundle; resolve source `CHAR` only when the mode needs
it; resolve story-local inputs; allocate `STCHAR` id; draft the full profile from zero;
validate frontmatter/body section anchors + the three hashes (`profile_hash`,
`voice_block_hash`, `page_packet_hash`); confirm no world mutation; submit the patch plan only
after explicit user approval.

**Body template (`stchar.v1`):** 13 named sections — Story-Facing Identity; Source Distillation;
Stable Persona Core; Emotional Appraisal Map; Pressure Behavior; Voice Bible / Dialogue
Authority; **Page-Plan Voice Block** (hashed by `voice_block_hash`); Perception and Embodiment;
Agency and Planning Tendencies; Relationship-Specific Behavior; Story-State Derivation Guide;
Prose Rendering Constraints; Validation / Audit Anchors. (Per the report §6.3; no word-count
ceilings per FOUNDATIONS §9.) Section anchors are validated by presence, not by per-section
hash (M1).

**Acceptance criteria:** supports the three modes; never mutates world `CHAR`; produces a
schema-valid STCHAR with the three hashes and all required body sections; supersession writes a
new id with a `supersedes` link.

---

## Phase 2 — `branching-story-bootstrap`

**File:** `.claude/skills/branching-story-bootstrap/SKILL.md`.

Bootstrap still accepts `selected_cast: [CHAR-*]`, but before creating meaningful story state it
distills an STCHAR for every selected cast member (bootstrap owns bundle creation, so inline
authoring is allowed here — unlike turn-cycle).

**New sequence:** load contracts → resolve `selected_cast` CHAR ids → for each: targeted MCP
retrieval of the dossier (or required sections), allocate STCHAR id, draft + validate the hybrid
profile → only after **all** STCHAR pass: create `STENT` bound via `bound_stchar_id`, create
initial temporal records, create PG-1/SE-1/CHC/SLT, write the page plan with STCHAR packets. If
any required STCHAR generation fails, **abort before any story state is created.**

**`cast_bind_list` reshape:**
```yaml
cast_bind_list:
  - stchar_id: STCHAR-1
    stent_id: STENT-1
    source_char_id: CHAR-1     # non-operational provenance only
    role_in_story: [viewpoint, primary_actor]
```
`char_id` is removed as operational authority.

**Cross-spec coupling (`cast_bind_list` parser)**: this reshape is the *data-producer* side — bootstrap writes the new `cast_bind_list` shape into `STORY_KERNEL.md`. The *parser* side — `buildCastBindList` + the `cast_bind_list` type in `tools/world-mcp/src/context-packet/{story-bundle-context.ts,shared.ts}` — is landed by **SPEC-56 Phase 6** (ticket `archive/tickets/SPEC56STCHARMACFOU-006.md`), which updates the parser to read `stchar_id` + `source_char_id` instead of `char_id`. Because SPEC-56 lands first (per the dependency header), the parser is ready before this reshape writes the new shape; the two are co-sequenced so neither strands the other (SPEC-56's Definition of Done carries the reciprocal note). When this spec is decomposed, the bootstrap ticket should reference `archive/tickets/SPEC56STCHARMACFOU-006.md` as the parser-side counterpart.

**Grounding rules for initial records:** `STINT` derives intent from STCHAR
appetite/refusals/pressure behavior; `SREL`/`STPLAN`/`STEMO` include STCHAR in `derived_from`
when stable conduct / plan shape / appraisal is load-bearing; `CHC` includes STCHAR in
`grounded_in.records` when wording/availability is character-specific; `PG` includes
`active_records.STCHAR`. `BEL` does **not** use STCHAR as epistemic basis (may consult its
perception/appraisal when belief formation is persona-shaped, but the access route stays
observation/testimony/etc.).

**Acceptance criteria:** selected cast is converted to STCHAR before state creation; bootstrap
aborts on STCHAR failure; STENT uses `bound_stchar_id`; `cast_bind_list` uses
`stchar_id` + non-operational `source_char_id`; the initial page plan includes STCHAR packets.

---

## Phase 3 — `branching-story-turn-cycle`

**Files:** `SKILL.md` + `references/pre-flight-and-prerequisites.md`,
`references/phase-7-page-plan.md`, `references/phase-8-choice-generation.md`,
`references/governance-and-foundations.md` (the latter holds turn-cycle's FOUNDATIONS Alignment
table — see §Definition of Done).

- Pre-flight loads active STCHAR profiles (via `story_bundle_context.active_story_characters`
  + targeted `get_record(section_path)`) **before** resolving player action, selecting/JIT
  storylets, creating/superseding `BEL`/`STINT`/`SREL`/`STPLAN`/`STEMO`, generating choices, or
  writing page plans.
- Pre-flight stops deriving world `CHAR` seeds from `STENT.bound_char_id`; it derives
  story-local authority from active `STENT.bound_stchar_id` and `active_records.STCHAR`. **Note:**
  `bound_char_id` no longer exists on the STENT schema (SPEC-56 removed it in favor of
  `bound_stchar_id`), so the current `references/pre-flight-and-prerequisites.md` reference to
  `STENT.bound_char_id` is already a dangling field — this edit is a correctness fix, not only a
  behavior change.
- **Mid-story complex-character rule (M6 — accepted, with the routing-result pattern because
  skills don't chain):** if a new individual is persistent / speaking / viewpoint / action-
  driving / emotionally salient / relationship- or information-bearing / pressure-driving / a
  direct choice target, turn-cycle must **not** commit a meaningful STENT/SE/PG without a bound
  active STCHAR. Instead it emits a `blocked_requires_stchar` routing result
  (`required_skill: story-character-profile`, mode, proposed display name, emergence context,
  source records, intended roles); the user invokes `story-character-profile`, then re-runs
  turn-cycle. Trivial background entities commit directly with `role_in_story: [background]`,
  `bound_stchar_id: null`.
- Page plan includes the mandatory STCHAR packets (Phase 7); CHC/STPLAN/STEMO grounding rules
  reference STCHAR as in Phase 2.

**Acceptance criteria:** pre-flight loads active STCHAR; no runtime characterization from `CHAR`;
complex new characters block on STCHAR; page plan carries STCHAR packets; grounding references
STCHAR.

---

## Phase 4 — `commitment-block-authoring`

**File:** `.claude/skills/commitment-block-authoring/SKILL.md`.

Commitment-block authoring consumes STCHAR when a block's eligibility, beats, or effects are
character-specific. It does **not** author STCHAR (skills don't chain) and does **not** read
world `CHAR`.

- **Pre-flight** loads active STCHAR summaries through `story_bundle_context.active_story_characters`;
  retrieve the full or projected profile (`get_record(section_path)`) **only** when authoring a
  block whose beats/effects depend on a specific character's persona, voice, or pressure behavior
  (parallel to the existing STPLAN/STEMO targeted-retrieval discipline).
- **Predicate DSL:** STCHAR enters block preconditions only through `record_active(STCHAR-*)`,
  which is **already lawful** (shared story state contract §5 `record_active` record-class list
  includes `STCHAR`). No machine-layer work is required. A global-pool existential
  (`any_story_character_active(alias, role?, status?)`) is **deferred** — it would be a new
  predicate requiring a shared-contract §5 amendment + validator support (out of this skill-only
  spec's scope per FOUNDATIONS §5b; raise a follow-up if global-pool prefiltering proves needed).
- **Anti-drama-manager guard:** do **not** introduce persona-state predicates such as
  `character_has_wound` or `character_arc_stage`; these reintroduce arc / drama-manager creep
  (FOUNDATIONS §5a/§5c). Character influence on a block is expressed through `record_active` plus
  the block's existing causal preconditions, never through a character-arc field.
- **Branch-scope discipline:** global author-pool blocks must not name `STCHAR-*` ids
  (branch-local-leak / Rule 4); branch-scoped or JIT blocks may cite STCHAR in their rationale or
  exact-id predicates when the actor is bound and the reference is lawful.
- FOUNDATIONS Alignment table updated to reference STCHAR.

**Acceptance criteria:** pre-flight loads active STCHAR summaries and retrieves full profiles only
when behavior-dependent; STCHAR-conditioned eligibility uses `record_active(STCHAR-*)` only; no
drama-manager character predicates are introduced; global-pool blocks carry no `STCHAR-*` ids.

---

## Phase 5 — `branching-story-prose-attach`

**File:** `.claude/skills/branching-story-prose-attach/SKILL.md` +
`tools/validators/src/schemas/prose-receipt.schema.json`.

**Deterministic receipt additions** (`stchar_authority` block): per required packet —
`packet_present`, `active_in_snapshot`, and `{profile,voice_block,page_packet}_hash`
expected-vs-observed → `deterministic_verdict`. Fail conditions for these STCHAR-specific checks:
packet missing, STCHAR not active in the PG snapshot, hash mismatch, or the receipt omits the
required block. (The hash checks are exactly why SPEC-56 keeps `voice_block_hash` +
`page_packet_hash` — these are their consumers.)

**CHAR-authority leak (reuse, do not re-implement):** the page-plan / prose-receipt
"cites `CHAR-*` as operational authority" check is **already** owned by the landed
`no_char_authority_in_story_runtime` validator, whose `TEXT_SURFACE_PATTERN` scans both
`pages-prose-plans/PG-*.md` and `pages-prose-receipts/PG-*.yaml` and raises
`no_char_authority_in_story_runtime.char_authority_text_leak`. Prose-attach **surfaces that
validator's verdict** (e.g., as a `char_authority_leak` line in the receipt) rather than
re-running a parallel leak scan — the new prose-attach fields stay scoped to the STCHAR-specific
packet/hash checks above.

**Judgment-assisted receipt additions** (`profile_fidelity`): per character —
`voice_fidelity`, `appraisal_fidelity`, `pressure_behavior_fidelity`,
`relationship_conduct_fidelity` ∈ `pass | minor_drift | major_drift | not_applicable`, with
evidence excerpts and `repair_recommendation ∈ {none, revise_prose, revise_page_plan,
regenerate_stchar, run_turn_cycle_repair}`. Judge against the page-plan packet first; retrieve
the full STCHAR only when the packet is missing/hash-inconsistent or a deeper diagnosis is
needed.

**Acceptance criteria:** receipt carries deterministic STCHAR authority checks and
judgment-assisted `profile_fidelity`; missing/hash-inconsistent packets fail deterministically;
the CHAR-authority leak verdict reuses the existing validator; drift produces actionable repair
recommendations.

---

## Phase 6 — `branching-story-health-audit`

**File:** `.claude/skills/branching-story-health-audit/SKILL.md`.

Add a structural phase **2m: STCHAR authority health** (the current structural phases run 2a–2l,
so `2m` is the next slot), with checks:
`stent_missing_required_stchar`, `stchar_unresolved`, `stchar_not_active_for_bound_stent`,
`stchar_superseded_still_active`, `page_plan_missing_stchar_packet`,
`page_plan_stchar_hash_mismatch`, `choice/plan/emotion_character_grounding_missing`,
`split_character_authority`, `repeated_profile_fidelity_failure`.

Normal health audit must **not** re-read world `CHAR` for drift. Add an **optional source-drift
mode** (this realizes the prior triage's accepted Option D) that compares
`STCHAR.source_char_hash` against the current `CHAR-*` content hash and reports advisory drift —
it never rewrites STCHAR automatically.

**Acceptance criteria:** phase 2m reports missing/stale/split-authority/page-plan/prose-fidelity
failures; default mode does not read world `CHAR`; optional source-drift mode is advisory only.

---

## Phase 7 — Page-plan STCHAR packet (mandatory §16a)

**Files:** the page-plan section discipline in
`.claude/skills/_shared-templates/story-state-contract.md` §8 (the §16a slot was reserved in
SPEC-56 Phase 1 — "STCHAR-derived character authority packets (reserved; not yet mandatory)") and
the page-plan-authoring references of bootstrap + turn-cycle. This phase promotes §16a from
reserved to mandatory.

The page plan is the external renderer's only authority and must not ask it to infer voice from
record ids. For every viewpoint / speaker / major actor / direct target / emotionally salient
character (or any whose behavior/voice materially shapes the page), include a packet:
`STENT-/STCHAR-/display name`; **required-because** reason; the three STCHAR hashes (so
prose-attach can validate); story-facing identity for this page; voice/dialogue authority
(copy/project STCHAR §Page-Plan Voice Block when speaking/viewpoint-rendering); relevant
appraisal rules; relevant pressure behavior; relationship-specific conduct; perception and
embodiment (when viewpoint/close narration); agency and planning tendency (for action-driving
characters); prose must-show / must-not-imply / anti-generic warnings.

No word-count ceiling (FOUNDATIONS §9). Human prose, not ids as shorthand. Existing optional §5
(active cast/status), §9 (relationships/beliefs), §9b (plans), §9c (emotions), §16 (cast material
reality projection), §17 (page-level style) are retained — STCHAR packets (§16a) are
character-voice authority, not a replacement for temporal-state sections.

**Acceptance criteria:** the page-plan contract carries the mandatory §16a STCHAR packet section
with hash citations; bootstrap and turn-cycle emit it for the required characters.

---

## Phase 8 — Promotion skills (minimal)

**Files:** `.claude/skills/story-fact-promotion-to-canon/SKILL.md`,
`.claude/skills/story-promotion-closeout/SKILL.md`.

- `character_outcome` source kind stays rooted in `STENT`/`STSTAT` outcomes.
- STCHAR may appear only as `proposal_evidence.supporting_story_character_profiles[]` —
  evidence context, never an automatic promotion source. Do not add STCHAR to the CF candidate
  `source_basis.derived_from[]` or to `promotion_claims[].source_record`.
- Story-local-character → world-`CHAR` promotion is explicitly **out of scope** (routed to a
  future dedicated workflow if ever needed). STCHAR never silently becomes world canon.
- Closeout follows the existing ledger-first, story-local-only discipline; STCHAR is superseded
  only when schema fields actually change.

**Acceptance criteria:** STCHAR is supporting evidence only; not an automatic promotion source;
story-to-world character promotion is out of scope.

---

## Phase 9 — Integration tests

**Files:** `tools/world-mcp/tests/tools/*`, `tools/validators/tests/**`.

**Automated coverage** (building on SPEC-56's schema/fixture tests) targets the machine surfaces
this spec actually adds: `prose-receipt.schema.json` accepts the `stchar_authority` +
`profile_fidelity` blocks and rejects receipts that omit the required block or carry
hash-inconsistent packets; `no_char_authority_in_story_runtime` exercises its leak path on
page-plan / prose-receipt fixtures that cite `CHAR-*`; the predicate-DSL parsability validator
confirms `record_active(STCHAR-*)` parses (already lawful, used by commitment-block-authoring).

**Skill-behavior assertions** (bootstrap aborts if a selected-cast STCHAR fails; bootstrap creates
STENT with `bound_stchar_id`; turn-cycle blocks a complex new STENT without STCHAR; health-audit
phase 2m reports stale/superseded/missing STCHAR; the optional source-drift mode is advisory) are
LLM-executed and have no automated harness — they are verified by the §Definition of Done sample
fixture walkthrough, not by `tools/*` unit tests.

---

## Out of Scope

- Machine-layer surfaces (schema, validators, patch-engine, index, MCP) — SPEC-56.
- Deferred skill modes `retire` / `supersede_from_story_evidence` (M2).
- `get_story_character_packet` MCP tool (M3) — skills use `get_record(section_path)`.
- A new `any_story_character_active` predicate for global-pool prefiltering — deferred (would
  require a shared-contract §5 amendment + validator support); `record_active(STCHAR-*)` is
  sufficient for v1.
- STCHAR → world-`CHAR` promotion workflow.

---

## FOUNDATIONS Alignment

| FOUNDATIONS principle | Stance | Rationale |
|---|---|---|
| §6.1 Story-Local Character Authority | aligns | Only bootstrap/authoring/promotion read `CHAR`; runtime reads STCHAR; enforced by SPEC-56's `no_char_authority_in_story_runtime`. |
| §4a Plan is authority, prose is receipt | aligns | The mandatory page-plan STCHAR packet is the renderer's voice authority; prose-attach validates the receipt against it (hashes + judgment fidelity). |
| §5a/§5c No act structure / no drama manager | aligns | STCHAR informs pressure behavior; runtime state decides outcomes. The skills must not encode "betray on page 7"; no arc/stage fields and no `character_arc_stage`-style predicates. |
| §6a Belief vs. Fact / §6b Observer firewall | aligns | STCHAR shapes conduct, not knowledge; never a `BEL` access basis; bootstrap/turn-cycle keep epistemic access routes intact. |
| §9 Prose length discipline | aligns | No word-count ceilings on STCHAR, packets, or rendered prose. |
| Rule 6 No Silent Retcons | aligns | Regeneration supersedes (new id); historical pages that referenced the old active STCHAR stay valid; no in-place rewrite. |
| Rule 4 No Globalization by Accident | aligns | Story-local STCHAR never auto-promotes to world `CHAR`; promotion is explicitly out of scope; global-pool storylets carry no `STCHAR-*` ids. |
| §7 Story-Pipeline Skill Category (skills don't chain — design convention) | aligns | Turn-cycle and commitment-block-authoring emit routing results / consume STCHAR rather than authoring it inline; only bootstrap (bundle owner) authors inline. |

---

## Definition of Done

- All nine phases' acceptance criteria pass; all touched skills' FOUNDATIONS Alignment tables
  updated to reference STCHAR (including turn-cycle's table in
  `references/governance-and-foundations.md`).
- FOUNDATIONS §7 (Story-Pipeline Skill Category) enumeration and
  `.claude/skills/skill-audit/references/cross-skill-consistency.md`'s Category 2c list are
  updated to include the new `story-character-profile` skill (the eighth story-pipeline skill).
- Build + typecheck + tests green across affected `tools/*` packages.
- The Phase 2 `cast_bind_list` reshape is co-sequenced with SPEC-56 Phase 6's `buildCastBindList` parser update (ticket `archive/tickets/SPEC56STCHARMACFOU-006.md`) — the data-producer (bootstrap) and the parser (world-mcp) land coherently; neither strands the other.
- A sample bootstrap → turn-cycle → prose-attach → health-audit pass over a small fixture cast
  demonstrates: STCHAR authored at bootstrap, voice packet in the page plan, prose-attach
  voice-fidelity receipt emitted, no `CHAR` read at runtime, health-audit phase 2m clean.

---

## Summary

Wires `STCHAR` through the seven existing story-pipeline skills (Skill Category 2c) plus a new
`story-character-profile` authoring skill (3 modes): bootstrap distillation at bundle creation,
turn-cycle consumption with a block-and-route pattern for mid-story characters,
commitment-block-authoring predicate/grounding integration (`record_active(STCHAR-*)` only),
prose-attach voice-fidelity receipts, health-audit phase 2m + optional source-drift mode, minimal
promotion-evidence handling, and the mandatory page-plan voice packet (§16a) that carries
character authority to the external renderer. Depends on SPEC-56. Together they replace the
lean-fix triage of 2026-05-20 with the full story-local character authority layer.

## Outcome

Completed: 2026-05-21.

SPEC-57 landed across `archive/tickets/SPEC57STCHARPIPINT-001.md` through
`archive/tickets/SPEC57STCHARPIPINT-010.md`:

- `story-character-profile` was added as the STCHAR authoring skill with the three v1 modes,
  STCHAR body contract, hybrid patch-engine routing, hash discipline, and CHAR-provenance
  firewall.
- The shared page-plan contract now makes §16a STCHAR-derived character authority packets
  mandatory when relevant, and bootstrap / turn-cycle consume or emit those packets at their
  owned phases.
- Bootstrap, turn-cycle, commitment-block-authoring, prose-attach, health-audit, and promotion
  skills now route STCHAR as story-local character authority without normal runtime world
  `CHAR-*` characterization reads.
- FOUNDATIONS §7 and the cross-skill-consistency enumeration now include
  `story-character-profile` as the eighth story-pipeline skill.
- The validators package now has SPEC-57 integration coverage for prose-receipt STCHAR
  authority blocks, CHAR-authority text leaks, and `record_active(STCHAR-*)` predicate parsing;
  the predicate DSL runtime/discoverable schema was corrected so that parser surface matches the
  shared story-state contract.

Verification:

- `npm test` from `tools/validators` — PASS before the final archive, 776 tests.
- `node --test dist/tests/integration/spec57-stchar-pipeline-integration.test.js dist/tests/predicate-dsl-grammar-parity.test.js dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
  from `tools/validators` — PASS before the final broad proof, 19 tests.
- Archived ticket-level manual contract reviews cover the LLM-executed skill behavior named in
  the original Definition of Done (`bootstrap -> turn-cycle -> prose-attach -> health-audit`).
  The repo does not expose an executable dry-run harness for that sample walkthrough, so no live
  end-to-end skill run is claimed here.

Deviations:

- Phase 9's drafted claim that `record_active(STCHAR-*)` was already machine-lawful was only
  true in the shared prose contract. The final ticket corrected the validator runtime and
  predicate schema as same-seam fallout.
- The final proof boundary is package-local validators plus archived manual contract review.
  This is the accepted boundary for LLM-executed skill changes in this repo; no world canon or
  story bundle fixture was directly mutated during finalization.
