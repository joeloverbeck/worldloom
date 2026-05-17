import {
  ENVELOPE_OVERHEAD_RESERVE_CHARS,
  resolveHarnessCeilingChars
} from "../context-packet/shared.js";
import { persistToolResultJson } from "../context-packet/persistence.js";

export type InlineDeliveryStatus = "inline";
export type PersistedWithSummaryDeliveryStatus = "persisted_with_summary";
export type PersistableDeliveryStatus =
  | InlineDeliveryStatus
  | PersistedWithSummaryDeliveryStatus;

export interface PersistedWithSummaryFields<Summary> {
  delivery_status: PersistedWithSummaryDeliveryStatus;
  persisted_output_path: string;
  summary: Summary;
}

export function effectiveInlineCeilingChars(env: NodeJS.ProcessEnv = process.env): number {
  const harnessCeilingChars = resolveHarnessCeilingChars(env);
  return Math.max(1, harnessCeilingChars - ENVELOPE_OVERHEAD_RESERVE_CHARS);
}

export function serializedChars(value: unknown): number {
  return JSON.stringify(value).length;
}

export function fitsInline(value: unknown): boolean {
  return serializedChars(value) <= effectiveInlineCeilingChars();
}

export function persistWithSummary<Full extends Record<string, unknown>, Summary>(
  nameParts: string,
  fullResponse: Full,
  summary: Summary
): (Full & { delivery_status: InlineDeliveryStatus }) | PersistedWithSummaryFields<Summary> {
  const inlineResponse = {
    delivery_status: "inline" as const,
    ...fullResponse
  };
  if (fitsInline(inlineResponse)) {
    return inlineResponse;
  }

  const persistedOutputPath = persistToolResultJson(nameParts, inlineResponse);
  return {
    delivery_status: "persisted_with_summary",
    persisted_output_path: persistedOutputPath,
    summary
  };
}

export function ceilingMetadata(): {
  harness_ceiling_chars: number;
  envelope_overhead_reserve_chars: number;
  effective_inline_ceiling_chars: number;
} {
  return {
    harness_ceiling_chars: resolveHarnessCeilingChars(),
    envelope_overhead_reserve_chars: ENVELOPE_OVERHEAD_RESERVE_CHARS,
    effective_inline_ceiling_chars: effectiveInlineCeilingChars()
  };
}
