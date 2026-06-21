// The ONE place e1RM math lives on the client (v1 had ~6 divergent copies).
// The DB's `personal_records` view is the source of truth for *stored* PRs;
// this mirrors its Epley formula for live UI preview before a set is saved.
// Keep the two formulas identical: weight * (1 + reps/30), rounded to 0.1.

/** Epley estimated 1RM. A logged single (reps === 1) is its own e1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return round1(weight)
  return round1(weight * (1 + reps / 30))
}

/** The view only estimates 1RM from sets of 1–12 reps; mirror that in the UI. */
export function showsE1RM(reps: number, isWarmup: boolean): boolean {
  return !isWarmup && reps >= 1 && reps <= 12
}

/** Load-volume for a single set. */
export function setVolume(weight: number, reps: number): number {
  return Math.max(0, weight * reps)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
