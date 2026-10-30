export interface DecisionOptions {
  /** Wall-clock budget for one decision. Omitted or non-finite means unlimited. */
  readonly budgetMs?: number;
  /** Injectable clock for deterministic tests; defaults to `performance.now`. */
  readonly now?: () => number;
}

export interface DecisionBudget {
  readonly expired: () => boolean;
}

/** One deadline shared by every enumerator in a decision. Checked before a
 * forecast starts, never inside one, so a forecast always completes. */
export function createBudget(options?: DecisionOptions): DecisionBudget {
  const budgetMs = options?.budgetMs;
  if (budgetMs === undefined || !Number.isFinite(budgetMs)) return { expired: () => false };
  const now = options?.now ?? (() => performance.now());
  const deadline = now() + Math.max(0, budgetMs);
  return { expired: () => now() >= deadline };
}
