import assert from "node:assert/strict";
import test from "node:test";

import { pagePlanStcharPacketIntegrity } from "../../src/structural/page-plan-stchar-packet-integrity.js";
import { context, record } from "./helpers.js";

const HASH_A = "sha256:" + "a".repeat(64);
const HASH_B = "sha256:" + "b".repeat(64);
const SEED_PAGE_PACKET_HASH = "sha256:" + "c".repeat(64);
const STORY = "test-story";
const PLAN_PATH = `stories/${STORY}/pages-prose-plans/PG-1.md`;

test("page_plan_stchar_packet_integrity accepts complete 16a packets", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(input(plan()), context(baseRecords()));

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects a missing required packet", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(input(plan({ includePacket: false })), context(baseRecords()));

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.missing_packet");
});

test("page_plan_stchar_packet_integrity allows omitted packets for offstage characters", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ includePacket: false })),
    context(baseRecords({ location: "offstage" }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity accepts offstage_causal packets without voice blocks", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ requiredBecause: "offstage_causal", voiceLine: "" })),
    context(baseRecords({ location: "offstage" }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects offstage_causal packets for present characters", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ requiredBecause: "offstage_causal", voiceLine: "" })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.offstage_packet_for_present_character");
});

test("page_plan_stchar_packet_integrity treats unknown and concealed locations as present", async () => {
  for (const location of ["unknown", "concealed"]) {
    const verdicts = await pagePlanStcharPacketIntegrity.run(
      input(plan({ requiredBecause: "offstage_causal", voiceLine: "" })),
      context(baseRecords({ location }))
    );

    assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.offstage_packet_for_present_character");
    assert.equal((verdicts[0]?.detail as { location?: string }).location, location);
  }
});

test("page_plan_stchar_packet_integrity rejects packets for inactive STCHAR ids", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(input(plan({ stcharId: "STCHAR-99" })), context(baseRecords()));

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.missing_packet");
  assert.equal(verdicts[1]?.code, "page_plan_stchar_packet_integrity.inactive_stchar");
});

test("page_plan_stchar_packet_integrity ignores tamper hash mismatches", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ profileHash: "sha256:" + "9".repeat(64) })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity ignores tamper hash mismatches on offstage_causal packets", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "offstage_causal",
      profileHash: "sha256:" + "9".repeat(64),
      voiceLine: ""
    })),
    context(baseRecords({ location: "offstage" }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects speaker packets without voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ voiceLine: "  - Voice/dialogue authority:" })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.missing_voice_block");
});

test("page_plan_stchar_packet_integrity rejects composite speaker packets without voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "direct_target, speaker",
      voiceLine: ""
    })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.missing_voice_block");
  assert.deepEqual((verdicts[0]?.detail as { voice_requiring_labels?: string[] }).voice_requiring_labels, ["speaker"]);
});

test("page_plan_stchar_packet_integrity accepts composite voice-requiring packets with voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ requiredBecause: "viewpoint, behavior_shapes_page" })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects voice_shapes_page packets without voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "voice_shapes_page",
      voiceLine: ""
    })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.missing_voice_block");
  assert.deepEqual((verdicts[0]?.detail as { voice_requiring_labels?: string[] }).voice_requiring_labels, ["voice_shapes_page"]);
});

test("page_plan_stchar_packet_integrity accepts legacy single-label speaker packets with voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ requiredBecause: "speaker" })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects composite offstage_causal packets for present characters", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "offstage_causal, direct_target",
      voiceLine: ""
    })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.offstage_packet_for_present_character");
});

test("page_plan_stchar_packet_integrity accepts legacy single-label offstage_causal packets for offstage characters", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "offstage_causal",
      voiceLine: ""
    })),
    context(baseRecords({ location: "offstage" }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity fails for unknown role labels per SPEC-76 §3.2 closed-vocabulary contract", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({ requiredBecause: "speaker, custom_unknown_label" })),
    context(baseRecords())
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.severity, "fail");
  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.unknown_role_label");
  assert.deepEqual((verdicts[0]?.detail as { unknown_labels?: string[] }).unknown_labels, ["custom_unknown_label"]);
});

test("page_plan_stchar_packet_integrity accepts non-voice-requiring role labels without voice block", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      requiredBecause: "emotionally_salient",
      voiceLine: ""
    })),
    context(baseRecords())
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity accepts active current-state record citations in packet fields", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      groundingLine: "  - Current-state grounding records: STEMO-1.",
      appraisalLine: "  - Relevant appraisal rules: guarded because STEMO-1 is active."
    })),
    context(baseRecords({
      activeRecords: { STEMO: ["STEMO-1"] },
      extraRecords: [storyRecord("story_emotion_record", "STEMO-1", "emotions", { id: "STEMO-1" })]
    }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity rejects packet citations to inactive current-state records", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      groundingLine: "  - Current-state grounding records: BEL-2.",
      projectionLine: "  - Page-local projection: distrust hardens around BEL-2."
    })),
    context(baseRecords({
      extraRecords: [storyRecord("story_belief_record", "BEL-2", "beliefs", { id: "BEL-2" })]
    }))
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.stale_current_state_reference");
  assert.equal((verdicts[0]?.detail as { record_id?: string }).record_id, "BEL-2");
  assert.equal((verdicts[0]?.detail as { field?: string }).field, "Page-local projection");
});

test("page_plan_stchar_packet_integrity rejects unresolved current-state record citations", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      groundingLine: "  - Current-state grounding records: STPLAN-4.",
      projectionLine: "  - Page-local projection: blocked by STPLAN-4."
    })),
    context(baseRecords())
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.stale_current_state_reference");
  assert.equal((verdicts[0]?.detail as { record_id?: string }).record_id, "STPLAN-4");
});

test("page_plan_stchar_packet_integrity rejects none grounding declarations with current-state citations elsewhere", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      groundingLine: "  - Current-state grounding records: none; stable STCHAR authority only.",
      projectionLine: "  - Page-local projection: blocked by STPLAN-1."
    })),
    context(baseRecords({
      activeRecords: { STPLAN: ["STPLAN-1"] },
      extraRecords: [storyRecord("story_plan_record", "STPLAN-1", "plans", { id: "STPLAN-1" })]
    }))
  );

  assert.equal(verdicts[0]?.code, "page_plan_stchar_packet_integrity.grounding_records_none_with_citations");
  assert.deepEqual((verdicts[0]?.detail as { record_ids?: string[] }).record_ids, ["STPLAN-1"]);
});

test("page_plan_stchar_packet_integrity accepts the page's own PG and SE references", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    input(plan({
      groundingLine: "  - Current-state grounding records: PG-1, SE-1.",
      projectionLine: "  - Page-local projection: as framed by PG-1 and SE-1."
    })),
    context(baseRecords({
      resolvedEventId: "SE-1",
      extraRecords: [storyRecord("story_event_record", "SE-1", "events", { id: "SE-1" })]
    }))
  );

  assert.deepEqual(verdicts, []);
});

test("page_plan_stchar_packet_integrity accepts two pages projecting different active STEMO records from the same STCHAR", async () => {
  const verdicts = await pagePlanStcharPacketIntegrity.run(
    inputFiles([
      {
        path: PLAN_PATH,
        content: plan({
          groundingLine: "  - Current-state grounding records: STEMO-1.",
          appraisalLine: "  - Relevant appraisal rules: fear from STEMO-1 tightens the voice."
        })
      },
      {
        path: `stories/${STORY}/pages-prose-plans/PG-2.md`,
        content: plan({
          groundingLine: "  - Current-state grounding records: STEMO-2.",
          appraisalLine: "  - Relevant appraisal rules: relief from STEMO-2 softens the voice."
        })
      }
    ]),
    context(baseRecords({
      activeRecords: { STEMO: ["STEMO-1"] },
      extraRecords: [
        storyRecord("story_emotion_record", "STEMO-1", "emotions", { id: "STEMO-1" }),
        storyRecord("page_record", "PG-2", "pages", pageParsed("PG-2", {
          active_records: { STENT: ["STENT-1"], STCHAR: ["STCHAR-1"], STEMO: ["STEMO-2"] },
          entity_status: {
            "STENT-1": {
              life: "alive",
              agency: "free",
              location: "STLOC-1"
            }
          }
        })),
        storyRecord("story_emotion_record", "STEMO-2", "emotions", { id: "STEMO-2" })
      ]
    }))
  );

  assert.deepEqual(verdicts, []);
});

function input(content: string) {
  return {
    files: [{ path: PLAN_PATH, content }]
  };
}

function inputFiles(files: Array<{ path: string; content: string }>) {
  return { files };
}

function baseRecords(options: {
  location?: string;
  activeRecords?: Record<string, string[]>;
  resolvedEventId?: string;
  extraRecords?: ReturnType<typeof storyRecord>[];
} = {}) {
  const activeRecords = {
    STENT: ["STENT-1"],
    STCHAR: ["STCHAR-1"],
    ...(options.activeRecords ?? {})
  };
  return [
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Test Character",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["speaker"]
    }),
    storyRecord("story_character_authority_record", "STCHAR-1", "story-characters", {
      id: "STCHAR-1",
      story_id: "STORY-1",
      status: "active",
      bound_stent_ids: ["STENT-1"],
      profile_hash: HASH_A,
      voice_block_hash: HASH_B
    }),
    storyRecord("page_record", "PG-1", "pages", pageParsed("PG-1", {
      active_records: activeRecords,
      entity_status: {
        "STENT-1": {
          life: "alive",
          agency: "free",
          location: options.location ?? "STLOC-1"
        }
      }
    }, options.resolvedEventId)),
    ...(options.extraRecords ?? [])
  ];
}

function pageParsed(id: string, stateSnapshot: Record<string, unknown>, resolvedEventId?: string) {
  return {
    id,
    story_id: "STORY-1",
    input: { resolved_event_id: resolvedEventId ?? null },
    state_snapshot: stateSnapshot
  };
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  const filePath = sourceDir === "story-characters"
    ? `stories/${STORY}/story-characters/${id}.md`
    : `stories/${STORY}/_source/${sourceDir}/${id}.yaml`;
  return {
    ...record(nodeType, `${STORY}:${id}`, filePath, parsed),
    story_slug: STORY
  };
}

function plan(options: {
  includePacket?: boolean;
  stcharId?: string;
  requiredBecause?: string;
  profileHash?: string;
  pagePacketHash?: string;
  voiceLine?: string;
  groundingLine?: string;
  appraisalLine?: string;
  projectionLine?: string;
} = {}): string {
  const includePacket = options.includePacket ?? true;
  const pagePacketHash = options.pagePacketHash ?? SEED_PAGE_PACKET_HASH;
  return [
    "# Page Plan",
    "",
    "## 16a. STCHAR-derived character authority packets",
    "",
    includePacket ? [
      packetText({ ...options, pagePacketHash }).replace(/\n$/, "")
    ].join("\n") : "",
    "",
    "## 17. Style/register notes",
    ""
  ].join("\n");
}

function packetText(options: {
  stcharId?: string;
  requiredBecause?: string;
  profileHash?: string;
  pagePacketHash?: string;
  voiceLine?: string;
  groundingLine?: string;
  appraisalLine?: string;
  projectionLine?: string;
} = {}): string {
  return [
    `- STENT-1 / ${options.stcharId ?? "STCHAR-1"} - Test Character.`,
    `  - Required because: ${options.requiredBecause ?? "speaker"}.`,
    `  - Hashes: profile_hash=${options.profileHash ?? HASH_A}; voice_block_hash=${HASH_B}; page_packet_hash=${options.pagePacketHash ?? SEED_PAGE_PACKET_HASH}.`,
    options.groundingLine ?? "  - Current-state grounding records: none; stable STCHAR authority only.",
    options.voiceLine ?? "  - Voice/dialogue authority: clipped STCHAR voice block.",
    options.appraisalLine ?? "  - Relevant appraisal rules: protect the secret.",
    options.projectionLine ?? "  - Page-local projection: protect the secret without implying current state.",
    ""
  ].join("\n");
}
