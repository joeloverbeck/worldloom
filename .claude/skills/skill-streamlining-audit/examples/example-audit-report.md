# Example: Phase 8 audit report shape

A representative chat-only audit report emitted at Phase 8 against a hypothetical post-rework target. This example illustrates report structure (Scope / Load-bearing-do-not-touch / Findings-by-tier / Things-not-redundant / Recommendations / Bottom-line / Summary) and the per-finding `F-NN` ID + severity-rationale + `file:line` anchor discipline. Not all patterns fire on every audit; this example shows one HIGH (numeric drift), one MEDIUM (triple-documented block), and two LOW findings (off-by-N + vestigial `(NEW)` marker) to demonstrate the per-tier shape.

---

```markdown
# Skill Streamlining Audit: branching-story-page-cycle

**Target path**: .claude/skills/branching-story-page-cycle/
**Audit date**: 2026-05-11
**Rework context**: post-prose-strip + post-arc-trace-extraction-phase-addition

## Scope of the audit

- Files read: SKILL.md (1842 lines, 78KB) + 11 reference files (203KB total) + 4 template files (38KB total)
- Siblings cross-checked: branching-story-bootstrap, branching-story-page-prose-finalize, branching-story-health-audit, storylet-pool-authoring, story-fact-promotion-to-canon

## What is genuinely load-bearing (do NOT touch)

| Target file | Cited by | Category | Reason |
|---|---|---|---|
| `references/record-schemas.md` | `branching-story-bootstrap/references/phase-7-root-page-plan.md:142`, `storylet-pool-authoring/SKILL.md:891` | Schema authority | PG / SE / CHC schema source-of-truth for shared classes; sibling references cite this as canonical |
| `references/engine-envelope-shape.md` | `storylet-pool-authoring/references/phase-4-jit-storylet.md:67`, `branching-story-bootstrap/SKILL.md:1203` | Cross-pipeline canonical reference | Envelope-shape contract cited by 2 sibling skills as the engine-routing authority |
| `templates/content-policy.txt` | `branching-story-bootstrap/templates/content-policy.txt` (identical copy), `storylet-pool-authoring/templates/content-policy.txt` (identical copy) | By-design duplicate | "Copied, not symlinked" per storylet-pool-authoring/references/governance-and-foundations.md:412 — the sibling triplet is intentional |
| `references/phase-7-5-visible-affordance-extraction.md` | `branching-story-bootstrap/references/phase-7-5-visible-affordance-extraction.md` (parallel file, bidirectional citation) | Analogue reference | Root-case analogue cited by bootstrap as the same-shape phase |

## Findings

### HIGH

- **F-01** — HIGH — *Numeric drift between HARD-GATE clause and Phase 4 gate enumeration; HARD-GATE says "8 gates" but Phase 4 enumerates 9.* — `SKILL.md:48`, `SKILL.md:512-587` — HARD-GATE clause (b) says "all 8 Phase 4 gates pass"; the Phase 4 gate table at lines 512-587 enumerates Mystery firewall, Resolution-authority declaration, Invariant compatibility, Consequence capacity, Dedup, Content-intensity coherence, Predicate DSL parsability, Branch-contamination, and Schema completeness — 9 gates. A faithful implementation would either skip one gate or block on the count mismatch. Canonical source: the Phase 4 enumeration (the gate table is the implementation contract; the HARD-GATE clause should cite the actual count).

### MEDIUM

- **F-02** — MEDIUM — *cadence_policy block documented three times across templates, SKILL.md prose, and references with full body each time.* — `templates/story-records.yaml:218-274`, `SKILL.md:1402-1456`, `references/cadence-discipline.md:34-89` — The yaml literal plus its rationale appears in three places. Future drift hazard: a tone refinement landing in one site silently fails to propagate. Canonical home recommendation: `templates/story-records.yaml` (the schema definition); `SKILL.md` and `references/cadence-discipline.md` should reference the template rather than re-enumerate.

### LOW

- **F-03** — LOW — *Off-by-N count: "§18 Scene direction — AUTHOR-WRITTEN five fields:" followed by six items.* — `references/phase-9-plan-construction.md:312-319` — The header claims five; the enumerated list under it has six (`action_beats`, `dialogue_beats`, `sensory_register`, `interiority_register`, `transition_marker`, `pacing_signature`). Trivial drift; reader confusion. Fix: update header to "six fields" OR drop one item.

- **F-04** — LOW — *Vestigial `(NEW)` annotation from BSPAG-014 which merged 2026-04-22.* — `references/phase-7-5-visible-affordance-extraction.md:8`, `references/phase-7-5-visible-affordance-extraction.md:144` — The phase title and one rule both carry `(NEW)` markers from BSPAG-014's implementation ticket. The ticket merged 19 days ago; the marker now implies the content is in draft. Strip both markers.

## Things that are NOT redundant or detrimental

- `templates/content-policy.txt` — deliberately copied across siblings (NC-21 policy); **keep**.
- HARD-GATE block at SKILL.md top — load-bearing per skill discipline; **keep**.
- `templates/record-schemas.md` — cited by bootstrap and storylet-pool-authoring as schema authority; **keep**.
- `references/engine-envelope-shape.md` — cited by 2 sibling skills; **keep** (architecture-location question — should this be at pipeline scope rather than skill scope? — is a separate concern).
- `references/phase-7-5-visible-affordance-extraction.md` — looks bulky (412 lines) but encodes the per-class validator gate table; verbosity is load-bearing; **keep**.

## Recommendations (least-risky-first)

1. **F-01** (HIGH, correctness sync) — update HARD-GATE clause (b) to cite 9 gates, matching the Phase 4 enumeration. Smallest blast radius; isolated edit at SKILL.md:48. Grep-verifiable.
2. **F-02** (MEDIUM, single-source consolidation) — declare `templates/story-records.yaml` as canonical for `cadence_policy`; refactor SKILL.md:1402-1456 and `references/cadence-discipline.md:34-89` to cross-reference rather than re-enumerate. Larger edit, but no contract change.
3. **F-03 + F-04 bundled** (LOW, janitorial sweep) — fix the off-by-N count at `references/phase-9-plan-construction.md:312` and strip both `(NEW)` markers at `references/phase-7-5-visible-affordance-extraction.md:8,144`. Single ticket.

## Bottom-line

Nothing should be deleted wholesale. The post-rework state has one concrete correctness drift (F-01) and one duplication-driven future-drift hazard (F-02); the LOW findings are cosmetic. Cleanup sites concentrate in references rather than templates or SKILL.md prose, consistent with the rework pattern (arc-trace-extraction added phase content; the gate count and cadence policy were extended in references without backfilling the HARD-GATE clause or the templates' single-source claim). The skill is structurally sound — F-01 fix and F-02 consolidation are independently mergeable; the LOW sweep can be deferred.

## Summary

**Total**: 4 findings — 1 HIGH, 1 MEDIUM, 2 LOW.
```

---

**User disposition options** (presented after the report):

- **ACCEPT-and-create-tickets** → Phase 9 fires: 3 tickets (BSPAG-NNN-fix-hard-gate-gate-count, BSPAG-NNN-consolidate-cadence-policy-canonical-source, BSPAG-NNN-janitorial-sweep) plus a triage manifest (3 tickets ≥ 3 threshold).
- **ACCEPT-report-only** → end the run; the user will commission edits later via separate steps.
- **REVISE-narrow** → e.g., "downgrade F-04 from LOW to drop — the `(NEW)` markers are intentional pending BSPAG-019's completion".
- **REJECT** → end the run with no further action.
