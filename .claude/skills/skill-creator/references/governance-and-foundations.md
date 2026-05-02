# Guardrails and FOUNDATIONS Alignment of skill-creator

This is the full Guardrails list and the FOUNDATIONS Alignment table for skill-creator itself. The thin SKILL.md keeps a short summary of the load-bearing rules inline — load this reference when an exhaustive list is needed (e.g., during audits, when training a new contributor, or when validating a maintenance pass).

## Guardrails (full list)

- The generated `SKILL.md` must be self-contained — a reader should not need skill-creator to run it.
- Do NOT duplicate FOUNDATIONS.md content inline. Cross-reference: "see FOUNDATIONS.md §Validation Rules".
- Generated `SKILL.md` target sizes differ by class: ~300 lines for meta-tooling; ~400 lines for canon-reading without diegetic in-world content; ~500 lines for canon-reading with diegetic in-world content (Rule 7 firewall triples the safety-check surface) or canon-mutating. These are targets, not hard caps — a canon-mutating skill with consequence-propagation across many domains, OR an audit-class meta-tooling skill with many category sub-passes plus layered validation (e.g., 10+ sub-categories × severity classification × multi-phase validation gates), may reasonably land at 550+ lines. If a proposal is long (e.g., 500+ lines), push verbose phase prose into `templates/` or trim to the enforceable core; the skill file is a runtime contract, not a recapitulation of the proposal. Do NOT delete required structural elements (HARD-GATE, World-State Prerequisites, Validation Rules upheld, FOUNDATIONS Alignment table) to hit a target size.
- skill-creator NEVER edits `docs/FOUNDATIONS.md`. FOUNDATIONS lives outside this tool's authority.
- skill-creator NEVER writes world-state files (`WORLD_KERNEL.md` etc.). Those are the jobs of canon-mutating skills, not the meta-skill.
- skill-creator MAY write pipeline-level supporting files the generated skill consumes at runtime (e.g., `tickets/_TEMPLATE.md`, `tickets/README.md`, `docs/archival-workflow.md`, validator fixtures, hook scripts) ONLY when the gap-filler interview's "Supporting-file bootstrap" gap elicited explicit user approval for expanded scope. These are distinct from world-state files (absolute prohibition above) and from FOUNDATIONS.md (absolute prohibition above). Without explicit expanded-scope approval, skill-creator's write authority is bounded to `.claude/skills/<slug>/*` plus the write-files step's archival move plus — when the gap-filler interview's §Reverse-seam scan produces hits — bounded post-shipping prose corrections to the cited sibling skills' SKILL.md / templates per Procedure §6 sub-step 5(c). The post-shipping correction surface is bounded by the §Reverse-seam scan's hit list and confined to replacing factual-status wording ("not yet shipping" / "Future-sibling seam" / "Until then, this skill inlines...") with the now-shipping reference plus a forward pointer to the deferred-integration ticket from sub-step 5(b) — skill-creator does NOT edit sibling-skill content beyond those hits.
- No scope inflation: generate one skill per invocation. If the user asks for a suite, confirm each individually.
- Worktree discipline: if in a worktree, all paths resolve from the worktree root.
- One question per message during interviews. Never batch substantive questions. (Routine confirmable assumptions under auto mode may accompany a single substantive question — see the gap-filler interview's protocol §Auto mode compression.)
- Respect early exit ("just go", "that's enough"): announce current confidence, list assumptions, proceed. Mark assumptions in the design so the user can correct them during section approval.
- The HARD-GATE at the top of this skill is absolute. No `Write` or `Edit` to skill files until design approval AND conformance-check pass.

## FOUNDATIONS Alignment of skill-creator Itself

| Principle | How skill-creator honors it |
|-----------|-----------------------------|
| Tooling Recommendation (§"non-negotiable") | Every generated skill is forced to declare `## World-State Prerequisites` (with a bootstrap-skill carve-out recognizing that pipeline heads have no prior state to read) |
| Rule 1: No Floating Facts | canon-mutating skills are forced to emit full Canon Fact Records (domain, scope, prerequisites, limits, consequences) |
| Multi-world directory discipline | canon-mutating/canon-reading/meta-tooling skills are forced to declare world scope {single-world, all-worlds, meta, meta-with-multi-world-read} and, for single-world skills, to root all file operations at `worlds/<world-slug>/`; for meta-with-multi-world-read skills (typically canon-reading or meta-tooling), to assemble the cross-world read aggregate at Pre-flight and write only at root-level surfaces |
| Rule 4: No Globalization by Accident | canon-mutating skills are forced to include a Scope Detection phase |
| Rule 5: No Consequence Evasion | canon-mutating skills are forced to include Consequence Propagation with ≥2 orders |
| Rule 6: No Silent Retcons | canon-mutating skills are forced to emit Change Log Entries |
| Rule 7: Preserve Mystery Deliberately | diegetic canon-reading skills are forced to include a Canon Safety Check |
| Canon Layering | Classification step forces explicit posture on canon mutation |
| Change Control Policy | Change log template bundled and referenced |
