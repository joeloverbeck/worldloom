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

function input(content: string) {
  return {
    files: [{ path: PLAN_PATH, content }]
  };
}

function baseRecords(options: { location?: string } = {}) {
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
    storyRecord("page_record", "PG-1", "pages", {
      id: "PG-1",
      story_id: "STORY-1",
      state_snapshot: {
        active_records: { STENT: ["STENT-1"], STCHAR: ["STCHAR-1"] },
        entity_status: {
          "STENT-1": {
            life: "alive",
            agency: "free",
            location: options.location ?? "STLOC-1"
          }
        }
      }
    })
  ];
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
} = {}): string {
  return [
    `- STENT-1 / ${options.stcharId ?? "STCHAR-1"} - Test Character.`,
    `  - Required because: ${options.requiredBecause ?? "speaker"}.`,
    `  - Hashes: profile_hash=${options.profileHash ?? HASH_A}; voice_block_hash=${HASH_B}; page_packet_hash=${options.pagePacketHash ?? SEED_PAGE_PACKET_HASH}.`,
    options.voiceLine ?? "  - Voice/dialogue authority: clipped STCHAR voice block.",
    "  - Relevant appraisal rules: protect the secret.",
    ""
  ].join("\n");
}
