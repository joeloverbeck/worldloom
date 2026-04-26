# Phase 0: Normalize the Request

Parse `parameters_path` if provided; otherwise interview the user. Extract:

- `batch_size` (X; default 7)
- `depth_mix` — distribution over `{emblematic, elastic, round_load_bearing}`
- `spread_vs_focus` — wide coverage vs concentrated lens on 1–2 domains
- `density_rule_mode` — auto-detect from registry size: <5 dossiers = character-sparse (prioritize anchors + under-modeled domains); 5–20 = balanced; >20 = character-dense (prioritize negative space + bridge figures). Power users override via `parameters_path.density_rule_mode`.
- `target_domains` — explicit domain list to deepen
- `taboo_areas` — free-form
- `ordinary_vs_exceptional_mix` — ratio hint
- `artifact_author_share` — desired fraction of artifact-native authors
- `under_modeled_priority` — specific regions / species / institutions / classes
- `max_overlap_allowed` — threshold against existing niches (default: crowded permitted, hard-duplicates forbidden)
- `story_scale_mix` — distribution over `{intimate, local, regional, transregional}`
- `mosaic_cluster_preference` — cluster vs separate mosaic zones
- `upstream_audit_path` — optional; load if set

**Conditional record load**: if `target_domains` or the referenced audit touches magical / technological systems, retrieve relevant `SEC-MTS-*` records via `search_nodes` + `get_record`.

**Rule**: Never advance to Phase 1 with unresolved required parameters.

**Rule**: Parameters define the *search space*, not the *content*. A `parameters_path` that attempts to dictate specific characters is rejected — those are character briefs, and belong as `character-generation`'s `character_brief_path`.

**Auto Mode**: Under Auto Mode (or any other autonomous-execution context), if the parameters brief is provided-but-thin (some parameters absent), proceed with inferred defaults for absent parameters:

- Infer `density_rule_mode` from registry size per the rule above.
- Infer `story_scale_mix` from world-kernel geography baseline where unambiguous (e.g., regional default for heartland-centric worlds).
- Fall back to explicit skill defaults for other parameters: `batch_size = 7`, `max_overlap_allowed = crowded_permitted_hard_duplicates_forbidden`, `mosaic_cluster_preference = spread_unless_told_otherwise`.

Document each inferred default and its inference basis in the batch manifest's `parameters:` block so the audit trail records which parameters the user authored and which the skill inferred. Do NOT block on interactive gap-filling under Auto Mode. If a parameter is genuinely undefinable from context (e.g., `taboo_areas` with no signal), record as explicitly "none declared" rather than fabricating.

**FOUNDATIONS cross-ref**: Tooling Recommendation (binding user intent to loaded world state — every generated seed must trace back to indexed canon, not to a dictated character).
