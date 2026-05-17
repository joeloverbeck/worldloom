import type { Context, IndexedRecord, Verdict } from "../framework/types.js";
import { asPlainRecord, queryRecordsByType, stringValue } from "./utils.js";
import { clockId, defineClockValidator, storyKey, warn } from "./clock-utils.js";

const VALIDATOR = "clock_terminal_debt_integrity";

export const clockTerminalDebtIntegrity = defineClockValidator(VALIDATOR, async (clock, ctx): Promise<Verdict[]> => {
  const parsed = asPlainRecord(clock.parsed);
  if (stringValue(parsed.salience) !== "high" || stringValue(parsed.status) !== "active") {
    return [];
  }

  const id = clockId(clock);
  const title = stringValue(parsed.title);
  const terminalPages = await terminalPagesForClock(ctx, clock, id);
  const verdicts: Verdict[] = [];
  for (const page of terminalPages) {
    const pageParsed = asPlainRecord(page.parsed);
    const continuation = asPlainRecord(asPlainRecord(pageParsed.state_snapshot).continuation);
    const rationale = stringValue(continuation.terminal_rationale);
    if (rationale !== undefined && (rationale.includes(id) || (title !== undefined && rationale.includes(title)))) {
      continue;
    }
    verdicts.push(warn(clock, VALIDATOR, "clock_terminal_debt_integrity.unresolved_terminal_clock", `${id} is high-salience active debt in terminal page ${stringValue(pageParsed.id) ?? page.node_id} without terminal_rationale naming the clock id or title.`, { page: stringValue(pageParsed.id) ?? page.node_id }));
  }
  return verdicts;
});

async function terminalPagesForClock(ctx: Context, clock: IndexedRecord, clockIdValue: string): Promise<IndexedRecord[]> {
  const pages = await queryRecordsByType(ctx, "page_record");
  return pages.filter((page) => {
    if (storyKey(page) !== storyKey(clock)) {
      return false;
    }
    const snapshot = asPlainRecord(asPlainRecord(page.parsed).state_snapshot);
    const activeRecords = asPlainRecord(snapshot.active_records);
    const activeClocks = activeRecords.CLK;
    if (!Array.isArray(activeClocks) || !activeClocks.includes(clockIdValue)) {
      return false;
    }
    const continuation = asPlainRecord(snapshot.continuation);
    const status = stringValue(continuation.terminal_status);
    return status === "terminal_closed" || status === "branch_pause";
  });
}
