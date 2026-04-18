# Continuity audit

## Purpose

Maintain long-term world coherence as canon grows.

This pipeline detects:
- contradictions
- scope drift
- capability creep
- dangling consequences
- thematic erosion
- hidden retcons
- local/global canon confusion

It also governs how revisions are allowed.

---

## When To Run

Run this pipeline:
- after every major canon addition
- after every 5-10 minor additions
- before publishing any story, game questline, lorebook, or sourcebook
- whenever a user suspects contradiction
- before large world expansions
- after introducing new regions, species, power systems, or historical revisions

---

## Inputs

- full canon ledger
- invariants
- recent change log
- unresolved contradiction list
- mystery reserve
- all diegetic text artifacts touching the relevant domain
- all open proposal cards under consideration

---

## Outputs

- contradiction report
- burden debt report
- scope drift report
- proposed repairs
- retcon recommendations
- update priority list

---

## Audit Categories

### 1. Ontological Contradictions
A fact says something can exist that another fact says cannot.

### 2. Causal Contradictions
Causes and effects stop matching established rule logic.

### 3. Distribution Contradictions
A rare capability begins behaving as if widespread without explanation.

### 4. Timeline Contradictions
Historical order, age, diffusion, or memory are impossible.

### 5. Institutional Contradictions
Major powers fail to react to facts that should affect them.

### 6. Everyday-Life Contradictions
Ordinary life ignores world-shaping conditions.

### 7. Tone / Identity Drift
Accumulated additions make the world feel unlike itself.

### 8. Mystery Corruption
Too many mysteries are explained too fast, or mysteries become incoherent sludge.

### 9. Diegetic Leakage
In-world texts reveal knowledge their authors could not plausibly have.

### 10. Local/Global Drift
A local practice or anomaly is repeatedly treated as universal world truth.

---

## Continuity Lint Questions

Run these questions mechanically.

- What changed recently that should now appear elsewhere?
- What capability has become suspiciously consequence-free?
- What institution has failed to respond to a world-changing development?
- Which facts are now redundant?
- Which facts silently imply broader adoption?
- Which regions are under-updated after a global change?
- Which species or classes are absent from consequences they should feel?
- Which earlier facts now need scoping, limiting, or reclassification?
- Which diegetic texts should now be re-read as biased or incomplete?
- Which mysteries should be protected from accidental overexposure?

---

## Contradiction Severity Levels

### Severity 1: Cosmetic Mismatch
Minor wording or emphasis inconsistency.

### Severity 2: Soft Contradiction
Lore now feels underexplained.

### Severity 3: Structural Tension
A domain file must be revised.

### Severity 4: World-Identity Risk
The world's core logic or feel is degrading.

### Severity 5: Canon Break
Hard contradiction or catastrophic drift.

---

## Repair Menu

Use the lightest viable repair.

### Clarify Scope
Example:
This was true only in one dynasty, region, species, or century.

### Add Limiting Condition
Example:
The power works only during eclipses, with rare materials, or with severe bodily cost.

### Reclassify as Diegetic Belief
Example:
The old text was propaganda, a sectarian claim, a mistaken theory, or deliberate mythmaking.

### Add Institutional Response
Example:
A guild, church, state office, or taboo network now explains why consequences were not previously visible.

### Insert Historical Change
Example:
This became possible only recently due to excavation, plague, reform, climate shift, or war.

### Narrow Adoption
Example:
Only one order, bloodline, biome, or technology lineage can do this.

### Split the Fact
Example:
Separate one oversized canon claim into two smaller truths.

### Full De-Canonization
Use only when necessary.
Do not hide it.
Log it.

---

## Retcon Taxonomy

Retcons are not all equal.

### Type A: Clarificatory Retcon
Makes explicit what was already implicitly true.

### Type B: Scope Retcon
Limits what had been spoken too broadly.

### Type C: Perspective Retcon
Reframes prior statements as incomplete, biased, or local.

### Type D: Cost Retcon
Adds a missing burden or failure mode.

### Type E: Chronology Retcon
Moves when something became true.

### Type F: Ontology Retcon
Changes what the world fundamentally allows.
Use rarely.

---

## Retcon Policy

- No silent edits
- No deletion without replacement note
- No changing world-level truth by stealth through diegetic text
- No retcon that solves one contradiction by creating three more
- No retcon that weakens the world's identity for convenience
- Every retcon must state:
  - what changed
  - why
  - what now follows
  - which old texts remain valid and in what sense

---

## Change Log Entry Template

```yaml
change_id: CH-0028
date: 2026-04-17
change_type: scope_retcon
affected_fact_ids:
  - CF-0102
summary: >
  Reclassified relic-detection methods from civilization-wide practice to
  a regional monastic technique.
reason:
  - earlier diffusion implications became world-breaking
  - prior geography and literacy limits support regional restriction
downstream_updates:
  - INSTITUTIONS.md
  - GEOGRAPHY.md
  - DIEGETIC_TEXTS/relic_manuals.md
impact_on_existing_texts:
  - one prior travelogue now treated as overgeneralization
severity_before_fix: 4
severity_after_fix: 2
```

---

## Pre-Publication Audit Checklist

Before any story or lore product ships, verify:

- all referenced facts still exist in current canon
- all supposedly public knowledge is public in the world at that date
- no new power appears without prior or contextual support
- local customs are not written as global truths
- institutions and ordinary life reflect relevant world conditions
- the text does not accidentally resolve protected mysteries
- the text does not rely on rejected or superseded canon

---

## Final Rule

Continuity is not mere contradiction avoidance.

It is ongoing enforcement of:
- scope discipline
- consequence discipline
- thematic discipline
- epistemic discipline

Without this pipeline, the world will eventually turn into disconnected trivia.