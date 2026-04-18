# Guardrails

Operational constraints this skill must respect on every invocation.

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `proposal_path`. Repo-root writes are forbidden.
- If a pre-flight `next_cf_id` collides with an existing CF record (indicating a concurrent or interrupted prior run), abort and ask the user to resolve the collision before retrying. Never overwrite an existing CF record.
- Domain-file patches are **additions and targeted revisions**, never wholesale rewrites. If a patch would remove more than a paragraph of existing prose, route to `change_type: scope_retcon` / `cost_retcon` / etc. and surface the removal explicitly in the Phase 15a summary — the user must see what is being cut before approving.
- The six critic sub-agents (when the escalation gate fires) are invoked in parallel via the Agent tool and receive only the minimum world-state slice their role needs — not the entire world. Large `CANON_LEDGER.md` files should be pre-filtered to relevant domains before dispatch. Sub-agents never write files; they return text reports only.
- The HARD-GATE at the top of SKILL.md is absolute. Auto Mode does not override it — skill invocation is not deliverable approval.
- Do NOT commit to git. Writes land in the working tree; the user reviews and commits.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root.
- This skill never produces diegetic artifacts (in-world texts); those belong to a future canon-reading skill. If the user supplies a proposal shaped like a diegetic text rather than a canon claim, Phase 0 must normalize it into an operational canon claim before proceeding, or abort with a pointer to the eventual diegetic-text skill.
