# Triage: FOUNDATIONS Amendment Proposal (2026-05-14)

**Source**: `archive/reports/worldloom_foundations_amendment_proposal.md` — external review (ChatGPT-Pro) of `docs/FOUNDATIONS.md`, conducted against the `docs/` set only, **no codebase access**. 12 numbered amendments proposed.

**Method**: each amendment reassessed against the actual schemas, validators, MCP layer, and skills via four parallel codebase-verification passes. The reviewer's diagnoses are largely accurate; its prescriptions over-build (several duplicate validator-enforced mechanisms; some proposed *fixes* invent fields/shapes that contradict working code).

**Deliverable**: `archive/specs/SPEC-27-foundations-canon-and-story-integrity-amendments.md` — one umbrella spec, 9 deliverables (D1–D9). No `specs/IMPLEMENTATION-ORDER.md` update (only archived versions exist).

## Accepted → SPEC-27

| Amendment | Verdict | SPEC-27 | Rationale |
|---|---|---|---|
| A1 — CF `status` enum (`derived_canon` missing, `mystery_reserve` dead) | accept | D1 | Real inconsistency: §Canon Layers names 5 layers, enum covers 4; `mystery_reserve` used by zero CFs and is a separate `M` record class. |
| A1 — `required_world_updates` retired `.md` filenames | accept-with-mod | D1 | Doc stale (self-contradicts `FOUNDATIONS.md:518`). Fixed to the **enforced** flat UPPER_SNAKE file-class shape — not the reviewer's invented structured-object shape. Stale `skill-creator` template + bad `canon-addition` example also fixed. |
| A2 — Silence Semantics | accept-with-mod | D3 | Obligation real but enforced only post-hoc (`continuity-audit` Phase 4k). Relocated to `canon-addition` Phase 0; six-state taxonomy dropped for a lightweight classification. |
| A4 — Rule Numbering & Enforcement Map | accept | D2 | Gap (Rules 1–7, 11, 12) is real and intentional (SPEC-09) but undocumented in-place; Rule-vs-Test numbering collides at 11–13. |
| A5 — Choice Consequence Integrity | accept | D5 | Real gap: empty `SE.state_delta` is explicitly legal; `CHC.grounded_in` is an availability anchor, not a consequence guarantee. |
| A6 — Canon Baseline Drift §4b | accept-with-mod | D6 | `canon_revision` is a phantom feature — `CONTEXT-PACKET-CONTRACT.md:246/258/264` describe a baseline the PG schema/skills never implemented. Doc-correctness fix is mandatory regardless; full mechanism is the heaviest surface. |
| A8 — Information / Observer Firewall §6b | accept-with-mod | D7 | `expected_witnesses` covers belief *propagation*; the genuine gap (move/choice *generation* respecting actor knowledge) is unenforced. Scoped narrowly to generation. |
| A9 — Mystery Accretion Discipline | accept-with-mod | D8 | Cumulative narrowing of a Mystery Reserve entry is unchecked. Reuses existing `unresolved_mystery_claims[].status` vocab — no new `SLT` field. |
| A11 — Authority-cited gate rationales | accept | D4 | Current bar is non-emptiness, not citation. Generalizes a discipline `canon-addition` Phase 14a already practices skill-locally. |

## Dismissed

| Amendment | Reason |
|---|---|
| A3 — "Canon Integration Chain" required schema block | *(structural)* ~9/15 sub-fields duplicate existing CF fields; the 11-phase `canon-addition` process already forces all five integration questions; a required block violates §5b schema-minimalism. The reviewer's flagship amendment, and the weakest. |
| A7 — "§4c Authorship and Authority Boundary" | *(structural)* Fully covered by `story-state-contract.md` §1, `FOUNDATIONS.md` §4a, §6 action routing, prose-attach `invented_structural_fact`. Pure restatement. |
| A10 — "impact_surface_map" Change Control expansion | *(structural)* §Change Control Policy is already realized as the executable CH record schema, which exceeds the prose spec. D1 instead adds a one-line prose pointer to the CH schema. |
| A12 — "§1a Story-Local Operationalization of Invariants" | *(structural)* `STORY_KERNEL.md` §7 already lists invariant constraints; per-invariant "operational consequence" prose is tone polish, not load-bearing. |
| A4 sub-part — new "Rule 13: No Perfect Recognition by Default" | *(structural)* Misrecognition already enforced via SPEC-18 (`canon-addition` Phase 0 probe + Test 13 + `epistemic_profile`). A Rule 13 duplicates shipped machinery and worsens the Rule-vs-Test collision. D2 documents the existing linkage instead. |

## Out-of-report findings (surfaced during verification, folded into SPEC-27)

- `FOUNDATIONS.md:312-316` self-contradicts `FOUNDATIONS.md:518` (stale `.md` filenames vs. "those files don't exist"). → D1
- `CONTEXT-PACKET-CONTRACT.md:246/258/264` describe a `canon_revision` mechanism that doesn't exist. → D6
- `skill-creator/templates/canon-fact-record.yaml:54-57` still shows retired `.md` filenames. → D1
- `canon-addition/examples/accept-with-required-updates.md:120` uses SEC record IDs in `required_world_updates`, contradicting the validator. → D1
- `FOUNDATIONS.md` §Change Control Policy prose is thin and out of sync with the CH schema that operationalizes it. → D1 (prose pointer)

## Follow-ups identified, not actioned

- `canon-addition` has no FOUNDATIONS Alignment table (noted by verification; out of SPEC-27 scope).
- If D6's implementation surface proves disproportionate at ticket-decomposition time, it is the candidate to split into a follow-up spec — but the `CONTEXT-PACKET-CONTRACT.md` correction must stay in SPEC-27.
