import { aggregateSeverity } from "./aggregate.js";
import { applyGrandfathering } from "./grandfathering.js";
import type { Context, Validator, ValidatorExecution, ValidatorRun, Verdict } from "./types.js";

export async function runValidators(
  validators: readonly Validator[],
  input: unknown,
  ctx: Context
): Promise<ValidatorRun> {
  const started_at = new Date().toISOString();
  const validators_run: string[] = [];
  const validators_skipped: Array<{ name: string; reason: string }> = [];
  const runnable: Validator[] = [];
  const executions: ValidatorExecution[] = [];

  for (const validator of validators) {
    if (validator.applies_to(ctx)) {
      validators_run.push(validator.name);
      runnable.push(validator);
    } else {
      const reason = validator.skip_reason ?? "applies_to=false";
      validators_skipped.push({ name: validator.name, reason });
      executions.push({
        name: validator.name,
        status: "skipped",
        duration_ms: 0,
        detail: reason
      });
    }
  }

  const timedRuns = await Promise.all(
    runnable.map(
      async (validator): Promise<{ name: string; verdicts: Verdict[]; duration_ms: number }> => {
        const startedNs = process.hrtime.bigint();
        const verdictsForValidator = await validator.run(input, ctx);
        const elapsedNs = process.hrtime.bigint() - startedNs;
        return {
          name: validator.name,
          verdicts: verdictsForValidator,
          duration_ms: Number(elapsedNs) / 1_000_000
        };
      }
    )
  );

  const allRawVerdicts: Verdict[] = timedRuns.flatMap((row) => row.verdicts);
  const verdicts = applyGrandfathering(allRawVerdicts, input);
  const summary = aggregateSeverity(verdicts);

  const failVerdictsByValidator = new Map<string, Verdict[]>();
  for (const verdict of verdicts) {
    if (verdict.severity !== "fail") {
      continue;
    }
    const bucket = failVerdictsByValidator.get(verdict.validator);
    if (bucket === undefined) {
      failVerdictsByValidator.set(verdict.validator, [verdict]);
    } else {
      bucket.push(verdict);
    }
  }

  for (const row of timedRuns) {
    const fails = failVerdictsByValidator.get(row.name) ?? [];
    if (fails.length === 0) {
      executions.push({
        name: row.name,
        status: "pass",
        duration_ms: row.duration_ms
      });
    } else {
      executions.push({
        name: row.name,
        status: "fail",
        duration_ms: row.duration_ms,
        detail: fails[0]?.message ?? `${fails.length} fail verdict(s)`
      });
    }
  }

  return {
    run_mode: ctx.run_mode,
    world_slug: ctx.world_slug,
    started_at,
    finished_at: new Date().toISOString(),
    verdicts,
    summary: {
      ...summary,
      validators_run,
      validators_skipped,
      executions
    }
  };
}
