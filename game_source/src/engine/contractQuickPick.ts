import type { Contract } from "./data";
import { contractSelectionDailyOutputEstimate, staffBusyReason, type RunState } from "./state";

export interface ContractQuickPick {
  staffIds: string[];
  showrunner: boolean;
  rate: number;
  size: number;
  meets: boolean;
  etaDays: number;
}

export interface ContractQuickPicks {
  minimum: ContractQuickPick | null;
  fastest: ContractQuickPick | null;
}

/** Evaluate every legal 1–3-seat contract team. "minimum" protects scarce
 * staff; "fastest" deliberately throws the strongest available crew at it. */
export function contractQuickPicks(run: RunState, contract: Contract): ContractQuickPicks {
  const runnerBusy = run.contractJobs.some((job) => job.showrunner);
  const seats: ({ kind: "staff"; id: string } | { kind: "runner" })[] = run.staff
    .filter((staff) => !staffBusyReason(run, staff.id))
    .map((staff) => ({ kind: "staff" as const, id: staff.id }));
  if (!runnerBusy) seats.push({ kind: "runner" });

  const candidates: ContractQuickPick[] = [];
  const consider = (picked: typeof seats) => {
    if (!picked.length || picked.length > 3) return;
    const staffIds = picked.filter((seat): seat is { kind: "staff"; id: string } => seat.kind === "staff").map((seat) => seat.id);
    const showrunner = picked.some((seat) => seat.kind === "runner");
    const rate = contractSelectionDailyOutputEstimate(run, contract, staffIds, showrunner);
    if (rate <= 0) return;
    candidates.push({
      staffIds,
      showrunner,
      rate,
      size: picked.length,
      meets: rate * contract.weeks * 7 >= contract.target,
      etaDays: Math.max(1, Math.ceil(contract.target / rate)),
    });
  };

  for (let a = 0; a < seats.length; a += 1) {
    consider([seats[a]]);
    for (let b = a + 1; b < seats.length; b += 1) {
      consider([seats[a], seats[b]]);
      for (let c = b + 1; c < seats.length; c += 1) consider([seats[a], seats[b], seats[c]]);
    }
  }

  const meeting = candidates.filter((candidate) => candidate.meets);
  const minimumPool = meeting.length ? meeting : candidates;
  const minimum = [...minimumPool].sort((a, b) =>
    Number(b.meets) - Number(a.meets) ||
    a.size - b.size ||
    Number(a.showrunner) - Number(b.showrunner) ||
    b.rate - a.rate
  )[0] ?? null;
  const fastest = [...candidates].sort((a, b) =>
    b.rate - a.rate ||
    a.size - b.size ||
    Number(a.showrunner) - Number(b.showrunner)
  )[0] ?? null;

  return { minimum, fastest };
}
