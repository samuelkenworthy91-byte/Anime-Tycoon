import type { RunState } from "./state";

/**
 * Insolvency is intentionally a career threat rather than an instant failure.
 * The studio may trade below £0 for up to two consecutive in-game months.
 *
 * The game already treats four weeks as one finance month (rent/payroll land
 * every fourth week), so the same calendar is used here:
 *   weeks 1-3 below zero  -> debt warning state
 *   week 4               -> landlord grants one final month's reprieve
 *   weeks 5-7            -> final recovery window
 *   week 8               -> lease terminated / game over
 *
 * Reaching £0 or above at any point clears the streak completely.
 */
export const INSOLVENCY_MONTH_WEEKS = 4;
export const INSOLVENCY_SHUTDOWN_WEEKS = INSOLVENCY_MONTH_WEEKS * 2;

/* Additive save field. It is optional so every historical save remains valid;
 * migrateRun already preserves unknown additive fields via its top-level spread.
 */
declare module "./state" {
  interface RunState {
    negativeCashWeeks?: number;
  }
}

export interface InsolvencyUpdate {
  run: RunState;
  weeksNegative: number;
  /** true only on the exact week the landlord issues the one-month reprieve */
  reprieveIssued: boolean;
  /** true when a prior debt streak has just been cleared */
  recovered: boolean;
  /** true once the studio has remained below £0 for two full months */
  shutdown: boolean;
}

const clampWeeks = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function negativeCashWeeks(r: RunState): number {
  return clampWeeks(r.negativeCashWeeks);
}

export function insolvencyWeeksRemaining(r: RunState): number {
  if (r.cash >= 0) return INSOLVENCY_SHUTDOWN_WEEKS;
  return Math.max(0, INSOLVENCY_SHUTDOWN_WEEKS - negativeCashWeeks(r));
}

/** Apply exactly once after each completed in-game week. */
export function applyWeeklyInsolvency(r: RunState): InsolvencyUpdate {
  const previous = negativeCashWeeks(r);

  if (r.cash >= 0) {
    const recovered = previous > 0;
    return {
      run: {
        ...r,
        negativeCashWeeks: 0,
        notices: recovered
          ? [...r.notices, "✅ Studio debt cleared. The landlord withdraws the shutdown notice."]
          : r.notices,
      },
      weeksNegative: 0,
      reprieveIssued: false,
      recovered,
      shutdown: false,
    };
  }

  const weeksNegative = previous + 1;
  const reprieveIssued = weeksNegative === INSOLVENCY_MONTH_WEEKS;
  const shutdown = weeksNegative >= INSOLVENCY_SHUTDOWN_WEEKS;
  let notices = r.notices;

  if (reprieveIssued) {
    notices = [
      ...notices,
      "🏚️ LANDLORD'S FINAL NOTICE: The studio has been below £0 for one month. You have ONE MONTH to return to solvency or the lease will be terminated.",
    ];
  } else if (shutdown) {
    notices = [
      ...notices,
      "🔒 LEASE TERMINATED: The studio remained below £0 for two consecutive months and has been shut down.",
    ];
  }

  return {
    run: { ...r, negativeCashWeeks: weeksNegative, notices },
    weeksNegative,
    reprieveIssued,
    recovered: false,
    shutdown,
  };
}
