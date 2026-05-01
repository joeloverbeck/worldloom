# FNDAMD-001: Clarify FOUNDATIONS §Tooling Recommendation to name whole-class enumeration as a legitimate primary loading pattern

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: No tool / engine / validator code is touched. Documentation-only — `docs/FOUNDATIONS.md` (additive paragraph appended to §Tooling Recommendation). `docs/CONTEXT-PACKET-CONTRACT.md`, `emergent-pressure-events`, and `continuity-audit` already carry the whole-class enumeration contract from MCPENH-007; this ticket leaves those consumers untouched except for verification.
**Deps**: `archive/tickets/MCPENH-007-bulk-full-body-fetch-for-whole-class-firewall-loads.md` (completed provider for `mcp__worldloom__list_records(... include_full_body=true)`, which this amendment live-cites).

## Problem

At intake, `docs/FOUNDATIONS.md` §Tooling Recommendation (lines 478–488 in the in-context read from that session) read:

> LLM agents should never operate on prose alone.
>
> They should always receive — directly or via the documented context-packet + targeted-retrieval pattern —:
> - current World Kernel
> - current Invariants
> - relevant canon fact records
> - affected domain files
> - unresolved contradictions list
> - **mystery reserve entries touching the same domain**

The bolded "touching the same domain" is scoped phrasing — it implies that mystery-reserve retrieval is domain-bounded by the skill's task. But two existing skills' Canon Safety Check disciplines explicitly require WHOLE-CLASS retrieval, not domain-bounded:

1. **`emergent-pressure-events`** Phase 6a (Per-card Invariant Conformance): "test against every INV record in the loaded packet"; Phase 6b (Per-card Mystery Reserve Firewall): "test against every M record in the loaded packet — overlap or not." Every-record discipline is the firewall's runtime expression; without it, the skill's Rule 7 commitment ("Preserve Mystery Deliberately") cannot be enforced at the candidate-event scale.
2. **`continuity-audit`**: cross-checks every CF against every INV against every M record. Same whole-class shape.

At intake, the current FOUNDATIONS text and these skills' firewall discipline were in mild tension: the "directly or via context-packet" permission above the bullet list was broad enough to legally cover whole-class loads (the "directly" branch encompasses any retrieval shape including `list_records(... include_full_body=true)`), but the "touching the same domain" mystery-reserve bullet pulled toward scoped retrieval, leaving skill authors to re-derive the legitimacy of whole-class loads from the broader permission rather than citing an explicit named pattern.

Session evidence from BATCH-0004 emergent-pressure-events run (2026-04-30): the skill's Phase 6 load went through `list_records(record_type='mystery_record', fields=[...])` plus N individual `get_record(record_id='M-N')` follow-up calls because (a) the deployed MCP server's `task_type` schema didn't accept `emergent_pressure_events` (motivating ENGINESYNC-002) and (b) before MCPENH-007 landed, `list_records` did not yet expose `include_full_body=true`. The skill's firewall discipline survived the friction because the operator (me) re-derived the whole-class legitimacy from §Tooling Recommendation's broader "directly" branch — but this re-derivation should not be load-bearing on operator judgment. A named pattern in FOUNDATIONS would let skill authors cite the principle directly.

This ticket adds a clarification paragraph naming "whole-class enumeration" as a legitimate primary loading pattern alongside seed-based context-packet retrieval. The clarification is purely additive: no existing principle is narrowed, no Validation Rule is changed, no schema is touched. The intent is to make the load-shape choice explicit so future skills with firewall discipline don't re-derive it.

## Assumption Reassessment (2026-05-01)

1. `docs/FOUNDATIONS.md` exists; §Tooling Recommendation is identified by the level-2 header `## Tooling Recommendation`. Section anchor (not line number) is the durable reference. Current paragraph order is still: (a) one-line "operate on prose alone" assertion; (b) bullet list of six items; (c) one-paragraph "non-negotiable" mechanism statement. The amendment lands as a NEW paragraph (d) appended after (c), before the section closes with `---`.
2. `docs/CONTEXT-PACKET-CONTRACT.md` already contains the back-reference this draft originally proposed. Its `## Index + Follow-Up Retrieval Pattern` section says skills whose validation surface intentionally tests every record of a class may use `mcp__worldloom__list_records(world_slug, record_type=<type>, include_full_body=true)` as the primary load, and the `## Focused Retrieval Tools` table names whole-class loads for EPE Phase 6 and continuity-audit. No context-packet doc edit remains owned by this ticket.
3. **Cross-skill / cross-artifact boundary under audit**: the contract between (a) `docs/FOUNDATIONS.md` (authoritative design-contract surface) and (b) existing consumer prose in `docs/CONTEXT-PACKET-CONTRACT.md`, `.claude/skills/emergent-pressure-events/SKILL.md`, and `.claude/skills/continuity-audit/SKILL.md`. Reassessment confirmed the consumers already name `include_full_body=true` whole-class loads; the remaining mismatch is that FOUNDATIONS itself does not yet name the pattern.
4. **FOUNDATIONS principle motivating this ticket**: §Tooling Recommendation itself. The amendment is a CLARIFICATION of the existing principle, not a substantive revision. The "directly or via the documented context-packet + targeted-retrieval pattern" permission already legally covers whole-class enumeration as the "directly" branch. The amendment makes this branch named and discoverable. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches a FOUNDATIONS-aligned enforcement surface (Canon Safety Check load shape), so the principle is restated above and the amendment is verified against it. The Mystery Reserve firewall enforcement at runtime is UNCHANGED — only the LOAD shape's legitimacy is named more explicitly. Rule 7 ("Preserve Mystery Deliberately") is not weakened; if anything, it is strengthened, because skill authors can now cite a named pattern when committing to whole-class M-record firewall discipline rather than re-deriving the legitimacy.
5. Not applicable per template item 5 — this ticket does not touch HARD-GATE semantics, canon-write ordering, or the Canon Safety Check enforcement mechanism. It touches the LOAD shape only. HARD-GATE, write ordering, firewall-test logic, and the Mystery Reserve firewall semantics remain identical.
6. Not applicable per template item 6 — no output schema (CF / CH / proposal card / dossier / artifact) is extended. The change is documentation prose only. The §Tooling Recommendation section's structural shape (header + intro line + bullet list + mechanism paragraph + new clarification paragraph) is preserved.
7. The change adds one paragraph; it does not rename, remove, or repurpose any existing principle, rule, schema, or relation type. Blast radius scan: `rg -n "Tooling Recommendation" .claude/skills -g 'SKILL.md'` shows generic §Tooling Recommendation citations in five skills. The amendment is additive prose under the same header and does not invalidate those entries.
8. Prior adjacent contradiction is already resolved: `.claude/skills/emergent-pressure-events/SKILL.md` now says Pre-flight loads atomic records via `mcp__worldloom__list_records`; Phase 6 uses `include_full_body=true` for whole-class INV / M firewall loads; targeted follow-up uses `search_nodes` / `get_record` / `get_neighbors`. `.claude/skills/continuity-audit/SKILL.md` likewise names `list_records(... include_full_body=true)` for deliberate whole-class audit passes. No skill-side ripple remains owned by this ticket.
9. The FOUNDATIONS amendment remains the smallest possible change to surface the legitimacy of whole-class enumeration: ONE paragraph appended to ONE section. The existing precedents for FOUNDATIONS amendments (SPEC09CANSAFEXP-001 added Rules 11 + 12 plus two CF schema blocks plus six relation types — a much larger surface; SPEC17AUDTRARET-002 clarified audit-trail retention semantics — a smaller but still SPEC-backed amendment) suggest amendments are typically backed by a SPEC document. This ticket is a borderline case: the change is small enough that drafting a full `specs/SPEC-NN-...md` design proposal feels heavyweight for what amounts to a one-paragraph clarification of an already-permitted pattern. The SPEC-backed convention exists for amendments that introduce new rules / schemas / relation types — this amendment introduces none. See §Architecture Check item 3 for the explicit rationale.

## Architecture Check

1. The amendment is the smallest change that resolves the friction. The existing FOUNDATIONS prose ("directly or via the documented context-packet + targeted-retrieval pattern") legally permits whole-class enumeration today; the amendment makes the legitimacy named and citable rather than implicit. The alternative — leaving the prose unchanged and continuing to let skill authors re-derive the legitimacy from the broader permission — perpetuates the friction surfaced in the BATCH-0004 emergent-pressure-events session and any future skill with similar firewall discipline.
2. No backwards-compatibility shims introduced. The amendment is purely additive: a new paragraph appended to an existing section. No existing principle text changes. Skills citing §Tooling Recommendation generically continue to be aligned; skills citing the new clarification explicitly gain a sharper reference.
3. **Why a SPEC document is not warranted here** (rationale for diverging from the SPEC09CANSAFEXP / SPEC17AUDTRARET precedent): the SPEC-backed convention covers FOUNDATIONS amendments that introduce new design contracts — new Validation Rules, new CF schema blocks, new relation types, new principle paragraphs that change enforcement scope. This amendment introduces NONE of those. It clarifies an already-permitted pattern by naming it. The SPEC-backed convention is operationally valuable when (a) the amendment text needs design review separate from implementation, and (b) downstream tickets implement the contract piecemeal. Here, neither (a) nor (b) applies: the amendment is one paragraph; it is implemented in a single ticket touching `docs/FOUNDATIONS.md`. If reviewers prefer SPEC-backed convention universally, this ticket can be upgraded by lifting its §What to Change content into a `specs/SPEC-WCE-whole-class-enumeration-clarification.md` document and re-keying the ticket as `SPECWCE-001` with the SPEC as a dep — but this is a stylistic upgrade, not a substantive correctness gain.

## Verification Layers

1. The new clarification paragraph appears in `docs/FOUNDATIONS.md` §Tooling Recommendation immediately after the existing "non-negotiable" mechanism paragraph and before the section's closing `---` → codebase grep-proof: `rg -n "Whole-class enumeration is a legitimate primary loading pattern" docs/FOUNDATIONS.md` returns exactly one hit at the correct location.
2. The amendment cross-references `mcp__worldloom__list_records(... include_full_body=true)` (provided by archived MCPENH-007) and the existing skills (`emergent-pressure-events` Phase 6, `continuity-audit` cross-check) → grep-proof: the amendment mentions both `list_records` and the named skills.
3. `docs/CONTEXT-PACKET-CONTRACT.md` includes a back-reference to the new FOUNDATIONS clarification → grep-proof: `rg -n "FOUNDATIONS §Tooling Recommendation|whole-class enumeration" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit.
4. The Mystery Reserve firewall enforcement is unchanged at runtime — no validator behavior change, no skill-side firewall test logic change → FOUNDATIONS alignment check: re-read FOUNDATIONS Rule 7 + the `emergent-pressure-events` Phase 6b firewall description and confirm the amendment does not alter either's substantive content.
5. Skills citing §Tooling Recommendation in their FOUNDATIONS Alignment tables continue to be valid post-amendment → manual review: spot-check 3 skills (`emergent-pressure-events`, `propose-new-canon-facts`, `character-generation`) and confirm their alignment-table entries remain accurate.
6. The amendment prose is faithful to FOUNDATIONS' existing register (declarative, terse, principle-named-then-rationale) → manual review by user before merge.

## What to Change

### 1. Append the clarification paragraph to FOUNDATIONS §Tooling Recommendation

In `docs/FOUNDATIONS.md`, immediately after the "non-negotiable" mechanism paragraph (the one ending with "raw file reads alone cannot enforce the contract.") and before the section's closing `---` separator, insert the following paragraph:

> **Whole-class enumeration is a legitimate primary loading pattern.** For skills whose validation discipline tests a candidate against every record of a class — the `emergent-pressure-events` Phase 6 firewalls (every INV record at Phase 6a; every Mystery Reserve entry at Phase 6b) and the `continuity-audit` cross-checks — whole-class enumeration via `mcp__worldloom__list_records(world_slug, record_type, include_full_body=true)` is a recognized primary loading branch of the "directly or via context-packet" permission above. The "touching the same domain" mystery-reserve scoping in the bullet list applies to skills with domain-bounded firewall surfaces; whole-class scoping applies to skills whose firewall is class-bounded by their own Canon Safety Check commitments. The load shape is the skill's choice, named explicitly in its FOUNDATIONS Alignment table and governed by its Canon Safety Check discipline.

Notes for the editor at implementation time:
- MCPENH-007 has landed and is archived, so the bare `list_records(... include_full_body=true)` reference is live-cited.
- The paragraph leads with a bolded principle name to mirror the §Validation Rules sub-headers (e.g., "**Rule 11: No Spectator Castes by Accident**") — this preserves FOUNDATIONS' typographic register for principle declarations.

### 2. Verify existing consumer/back-reference surfaces

`docs/CONTEXT-PACKET-CONTRACT.md`, `.claude/skills/emergent-pressure-events/SKILL.md`, and `.claude/skills/continuity-audit/SKILL.md` already name whole-class enumeration via `list_records(... include_full_body=true)`. Do not edit them in this ticket unless final verification exposes a same-seam contradiction.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — append clarification paragraph to §Tooling Recommendation)
- `docs/CONTEXT-PACKET-CONTRACT.md` (verify only — existing back-reference already present)
- `.claude/skills/emergent-pressure-events/SKILL.md` (verify only — existing whole-class load prose already present)
- `.claude/skills/continuity-audit/SKILL.md` (verify only — existing whole-class load prose already present)

## Out of Scope

1. **No MCP server or implementation changes.** The amendment cross-references `list_records(... include_full_body=true)`, which is already provided by archived MCPENH-007. This ticket only clarifies FOUNDATIONS and the context-packet documentation; it does not reopen MCPENH-007 or alter the MCP server.
2. **Sweeping every skill to update FOUNDATIONS Alignment tables.** Per-skill audit cycles handle ripple. The amendment is valid the moment it lands; alignment-table updates are skill-side polish, not contract-side correctness.
3. **Adding new Validation Rules, CF schema blocks, or relation types.** This amendment is a clarification of an existing principle, not an extension of the design contract. If future work warrants substantive additions (e.g., a new Rule about whole-class load completeness verification), that becomes its own SPEC-backed ticket per the SPEC09CANSAFEXP precedent.
4. **Renaming or restructuring the existing §Tooling Recommendation section.** The bullet list, the "non-negotiable" mechanism paragraph, and the section's overall shape are preserved. The amendment is one paragraph appended.
5. **Validators-side enforcement of whole-class load completeness.** No validator currently checks that a skill's load actually retrieved every record of a class; the discipline is skill-side. If future work warrants validator-side enforcement (e.g., a `phase_6_firewall_completeness` validator that asserts the loaded record set covers the full class at submit time), that becomes its own ticket — likely under a `VALIDENH` namespace.
6. **Upgrading this ticket to a SPEC-backed format.** See §Architecture Check item 3 for the rationale; the SPEC-backed convention applies to substantive amendments. If reviewers prefer SPEC backing universally, the upgrade is mechanical (lift §What to Change into a SPEC document; re-key the ticket).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "Whole-class enumeration is a legitimate primary loading pattern" docs/FOUNDATIONS.md` returns exactly one hit, located within §Tooling Recommendation (between the "non-negotiable" mechanism paragraph and the section's closing `---`).
2. `rg -n "list_records.*include_full_body" docs/FOUNDATIONS.md` returns at least one hit confirming the cross-reference to MCPENH-007's affordance.
3. `rg -n "emergent-pressure-events.*Phase 6|continuity-audit.*cross-check" docs/FOUNDATIONS.md` returns at least one hit confirming the named-skill citations.
4. `rg -n "whole-class enumeration|FOUNDATIONS §Tooling Recommendation" docs/CONTEXT-PACKET-CONTRACT.md` returns at least one hit confirming the existing back-reference remains present.
5. The amended FOUNDATIONS.md continues to render as well-formed Markdown — no broken header structure, no orphaned blockquote, no lost cross-references → manual review (`cat docs/FOUNDATIONS.md` followed by visual inspection of §Tooling Recommendation).
6. The Mystery Reserve firewall behavior at runtime is unchanged → manual review of FOUNDATIONS Rule 7 (no edit) and `emergent-pressure-events` SKILL.md Phase 6b text (no behavior change in the firewall test logic).

### Invariants

1. The amendment is purely additive: no existing FOUNDATIONS principle, rule, or schema text is removed, narrowed, or contradicted. Existing skill alignment-table citations of §Tooling Recommendation remain valid.
2. The Mystery Reserve firewall enforcement is unchanged. Whole-class M-record retrieval is now NAMED as a legitimate load shape, but the firewall's runtime behavior (test every loaded M record's `disallowed_cheap_answers` and `extensions[]` against the candidate event) is identical.
3. The §Tooling Recommendation section's structural shape (header + intro + bullet list + mechanism paragraph + clarification paragraph + closing separator) is preserved.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-and-manual-review and existing pipeline coverage is unchanged.` Per the ticket README's allowed phrasing for documentation-only tickets.

### Commands

1. `rg -n "Whole-class enumeration is a legitimate primary loading pattern" docs/FOUNDATIONS.md` — confirms the principle name landed.
2. `rg -n "list_records.*include_full_body|emergent-pressure-events.*Phase 6|continuity-audit.*cross-check" docs/FOUNDATIONS.md` — confirms the cross-references and named-skill citations landed.
3. `rg -n "whole-class enumeration|FOUNDATIONS §Tooling Recommendation" docs/CONTEXT-PACKET-CONTRACT.md` — confirms the existing back-reference remains present.
4. Manual review: read the amended §Tooling Recommendation top-to-bottom and confirm the new paragraph is faithful to FOUNDATIONS' existing register (declarative, terse, principle-named-then-rationale) and does not introduce contradictions with the existing bullet list or mechanism paragraph.
5. Manual review: spot-check 3 skills' FOUNDATIONS Alignment tables (`emergent-pressure-events`, `propose-new-canon-facts`, `character-generation`) and confirm their generic citations of §Tooling Recommendation remain accurate post-amendment.

## Outcome

Completed on 2026-05-01.

- Added the whole-class enumeration clarification paragraph to `docs/FOUNDATIONS.md` §Tooling Recommendation.
- Reassessed the ticket against the live repo and narrowed the owned implementation to `docs/FOUNDATIONS.md`; `docs/CONTEXT-PACKET-CONTRACT.md`, `.claude/skills/emergent-pressure-events/SKILL.md`, and `.claude/skills/continuity-audit/SKILL.md` already carried the MCPENH-007 whole-class load contract.
- No tool, engine, validator, skill, schema, HARD-GATE, or canon-write behavior changed.

## Verification Result

1. `rg -n "Whole-class enumeration is a legitimate primary loading pattern" docs/FOUNDATIONS.md` — passed; returned exactly one hit in §Tooling Recommendation.
2. `rg -n "list_records.*include_full_body" docs/FOUNDATIONS.md` — passed; returned the new clarification paragraph.
3. `rg -n "emergent-pressure-events.*Phase 6|continuity-audit.*cross-check" docs/FOUNDATIONS.md` — passed; returned the new clarification paragraph.
4. `rg -n "whole-class enumeration|FOUNDATIONS §Tooling Recommendation" docs/CONTEXT-PACKET-CONTRACT.md` — passed; returned existing hits in the truncation guidance and whole-class retrieval pattern text.
5. Manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation — passed; the new paragraph sits after the non-negotiable mechanism paragraph and before the section-closing `---`, and preserves the section's additive clarification shape.
6. Manual review of FOUNDATIONS Rule 7 and `.claude/skills/emergent-pressure-events/SKILL.md` Phase 6b — passed; Rule 7 and the skill's Mystery Reserve firewall behavior were not edited.
7. Manual spot-check of FOUNDATIONS Alignment entries in `.claude/skills/emergent-pressure-events/SKILL.md`, `.claude/skills/propose-new-canon-facts/references/canon-rules-and-foundations.md`, and `.claude/skills/character-generation/references/governance-and-foundations.md` — passed; generic §Tooling Recommendation citations remain accurate after the additive clarification.

## Deviations

- The drafted `docs/CONTEXT-PACKET-CONTRACT.md` edit was already present before this ticket's implementation, so this ticket verified that surface instead of editing it.
- The drafted skill-side ripple was already present in `emergent-pressure-events` and `continuity-audit`; this ticket left those files untouched.
