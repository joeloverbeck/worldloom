import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  locationFor,
  queryRecordsByType,
  stringValue
} from "./utils.js";

export interface ClockThreshold {
  at: number;
  label?: string;
}

export interface ClockTick {
  event?: string;
  delta?: number;
  cause?: string;
}

export const CLOCK_MUTATION_OPS = new Set([
  "create_clk_record",
  "supersede_clk_record"
]);

export function clockValidatorApplies(ctx: Context): boolean {
  if (ctx.run_mode === "full-world") {
    return true;
  }
  if (ctx.run_mode === "pre-apply") {
    return (ctx.patch_plan?.patches ?? []).some((patch) => CLOCK_MUTATION_OPS.has(patch.op));
  }
  return ctx.touched_files.some((file) =>
    /(?:^|\/)stories\/[^/]+\/_source\/clocks\/CLK-\d+\.yaml$|(?:^|\/)_source\/clocks\/CLK-\d+\.yaml$/.test(file)
  );
}

export function defineClockValidator(
  name: string,
  runClock: (clock: IndexedRecord, ctx: Context) => Promise<Verdict[]> | Verdict[]
): Validator {
  return {
    name,
    severity_mode: "fail",
    applies_to: clockValidatorApplies,
    run: async (_input: unknown, ctx: Context): Promise<Verdict[]> => {
      const clocks = await queryRecordsByType(ctx, "pressure_clock_record");
      const verdicts: Verdict[] = [];
      for (const clock of clocks) {
        verdicts.push(...await runClock(clock, ctx));
      }
      return verdicts;
    }
  };
}

export function clockId(clock: IndexedRecord): string {
  return stringValue(asPlainRecord(clock.parsed).id) ?? bareStoryId(clock.node_id) ?? clock.node_id;
}

export function clockLabel(clock: IndexedRecord): string {
  return `${clockId(clock)}:`;
}

export function integerField(clock: IndexedRecord, field: "value" | "max"): number | null {
  const value = asPlainRecord(clock.parsed)[field];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export function thresholds(clock: IndexedRecord): ClockThreshold[] {
  const value = asPlainRecord(clock.parsed).thresholds;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => asPlainRecord(entry)).map((entry) => {
    const label = stringValue(entry.label);
    return {
      at: typeof entry.at === "number" && Number.isInteger(entry.at) ? entry.at : Number.NaN,
      ...(label !== undefined ? { label } : {})
    };
  });
}

export function tickHistory(clock: IndexedRecord): ClockTick[] {
  const value = asPlainRecord(clock.parsed).tick_history;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => asPlainRecord(entry)).map((entry) => {
    const event = stringValue(entry.event);
    const cause = stringValue(entry.cause);
    return {
      ...(event !== undefined ? { event } : {}),
      ...(typeof entry.delta === "number" && Number.isInteger(entry.delta) ? { delta: entry.delta } : {}),
      ...(cause !== undefined ? { cause } : {})
    };
  });
}

export function storyKey(record: IndexedRecord): string {
  if (record.story_slug) {
    return record.story_slug;
  }
  const [maybeStory] = record.node_id.split(":");
  return record.node_id.includes(":") && maybeStory ? maybeStory : "__world__";
}

export function fail(clock: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "fail",
    code,
    message: `${clockLabel(clock)} ${message}`,
    location: locationFor(clock),
    detail
  };
}

export function warn(clock: IndexedRecord, validator: string, code: string, message: string, detail?: unknown): Verdict {
  return {
    validator,
    severity: "warn",
    code,
    message: `${clockLabel(clock)} ${message}`,
    location: locationFor(clock),
    detail
  };
}

function bareStoryId(nodeId: string): string | null {
  const parts = nodeId.split(":");
  return parts.length > 1 ? parts[parts.length - 1] ?? null : nodeId;
}
