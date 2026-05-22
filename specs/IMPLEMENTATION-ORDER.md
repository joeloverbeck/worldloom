# Implementation Order

Specs derived from the triage of `reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | `SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `adjudications/`, `characters/`, `diegetic-artifacts/` | none | low — single validator file, additive |
| 2 | `SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Type `claim_map.items` + the four loose DA frontmatter objects; add `if/then` anti-laundering rules | none | medium — strict schema may surface non-conformant existing DA files for hand-repair |

## Sequencing notes

- **The two specs are independent** (disjoint files: SPEC-69 touches
  `tools/validators/src/structural/index-disk-consistency.ts`; SPEC-68 touches
  `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`). Either order is valid; they
  may be implemented in parallel.
- Recommended order is **SPEC-69 first** (smaller, additive, no migration surface), then **SPEC-68**
  (whose strict typing requires reconciling existing on-disk DA files). This front-loads the zero-risk
  change and isolates the spec with a compatibility-reassessment step.
- Both ship in `tools/validators` (`npm run build` + `npm test`); neither requires an MCP, patch-engine,
  or FOUNDATIONS change.
