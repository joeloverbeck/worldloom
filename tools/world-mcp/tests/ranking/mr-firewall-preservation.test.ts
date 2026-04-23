import assert from "node:assert/strict";
import test from "node:test";

import { characterGenerationRankingProfile } from "../../src/ranking/profiles";

test("character_generation keeps firewall_for weight strictly positive", () => {
  assert.ok((characterGenerationRankingProfile.edge_type_boost?.firewall_for ?? 0) > 0);
});
