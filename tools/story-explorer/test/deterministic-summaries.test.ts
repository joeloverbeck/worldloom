import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRecordCard } from "../src/read/record-card.js";

test("summary fallback prefers explicit title label name objective or claim", () => {
  assert.equal(buildRecordCard("THR-99", { id: "THR-99", title: "Explicit title", summary: "Secondary text" }).summaryLine, "Explicit title");
  assert.equal(buildRecordCard("STLOC-99", { id: "STLOC-99", label: "Explicit label", description: "Secondary text" }).summaryLine, "Explicit label");
  assert.equal(buildRecordCard("STENT-99", { id: "STENT-99", name: "Explicit name", role_in_story: "ally" }).summaryLine, "Explicit name");
  assert.equal(buildRecordCard("STPLAN-99", { id: "STPLAN-99", objective: "Explicit objective", plan_status: "active" }).summaryLine, "Explicit objective");
  assert.equal(buildRecordCard("BEL-99", { id: "BEL-99", claim: "Explicit claim", confidence: "high" }).summaryLine, "Explicit claim");
});

test("summary fallback uses first meaningful class-specific string when explicit fields are absent", () => {
  assert.equal(
    buildRecordCard("SE-99", { id: "SE-99", event_kind: "secret_reveal", actor: "STENT-1", outcome_route: "accept" }).summaryLine,
    "secret_reveal"
  );
});

test("summary fallback uses record id plus class when only ids are present", () => {
  assert.equal(buildRecordCard("STSTAT-99", { id: "STSTAT-99" }).summaryLine, "STSTAT-99 (STSTAT)");
});

test("summary fallback returns the untitled class fallback when no body string is meaningful", () => {
  assert.equal(buildRecordCard("STSTAT-100", { life: null, agency: null }).summaryLine, "Untitled STSTAT record");
});

test("summary text is sourced from the record body or from the class-name fallback", () => {
  const body = { id: "CLK-99", title: "Body clock title", salience: "high" };
  const titleCard = buildRecordCard("CLK-99", body);
  assert.equal(titleCard.summaryLine, "Body clock title");
  assert.equal(Object.values(body).includes(titleCard.summaryLine), true);

  const untitledCard = buildRecordCard("CLK-100", {});
  assert.equal(untitledCard.summaryLine, "Untitled CLK record");
});

test("record groups cover the eight SPEC-87 taxonomy buckets", () => {
  const groups = new Set([
    buildRecordCard("STENT-1", { id: "STENT-1", display_name: "Mara" }).group,
    buildRecordCard("STLOC-1", { id: "STLOC-1", label: "Cellar" }).group,
    buildRecordCard("BEL-1", { id: "BEL-1", claim: "The door is watched." }).group,
    buildRecordCard("STPLAN-1", { id: "STPLAN-1", objective: "Open the door." }).group,
    buildRecordCard("OBL-1", { id: "OBL-1", description: "Mara owes Ren." }).group,
    buildRecordCard("THR-1", { id: "THR-1", title: "Door thread" }).group,
    buildRecordCard("SE-1", { id: "SE-1", event_kind: "npc_action" }).group,
    buildRecordCard("SAU-1", { id: "SAU-1", title: "Audit" }).group,
  ]);

  assert.deepEqual(
    [...groups].sort(),
    [
      "Cast & Status",
      "Event Delta",
      "Knowledge & Truth",
      "Plans & Emotion",
      "Pressure & Open Loops",
      "Relationships & Debts",
      "Scene & Affordances",
      "Validation & Integrity",
    ]
  );
});
