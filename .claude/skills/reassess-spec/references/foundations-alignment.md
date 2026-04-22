# FOUNDATIONS.md Alignment Check (Step 4)

## 4.0 Internal Contradictions

Before checking FOUNDATIONS, scan for contradictions between the spec's Problem Statement, Approach, Non-Goals, FOUNDATIONS Alignment table, and Deliverables. If the spec includes a table that classifies state (e.g., "Indexed vs. not indexed", "Validator-enforced vs. validator-warned"), verify consistency across sections. A deliverable that contradicts its own Out of Scope entry is a CRITICAL Issue.

## 4.1 Alignment Table Verification

If the spec has a FOUNDATIONS Alignment table (most worldloom specs do), verify each entry:

- Principle names must match names in `docs/FOUNDATIONS.md` exactly (`§Tooling Recommendation`, `Rule 6 No Silent Retcons`, `§Canon Fact Record Schema`, etc.).
- Each alignment statement must be specific — a bare "aligned" without mechanism is a MEDIUM Improvement finding.
- For deliverables that touch canon-pipeline semantics, the alignment table must name the mechanism (e.g., "anchor-checksum drift detection preserves Rule 6 because every surgical edit records which CH entry approved it").

Flag mismatches as Issues.

## 4.2 Missing Principles

Identify FOUNDATIONS principles the spec should address but doesn't. Pay particular attention to:

- **§Tooling Recommendation** — specs proposing new MCP tools, validators, or hooks must name which world-state reads they make (World Kernel, Invariants, relevant CF records, affected domain files, unresolved contradictions, Mystery Reserve entries touching the same domain). A spec that proposes a canon-touching tool without declaring its world-state read contract is a HIGH Issue.
- **§Canon Fact Record Schema** — specs parsing, emitting, or patching CF records must enumerate the schema fields they handle. Silent field drops are Rule-6 violations.
- **Rule 1: No Floating Facts** — for specs introducing new canon-impacting mechanisms (validators, patch-engine write paths, canon-safety checks), deliverables must declare scope / prerequisites / limits / consequences. Absence is a HIGH Issue per FOUNDATIONS.md.
- **Rule 5: No Consequence Evasion** — specs proposing a canon-pipeline change must address second-order effects. A new validator with pass/fail thresholds must name what failing means (block the commit? warn the user? log to validation_results?). Unaddressed second-order effects are Improvement findings at minimum.
- **Rule 6: No Silent Retcons** — specs that propose editing landed work (reassess-spec itself, patch-engine's surgical edits, canon-addition's retcon proposal path) must log changes. Verify the proposal produces an explicit log entry (Change Log Entry for canon, Outcome section for spec archival, anchor-checksum record for surgical edits). Silent edits are a CRITICAL Issue.
- **Rule 7: Preserve Mystery Deliberately** — specs touching retrieval (world-mcp), validators, or patch-engine must preserve the Mystery Reserve firewall. A proposal that lets a query or patch silently resolve an MR entry is a CRITICAL Issue.

## 4.3 Record Alignment Issues

Record each issue with specific FOUNDATIONS principle and conflict. Cite the FOUNDATIONS section heading exactly (`§Tooling Recommendation`, `Rule 6 No Silent Retcons`). Bare citations (`FOUNDATIONS violation`) without principle names are imprecise and will force Step 7's pre-apply verification to disambiguate.

**CLAUDE.md invariants sub-check**: If the spec's deliverables or verification steps claim determinism, reproducibility, or byte-identical output, verify against the project's determinism expectations. For worldloom's tooling layer (TypeScript on Node.js), this means:

- Deterministic iteration order requires sorted collections or deterministic-insertion-order maps (JavaScript `Map` preserves insertion order; `Set` does too; plain `Object` key order is reliable for string keys in modern engines but relying on it is fragile).
- Hash functions for content addressing must be cross-platform stable (`sha256` from `node:crypto` is safe; non-cryptographic hashes like `xxhash` must pin the implementation version).
- No wall-clock time in content hashes (per SPEC-01's `content_hash` discipline).
- No `Date.now()` in canonical forms unless the spec explicitly separates "captured-at timestamp" (allowed) from "canonical-form input" (forbidden).

Flag determinism violations as HIGH Issues referencing the relevant SPEC (SPEC-01 for indexing, SPEC-03 for patch engine, SPEC-04 for validators).

## 4.4 Canon-Pipeline Impact Rule

If the spec modifies canon-pipeline semantics (patch-engine write paths, validator thresholds, hook enforcement, canon-safety expansions, MCP tools mediating canon reads/writes, skill HARD-GATE discipline), verify the following checklist:

1. **Write authority**: Who is authorized to commit the change? (HARD-GATE on canon-addition; HARD-GATE on create-base-world; implicit user approval on surgical-edit tools via patch-engine's approval flow.) Specs that bypass HARD-GATE are CRITICAL Issues.
2. **Scope declaration**: Does the proposal respect world-scope {single-world, all-worlds, meta}? Silent cross-world writes are CRITICAL.
3. **Audit trail**: Does the change emit a log entry (Change Log Entry, adjudication record, anchor-checksum record)? Missing audit trail is a Rule-6 violation.
4. **Mystery Reserve firewall**: Does the change preserve the MR firewall (no silent resolution of M-N entries)? Missing firewall is a Rule-7 violation.
5. **Invariant preservation**: Does the change preserve INVARIANTS.md entries? Silent invariant breaks are CRITICAL.
6. **Canon-layer discipline**: Does the change respect Canon Layers (hard / derived / soft / contested / mystery-reserve)? Promotions from soft → hard without adjudication are Rule-6 violations.
7. **Rollback discipline**: Can the change be reversed if found wrong? For append-only structures (`CANON_LEDGER.md`), reversal requires a follow-up retcon entry, not a deletion.

Record each missing checklist item as a finding keyed to the specific rule it violates. Format in Step 6 presentation: `### Canon-Pipeline Impact Rule` section with numbered checklist, one pass/N/A/flag entry per item (mirrors worldwake's Authoritative-to-AI Impact Rule section but with canon-pipeline semantics).
