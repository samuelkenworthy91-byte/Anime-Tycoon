import type { Staff } from "./data";

export function staffIsInjured(staff: Pick<Staff, "injuredUntilDay">, day: number): boolean {
  return (staff.injuredUntilDay ?? -1) > day;
}

export function injuryDaysRemaining(staff: Pick<Staff, "injuredUntilDay">, day: number): number {
  return Math.max(0, Math.ceil((staff.injuredUntilDay ?? day) - day));
}

export function injuryWeeksRemaining(staff: Pick<Staff, "injuredUntilDay">, day: number): number {
  return Math.max(0, Math.ceil(injuryDaysRemaining(staff, day) / 7));
}

export function staffInjuryReason(staff: Pick<Staff, "injuredUntilDay" | "injuryLabel">, day: number): string | null {
  if (!staffIsInjured(staff, day)) return null;
  const days = injuryDaysRemaining(staff, day);
  return `${staff.injuryLabel ?? "Arcball injury"} · ${days} day${days === 1 ? "" : "s"} remaining`;
}
