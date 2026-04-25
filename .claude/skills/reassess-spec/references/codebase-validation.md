# Codebase Validation (Step 3)

Validate every reference from Step 2. For specs with >10 references, consider parallel Explore agents (see Agent Delegation below).

Substep applicability is determined by the Pre-Process classification:

| Substep | (a) new | (b) extension | (c) refactor | (d) retroactive |
|---|---|---|---|---|
| 3.0 Cross-package scope | ✓ | ✓ | ✓ | skip |
| 3.1 File paths | ✓ | ✓ | ✓ | ✓ (rigorous) |
| 3.2 Types and interfaces | ✓ | ✓ | ✓ | ✓ (rigorous) |
| 3.3 Functions and exports | ✓ | ✓ | ✓ | ✓ (rigorous) |
| 3.4 Dependencies | ✓ | ✓ | ✓ | ✓ (rigorous) |
| 3.5 Skill-structure validation | ✓ | if SKILL.md modified | if content moves between SKILLs | skip |
| 3.6 Downstream consumers | ✓ | ✓ | skip | skip |
| 3.7 Package-boundary validation | ✓ | if boundaries shift | if boundaries shift | skip |
| 3.8 Upstream spec references | ✓ | ✓ | ✓ | skip |
| 3.9 FOUNDATIONS-contract fidelity | ✓ | if canon-pipeline semantics touched | skip | skip |
| 3.10 Project-convention drift (CLAUDE.md) | ✓ | if new ID conventions or project-level conventions introduced | skip | if the landed work introduced new conventions |
| 3.11 New-deliverable consumer verification | ✓ | ✓ | skip | skip |

## 3.0 Cross-Package Scope Establishment

For patterns referenced across multiple files or packages (e.g., type imports like `import { CanonFactRecord }`, CLI-command invocations, MCP tool-handler registrations, SQL column references), run a cross-package count grep first to establish the full scope before per-file analysis. Compare the spec's claimed locations against the actual count. This catches files the spec missed and prevents incomplete deliverables.

## 3.1 File Paths

Glob/Grep to confirm each path exists. If moved, renamed, or deleted, record the discrepancy and actual location.

Distinguish existing paths (must exist now) from proposed paths (will exist after implementation). Proposed paths still need validation — parent directory must exist, path must not collide with an existing file, naming must follow worldloom conventions (kebab-case filenames, `SPEC-NN-<slug>.md` for specs, `PR-NNNN-<slug>.md` for proposal cards, etc.).

For specs that reference world files by canonical name (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`), verify the spec treats these as read-only pattern references, not write targets. A spec that proposes writes to a canonical world file from outside `canon-addition` is a CRITICAL Issue.

## 3.2 Types and Interfaces

Grep for each TypeScript type, interface, SQL column name, or YAML schema field. Confirm existence and current shape. Check for:

- **Field existence and naming**: Flag fields the spec assumes but don't exist or have different names/types.
- **Type accuracy**: Verify assumed types match actual types (e.g., `number` vs `bigint`, `string` vs a branded type like `NodeId`). TypeScript's structural typing makes silent drift easy to introduce.
- **Serialization**: If the spec proposes serializing a type to SQLite or JSON, verify the type's representation supports it (no `Date` objects in SQLite columns unless explicitly converted; `bigint` requires `BigInt64Array` or string-marshaling for JSON).
- **JSON Schema / YAML schema fidelity**: If the spec proposes a JSON Schema or YAML frontmatter schema, verify against FOUNDATIONS.md §Canon Fact Record Schema and against any existing schema file in `tools/*/schema/` or `.claude/skills/*/templates/*.yaml`.
- **SQL schema alignment**: For specs extending `tools/world-index`'s SQLite schema, verify column additions respect existing constraints (`PRIMARY KEY`, `FOREIGN KEY`, indexed columns), verify migration ordering (migrations are forward-only; new migration gets next sequence number), and verify the new column's type is FTS5-compatible if it's added to a virtual table.
- **Design table exhaustiveness**: If the spec includes a lookup table or mapping indexed by a string-enum-like type (e.g., `node_type -> parser-pass`, `edge_type -> source-field`), verify the table covers all current values. Missing values will require either explicit entries or a documented catch-all default.
- **Record-field-name drift (post-SPEC-13)**: For specs that propose to validate, emit, patch, or schema-check records against a named record class (CF / CH / INV / M / OQ / ENT / SEC / PA / CHAR / DA), read one representative atomic-YAML record from `worlds/<slug>/_source/<type-subdir>/` and verify every record-field name the spec claims. Pre-SPEC-13 prose-sourced field names — derived by the spec author from FOUNDATIONS.md prose paragraphs that describe the record class's *intent* (e.g., FOUNDATIONS §Mystery Reserve: "Mystery Reserve entries must define: what is unknown, what is known around it, what kinds of answers are forbidden") — commonly drift from post-SPEC-13 data-sourced field names (the actual YAML keys authored by `create-base-world` or the SPEC-13 migration — e.g., `unknowns` / `knowns` / `disallowed_cheap_answers`). A validator, emitter, or patch-op written against prose-sourced names fails against every real record. Mismatches are CRITICAL. The same drift risk applies to FOUNDATIONS-only canonical names versus data-layer conventions for status enums, scope sub-fields, and any other record-level surface where the intent description and the YAML schema diverge.

## 3.3 Functions and Exports

Grep for each function, CLI command, or MCP tool. Confirm signature, module location, and export status. Line-number references in specs are informational aids, not authoritative. Verify they point to the claimed content. If accurate, leave them — they help implementers navigate. If drifted, either correct them or replace with function/type names that are grep-stable.

**Large-file handling**: For files exceeding the Read tool's token limit (typically parser modules, SQL-migration bundles, or the full `.claude/skills/canon-addition/SKILL.md`), prefer Grep with `output_mode=content` and `-n=true` to locate the target symbols, then targeted offset/limit Read calls rather than chunked full-file Reads.

Check for:

- **Signature differences** from what the spec assumes.
- **New function parameter sufficiency**: Validate that proposed parameters provide sufficient data at every call site. Flag if a parameter type lacks needed context.
- **Data-surface compatibility**: For proposed shared helpers or unified abstractions, verify that the input type (e.g., `ParseContext`, `NodeRef`, `ValidationResult`) is accessible at ALL intended call sites.
- **Proposed modifications to existing functions**: Verify the function's parameters and local scope include variables the proposed code references. Flag out-of-scope variable usage as an Issue.
- **Code example fidelity**: If the spec includes Before/After code snippets, verify they match the actual code's control flow structure (e.g., async/await vs. promise chains, for-of vs. `.forEach`, destructuring vs. indexed access). Style mismatches in code examples mislead implementers.
- **Reuse opportunities**: For each new function the spec proposes to create, grep the codebase for existing functions serving the same purpose. A proposed new function that duplicates existing functionality should be flagged as an Issue (prefer reuse) or Improvement (note the existing alternative).
- **Pseudocode dependency completeness**: For each function call, type constructor, or method invocation in spec pseudocode, verify it either (a) exists in the codebase, or (b) is defined or proposed elsewhere in the spec as a new deliverable. Functions that are neither existing nor spec-defined are incomplete deliverables — flag as Issues.
- **Proposed reuse fidelity**: When a spec claims to reuse an existing function, field, or mechanism, verify the reuse is semantically compatible. Read the existing implementation and compare its behavior (input filtering, edge cases, output semantics) against the spec's proposed usage.
- **Existing behavior overlap**: For deliverables that propose modifying existing functions, verify the proposed change isn't already implemented.

### 3.3A CLI / MCP / Hook Surface Fidelity

For specs that propose new CLI commands (`tools/world-index`'s `world-index build` surface), new MCP tools (`tools/world-mcp`), or new hooks (`tools/hooks`), verify the proposed surface matches existing conventions:

- **CLI flag style**: worldloom uses GNU long-form (`--world`, `--dry-run`), not single-letter abbreviations except for common ones (`-v` for verbose). Flag deviations.
- **MCP tool naming**: tools use snake_case (`submit_patch_plan`, `get_node`). Flag camelCase proposals.
- **Hook phase names**: worldloom uses the Claude Code lifecycle names (`PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`, `SubagentStop`, `Stop`, `Notification`). Flag non-standard phase names.
- **Exit codes**: convention is `0` success, `1` generic failure, `2` invalid input, `3` missing mandatory file, `4` parse failure above threshold (see SPEC-01 §Error model). Flag conflicting exit-code assignments.

## 3.4 Dependencies (specs / skills / npm packages)

Three sub-checks:

- **Spec dependencies**: Verify each `Depends on:` or `Blocks:` entry resolves to a file in `specs/` or `archive/specs/`. Note specs listed as incomplete but since archived.
  - **Archived-spec with posterior amendments**: when a `Depends on:` entry resolves to `archive/specs/<ID>.md`, additionally check (a) whether a later-numbered active or archived spec's amendments section (common pattern: `SPEC-NN §C`) extends the archived spec's scope, and (b) whether `specs/IMPLEMENTATION-ORDER.md` schedules pending Phase N+ work against the archived spec. If either is true, the `Depends on:` line is incomplete — the reassessor must cite both the archived-spec anchor and the amendment commitment location, and surface any missing-commitment as an Issue finding. This is a Rule-5 (No Consequence Evasion) check generalized to the archived-spec-plus-amendment pattern: the archived spec's work landed, but commitments extending its surface may not have.
- **Skill dependencies**: Verify `.claude/skills/<name>/` directories referenced in the spec exist. For specs proposing to consume a skill's output, verify the skill's SKILL.md `Output` section describes the format the spec expects.
- **npm dependencies**: For tooling specs that propose importing a new npm package, verify `package.json` declares it (or will need to declare it) AND compare the spec's declared deps against the package's `README.md` (Step 2 extracts both surfaces). The README often names concrete packages (`better-sqlite3`, `remark-gfm`) where the spec's prose only names umbrella frameworks (`SQLite`, `remark`); any package in the README not surfaced in the spec — or vice versa — is a drift finding at MEDIUM severity. Flag proposals that silently add transitive-only packages.

## 3.5 Skill-Structure Validation

For deliverables that propose SKILL.md changes (new skill, skill modification, skill consolidation), verify the proposed structure passes `skill-creator`'s universal and class-specific checks:

- **Universal**: Frontmatter declares `name`, `description`, `user-invocable`, `arguments`. Description names triggers, produces, and mutates. World-State Prerequisites block present. Final Rule is a single enforceable sentence.
- **If canon-mutating**: `<HARD-GATE>` block present. References `templates/canon-fact-record.yaml` or `templates/change-log-entry.yaml` as applicable. Names at least 3 of the 7 Validation Rules with enforcing phases. Pre-flight Check section present. Commit / Write phase present.
- **If canon-reading with in-world output**: Contains the explicit rule "This skill MUST NOT write to world files, `CANON_LEDGER.md`, or `INVARIANTS.md`." Canon Safety Check phase present. Rule 7 explicitly listed in Validation Rules.
- **If meta-tooling**: Output is report-shaped, not canon-write-shaped. Contains "This skill proposes changes; it does not apply them" (or equivalent).
- **World-scope declaration**: Exactly one of {single-world, all-worlds, meta} named.

When a deliverable modifies HARD-GATE semantics or canon-write ordering, also read `docs/HARD-GATE-DISCIPLINE.md` and verify the proposal preserves partial-failure semantics and write-order discipline.

## 3.6 Downstream Consumers

For types, interfaces, or functions the spec modifies, grep all import sites and usage points across `tools/*`, `.claude/skills/*`, and `docs/*`. Record blast radius.

For new string-enum values (e.g., new `node_type`, new `edge_type`, new `validator_code`), grep for pattern matches on existing values to find all match sites needing a new arm.

For SKILL.md changes that modify an argument contract or output format, grep sibling skills for references to the changed skill's argument names or output fields — a sibling skill consuming the output is a downstream consumer.

## 3.7 Package-Boundary Validation

Verify proposed imports respect `tools/*` package boundaries. Worldloom's tooling layout (as of SPEC-01..SPEC-09):

- `tools/world-index` — standalone parser + SQLite index; may not import from sibling tool packages
- `tools/world-mcp` — consumes `world-index`'s public schema types and read-only query surface; may not reach into `world-index/src/parse/` internals
- `tools/patch-engine` — consumes `world-index`'s anchor-checksum API; may not reach into parser internals
- `tools/validators` — consumes `world-index`'s read surface + `patch-engine`'s patch-plan surface; shippable as CLI first
- `tools/hooks` — consumes Claude Code's hook lifecycle; may shell out to other tools but must not import their internals

Check `package.json` dependency declarations match proposed imports. Flag violations of the workspace layering above. If a deliverable requires a type to cross a boundary, the fix is usually to relocate the type to a shared schema package (proposed as a scope-extending finding), not to weaken the boundary.

## 3.8 Upstream Spec References

Grep active specs in `specs/` **and archived specs in `archive/specs/`** for references to this spec's deliverables. Note affected specs.

Archived-spec matches are informational (the dependency already landed) — use them to refresh the Dependencies section, Motivating Evidence, and any "this spec depends on X" prose with accurate archival paths. Archived matches do not block reassessment; they catch stale "X has not landed yet" claims and surface forward-references that the archived sibling made back to this spec. An archived-spec match is **informational only when no post-archival amendment commitments extend its scope**; verify the amendment surfaces per §3.4's archived-spec sub-rule before concluding "dependency already landed."

**Forward-compat with blocked specs**: For specs that define parsers, validators, or schemas AND whose `Blocks:` list includes later specs in the bundle, read each blocked spec for extensions to the current spec's schemas/interfaces/parser contracts. Common extension shapes: new conditionally-mandatory schema fields (e.g., SPEC-09's `exception_governance` extending the CF record schema from SPEC-01's parser); new validator codes the current spec's `validation_results` table must accommodate; new node types, edge types, or node-ID prefixes the current spec's regex / enum must accept. If a blocked spec proposes additions the current spec's parser, validator, or schema would silently reject — strict shape validation, closed enums, missing unknown-field tolerance — flag a forward-compat Improvement at MEDIUM severity. This is a Rule-5 (No Consequence Evasion) check generalized to bundle-forward-compat: the current spec's design must acknowledge, or be resilient to, the downstream additions its `Blocks` list implicates. Skip this check when the spec has no `Blocks:` entries or when the blocked specs do not extend the current spec's data surfaces (pure hook / orchestration dependencies, for example, don't trigger this check).

## 3.9 FOUNDATIONS-Contract Fidelity

For deliverables that touch canon-pipeline semantics (patch-engine write paths, validator thresholds, hook enforcement, canon-safety expansions, MCP tools that mediate canon reads/writes):

- **Verify no Validation Rule weakening**: Read FOUNDATIONS.md §Validation Rules. For each Rule the deliverable touches, verify the proposal enforces the rule at least as strictly as existing canon-pipeline skills (`canon-addition`, `continuity-audit`, `propose-new-canon-facts`). A proposal that weakens a Rule is a CRITICAL Issue.
- **Verify Mystery Reserve firewall preservation**: For deliverables affecting retrieval (world-mcp), patch application (patch-engine), or canon validation (validators), verify the proposal does not let a query, patch, or validation pass silently resolve a Mystery Reserve entry. Cite the Rule 7 enforcement mechanism (usually: block-if-MR-overlap pre-commit check) or flag its absence as a CRITICAL Issue.
- **Verify Canon Fact Record schema preservation**: For deliverables that parse, emit, or patch CF records, verify the proposal preserves every field named in FOUNDATIONS.md §Canon Fact Record Schema. Silent field drops are Rule-6 violations.

## Agent Delegation

In plan mode, Explore agents are the primary validation mechanism (read-only, inherently compatible). Launch 2-3 agents organized by theme for specs with >10 references.

For specs with many references, launch parallel Explore agents organized by theme (e.g., tooling-symbol references, skill-structure references, dependency/infrastructure references). Choose themes to minimize cross-agent dependencies. Typical: 1 agent for 10-15 references with a single domain, 2-3 agents for 15+ references spanning multiple domains. Max 3 agents.

Guidelines:

- If agents return conflicting results for the same reference, spot-check with direct Grep/Read. Trust the direct tool result over the agent claim.
- After results arrive, cross-reference findings against the spec's type assumptions and formulas. Agents validate existence; you validate semantic compatibility.
- Spot-check agent claims with direct Grep/Read before including in findings — agent results are leads, not facts. Especially spot-check when an agent reports a referenced type as "does not exist" or "needs to be created" — verify whether the spec used a wrong name for an existing type before accepting the agent's conclusion.
- Inversely, spot-check when an agent reports a spec-referenced method or type as *existing* — grep the exact symbol to confirm. Agents sometimes confabulate existence to match the spec's Before/After framing. When two agents agree a symbol is absent and a third reports it present, trust the absence-reporters and verify with direct Grep.
- For structural refactor specs (type c), direct agents toward discrepancy checking (counts, symbol existence, blast radius) rather than broad exploration.

## 3.10 Project-Convention Drift (CLAUDE.md)

For specs that reference structured-ID conventions (CF, CH, PA, CHAR, DA, PR, BATCH, NCP, NCB, AU, RP, or any new spec-introduced prefix), HARD-GATE semantics, worktree discipline, or any other project-level convention documented in `CLAUDE.md`:

- Read `CLAUDE.md` §ID Allocation Conventions (and any other relevant convention tables).
- For each structured-ID prefix the spec uses (extracted at Step 2 under "Structured-ID prefixes"), grep `CLAUDE.md` for the prefix. A prefix the spec uses that `CLAUDE.md` does not document is a MEDIUM Improvement finding — the reassessed spec should either (a) add a `CLAUDE.md` docs-gap ticket reference in its Risks section, or (b) extend `CLAUDE.md` as a separate deliverable (only when the spec's scope legitimately covers pipeline-level convention documentation; otherwise (a) is preferred to keep scope contained).
- For HARD-GATE-affecting deliverables, verify the spec's description is consistent with `CLAUDE.md`'s §HARD-GATE Discipline block and with `docs/HARD-GATE-DISCIPLINE.md`. Silent divergence between `CLAUDE.md` and a spec is a Rule-6 (No Silent Retcons) risk at the pipeline level.
- For worktree-discipline-affecting deliverables (specs that prescribe how hooks, skills, or tools resolve paths), verify the spec honors `CLAUDE.md`'s worktree-root resolution rule. A spec that assumes main-repo-root paths without a worktree carve-out is a HIGH Issue.

Skip this substep when the spec's deliverables do not interact with any `CLAUDE.md`-documented convention.

## 3.11 New-Deliverable Consumer Verification

For each proposed new deliverable (new MCP tool, new CLI command, new validator, new skill output surface, new type made public to other packages, new reference-file section), verify at least one identifiable consumer exists or is explicitly planned. This is a Rule-5-adjacent check generalized to deliverable-level existence justification: the spec's second-order-effects discipline applied to the deliverable itself, not only to its side-effects. It complements 3.3 (which asks "does this proposal duplicate existing functionality?") and 3.6 (which asks "what consumes the *modified* symbols?") by asking the missing third question: "does anything consume what this new deliverable *produces*?"

For each new deliverable, grep for references to it by name across:

- `.claude/skills/*/SKILL.md` and `.claude/skills/*/references/*.md` — would any skill invoke or consume this?
- `specs/*.md` and `archive/specs/*.md` — does any spec cite it as a prerequisite, name it as a dependency, or reference it in its Problem Statement or Motivating Evidence?
- `tickets/*.md` and `archive/tickets/*.md` — does any pending or landed ticket exercise it?
- `docs/*.md` — does any design doc describe a consumer-side workflow that would use it?

Also inspect the spec's own Problem Statement and Approach: does the spec name a concrete consumer-side workflow the deliverable enables? "Used primarily for X" where X is a speculative use case (future skill, hypothetical HARD-GATE preview, "skills assembling a preview of...") without a pending consumer spec or ticket is a red flag — the justification is aspirational, not operational.

**Outcome classification**:

- **≥1 consumer found** (grep match in skills / specs / tickets / docs, OR a concrete consumer-side workflow named in the spec and traceable to a pending spec or ticket): deliverable is justified. Record the consumers in Step 6 presentation for audit-trail visibility so the reader can reconstruct why the deliverable earned its place.
- **Zero consumers found AND no pending consumer is named by the spec**: flag as a HIGH Issue. Present at Step 6 as a Question with three options: (a) drop the deliverable per YAGNI; (b) keep with explicit rationale naming a near-term consumer (force the spec to document the consumer inline); (c) defer to a separate consumer-driven spec (drop here, re-introduce there when the consumer is concrete).
- **Inherited-commitment case** (deliverable originates from a parent, archived, or superseded spec's commitment but no surviving consumer exists in current work): this is the "ghost deliverable" pattern. Treat as the zero-consumers case — the archived commitment does not justify carrying forward if the consumer path evaporated. Cite the archived-spec anchor (e.g., `archive/specs/SPEC-NN-foo.md §C`) in the finding so the retcon of the archived commitment is surfaced per Rule 6 (No Silent Retcons); dropping silently would be a silent retcon of the archived commitment.

When the consumer check surfaces a zero-consumers deliverable, **defer the decision to the Step 6 Question path** — do not silently drop the deliverable at Step 3. The user is the one to confirm the drop or to name the consumer that the grep missed. The reassessor's job is to surface the question, not to answer it unilaterally.

## Conditional Deliverable Validation

For specs with conditional deliverables ("If root cause X is confirmed, do Y"), validate:

1. **Diagnostic sufficiency** — the investigation steps can distinguish between hypotheses (e.g., each hypothesis predicts different observable outcomes).
2. **Fix correctness** — each proposed fix references correct types, functions, and file paths, regardless of whether it will ultimately be selected.
3. **Architectural soundness** — each proposed fix respects package boundaries and FOUNDATIONS principles even though it is conditional. Flag fixes that violate constraints even if conditional — a conditional violation is still a spec defect.
