import type { Verdict } from "../framework/types.js";
import { asPlainRecord, stringValue } from "./utils.js";
import {
  carrierRecord,
  clueCarriers,
  defineSecretValidator,
  fail,
  precedesReveal,
  storyKey
} from "./secret-utils.js";

const VALIDATOR = "critical_secret_clue_coverage_when_revealed";
const REQUIRED_DISCOVERED_CARRIERS = 2;

export const criticalSecretClueCoverageWhenRevealed = defineSecretValidator(VALIDATOR, (secret, _ctx, records): Verdict[] => {
  const parsed = asPlainRecord(secret.parsed);
  if (stringValue(parsed.salience) !== "high" || stringValue(parsed.status) !== "revealed") {
    return [];
  }

  const revealEventId = stringValue(parsed.reveal_event);
  if (revealEventId === undefined) {
    return [fail(secret, VALIDATOR, "critical_secret_clue_coverage_when_revealed.missing_reveal_event", "high-salience revealed secrets must name reveal_event.")];
  }

  const revealEvent = records.eventsById.get(`story_event_record:${storyKey(secret)}:${revealEventId}`);
  if (revealEvent === undefined) {
    return [fail(secret, VALIDATOR, "critical_secret_clue_coverage_when_revealed.missing_reveal_event", `reveal_event references missing ${revealEventId}.`, { reveal_event: revealEventId })];
  }

  let discoveredBeforeReveal = 0;
  for (const carrier of clueCarriers(secret)) {
    if (carrier.status !== "discovered") {
      continue;
    }
    const target = carrierRecord(records, secret, carrier);
    if (target !== undefined && precedesReveal(secret, target, revealEvent, records.pagesById)) {
      discoveredBeforeReveal += 1;
    }
  }

  if (discoveredBeforeReveal < REQUIRED_DISCOVERED_CARRIERS) {
    return [fail(secret, VALIDATOR, "critical_secret_clue_coverage_when_revealed.insufficient_clue_coverage", `high-salience revealed secrets require at least ${REQUIRED_DISCOVERED_CARRIERS} discovered clue carriers before ${revealEventId}; found ${discoveredBeforeReveal}.`, {
      reveal_event: revealEventId,
      required: REQUIRED_DISCOVERED_CARRIERS,
      discovered_before_reveal: discoveredBeforeReveal
    })];
  }

  return [];
});
