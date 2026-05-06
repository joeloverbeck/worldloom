# Triage: ChatGPT-Pro `branching-story-bootstrap` Findings (2026-05-06)

## Source

External LLM review (ChatGPT-Pro) of `.claude/skills/branching-story-bootstrap` SKILL.md captured at `reports/branching-story-boostrap-fixes.md`. The report enumerated 19 numbered findings (eight "critical issues", four narrative-theory improvements, three choice-generation issues, four schema/template issues) plus a top-level priority list.

Each finding was verified against the current skill's `SKILL.md`, all 10 files under `references/`, and all 4 files under `templates/`, plus the supporting machine-facing surfaces (`tools/world-mcp/src/tools/allocate-next-id.ts`, `tools/patch-engine/src/ops/create-story-record.ts`, `tools/validators/src/schemas/story-*.schema.json`).

## Accepted (15 — one ticket each, BSBOOT-003 through BSBOOT-017)

### Tier 1 — confirmed bugs

| Ticket | Finding | Path |
|---|---|---|
| `archive/tickets/BSBOOT-003.md` | STENT/STINT `character_id` semantic collision (rename STINT field; fix STENT example) | report #3 |
| `archive/tickets/BSBOOT-004.md` | STORY_KERNEL vs INDEX bootstrap-mix shape-label disagreement (use canonical bootstrap-mix labels in the initial INDEX template) | report #18 |
| `archive/tickets/BSBOOT-005.md` | `canon_revision: ""` should be `null` in BR + PG examples | report #17 |
| `archive/tickets/BSBOOT-006.md` | Phase 7 prose cross-check stricter than Phase 9 gate 10 (relax to physical-staging only) | report #6 |

### Tier 2 — design gaps

| Ticket | Finding | Path |
|---|---|---|
| `archive/tickets/BSBOOT-007.md` | Phase 9 gate 2 audit scope too narrow (broaden beyond `applied_event_ops`) | report #4 |
| `archive/tickets/BSBOOT-008.md` | Phase 9 gate 12 closure root too narrow (root from PG-0001, not just `state_snapshot`) | report #5 |
| `archive/tickets/BSBOOT-009.md` | CNSQ ledger doc inconsistencies (make CNSQ creation conditional; allocations conditional) | report #2 |
| `archive/tickets/BSBOOT-010.md` | SF `visible_to_reader: true` default leaks secrets (default false; add `reader_visibility_basis`) | report #7 |
| `archive/tickets/BSBOOT-011.md` | Storylet pool sizing not scale-aware (intended_scale unused by Phase 6) | report #8 |
| `archive/tickets/BSBOOT-012.md` | SLT id-assignment timing risk (pre-allocate ids before delegation) | report #19 |

### Tier 3 — real improvements

| Ticket | Finding | Path |
|---|---|---|
| `archive/tickets/BSBOOT-013.md` | Strengthen gate 11 with simulated post-choice continuation validation | report #13 |
| `archive/tickets/BSBOOT-014.md` | Phase 7.5 visible-affordance extraction (parse rendered prose, feed to Phase 8) | report #15 |
| `archive/tickets/BSBOOT-015.md` | Bootstrap-specific strict validator (catch missing soft-required fields) | report #16 |
| `archive/tickets/BSBOOT-016.md` | CHC semantic-distance gate (2 axes plus structural difference) | report #14 |
| `tickets/BSBOOT-017.md` | Tighten Phase 11 atomicity wording ("staged commit", not "single transaction") | report #1 |

## Dismissed (4 — no clear runtime payoff for the proposed schema additions)

| Report # | Proposal | Reason for dismissal |
|---|---|---|
| #9 | `dominant_interaction_grammar` taxonomy on STORY_KERNEL.md | Adds a new vocabulary that competes with existing `designing_principle` + `themes` + `tone_constraints`. No runtime consumer; storylet shape distribution + obligation salience already encode the practical levers. Authorial overhead without validation surface. |
| #10 | `narrative_interest_mix` (suspense / curiosity / surprise weights) on STORY_KERNEL.md | Sternberg's narrativity model is real but encoding interest as bundle-level percentage weights is hard to operationalize and hard to validate. Storylet shape distribution + obligation salience already give the runtime levers. |
| #11 | Per-page `focalization` YAML fields on PG records | The Prose Craft Contract (loaded into every Phase 7 prompt) already governs voice/perspective. Adding per-page schema fields is bloat unless the runtime page-cycle consumes them. The underlying concern (accidental omniscience, characters reporting hidden facts) is legitimately a prose-critic axis — but as a critic rule, not a YAML schema field. |
| #12 | `scene_turn` YAML schema on PG records | Phase 7's "end at a moment where 4-6 distinct choices for what happens next would be natural" already encodes a turn (choices imply a decision point). The information is already in `applied_event_ops` + state_snapshot delta. Could be tightened as a prose-critic rule, but a new schema is overengineering. |

Tier 4 dismissals do not preclude future revisitation if the runtime page-cycle later grows consumers for these fields. The underlying prose-quality concerns of #11 (focalization breaches) and #12 (scene-turn weakness) MAY become prose-critic axes in `branching-story-page-cycle/references/prose-craft-contract.md` later — that is a separate decision, not within this triage's scope.

## Follow-ups identified (not actioned in this triage)

- ChatGPT's "Phase 1.5 Narrative Architecture Pass" proposal (report §What I would add) bundles findings #9, #10, #11 plus a `root_scene_contract`. With #9–#12 dismissed, the umbrella also falls. If the runtime page-cycle later consumes any of these signals, the umbrella may be revisited.
- ChatGPT's `.bootstrap-in-progress` marker proposal (report #1, second paragraph) is **not** included in BSBOOT-017. The wording-only fix is sufficient; introducing a marker file is over-engineering relative to the existing slug-collision check + per-world-INDEX-last ordering. If a future audit identifies real failure modes the marker would catch, that becomes its own ticket.

## Out of scope for this triage

- Modifying `docs/FOUNDATIONS.md`. None of the accepted findings change a Foundations principle; they tighten a canon-reading skill's discipline to better honor existing principles (Rules 1, 4, 7).
- Modifying `branching-story-page-cycle`. BSBOOT-012 leaves page-cycle's JIT path unchanged. BSBOOT-012 does update `storylet-pool-authoring`'s bootstrap seed sub-routine contract so it requires and consumes caller-supplied `target_slt_ids[]`; no engine or schema change is required.
- World-bundle migration. All accepted changes are forward-only for new bootstrap runs; existing bundles retain their current shape.
