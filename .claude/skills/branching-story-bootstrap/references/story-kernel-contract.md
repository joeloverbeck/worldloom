# STORY_KERNEL.md Section Contract

Covers original §STORY_KERNEL.md Section Contract.

Draft `worlds/<world_slug>/stories/<story_slug>/STORY_KERNEL.md` as the bundle's compact primary-authored story contract. It MUST begin with a YAML frontmatter block carrying the machine-read fields consumed by `tools/world-mcp/src/context-packet/story-bundle-context.ts`, followed by these sections in this order unless the user explicitly approves a clearer order for the specific bundle:

```yaml
---
story_id: STORY-<integer>
story_slug: <story_slug>
root_branch_id: BR-1
root_page_id: PG-1
cast_bind_list:
  - stchar_id: STCHAR-<integer>
    stent_id: STENT-<integer>
    source_char_id: CHAR-<integer> | null
    role_in_story: [<role_in_story values>]
player_agency_surface:
  - STENT-<integer>
mysteries_in_play:
  - m_id: M-<integer>
    status: <unresolved_mystery_claims.status value>
    future_resolution_safety: <safety label>
    domain_overlap: <domain or "none">
invariants_acknowledged:
  - <invariant id or label>
---
```

1. `# <Story Title>`
2. `## Story Identity` — world slug, story slug, `STORY-<integer>`, root branch, root page, premise summary, POV, tone, and content intensity.
3. `## Player Agency Contract` — exactly these three bullets:
   - **Agency surface** — which `STENT` record(s) the player primarily controls.
   - **Write-in envelope** — what kinds of manual actions are admissible.
   - **Viewpoint limits** — whether the player may act on knowledge the viewpoint character lacks.
4. `## Cast and Roles` — active `STENT` ids, bound `STCHAR` ids, non-operational source `CHAR` provenance, display names, and `role_in_story` values.
5. `## Opening Situation` — the public situation, private/contested knowledge labels, initial location, and opening pressure.
6. `## Canon Grounding` — the load-bearing parent-world canon excerpts and mirrored `SF` ids the opening depends on.
7. `## Protected Mystery and Invariant Boundaries` — forbidden mystery resolutions and invariant constraints that the validation step's mystery / invariant firewall gate must preserve.
8. `## Initial Continuation Contract` — expected first hinge, emitted choice surface, and seed/JIT continuation posture.

The `## Player Agency Contract` is load-bearing. Downstream `branching-story-turn-cycle` uses it as the stable routing input for write-in action-source legality, and `branching-story-scene-prose-attach` uses it to flag rendered scene prose that implies a broader or narrower player agency surface than the bundle permits.

The frontmatter is authoritative for machine retrieval. Keep `cast_bind_list` in sync with `## Cast and Roles`, and keep `mysteries_in_play` / `invariants_acknowledged` in sync with `## Protected Mystery and Invariant Boundaries`; those markdown sections are the human rendering of the same data.
