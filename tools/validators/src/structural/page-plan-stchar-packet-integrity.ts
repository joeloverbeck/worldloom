import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  queryStructuralRecords,
  stringValue
} from "./utils.js";
import { markdownSection, pagePlanTargets } from "./page-plan-section-parser.js";
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
const OFFSTAGE_REQUIRED_BECAUSE = "offstage_causal";
const STCHAR_SECTION_HEADING = /^##\s+16a\.\s+STCHAR-derived character authority packets\s*$/m;
const CURRENT_STATE_ID = /\b(PG|SE|STEMO|BEL|STPLAN|SREL|STSTAT|STOBJ|STLOC|THR|OBL|CNSQ|CLK|STSEC|STQ)-(0|[1-9][0-9]*)\b/g;
const DISALLOWED_AUTHORITY_ID = /\bCHAR-(0|[1-9][0-9]*)\b/g;
const NONE_GROUNDING_VALUE = /^none\s*;\s*stable\s+STCHAR\s+authority\s+only\.?$/i;
const PACKET_ROLE_VOCABULARY: ReadonlySet<string> = new Set([
  "viewpoint",
  "speaker",
  "major_actor",
  "direct_target",
  "emotionally_salient",
  "behavior_shapes_page",
  "voice_shapes_page",
  OFFSTAGE_REQUIRED_BECAUSE
] as const);
const VOICE_REQUIRING_LABELS = new Set(["speaker", "viewpoint", "voice_shapes_page"]);

interface Packet {
  stentId: string;
  stcharId: string;
  requiredBecause: string;
  requiredBecauseLabels: Set<string>;
  currentStateGroundingRecords: string | null;
  hasVoiceBlock: boolean;
  packetText: string;
}

interface PacketReference {
  id: string;
  field: string;
  disallowedAuthority: boolean;
}

export const pagePlanStcharPacketIntegrity: Validator = {
  name: VALIDATOR,
  severity_mode: "fail",
  applies_to: appliesToStcharStoryState,
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const records = await queryStructuralRecords(ctx);
    const plans = pagePlanTargets(input, ctx);
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
          verdicts.push(...packetVerdicts(page, plan.path, packet, location, activeStchars, maps));
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
  maps: ReturnType<typeof storyMaps>
): Verdict[] {
  const verdicts: Verdict[] = [];
  if (!activeStchars.has(packet.stcharId)) {
    return verdicts;
  }

  const unknownLabels = [...packet.requiredBecauseLabels].filter((label) => !PACKET_ROLE_VOCABULARY.has(label));
  if (unknownLabels.length > 0) {
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.unknown_role_label",
      `${planPath} 16a packet for ${packet.stcharId} declares unknown role label(s): ${unknownLabels.join(", ")} (allowed: ${[...PACKET_ROLE_VOCABULARY].join(" | ")}).`,
      { page_id: pageId(page), stchar_id: packet.stcharId, unknown_labels: unknownLabels },
      `Use only documented Required because labels for ${packet.stcharId}; the closed-vocabulary contract is enforced per SPEC-76 §3.2.`
    ));
  }

  if (packet.requiredBecauseLabels.has(OFFSTAGE_REQUIRED_BECAUSE) && stentLocation !== "offstage") {
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.offstage_packet_for_present_character",
      `${planPath} 16a offstage_causal packet for ${packet.stentId} / ${packet.stcharId} is not allowed when ${packet.stentId}.location is ${stentLocation ?? "<missing>"}.`,
      { page_id: pageId(page), stent_id: packet.stentId, stchar_id: packet.stcharId, location: stentLocation ?? null },
      `Use a present-character required_because value for ${packet.stentId} / ${packet.stcharId}, or set ${packet.stentId}.location to offstage when the reduced offstage tier is intended.`
    ));
  }

  const voiceRequiringLabels = [...packet.requiredBecauseLabels].filter((label) => VOICE_REQUIRING_LABELS.has(label));
  if (voiceRequiringLabels.length > 0 && !packet.hasVoiceBlock) {
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.missing_voice_block",
      `${planPath} 16a packet for ${packet.stcharId} omits the voice/dialogue authority block (voice-requiring labels in set: ${voiceRequiringLabels.join(", ")}).`,
      {
        page_id: pageId(page),
        stchar_id: packet.stcharId,
        required_because: packet.requiredBecause,
        voice_requiring_labels: voiceRequiringLabels
      },
      `Add the STCHAR Page-Plan Voice Block projection to the 16a packet for ${packet.stcharId}.`
    ));
  }

  const currentStateReferences = packetReferencesOutsideGrounding(packet);
  if (isNoneGroundingDeclaration(packet.currentStateGroundingRecords) && currentStateReferences.some((reference) => !reference.disallowedAuthority)) {
    const recordIds = unique(currentStateReferences
      .filter((reference) => !reference.disallowedAuthority)
      .map((reference) => reference.id));
    verdicts.push(planFail(
      page,
      planPath,
      "page_plan_stchar_packet_integrity.grounding_records_none_with_citations",
      `${pageId(page)} 16a packet for ${packet.stcharId} declares "Current-state grounding records: none; stable STCHAR authority only" but cites current-state record(s) ${recordIds.join(", ")} elsewhere in the packet.`,
      { page_id: pageId(page), stchar_id: packet.stcharId, record_ids: recordIds },
      `Remove current-state citations from the 16a packet for ${packet.stcharId}, or name the active grounding records in Current-state grounding records.`
    ));
  }

  for (const reference of currentStateReferences) {
    if (reference.disallowedAuthority || !isPacketReferenceActive(page, reference.id, maps)) {
      verdicts.push(planFail(
        page,
        planPath,
        "page_plan_stchar_packet_integrity.stale_current_state_reference",
        `${pageId(page)} 16a packet for ${packet.stcharId} cites ${reference.id} in ${reference.field}, which is not active in the page snapshot (or does not resolve in the bundle).`,
        { page_id: pageId(page), stchar_id: packet.stcharId, record_id: reference.id, field: reference.field },
        `Create or activate ${reference.id} in ${pageId(page)}.state_snapshot.active_records, cite the page's own PG/SE record, or remove the stale packet reference.`
      ));
    }
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
  const section = markdownSection(content, STCHAR_SECTION_HEADING);
  if (section === null) {
    return [];
  }
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
      requiredBecauseLabels: parseRequiredBecauseLabels(required),
      currentStateGroundingRecords: packetText.match(/^\s+- Current-state grounding records:\s*(.+?)\s*$/m)?.[1]?.trim() ?? null,
      hasVoiceBlock: /^[^\S\r\n]*- Voice\/dialogue authority:[^\S\r\n]*\S/m.test(packetText),
      packetText
    };
  });
}

function packetReferencesOutsideGrounding(packet: Packet): PacketReference[] {
  const references: PacketReference[] = [];
  let field = "packet";
  for (const line of packet.packetText.split(/\r?\n/)) {
    const fieldMatch = line.match(/^\s+- ([^:]+):/);
    if (fieldMatch?.[1]) {
      field = fieldMatch[1].trim();
    }
    if (/^\s+- Current-state grounding records:/i.test(line)) {
      continue;
    }
    for (const match of line.matchAll(CURRENT_STATE_ID)) {
      references.push({ id: match[0], field, disallowedAuthority: false });
    }
    for (const match of line.matchAll(DISALLOWED_AUTHORITY_ID)) {
      references.push({ id: match[0], field, disallowedAuthority: true });
    }
  }
  return references;
}

function isNoneGroundingDeclaration(value: string | null): boolean {
  return value !== null && NONE_GROUNDING_VALUE.test(value);
}

function isPacketReferenceActive(page: IndexedRecord, referenceId: string, maps: ReturnType<typeof storyMaps>): boolean {
  const recordClass = referenceId.split("-")[0];
  if (!recordClass || !maps.byId.has(referenceId)) {
    return false;
  }
  if (recordClass === "PG" && referenceId === pageId(page)) {
    return true;
  }
  if (recordClass === "SE" && referenceId === pageResolvedEventId(page)) {
    return true;
  }
  return activeIds(page, recordClass).includes(referenceId);
}

function pageResolvedEventId(page: IndexedRecord): string | undefined {
  return stringValue(asPlainRecord(asPlainRecord(page.parsed).input).resolved_event_id);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function parseRequiredBecauseLabels(requiredBecause: string): Set<string> {
  return new Set(
    requiredBecause
      .split(",")
      .map((label) => label.trim().toLowerCase())
      .filter((label) => label.length > 0)
  );
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
