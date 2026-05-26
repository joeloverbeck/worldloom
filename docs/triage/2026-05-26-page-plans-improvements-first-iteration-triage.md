# 2026-05-26 — Page plans improvements (first iteration) triage

## Source

`reports/page-plans-improvements-first-iteration.md` — ChatGPT-Pro deep-research analysis (902 lines, 15 top-level sections) of the worldloom page-plan architecture. The report's executive verdict is to **split the single page-plan artifact into two**: an internal audit packet (record IDs, hashes, state deltas, validation trace) and a renderer-facing prose packet (zero IDs, zero engine vocabulary, human-labeled character authority, translated state-deltas, structured continuity).

User directive: "Please be critical of ChatGPT-Pro's proposals: reassess them for correctness and benefit. If changes aligned with `docs/FOUNDATIONS.md` are warranted, create specs in specs/*."

## Executive position

Diagnosis correct; remedy over-engineered. The single-artifact architecture is preserved (per FOUNDATIONS §Story Bundles §4 and the 2026-05-10 PROSESPLIT decision); the engine-vocabulary cleanup pattern PPLAN-005/006 started is extended to the remaining sections; a new structural validator enforces the existing "engine jargon only in §15" contract rule. The two-artifact split is rejected.

**Deliverable**: `specs/SPEC-91-page-plan-body-renderer-cleanliness.md`. Five ticket-sized chunks; estimated mid-sized scope.

## Prior decisions this triage extends

| Date | Decision | Reference |
|---|---|---|
| 2026-05-10 | Plan IS the renderer prompt (single artifact); plan rendering OUT of skill | PROSESPLIT-001..009; `docs/triage/2026-05-10-prose-rendering-out-of-skill-triage.md` |
| 2026-05-12 | Translate SLT (§15) and OBL/CNSQ/THR (§10) engine vocab to prose direction; drop `forbidden_engine_vocabulary[]` from §18/§19 body | PPLAN-001..007; `docs/triage/2026-05-12-page-plan-engine-vocabulary-cleanup-triage.md` |
| 2026-05-12 | §2 / §3 / §19 stay verbatim every page (no cross-page compaction) | User decision; feedback memory `page_plan_verbatim_sections` |

## Verified empirical claims

| Claim | Status |
|---|---|
| Plans 71-134 KB; prose 3.6-7.6 KB | ✓ verified across 5 PG files in red-bunny |
| PG-1 has 234 record-ID tokens; PG-4 has 636 | ✓ exact |
| Rendered prose contains zero record-ID tokens | ✓ all 5 prose files |
| PG-2 §7 contains `state_delta.create/supersede/close` arrays + YAML fragments + `record_introductions` | ✓ PG-2.md lines 203-247 |
| PG-3 prose imports plan vocabulary ("sort-grid", "file loads the header", "search query / lookup table") | ✓ PG-3 prose lines 25, 29 |
| `engine_jargon_leak` check exists but only scans rendered prose, NOT plan body | ✓ prose-attach SKILL.md Phase 3 check 2 |
| Renderer-prompt diagnostic enumeration ("post-render prose critic will flag `filter_word_saturation`...") trains the model to think about a rubric | ✓ verbatim at `reports/prose-quality-instructions.md` lines 214-217 |
| Prose Craft Contract Rule 9 enumerates 30+ engine-vocabulary prefixes in the renderer prompt | ✓ verbatim at `reports/prose-quality-instructions.md` line 115 |

## Corrections to the report

1. **"The repo does NOT require the external renderer to see record IDs"** — partially false. §16a's `Current-state grounding records:` field is by design a comma-separated record-ID list and the `page_plan_stchar_packet_integrity` validator enforces it. Eliminating those IDs would require schema amendment touching ≥3 validators.
2. **"Worldloom already has the conceptual basis for the split"** — conceptually yes, but the operational decision went the OTHER way: PROSESPLIT-001..009 (2026-05-10) explicitly made the plan the single renderer-facing artifact to eliminate the cross-artifact synchronization problem the report's split proposal would reintroduce.
3. The report implies that "engine-jargon-only-in-§15" needs to be invented; in fact it already exists at `.claude/skills/_shared-templates/story-state-contract.md` §8 line 571: *"The plan must not expose engine jargon to prose. Engine terms confined to §15 frontmatter only."* The actual gap is **structural enforcement** — no validator scans the plan body for engine vocabulary leakage outside §15.
4. **Delta gap**: the report does not acknowledge that PPLAN-001..007 (2026-05-12) already translated SLT/OBL/CNSQ/THR engine vocabulary in §10 and §15 and dropped the forbidden_engine_vocabulary enumeration from §18/§19. The report re-presents some of this work as new.

## Per-proposal triage

### accept-with-modification (6)

| # | Proposal | Modification scope |
|---|---|---|
| AM-1 | Eliminate engine-vocabulary leakage from the renderer-facing plan body | Keep single artifact (per FOUNDATIONS §Story Bundles §4 and prior PROSESPLIT decision); extend PPLAN-005/006's pattern to §7 state_delta / §7a driver / §9 BEL grounding / §9b STPLAN / §9c STEMO / §10b CLK-STSEC-STQ. Landed in SPEC-91 §6. |
| AM-2 | Translate state-delta into prose-direction language | Direct extension of PPLAN-005 (SLT translation) and PPLAN-006 (OBL/CNSQ/THR translation). Apply same pattern to §7: keep engine YAML in §15 frontmatter, body says "Jon now believes X; Ane now knows Y; the observation-clock has begun" in prose. Landed in SPEC-91 §6 §7 subsection. |
| AM-3 | Restructure §14 to use a structured continuity + anti-repetition summary | Verified pathology — PG-3's prose recycles plan vocabulary. Replace §14's optional verbatim prose dump with a 4-subsection structured packet (continuity bullets / facts to preserve / "do not reuse" anchors list / fresh anchor opportunities). Verbatim prior-prose quotation hard-capped at 1-3 lines on explicit triggers. Landed in SPEC-91 §6 §14 subsection. |
| AM-4 | Move diagnostic-token enumeration ("post-render prose critic will flag `filter_word_saturation`...") out of the renderer-facing prompt | Reword §Render-Time Instruction Template and §Anti-Pathology Checklist to use natural-language "avoid X" prose; keep the diagnostic axis names as **prose-attach internal validator vocabulary**, not renderer-facing language. Landed in SPEC-91 §7.1 and §7.3. |
| AM-5 | Reword Prose Craft Contract Rule 9 to avoid teaching the model the 30+-prefix engine vocabulary | Replace enumeration with category-level rule ("no record-id-shaped tokens, no schema field names, no validator vocabulary"); move the full enumeration to a validator-only file. Landed in SPEC-91 §7.2 and §8.2. |
| AM-6 | New validator scanning plan body for engine-vocabulary cleanliness | Scope: scan plan body sections OTHER than §15 frontmatter, §16a `Current-state grounding records:` field, §2/§3/§19 verbatim blocks. WARN at 1-2 hits per section; FAIL at ≥3. Landed in SPEC-91 §8 as `page_plan_body_engine_vocabulary_cleanliness`. |

### reject (4)

| # | Proposal | Rejection rationale |
|---|---|---|
| R-1 | Split into TWO artifacts (internal audit packet + renderer prose packet) | (a) Reverses PROSESPLIT's architectural commitment (FOUNDATIONS §Story Bundles §4: "its body inlines all canonical context the external renderer needs"). (b) Introduces a source-map synchronization problem the single-artifact design specifically eliminated. (c) Doubles the hash basis (`internal_packet_hash` + `renderer_packet_hash` + `source_map_hash`), expanding the Hook 6 / Hook 7 surface. (d) The actual problem — engine vocabulary in the body — is solvable within the existing single-artifact contract by completing the body-translation pattern PPLAN-005/006 started. Alternative path: cleanup + structural enforcement per AM-1 through AM-6. |
| R-2 | Eliminate ALL record IDs from §16a "Character authority for this page" packets (the report's "human labels only" proposal) | Contradicts §16a contract: `Current-state grounding records:` field is parsed as a comma-separated id list by design and validators depend on it (`page_plan_stchar_packet_integrity` requires presence). Removing IDs would require schema amendment touching ≥3 validators. Alternative path: keep the `Current-state grounding records:` field as the lawful in-body record-ID location; the new validator allow-lists it. |
| R-3 | New `internal_packet_schema_compliance` and `renderer_packet_source_coverage` validators | These exist only because of the split (R-1); not needed under the single-artifact framing. Alternative path: the new plan-body-engine-vocabulary-cleanliness validator (AM-6) covers the same intent. |
| R-4 | Wholesale 12-section renderer-packet template (report §15) replacing the 19-section contract | The 19-section contract has been tuned across PROSESPLIT + PPLAN + SPEC-42 + SPEC-47 + SPEC-56 + SPEC-71/72/73. Wholesale replacement would invalidate every downstream validator's section-parser regex (`page-plan-section-parser.ts`). Alternative path: targeted section-content rewrites for §7, §7a, §9, §9b, §9c, §10b, §14, §16a; keep the 19-section structure. |

### confirms-existing-position (4)

| Proposal | Existing position |
|---|---|
| "Keep STCHAR authority intact; do not weaken" | Already protected by `_stchar-operational-sections.ts`, `stchar-body-integrity.ts`, `stchar-temporal-reference-boundary.ts`, and `page_plan_stchar_packet_integrity`. |
| "Plan-authority boundary: rendered prose is not state authority" | Already FOUNDATIONS §Story Bundles §4a and prose-attach SKILL.md Phase 3. |
| "Observer firewall" | Already FOUNDATIONS §Story Bundles §6b + story-state-contract §5 §5a §11a + `turn_driver_pov_observer_firewall` validator. |
| "Content Policy must remain inlined" | Already user-confirmed 2026-05-12 (feedback memory `page_plan_verbatim_sections`). |

### already-resolved (6)

| Proposal | Where resolved |
|---|---|
| SLT schema → prose-direction translation in §15 | PPLAN-005 (2026-05-12, completed) |
| OBL/CNSQ/THR engine vocab → prose translation in §10 | PPLAN-006 (2026-05-12, completed) |
| Drop `forbidden_engine_vocabulary[]` enumeration from §18/§19 body | PPLAN-007 (2026-05-12, completed) |
| Cast Material Reality projection | PPLAN-001 (2026-05-12, completed) |
| §16a record-ID token discipline | `page_plan_stchar_packet_integrity` validator (post-SPEC-71/73) |
| Rendered prose engine-jargon scan | prose-attach Phase 3 check 2 `engine_jargon_leak` (existing) |

### follow-up — landed inline 2026-05-26 (1)

- **Stale section numbering in `reports/prose-quality-instructions.md` §External-Renderer Usage Guide lines 264-267**: referenced the pre-SPEC-72 section layout (`§4 POV / §5 world canon / §6 invariants / §7 mysteries-in-play firewall / §15 selected arc`) that didn't match the current 19-section contract. The verbatim §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template blocks themselves were correct; only this usage-guide paragraph had stale labels. **Fixed inline 2026-05-26** by direct edit on `reports/prose-quality-instructions.md`; the same edit fixed two adjacent pre-rebuild references in the same section (`branching-story-page-cycle Phase 7` → `branching-story-turn-cycle Phase 7`; the `branching-story-page-prose-finalize` / `prose_ledger_consistency` / `arc_trace_evidence_alignment` / `prose_critic_8_axis` / "3-attempt budget" / `SOFT_FAIL`/`HARD_FAIL` paragraph → current `branching-story-prose-attach` 8-deterministic-check + STCHAR + optional 7-axis craft critic + PASS/WARN/FAIL roll-up + `repair_recommendation` shape). SPEC91-004 ticket scope reduced accordingly per SPEC-91 §7.4 update.

## Decision summary

| Bucket | Count |
|---|---|
| accept-with-modification | 6 |
| reject | 4 |
| confirms-existing-position | 4 |
| already-resolved | 6 |
| follow-up | 1 |
| **Total evaluated** | **21** |

§Input-complexity carve-out fires at ≥8 evaluated items (this triage has 21). Single-deliverable triage flow → one spec (SPEC-91) + this companion triage file.

## Named assumptions

The triage rests on these assumptions; user can override on review:

1. **Continuation of PROSESPLIT's single-artifact architecture.** If the user actually wants the split (two artifacts, source map, dual hashes), the spec must be re-drafted as a fundamentally larger change with PROSESPLIT-style decomposition.
2. **The §16a `Current-state grounding records:` field stays as a record-ID list.** Eliminating IDs there is a schema change touching ≥3 validators.
3. **One spec, not multiple.** With 5 tightly-coupled ticket-sized chunks under one architectural theme, one spec keeps the work coherent.
4. **No retroactive plan rewrite.** Existing PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/` remain as-is; the new contract applies to plans authored after the spec lands.
5. **The fix is design-only; the prose-attach 8-axis critic vocabulary remains internal.** Only the renderer-facing presentation of those axis names is removed.

## Future iterations

If a future page-plans-improvements-second-iteration report appears, it should be triaged as a delta against this triage and against SPEC-91's landed state, not as a fresh pass — accepted-with-modification items already covered, rejected items deliberately ruled out, and already-resolved items should not be silently re-proposed without naming the iteration-N evidence that meets a prior deferral / rejection's lift-condition (per the brainstorm skill's Step 1 bidirectional lineage check).

The current report did not acknowledge the 2026-05-12 PPLAN landed work, so its iteration-1 framing is partly stale-baseline. A second iteration that acknowledges PPLAN + SPEC-91 (once landed) and proposes only delta extensions would be the cleaner shape.
