import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import { parseScenePlanSections, scenePlanTargets } from "./scene-plan-section-parser.js";
import { asPlainRecord, locationFor, queryRecordsByType, stringValue, touchedFilesInclude } from "./utils.js";

const VALIDATOR = "scn_no_narrative_shape_language";

const NARRATIVE_SHAPE_PATTERNS: Array<{ token: string; pattern: RegExp }> = [
  { token: "act", pattern: /\bact\s+(?:i{1,3}|iv|v|[1-5])\b/i },
  { token: "arc", pattern: /\barc\b/i },
  { token: "midpoint", pattern: /\bmidpoint\b/i },
  { token: "climax", pattern: /\bclimax\b/i },
  { token: "rising action", pattern: /\brising action\b/i },
  { token: "falling action", pattern: /\bfalling action\b/i },
  { token: "builds toward", pattern: /\bbuilds?\s+toward\b/i },
  { token: "dramatic obligation", pattern: /\bdramatic obligation\b/i },
  { token: "target narrative shape", pattern: /\btarget narrative shape\b/i }
];

export const scnNoNarrativeShapeLanguage: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    ctx.patch_plan?.patches.some((patch) => patch.op === "create_scn_record" || patch.op === "supersede_scn_record") === true ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/(?:_source\/scenes\/SCN-\d+\.yaml|scene-prose-plans\/SCN-\d+\.md)$/)),
  skip_reason: "SCN and scene-plan narrative-shape guard surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const scenes = await queryRecordsByType(ctx, "scene_record");
    return [
      ...scenes.flatMap((scene) => validateSceneRecord(scene)),
      ...scenePlanTargets(input, ctx).flatMap((plan) => validateScenePlan(plan.path, plan.sceneId, plan.content))
    ];
  }
};

function validateSceneRecord(scene: IndexedRecord): Verdict[] {
  const parsed = asPlainRecord(scene.parsed);
  const sceneId = stringValue(parsed.id) ?? scene.node_id;
  return [
    ...scanText(String(parsed.scene_descriptor ?? ""), "scene_descriptor"),
    ...scanText(String(parsed.boundary_rationale ?? ""), "boundary_rationale")
  ].map((hit) => ({
    validator: VALIDATOR,
    severity: "fail" as const,
    code: `${VALIDATOR}.record_token`,
    message: `${sceneId} ${hit.field} contains narrative-shape language '${hit.token}'. SCN records may describe only committed scene membership/status, not arc structure.`,
    location: locationFor(scene),
    detail: { scene_id: sceneId, field: hit.field, token: hit.token },
    suggested_fix: "Rewrite the SCN wording as factual depiction/boundary rationale without act, arc, climax, or future-shape framing."
  }));
}

function validateScenePlan(path: string, sceneId: string, content: string): Verdict[] {
  return parseScenePlanSections(content).flatMap((section) =>
    section.lines.flatMap((line, offset) =>
      scanText(line, section.title).map((hit) => ({
        validator: VALIDATOR,
        severity: "fail" as const,
        code: `${VALIDATOR}.plan_token`,
        message: `${path} "${section.title}" contains narrative-shape language '${hit.token}'.`,
        location: {
          file: path,
          line_range: [section.startLine + offset, section.startLine + offset],
          node_id: sceneId
        },
        detail: { scene_id: sceneId, section: section.title, token: hit.token },
        suggested_fix: "Replace narrative-shape framing with committed scene facts, beats, or boundary rationale."
      }))
    )
  );
}

function scanText(text: string, field: string): Array<{ field: string; token: string }> {
  return NARRATIVE_SHAPE_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => ({ field, token: entry.token }));
}
