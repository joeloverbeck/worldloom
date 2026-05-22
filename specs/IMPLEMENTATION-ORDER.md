# Implementation Order

Specs derived from the triage of `reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | `SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `adjudications/`, `characters/`, `diegetic-artifacts/` | none | low — single validator file, additive |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| `archive/specs/SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Typed DA `claim_map.items`, the loose DA frontmatter objects, and `if/then` anti-laundering rules | 2026-05-22 |

## Sequencing notes

- **The two specs are independent** (disjoint files: SPEC-69 touches
  `tools/validators/src/structural/index-disk-consistency.ts`; SPEC-68 touches
  `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`). Either order is valid; they
  may be implemented in parallel.
- SPEC-68 is complete and archived. SPEC-69 remains active and independent.
- Both ship in `tools/validators` (`npm run build` + `npm test`); neither requires an MCP, patch-engine,
  or FOUNDATIONS change.
