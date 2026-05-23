import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  queryStructuralRecords,
  stringValue,
  toPosixPath,
  worldRootFrom
} from "./utils.js";
import {
  activeIds,
  allStorySlugs,
  appliesToStcharStoryState,
  fail,
  pageId,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps
} from "./stchar-utils.js";

const VALIDATOR = "prose_receipt_stchar_integrity";
const PLAN_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-plans\/(PG-(0|[1-9][0-9]*))\.md$/;
const RECEIPT_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-receipts\/(PG-(0|[1-9][0-9]*))\.yaml$/;

interface PageTextTarget {
  storySlug: string;
  pageId: string;
  path: string;
  content: string;
}

interface Packet {
  stentId: string;
  stcharId: string;
  requiredBecause: string;
  packetText: string;
}

export const proseReceiptStcharIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const plans = planTargets(input, ctx);
    const receipts = receiptTargets(input, ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      const plansByPage = new Map(
        plans
          .filter((plan) => plan.storySlug === storySlug)
          .map((plan) => [plan.pageId, plan])
      );
      const receiptsByPage = new Map(
        receipts
          .filter((receipt) => receipt.storySlug === storySlug)
          .map((receipt) => [receipt.pageId, receipt])
      );

      for (const page of maps.byType.get("page_record") ?? []) {
        if (!shouldCheckRecordInPreApply(page, ctx)) {
          continue;
        }
        const plan = plansByPage.get(pageId(page));
        const receipt = receiptsByPage.get(pageId(page));
        if (!plan || !receipt) {
          continue;
        }
        const parsedReceipt = parseYamlReceipt(receipt.content);
        if (!parsedReceipt) {
          verdicts.push(receiptFail(
            receipt,
            page,
            "prose_receipt_stchar_integrity.yaml_parse",
            `${receipt.path} prose receipt YAML could not be parsed.`,
            undefined,
            "Repair the receipt YAML before checking STCHAR authority integrity."
          ));
          continue;
        }

        const packets = parsePackets(plan.content);
        verdicts.push(...receiptVerdicts(page, receipt, parsedReceipt, packets));
      }
    }

    return verdicts;
  }
};

function receiptVerdicts(
  page: IndexedRecord,
  receipt: PageTextTarget,
  parsedReceipt: Record<string, unknown>,
  packets: Packet[]
): Verdict[] {
  const verdicts: Verdict[] = [];
  const activeStchars = new Set(activeIds(page, "STCHAR"));
  const authorityEntries = recordsArray(parsedReceipt.stchar_authority);
  const fidelityEntries = recordsArray(parsedReceipt.profile_fidelity);
  const authorityByStchar = new Map(authorityEntries.map((entry) => [stringValue(entry.stchar_id), entry]));
  const fidelityByStchar = new Map(fidelityEntries.map((entry) => [stringValue(entry.stchar_id), entry]));
  const packetsByStchar = new Map(packets.map((packet) => [packet.stcharId, packet]));

  for (const packet of packets) {
    const entry = authorityByStchar.get(packet.stcharId);
    if (!entry) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.missing_stchar_authority_entry",
        `${receipt.path} omits stchar_authority for required ${packet.stentId} / ${packet.stcharId}.`,
        { page_id: pageId(page), stent_id: packet.stentId, stchar_id: packet.stcharId },
        `Add a stchar_authority entry for ${packet.stentId} / ${packet.stcharId}.`
      ));
      continue;
    }

    if (stringValue(entry.stent_id) !== packet.stentId) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.stent_mismatch",
        `${receipt.path} stchar_authority for ${packet.stcharId} names ${stringValue(entry.stent_id) ?? "<missing>"} instead of ${packet.stentId}.`,
        { page_id: pageId(page), stchar_id: packet.stcharId, expected_stent_id: packet.stentId, observed_stent_id: stringValue(entry.stent_id) ?? null },
        `Update ${packet.stcharId}'s stchar_authority.stent_id to ${packet.stentId}.`
      ));
    }

    if (stringValue(entry.required_because) !== packet.requiredBecause) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.required_because_mismatch",
        `${receipt.path} stchar_authority for ${packet.stcharId} records required_because=${stringValue(entry.required_because) ?? "<missing>"}, expected ${packet.requiredBecause}.`,
        { page_id: pageId(page), stchar_id: packet.stcharId, expected: packet.requiredBecause, observed: stringValue(entry.required_because) ?? null },
        `Match ${packet.stcharId}'s stchar_authority.required_because to the page-plan 16a packet.`
      ));
    }

    if (entry.active_in_snapshot !== true || !activeStchars.has(packet.stcharId)) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.snapshot_mismatch",
        `${receipt.path} stchar_authority for ${packet.stcharId} is not marked active in the page snapshot.`,
        { page_id: pageId(page), stchar_id: packet.stcharId, active_in_snapshot: entry.active_in_snapshot ?? null },
        `Set active_in_snapshot only when ${packet.stcharId} is present in ${pageId(page)}.state_snapshot.active_records.STCHAR.`
      ));
    }

    if (!fidelityByStchar.has(packet.stcharId)) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.missing_profile_fidelity_entry",
        `${receipt.path} omits profile_fidelity for required ${packet.stcharId}.`,
        { page_id: pageId(page), stchar_id: packet.stcharId },
        `Add a profile_fidelity entry for ${packet.stcharId}; do not auto-grade the judgment-assisted fidelity axes.`
      ));
    }
  }

  for (const entry of authorityEntries) {
    const stcharId = stringValue(entry.stchar_id);
    if (stcharId && !packetsByStchar.has(stcharId)) {
      verdicts.push(receiptFail(
        receipt,
        page,
        "prose_receipt_stchar_integrity.extra_stchar_authority_entry",
        `${receipt.path} includes stchar_authority for ${stcharId}, but no required 16a packet exists for it.`,
        { page_id: pageId(page), stchar_id: stcharId },
        `Remove the extra stchar_authority entry or add the missing page-plan 16a packet.`
      ));
    }
  }

  return verdicts;
}

function parsePackets(content: string): Packet[] {
  const sectionStart = content.search(/^##\s+16a\.\s+STCHAR-derived character authority packets\s*$/m);
  if (sectionStart === -1) {
    return [];
  }
  const section = content.slice(sectionStart).split(/\n(?=##\s+)/)[0] ?? "";
  const starts = [...section.matchAll(/^- (STENT-(?:0|[1-9][0-9]*)) \/ (STCHAR-(?:0|[1-9][0-9]*))\b.*$/gm)];
  return starts.map((match, index) => {
    const packetText = section.slice(match.index ?? 0, starts[index + 1]?.index ?? section.length);
    const stentId = match[1];
    const stcharId = match[2];
    if (!stentId || !stcharId) {
      throw new Error("internal parser invariant: STENT/STCHAR packet regex produced no id captures");
    }
    return {
      stentId,
      stcharId,
      requiredBecause: packetText.match(/^\s+- Required because:\s*([^.\n]+)\.?/m)?.[1]?.trim() ?? "",
      packetText
    };
  });
}

function planTargets(input: unknown, ctx: Context): PageTextTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => planTargetFromContent(file.path, file.content));
  if (explicit.length > 0 || ctx.run_mode === "pre-apply") {
    return explicit;
  }
  return textTargetsFromWorldRoot(input, ctx, "pages-prose-plans", ".md", planTargetFromContent);
}

function receiptTargets(input: unknown, ctx: Context): PageTextTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => receiptTargetFromContent(file.path, file.content));
  if (explicit.length > 0 || ctx.run_mode === "pre-apply") {
    return explicit;
  }
  return textTargetsFromWorldRoot(input, ctx, "pages-prose-receipts", ".yaml", receiptTargetFromContent);
}

function textTargetsFromWorldRoot(
  input: unknown,
  ctx: Context,
  sourceDir: string,
  extension: string,
  fromContent: (filePath: string, content: string) => PageTextTarget[]
): PageTextTarget[] {
  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }
  const targets: PageTextTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const targetRoot = path.join(storiesRoot, storyEntry.name, sourceDir);
    if (!existsSync(targetRoot)) {
      continue;
    }
    for (const file of readdirSync(targetRoot, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith(extension)) {
        continue;
      }
      const relative = toPosixPath(path.join("stories", storyEntry.name, sourceDir, file.name));
      targets.push(...fromContent(relative, readFileSync(path.join(targetRoot, file.name), "utf8")));
    }
  }
  return targets;
}

function planTargetFromContent(filePath: string, content: string): PageTextTarget[] {
  return pageTextTargetFromContent(filePath, content, PLAN_PATH_PATTERN);
}

function receiptTargetFromContent(filePath: string, content: string): PageTextTarget[] {
  return pageTextTargetFromContent(filePath, content, RECEIPT_PATH_PATTERN);
}

function pageTextTargetFromContent(filePath: string, content: string, pattern: RegExp): PageTextTarget[] {
  const normalizedPath = toPosixPath(filePath);
  const match = normalizedPath.match(pattern);
  const storySlug = match?.[1];
  const targetPageId = match?.[2];
  return storySlug && targetPageId ? [{ storySlug, pageId: targetPageId, path: normalizedPath, content }] : [];
}

function parseYamlReceipt(content: string): Record<string, unknown> | null {
  try {
    return asPlainRecord(yaml.load(content, { schema: yaml.JSON_SCHEMA }));
  } catch {
    return null;
  }
}

function recordsArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asPlainRecord) : [];
}

function receiptFail(
  receipt: PageTextTarget,
  page: IndexedRecord,
  code: string,
  message: string,
  detail: unknown,
  suggested_fix: string
): Verdict {
  return {
    ...fail(VALIDATOR, page, code, message, detail, suggested_fix),
    location: { file: receipt.path, node_id: recordId(page) }
  };
}
