# Phases 3–5: Character Web, Niches, Negative-Space Diagnosis

## Phase 3: Build Story-World Character Web

Two simultaneous views.

**Constellation view** — existing registry entries linked by kinship / patronage / rivalry / debt / mentorship / desire / conflict / co-presence / contrast / moral-opposition / thematic-analogy. Use `get_neighbors` on registry-entry `ENT-NNNN` ids when the relation graph is not already in the packet.

**Mosaic view** — registry entries linked even if they never meet, through shared institution / trade route / species pressure / border / taboo system / relic economy / war residue / archive chain / artifact circulation / rumor ecology / mirrored contradictions across regions.

Required outputs:

- **dense clusters** — domains with multiple closely-coupled registry entries
- **isolated domains** — domains where registry entries do not connect to others
- **overrepresented clusters** — clusters whose density distorts world-window coverage
- **monopoly windows** — domains visible through only one registry entry (single-point-of-failure)
- **mosaic mirrors** — separated entries in parallel positions across regions / species / institutions

**Rule**: Characters need not know each other to compete for the same story-world niche.

**Mandatory critic pass**: Constellation / Mosaic Analyst.

## Phase 4: Determine Filled / Crowded / Open Niches

Per registry entry, compute a niche signature from the 7-layer essence. Classify future spaces as `filled` / `crowded` / `adjacent` / `open`.

- **Hard Duplicate** — substantial match on function + world-position-and-institution + pressure + access + epistemic + voice-family.
- **Crowded Niche** — several entries reveal the same world window from similar pressure / voice positions.
- **Adjacent Niche** — shared domain, differs on function OR power-relation OR pressure-engine OR perception OR voice OR thematic-charge OR artifact-affordance.
- **False Duplicate** — never reject a proposal solely for shared profession / species / region / age_band / gender / religious_alignment.

**Optional weighted heuristic**: function+pressure-relation 25% / world-position+institution 20% / pressure-engine 20% / access 15% / epistemic 10% / voice 10%. Thresholds: 0.75+ duplicate / 0.55–0.74 crowded / 0.35–0.54 adjacent / <0.35 distinct.

**Rule**: Never use the score without human-readable justification recorded in the card's Niche Analysis section.

**FOUNDATIONS cross-ref**: Rule 4 (first guard against silently universalizing a single character's niche).

## Phase 5: Negative-Space Diagnosis

Run 17 probes against the registry + world state:

1. Institutions without insiders
2. Institutions without dissenters / corrupters / victims / enforcers
3. Regions without local voices
4. Classes present only as abstractions
5. Species present but not yet thinking differently on the page
6. Missing age bands or kinship positions
7. Pressures without witnesses / profiteers / healers / deniers / translators / archivists
8. Themes monopolized by one character only
9. Artifact genres without plausible authors
10. Knowledge systems without representatives
11. Absent perceptual filters
12. Absent voice families
13. Absent border positions
14. Ordinary labor systems without a character lens
15. Historical residues without carriers
16. Mystery-adjacent vantage points without an epistemic inhabitant (careful: targets vantage, NOT mystery-resolving knowledge — Phase 10b firewall still applies)
17. Monopoly-window domains (Phase 3 output) risking single-point-of-failure

Drive the probes via `search_nodes` per file class (`institutions`, `peoples-and-species`, `geography`, `everyday-life`, `timeline`) plus `get_record` on cited `SEC-*` / `M-*` / `CF-*` ids. Each finding cites the specific record id (e.g., `SEC-INS-007`, `CF-0044`, `M-0003`) and the concern it sits under.

If `upstream_audit_path` was loaded at Phase 0, merge its person-thinness findings; skip overlapping probes.

**Rule**: Negative space is "who must exist if this world is real, but is still missing from the cast" — not "who is cool."

**Rule**: Every finding cites at least one record id. A finding that cannot be record-cited is not a finding — it is a hunch, and hunches are disallowed.

**Mandatory critic pass**: Institutional + Everyday-Life Critic.

**FOUNDATIONS cross-ref**: Rule 2 (each probe is a pure-cosmetics guard).
