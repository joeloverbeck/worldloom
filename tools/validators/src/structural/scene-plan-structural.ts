import type { Context, Validator, Verdict } from "../framework/types.js";
import { scenePlanTargets, parseScenePlanSections, type ScenePlanTarget } from "./scene-plan-section-parser.js";
import { touchedFilesInclude } from "./utils.js";

const VALIDATOR = "scene_plan_structural";

const REQUIRED_SECTIONS = [
  "content_policy",
  "prose_craft_contract",
  "render_mission",
  "what_changes_in_this_scene",
  "where_the_scene_begins_must_end",
  "beat_chain",
  "pov_observer_firewall",
  "cast_voice",
  "emotional_relationship_throughline",
  "physical_continuity",
  "secrets_forbidden_reveals",
  "choice_surface",
  "render_time_instruction"
] as const;

export const scenePlanStructural: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/scene-prose-plans\/SCN-\d+\.md$/)),
  skip_reason: "scene-plan markdown surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> =>
    scenePlanTargets(input, ctx).flatMap((plan) => validatePlan(plan))
};

function validatePlan(plan: ScenePlanTarget): Verdict[] {
  const verdicts: Verdict[] = [];
  if (!/^#\s+Scene:\s+\S+/.test(plan.content)) {
    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: `${VALIDATOR}.missing_title`,
      message: `${plan.path} must start with a '# Scene: <Title>' heading.`,
      location: { file: plan.path, node_id: plan.sceneId },
      detail: { scene_id: plan.sceneId }
    });
  }

  const sectionKeys = new Set(parseScenePlanSections(plan.content).map((section) => normalizeScenePlanSectionKey(section.key)));
  const missing = REQUIRED_SECTIONS.filter((section) => !sectionKeys.has(section));
  if (missing.length > 0) {
    verdicts.push({
      validator: VALIDATOR,
      severity: "fail",
      code: `${VALIDATOR}.missing_sections`,
      message: `${plan.path} is missing required scene-plan section(s): ${missing.join(", ")}.`,
      location: { file: plan.path, node_id: plan.sceneId },
      detail: {
        scene_id: plan.sceneId,
        missing_sections: missing
      },
      suggested_fix: "Regenerate the scene plan from the SPEC-92 scene-plan structure."
    });
  }
  return verdicts;
}

export function normalizeScenePlanSectionKey(key: string): string {
  return key
    .replace(/^\d+_/, "")
    .replace(/^cast_and_voice$/, "cast_voice")
    .replace(/^emotional_and_relationship_throughline$/, "emotional_relationship_throughline")
    .replace(/^secrets_and_forbidden_reveals$/, "secrets_forbidden_reveals")
    .replace(/^render_time_instruction_block$/, "render_time_instruction");
}
