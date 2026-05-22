import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

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
  isNonBackgroundEntity,
  pageId,
  recordId,
  shouldCheckRecordInPreApply,
  storyMaps
} from "./stchar-utils.js";

const VALIDATOR = "page_plan_stchar_packet_integrity";
const PLAN_PATH_PATTERN = /^stories\/([^/]+)\/pages-prose-plans\/(PG-(0|[1-9][0-9]*))\.md$/;
const OFFSTAGE_REQUIRED_BECAUSE = "offstage_causal";
const SPEAKER_VOICE_REQUIRED = new Set(["speaker", "viewpoint"]);

interface PlanTarget {
  storySlug: string;
  pageId: string;
  path: string;
  content: string;
}

interface Packet {
  stentId: string;
  stcharId: string;
  requiredBecause: string;
  hasVoiceBlock: boolean;
  packetText: string;
}

export const pagePlanStcharPacketIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const plans = planTargets(input, ctx);
    const verdicts: Verdict[] = [];

    for (const storySlug of allStorySlugs(records)) {
      const maps = storyMaps(records, storySlug);
      const plansByPage = new Map(
        plans
          .filter((plan) => plan.storySlug === storySlug)
          .map((plan) => [plan.pageId, plan])
      );

      for (const page of maps.byType.get("page_record") ?? []) {
        if (!shouldCheckRecordInPreApply(page, ctx)) {
          continue;
        }
        const plan = plansByPage.get(pageId(page));
        if (!plan) {
          continue;
        }
        const packets = parsePackets(plan.content);
        const byStchar = new Map(packets.map((packet) => [packet.stcharId, packet]));
        const activeStchars = new Set(activeIds(page, "STCHAR"));

        for (const stentId of activeIds(page, "STENT")) {
          const stent = maps.byId.get(stentId);
          const stentParsed = asPlainRecord(stent?.parsed);
          if (stent?.node_type !== "story_entity_record" || !isNonBackgroundEntity(stentParsed)) {
            continue;
          }
          const stcharId = stringValue(stentParsed.bound_stchar_id);
          if (!stcharId || !activeStchars.has(stcharId)) {
            continue;
          }
          const packet = byStchar.get(stcharId);
          const location = entityLocation(page, stentId);
          if (!packet) {
            if (location === "offstage") {
              continue;
            }
            verdicts.push(planFail(
              page,
              plan.path,
              "page_plan_stchar_packet_integrity.missing_packet",
              `${plan.path} omits a 16a STCHAR packet for active ${stentId} / ${stcharId}.`,
              { page_id: pageId(page), stent_id: stentId, stchar_id: stcharId },
              `Add a 16a packet for ${stentId} / ${stcharId}, or remove the character from the page's active STENT/STCHAR set.`
            ));
            continue;
          }
          verdicts.push(...packetVerdicts(page, plan.path, packet, location, activeStchars, maps.byId.get(packet.stcharId)));
        }

        for (const packet of packets) {
          if (!activeStchars.has(packet.stcharId)) {
            verdicts.push(planFail(
              page,
              plan.path,
              "page_plan_stchar_packet_integrity.inactive_stchar",
              `${plan.path} 16a packet cites ${packet.stcharId}, but it is not active in ${pageId(page)}.state_snapshot.active_records.STCHAR.`,
              { page_id: pageId(page), stent_id: packet.stentId, stchar_id: packet.stcharId },
              `Add ${packet.stcharId} to ${pageId(page)}.state_snapshot.active_records.STCHAR or remove the stale 16a packet.`
            ));
          }
        }
      }
    }

    return verdicts;
  }
};

function packetVerdicts(
  page: IndexedRecord,
  planPath: string,
  packet: Packet,
  stentLocation: string | undefined,
  activeStchars: Set<string>,
  _stchar: IndexedRecord | undefined
): Verdict[] {
  const verdicts: Verdict[] = [];
  if (!activeStchars.has(packet.stcharId)) {
    return verdicts;
  }

  if (packet.requiredBecause === OFFSTAGE_REQUIRED_BECAUSE && stentLocation !== "offstage") {
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.offstage_packet_for_present_character",
      `${planPath} 16a offstage_causal packet for ${packet.stentId} / ${packet.stcharId} is not allowed when ${packet.stentId}.location is ${stentLocation ?? "<missing>"}.`,
      { page_id: pageId(page), stent_id: packet.stentId, stchar_id: packet.stcharId, location: stentLocation ?? null },
      `Use a present-character required_because value for ${packet.stentId} / ${packet.stcharId}, or set ${packet.stentId}.location to offstage when the reduced offstage tier is intended.`
    ));
  }

  if (SPEAKER_VOICE_REQUIRED.has(packet.requiredBecause) && !packet.hasVoiceBlock) {
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.missing_voice_block",
      `${planPath} 16a ${packet.requiredBecause} packet for ${packet.stcharId} omits the voice/dialogue authority block.`,
      { page_id: pageId(page), stchar_id: packet.stcharId, required_because: packet.requiredBecause },
      `Add the STCHAR Page-Plan Voice Block projection to the 16a packet for ${packet.stcharId}.`
    ));
  }

  return verdicts;
}

function entityLocation(page: IndexedRecord, stentId: string): string | undefined {
  const snapshot = asPlainRecord(asPlainRecord(page.parsed).state_snapshot);
  const statuses = asPlainRecord(snapshot.entity_status);
  const status = asPlainRecord(statuses[stentId]);
  return stringValue(status.location);
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
    const required = packetText.match(/^\s+- Required because:\s*([^.\n]+)\.?/m)?.[1]?.trim() ?? "";
    const stentId = match[1];
    const stcharId = match[2];
    if (!stentId || !stcharId) {
      throw new Error("internal parser invariant: STENT/STCHAR packet regex produced no id captures");
    }
    return {
      stentId,
      stcharId,
      requiredBecause: required,
      hasVoiceBlock: /^[^\S\r\n]*- Voice\/dialogue authority:[^\S\r\n]*\S/m.test(packetText),
      packetText
    };
  });
}

function planTargets(input: unknown, ctx: Context): PlanTarget[] {
  const explicit = fileInputsFrom(input, ctx).flatMap((file) => planTargetFromContent(file.path, file.content));
  if (explicit.length > 0 || ctx.run_mode === "pre-apply") {
    return explicit;
  }

  const worldRoot = worldRootFrom(input, ctx);
  if (!worldRoot) {
    return [];
  }
  const storiesRoot = path.join(worldRoot, "stories");
  if (!existsSync(storiesRoot)) {
    return [];
  }
  const targets: PlanTarget[] = [];
  for (const storyEntry of readdirSync(storiesRoot, { withFileTypes: true })) {
    if (!storyEntry.isDirectory() || (ctx.story_slug && storyEntry.name !== ctx.story_slug)) {
      continue;
    }
    const plansRoot = path.join(storiesRoot, storyEntry.name, "pages-prose-plans");
    if (!existsSync(plansRoot)) {
      continue;
    }
    for (const file of readdirSync(plansRoot, { withFileTypes: true })) {
      if (!file.isFile()) {
        continue;
      }
      const relative = toPosixPath(path.join("stories", storyEntry.name, "pages-prose-plans", file.name));
      targets.push(...planTargetFromContent(relative, readFileSync(path.join(plansRoot, file.name), "utf8")));
    }
  }
  return targets;
}

function planTargetFromContent(filePath: string, content: string): PlanTarget[] {
  const normalizedPath = toPosixPath(filePath);
  const match = normalizedPath.match(PLAN_PATH_PATTERN);
  const storySlug = match?.[1];
  const planPageId = match?.[2];
  return storySlug && planPageId ? [{ storySlug, pageId: planPageId, path: normalizedPath, content }] : [];
}

function planFail(
  page: IndexedRecord,
  planPath: string,
  code: string,
  message: string,
  detail: unknown,
  suggested_fix: string
): Verdict {
  return {
    ...fail(VALIDATOR, page, code, message, detail, suggested_fix),
    location: { file: planPath, node_id: recordId(page) }
  };
}
