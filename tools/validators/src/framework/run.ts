import { aggregateSeverity } from "./aggregate.js";
import { applyGrandfathering } from "./grandfathering.js";
import type { Context, Validator, ValidatorRun, Verdict } from "./types.js";

export async function runValidators(
  validators: readonly Validator[],
  input: unknown,
  ctx: Context
): Promise<ValidatorRun> {
  const started_at = new Date().toISOString();
  const validators_run: string[] = [];
  const validators_skipped: Array<{ name: string; reason: string }> = [];
  const runnable: Validator[] = [];

  for (const validator of validators) {
    if (validator.applies_to(ctx)) {
      validators_run.push(validator.name);
      runnable.push(validator);
    } else {
      validators_skipped.push({
        name: validator.name,
        reason: validator.skip_reason ?? "applies_to=false"
      });
    }
  }

  const verdictGroups = await Promise.all(
    runnable.map(async (validator): Promise<Verdict[]> => validator.run(input, ctx))
  );
  const verdicts = applyGrandfathering(verdictGroups.flat(), input);
  const summary = aggregateSeverity(verdicts);

  return {
    run_mode: ctx.run_mode,
    world_slug: ctx.world_slug,
    started_at,
    finished_at: new Date().toISOString(),
    verdicts,
    summary: {
      ...summary,
      validators_run,
      validators_skipped
    }
  };
}
