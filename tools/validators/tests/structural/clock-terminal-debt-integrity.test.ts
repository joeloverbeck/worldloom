import assert from "node:assert/strict";
import test from "node:test";

import { clockTerminalDebtIntegrity } from "../../src/structural/clock-terminal-debt-integrity.js";
import { context, record } from "./helpers.js";

test("clock_terminal_debt_integrity accepts terminal rationale that names high-salience active clock debt", async () => {
  const verdicts = await clockTerminalDebtIntegrity.run(undefined, context([
    clockRecord(),
    pageRecord("The branch closes by inheriting CLK-1 into the sibling route.")
  ]));

  assert.deepEqual(verdicts, []);
});

test("clock_terminal_debt_integrity warns when terminal pages omit high-salience active clock rationale", async () => {
  const verdicts = await clockTerminalDebtIntegrity.run(undefined, context([
    clockRecord(),
    pageRecord("The branch ends.")
  ]));

  assert.equal(verdicts[0]?.severity, "warn");
  assert.equal(verdicts[0]?.code, "clock_terminal_debt_integrity.unresolved_terminal_clock");
});

function clockRecord() {
  return record("pressure_clock_record", "test-story:CLK-1", "stories/test-story/_source/clocks/CLK-1.yaml", {
    id: "CLK-1",
    title: "Exposure Clock",
    salience: "high",
    status: "active"
  });
}

function pageRecord(terminal_rationale: string) {
  return record("page_record", "test-story:PG-2", "stories/test-story/_source/pages/PG-2.yaml", {
    id: "PG-2",
    state_snapshot: {
      active_records: { CLK: ["CLK-1"] },
      continuation: {
        terminal_status: "terminal_closed",
        terminal_rationale
      }
    }
  });
}
