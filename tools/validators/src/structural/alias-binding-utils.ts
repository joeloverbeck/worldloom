import type { IndexedRecord } from "../framework/types.js";
import {
  asPlainRecord
} from "./utils.js";

const STORY_ENTITY_ID = /^STENT-\d+$/;

export function aliasBindingsFor(event: IndexedRecord | Record<string, unknown>): ReadonlyMap<string, string> {
  const parsed = parsedEvent(event);
  const bindings = asPlainRecord(asPlainRecord(parsed.commitment).alias_bindings);
  const result = new Map<string, string>();

  for (const [alias, bound] of Object.entries(bindings)) {
    if (typeof bound === "string" && bound.length > 0) {
      result.set(alias, bound);
    }
  }

  return result;
}

export function resolveAliasBinding(
  event: IndexedRecord | Record<string, unknown>,
  alias: string
): string | undefined {
  return aliasBindingsFor(event).get(unboundAlias(alias));
}

export function resolveStoryEntityAliasBinding(
  event: IndexedRecord | Record<string, unknown>,
  alias: string
): string | undefined {
  const bound = resolveAliasBinding(event, alias);
  return bound !== undefined && STORY_ENTITY_ID.test(bound) ? bound : undefined;
}

export function unboundAlias(alias: string): string {
  return alias.startsWith("bound:") ? alias.slice("bound:".length) : alias;
}

function parsedEvent(event: IndexedRecord | Record<string, unknown>): Record<string, unknown> {
  const maybeIndexed = asPlainRecord(event);
  const parsed = asPlainRecord(maybeIndexed.parsed);
  return Object.keys(parsed).length > 0 ? parsed : maybeIndexed;
}
