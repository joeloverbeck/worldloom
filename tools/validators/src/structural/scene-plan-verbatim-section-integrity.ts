import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import type { Context, Validator, Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue, touchedFilesInclude } from "./utils.js";
import {
  CANONICAL_SOURCES,
  stripFramingHeader,
  trimTrailingWhitespace,
  type VerbatimSectionNumber
} from "./page-plan-verbatim-canonical-sources.js";
import { scenePlanTargets, sectionBody, type ScenePlanTarget } from "./scene-plan-section-parser.js";

const VALIDATOR = "scene_plan_verbatim_section_integrity";
const SECTION_KEYS: Record<VerbatimSectionNumber, string> = {
  "2": "content_policy",
  "3": "prose_craft_contract",
  "19": "render_time_instruction"
};

type CanonicalContents = Record<VerbatimSectionNumber, string>;

export const scenePlanVerbatimSectionIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(ctx, /(?:^|\/)stories\/[^/]+\/scene-prose-plans\/SCN-\d+\.md$/)),
  skip_reason: "scene-plan §2/§3/render-time byte-equality surfaces only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const targets = scenePlanTargets(input, ctx);
    if (targets.length === 0) {
      return [];
    }
    const canonical = await loadCanonicalSources(input);
    return targets.flatMap((plan) => validatePlan(plan, canonical));
  }
};

async function loadCanonicalSources(input: unknown): Promise<CanonicalContents> {
  const repoRoot = repoRootFrom(input);
  const entries = await Promise.all(
    Object.entries(CANONICAL_SOURCES).map(async ([sectionNumber, relativePath]) => {
      const raw = await fs.readFile(path.join(repoRoot, relativePath), "utf8");
      return [sectionNumber, stripFramingHeader(raw)] as const;
    })
  );
  return Object.fromEntries(entries) as CanonicalContents;
}

function repoRootFrom(input: unknown): string {
  const record = asPlainRecord(input);
  const direct = stringValue(record.repo_root) ?? stringValue(record.repoRoot);
  if (direct) {
    return path.resolve(direct);
  }

  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, "docs", "prose-renderer-contract"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(process.cwd(), "../..");
}

function validatePlan(plan: ScenePlanTarget, canonical: CanonicalContents): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const sectionNumber of ["2", "3", "19"] as const) {
    const body = sectionBody(plan.content, SECTION_KEYS[sectionNumber]);
    const canonicalBody = canonical[sectionNumber];
    if (body === undefined) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.missing_section`,
        message: `Scene plan ${plan.path} is missing ${label(sectionNumber)}; expected verbatim content from ${CANONICAL_SOURCES[sectionNumber]}.`,
        location: { file: plan.path, node_id: plan.sceneId },
        detail: { scene_id: plan.sceneId, missing_section: sectionNumber, canonical_source: CANONICAL_SOURCES[sectionNumber] },
        suggested_fix: `Refresh ${label(sectionNumber)} from ${CANONICAL_SOURCES[sectionNumber]}.`
      });
      continue;
    }
    if (trimTrailingWhitespace(body) !== canonicalBody) {
      verdicts.push({
        validator: VALIDATOR,
        severity: "fail",
        code: `${VALIDATOR}.drift`,
        message: `Scene plan ${plan.path} ${label(sectionNumber)} drifts from canonical source ${CANONICAL_SOURCES[sectionNumber]}. The verbatim-inlining contract requires byte-equality.`,
        location: { file: plan.path, node_id: plan.sceneId },
        detail: {
          scene_id: plan.sceneId,
          section: sectionNumber,
          canonical_source: CANONICAL_SOURCES[sectionNumber],
          first_diverging_line: findFirstDivergingLine(trimTrailingWhitespace(body), canonicalBody)
        },
        suggested_fix: `Refresh ${label(sectionNumber)} from ${CANONICAL_SOURCES[sectionNumber]}.`
      });
    }
  }
  return verdicts;
}

function label(sectionNumber: VerbatimSectionNumber): string {
  return sectionNumber === "19" ? "render-time instruction" : `§${sectionNumber}`;
}

function findFirstDivergingLine(a: string, b: string): number {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  for (let index = 0; index < Math.min(aLines.length, bLines.length); index += 1) {
    if (aLines[index] !== bLines[index]) {
      return index + 1;
    }
  }
  return Math.min(aLines.length, bLines.length) + 1;
}
