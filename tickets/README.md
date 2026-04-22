# Ticket Authoring Contract

This directory contains active implementation tickets.

To keep architecture clean, robust, and extensible, every new ticket must be created from `tickets/_TEMPLATE.md` and must satisfy the checks below.

## Core Architectural Contract

1. No backwards-compatibility shims or alias paths in new work.
2. If current code and ticket assumptions diverge, update the ticket first before implementation.
3. `docs/FOUNDATIONS.md` is the non-negotiable design contract. Tickets must align with its Canon Layers, Validation Rules, Canon Fact Record Schema, Change Control Policy, and Tooling Recommendation.

## Required Ticket Sections

1. `Assumption Reassessment (YYYY-MM-DD)`:
   - Validate ticket assumptions against current code, skills, and specs.
   - Explicitly call out mismatches and corrected scope.
   - Cite exact files, symbols, skill names, or schema fields for any non-trivial architectural claim.
   - For cross-skill or cross-artifact tickets, name the exact shared boundary, contract, or schema under audit before implementation.
   - Classify newly exposed adjacent contradictions as required consequences of the intended change, separate bugs uncovered during reassessment, or future cleanup that must become its own ticket.
   - For tickets touching FOUNDATIONS-aligned enforcement surfaces (validators, hooks, Canon Safety Checks, Mystery Reserve firewall, HARD-GATE semantics), restate the FOUNDATIONS principle under audit before trusting the spec narrative.
2. `Architecture Check`:
   - Explain why the proposed design is cleaner than alternatives.
   - State that no backwards-compatibility aliasing/shims are introduced.
3. `Verification Layers`:
   - Required for any cross-skill or cross-artifact ticket.
   - Map each important invariant to the exact verification surface that proves it.
   - Use one line per invariant. Valid verification surfaces for worldloom tickets:
     - codebase grep-proof (symbol existence, rename/removal confirmation, schema field presence)
     - schema validation (YAML frontmatter conformance, Canon Fact Record field completeness, Change Log Entry structure)
     - skill dry-run (skill invoked with a representative input; deliverable inspected without commit)
     - FOUNDATIONS alignment check (principle, rule, or schema cited by section)
     - manual review (prose quality, diegetic-to-world laundering check, Mystery Reserve firewall audit)
   - Do not collapse multiple layers into one generic "validation" or "review" surface.
4. `Tests`:
   - List new/modified tests, validators, or dry-run commands and rationale per test.
   - Include targeted and full-pipeline verification commands.
   - Commands must be copy-paste runnable against real skill invocations, real file paths, or real validator binaries, not approximate filters.

## Mandatory Pre-Implementation Checks

1. Dependency references point to existing repository files (active or archived paths are both valid when explicit).
2. Type, schema, and data-contract references match current code.
3. Files-to-touch list matches current file layout and ownership.
4. Scope does not duplicate already-delivered architecture.
5. Test/verification commands have been dry-run checked or verified against the current pipeline layout.
6. Claimed helper, skill, or function usage is verified against the exact current symbol location, not inferred from a similarly named artifact elsewhere in the repo.
7. For cross-skill or cross-artifact tickets, confirm the intended invariant, the exact shared boundary under audit, and whether adjacent contradictions belong to this ticket or a follow-up before implementation begins.
8. For information-path refactors (where the same fact is currently transported through multiple paths), confirm whether current code still has multiple lawful transport paths for the same fact, name the canonical end-state path, and verify that the planned proof surface remains strong enough to debug that canonical path after the change.
9. For tickets touching skill HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces, verify the change does not weaken the Mystery Reserve firewall or silently resolve a Mystery Reserve entry (FOUNDATIONS §Rule 7).
10. For tickets extending an existing output schema (CF Record, Change Log Entry, proposal card, character dossier, diegetic artifact), verify consumers of that schema have been updated, or the extension is additive-only (new optional field with a default).

## Archival Reminder

Follow `docs/archival-workflow.md` as the canonical archival process.
