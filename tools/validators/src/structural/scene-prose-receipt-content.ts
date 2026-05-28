import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, IndexedRecord, Validator, Verdict, VerdictSeverity } from "../framework/types.js";
import { RECORD_ID_PATTERN, SCHEMA_FIELD_NAME_LITERALS } from "./_engine-vocabulary-tokens.js";
import {
  asPlainRecord,
  fileInputsFrom,
  queryRecordsByType,
  stringArray,
  stringValue,
  toPosixPath,
  worldRootFrom
} from "./utils.js";

const VALIDATOR = "scene_prose_receipt_content";
const RECEIPT_PATH_PATTERN = /^stories\/([^/]+)\/scene-prose-receipts\/(SCN-(?:0|[1-9][0-9]*))\.yaml$/;
const PROSE_PATH_PATTERN = /^stories\/([^/]+)\/scene-prose\/(SCN-(?:0|[1-9][0-9]*))\.md$/;
const CONTENT_CHECKS = [
  "included_pg_events_rendered",
  "final_scene_choice_surface_visibility",
  "scene_range_entity_status_consistency",
  "scene_range_invented_structural_fact",
  "scene_range_forbidden_mystery_resolution",
  "scene_prose_stchar_fidelity",
  "engine_jargon_leak",
  "canon_claim_without_authority"
] as const;

type ContentCheck = typeof CONTENT_CHECKS[number];

interface ReceiptTarget {
  storySlug: string;
  sceneId: string;
  path: string;
  content: string;
}

interface ProseTarget {
  storySlug: string;
  sceneId: string;
  path: string;
  content: string;
}

export const sceneProseReceiptContent: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: (ctx: Context): boolean => {
    if (ctx.run_mode === "pre-apply") {
      return false;
    }
    if (ctx.run_mode === "incremental") {
      return ctx.touched_files.some((file) => {
        const normalized = toPosixPath(file);
        return receiptPathMatchesScope(normalized, ctx) || prosePathMatchesScope(normalized, ctx);
      });
    }
    return true;
  },
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const [scenes, pages, choices, mysteries] = await Promise.all([
      queryRecordsByType(ctx, "scene_record"),
      queryRecordsByType(ctx, "page_record"),
      queryRecordsByType(ctx, "choice_record"),
      queryRecordsByType(ctx, "mystery_reserve_entry")
    ]);
    const sceneMap = storyRecordMap(scenes);
    const pageMap = storyRecordMap(pages);
    const choicesByStoryAndId = storyRecordMap(choices);
    const forbiddenMysteries = new Set(
      mysteries
        .filter((record) => stringValue(asPlainRecord(record.parsed).status) === "forbidden")
        .map((record) => stringValue(asPlainRecord(record.parsed).id) ?? record.node_id)
    );
    const proseByStoryAndScene = new Map(proseTargets(input, ctx).map((target) => [`${target.storySlug}:${target.sceneId}`, target]));
    const verdicts: Verdict[] = [];

    for (const receipt of receiptTargets(input, ctx)) {
      const parsed = parseYamlReceipt(receipt.content);
      if (!parsed) {
        verdicts.push(receiptVerdict(receipt, "yaml_parse", "fail", `${receipt.path} scene prose receipt YAML could not be parsed.`));
        continue;
      }

      const sceneId = stringValue(parsed.scene_id) ?? receipt.sceneId;
      const scene = sceneMap.get(`${receipt.storySlug}:${sceneId}`);
      const prose = proseByStoryAndScene.get(`${receipt.storySlug}:${sceneId}`) ?? proseFromReceiptPath(input, ctx, receipt, parsed);

      if (!scene) {
        verdicts.push(receiptVerdict(receipt, "missing_scene", "fail", `${receipt.path} references ${sceneId}, but no SCN record resolves in story ${receipt.storySlug}.`, { scene_id: sceneId }));
        continue;
      }

      const checkRecord = asPlainRecord(parsed.checks);
      for (const check of CONTENT_CHECKS) {
        verdicts.push(...statusVerdicts(receipt, check, checkRecord[check]));
      }

      const sceneParsed = asPlainRecord(scene.parsed);
      const pgIds = stringArray(sceneParsed.pg_ids);
      const includedPages = receiptIncludedPages(parsed);
      verdicts.push(...validateIncludedPages(receipt, includedPages, pgIds, pageMap, receipt.storySlug));
      verdicts.push(...validateChoiceSurface(receipt, sceneParsed, pageMap, choicesByStoryAndId, prose, receipt.storySlug));
      verdicts.push(...validateProseScans(receipt, prose, forbiddenMysteries));
    }

    return verdicts;
  },
  skip_reason: "no scene prose receipt/prose content in scope"
};

function validateIncludedPages(
  receipt: ReceiptTarget,
  includedPages: Array<{ pageId: string; stateHash: string | undefined }>,
  pgIds: string[],
  pageMap: Map<string, IndexedRecord>,
  storySlug: string
): Verdict[] {
  const verdicts: Verdict[] = [];
  const includedIds = includedPages.map((page) => page.pageId);
  if (!sameStringArray(includedIds, pgIds)) {
    verdicts.push(receiptVerdict(
      receipt,
      "included_pg_events_rendered.range_mismatch",
      "fail",
      `${receipt.path} included_pages must match the SCN pg_ids range in order.`,
      { included_pages: includedIds, scene_pg_ids: pgIds }
    ));
  }

  for (const page of includedPages) {
    const pageRecord = pageMap.get(`${storySlug}:${page.pageId}`);
    if (!pageRecord) {
      verdicts.push(receiptVerdict(
        receipt,
        "included_pg_events_rendered.missing_page",
        "fail",
        `${receipt.path} included_pages references missing ${page.pageId}.`,
        { page_id: page.pageId }
      ));
      continue;
    }
    const currentHash = stringValue(asPlainRecord(pageRecord.parsed).state_hash);
    if (currentHash && page.stateHash && page.stateHash !== currentHash) {
      verdicts.push(receiptVerdict(
        receipt,
        "included_pg_events_rendered.state_hash_mismatch",
        "fail",
        `${receipt.path} state_hash_at_attach for ${page.pageId} no longer matches the PG state_hash.`,
        { page_id: page.pageId, state_hash_at_attach: page.stateHash, current_state_hash: currentHash }
      ));
    }
  }

  return verdicts;
}

function validateChoiceSurface(
  receipt: ReceiptTarget,
  scene: Record<string, unknown>,
  pageMap: Map<string, IndexedRecord>,
  choicesByStoryAndId: Map<string, IndexedRecord>,
  prose: ProseTarget | undefined,
  storySlug: string
): Verdict[] {
  const endPageId = stringValue(scene.end_page_id);
  const sceneChoiceIds = stringArray(scene.emitted_choice_ids);
  const endPage = endPageId ? pageMap.get(`${storySlug}:${endPageId}`) : undefined;
  const endPageChoiceIds = endPage ? stringArray(asPlainRecord(endPage.parsed).emitted_choices) : [];
  const verdicts: Verdict[] = [];

  if (!sameStringArray(sceneChoiceIds, endPageChoiceIds)) {
    verdicts.push(receiptVerdict(
      receipt,
      "final_scene_choice_surface_visibility.choice_surface_mismatch",
      "fail",
      `${receipt.path} scene emitted_choice_ids must match the end PG emitted_choices.`,
      { scene_emitted_choice_ids: sceneChoiceIds, end_page_emitted_choices: endPageChoiceIds }
    ));
  }

  if (prose && endPageChoiceIds.length > 0) {
    const proseText = prose.content.toLocaleLowerCase();
    for (const choiceId of endPageChoiceIds) {
      const choice = choicesByStoryAndId.get(`${storySlug}:${choiceId}`);
      const label = choice ? stringValue(asPlainRecord(choice.parsed).surface_label) : undefined;
      const intent = choice ? stringValue(asPlainRecord(choice.parsed).player_visible_intent) : undefined;
      if (!containsNaturalText(proseText, label) && !containsNaturalText(proseText, intent)) {
        verdicts.push(receiptVerdict(
          receipt,
          "final_scene_choice_surface_visibility.choice_text_missing",
          "fail",
          `${receipt.path} scene prose does not surface end choice ${choiceId}.`,
          { choice_id: choiceId, surface_label: label ?? null, player_visible_intent: intent ?? null, prose_path: prose.path }
        ));
      }
    }
  }

  return verdicts;
}

function validateProseScans(
  receipt: ReceiptTarget,
  prose: ProseTarget | undefined,
  forbiddenMysteries: Set<string>
): Verdict[] {
  if (!prose) {
    return [];
  }

  const verdicts: Verdict[] = [];
  const recordIds = [...prose.content.matchAll(RECORD_ID_PATTERN)].map((match) => match[0]);
  const engineTerms = SCHEMA_FIELD_NAME_LITERALS.filter((term) => prose.content.includes(term));
  if (recordIds.length > 0 || engineTerms.length > 0) {
    verdicts.push(receiptVerdict(
      receipt,
      "engine_jargon_leak.prose_contains_engine_terms",
      "fail",
      `${prose.path} contains record IDs or schema/lifecycle terms that should not appear in scene prose.`,
      { record_ids: unique(recordIds), engine_terms: engineTerms }
    ));
  }

  const forbiddenHits = [...forbiddenMysteries].filter((mysteryId) => prose.content.includes(mysteryId));
  if (forbiddenHits.length > 0) {
    verdicts.push(receiptVerdict(
      receipt,
      "scene_range_forbidden_mystery_resolution.prose_names_forbidden_mystery",
      "fail",
      `${prose.path} names forbidden Mystery Reserve ids directly.`,
      { mystery_ids: forbiddenHits }
    ));
  }

  if (/\b(?:canonically|world[- ]canon|hard canon|canon says)\b/i.test(prose.content)) {
    verdicts.push(receiptVerdict(
      receipt,
      "canon_claim_without_authority.prose_asserts_canon_authority",
      "fail",
      `${prose.path} appears to assert world-canon authority inside rendered scene prose.`,
      { prose_path: prose.path }
    ));
  }

  return verdicts;
}

function statusVerdicts(receipt: ReceiptTarget, check: ContentCheck, rawStatus: unknown): Verdict[] {
  if (rawStatus !== "FAIL" && rawStatus !== "WARN") {
    return [];
  }
  return [receiptVerdict(
    receipt,
    `${check}.${String(rawStatus).toLocaleLowerCase()}`,
    rawStatus === "FAIL" ? "fail" : "warn",
    `${receipt.path} records ${rawStatus} for ${check}.`,
    { check, status: rawStatus }
  )];
}

function receiptTargets(input: unknown, ctx: Context): ReceiptTarget[] {
  const explicit = fileInputsFrom(input, ctx)
    .filter((file) => receiptPathMatchesScope(file.path, ctx))
    .flatMap((file) => receiptTargetFromPath(file.path, file.content));
  if (explicit.length > 0) {
    return explicit;
  }
  if (ctx.run_mode === "incremental") {
    return [];
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }
  return receiptTargetsFromWorldRoot(worldRoot, ctx);
}

function proseTargets(input: unknown, ctx: Context): ProseTarget[] {
  const explicit = fileInputsFrom(input, ctx)
    .filter((file) => prosePathMatchesScope(file.path, ctx))
    .flatMap((file) => proseTargetFromPath(file.path, file.content));
  if (explicit.length > 0) {
    return explicit;
  }
  if (ctx.run_mode === "incremental") {
    return [];
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }
  return proseTargetsFromWorldRoot(worldRoot, ctx);
}

function receiptTargetsFromWorldRoot(worldRoot: string, ctx: Context): ReceiptTarget[] {
  return targetsFromWorldRoot(worldRoot, ctx, "scene-prose-receipts", /^SCN-(?:0|[1-9][0-9]*)\.yaml$/, receiptTargetFromPath);
}

function proseTargetsFromWorldRoot(worldRoot: string, ctx: Context): ProseTarget[] {
  return targetsFromWorldRoot(worldRoot, ctx, "scene-prose", /^SCN-(?:0|[1-9][0-9]*)\.md$/, proseTargetFromPath);
}

function targetsFromWorldRoot<T>(
  worldRoot: string,
  ctx: Context,
  dirName: string,
  fileNamePattern: RegExp,
  fromPath: (filePath: string, content: string) => T[]
): T[] {
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }

  const targets: T[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const targetRoot = path.join(storiesRoot, storyEntry.name, dirName);
    if (!existsSync(targetRoot)) {
      continue;
    }
    for (const file of readdirSync(targetRoot, { withFileTypes: true })) {
      if (!file.isFile() || !fileNamePattern.test(file.name)) {
        continue;
      }
      const relative = toPosixPath(path.join("stories", storyEntry.name, dirName, file.name));
      targets.push(...fromPath(relative, readFileSync(path.join(targetRoot, file.name), "utf8")));
    }
  }
  return targets;
}

function proseFromReceiptPath(input: unknown, ctx: Context, receipt: ReceiptTarget, parsed: Record<string, unknown>): ProseTarget | undefined {
  const prosePath = stringValue(parsed.prose_path);
  if (!prosePath) {
    return undefined;
  }
  const relativePath = path.posix.normalize(path.posix.join("stories", receipt.storySlug, prosePath));
  if (!relativePath.startsWith(`stories/${receipt.storySlug}/scene-prose/`)) {
    return undefined;
  }

  const explicit = fileInputsFrom(input, ctx).find((file) => toPosixPath(file.path) === relativePath);
  if (explicit) {
    return proseTargetFromPath(explicit.path, explicit.content)[0];
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return undefined;
  }
  const absolutePath = path.join(worldRoot, ...relativePath.split("/"));
  if (!existsSync(absolutePath)) {
    return undefined;
  }
  return proseTargetFromPath(relativePath, readFileSync(absolutePath, "utf8"))[0];
}

function receiptTargetFromPath(filePath: string, content: string): ReceiptTarget[] {
  const match = RECEIPT_PATH_PATTERN.exec(toPosixPath(filePath));
  return match ? [{ storySlug: match[1] ?? "", sceneId: match[2] ?? "", path: toPosixPath(filePath), content }] : [];
}

function proseTargetFromPath(filePath: string, content: string): ProseTarget[] {
  const match = PROSE_PATH_PATTERN.exec(toPosixPath(filePath));
  return match ? [{ storySlug: match[1] ?? "", sceneId: match[2] ?? "", path: toPosixPath(filePath), content }] : [];
}

function parseYamlReceipt(content: string): Record<string, unknown> | null {
  try {
    return asPlainRecord(yaml.load(content, { schema: yaml.JSON_SCHEMA }));
  } catch {
    return null;
  }
}

function receiptIncludedPages(parsed: Record<string, unknown>): Array<{ pageId: string; stateHash: string | undefined }> {
  const entries = parsed.included_pages;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.map((entry) => {
    const record = asPlainRecord(entry);
    return {
      pageId: stringValue(record.page_id) ?? "",
      stateHash: stringValue(record.state_hash_at_attach)
    };
  }).filter((entry) => entry.pageId.length > 0);
}

function storyRecordMap(records: IndexedRecord[]): Map<string, IndexedRecord> {
  const map = new Map<string, IndexedRecord>();
  for (const record of records) {
    const parsed = asPlainRecord(record.parsed);
    const id = stringValue(parsed.id) ?? record.node_id.split(":").at(-1) ?? record.node_id;
    const storySlug = record.story_slug ?? storySlugFromPath(record.file_path);
    map.set(`${storySlug}:${id}`, record);
  }
  return map;
}

function receiptPathMatchesScope(filePath: string, ctx: Context): boolean {
  const match = RECEIPT_PATH_PATTERN.exec(toPosixPath(filePath));
  return match !== null && (!ctx.story_slug || match[1] === ctx.story_slug);
}

function prosePathMatchesScope(filePath: string, ctx: Context): boolean {
  const match = PROSE_PATH_PATTERN.exec(toPosixPath(filePath));
  return match !== null && (!ctx.story_slug || match[1] === ctx.story_slug);
}

function storySlugFromPath(filePath: string): string {
  return toPosixPath(filePath).match(/^stories\/([^/]+)\//)?.[1] ?? "";
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function containsNaturalText(proseText: string, value: string | undefined): boolean {
  return value !== undefined && proseText.includes(value.toLocaleLowerCase());
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en-US"));
}

function receiptVerdict(
  receipt: ReceiptTarget,
  code: string,
  severity: VerdictSeverity,
  message: string,
  detail?: unknown
): Verdict {
  return {
    validator: VALIDATOR,
    severity,
    code: `${VALIDATOR}.${code}`,
    message,
    location: {
      file: receipt.path,
      node_id: `scene-prose-receipt:${receipt.storySlug}:${receipt.sceneId}`
    },
    ...(detail === undefined ? {} : { detail })
  };
}
