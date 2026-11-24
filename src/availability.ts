export type Booking = { start: number; end: number };

export type Result =
  | { kind: "available" }
  | { kind: "unavailable"; reasons: string[] };

export const MAX_DURATION = 120;

export function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(label);
  if (!match) return null;
  const h = Number(match[1]);
  const mm = Number(match[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

export function checkAvailability(
  start: number,
  end: number,
  now: number,
  blocked: boolean,
  existing: Booking[]
): Result {
  const reasons: string[] = [];

  if (!(0 <= start && start < end && end <= 1440)) {
    reasons.push(
      "Times must satisfy 0 ≤ start < end ≤ 1440 (minutes after midnight)."
    );
  }
  if (!(start > now)) {
    reasons.push(
      `Start time must be strictly later than the current time (${minutesToLabel(
        now
      )}).`
    );
  }
  if (end - start > MAX_DURATION) {
    reasons.push(
      `Requested duration is ${end - start} min, which exceeds the ${MAX_DURATION}-minute limit.`
    );
  }
  if (blocked) {
    reasons.push("This room is currently blocked and cannot be booked.");
  }
  for (const b of existing) {
    const overlaps = start < b.end && end > b.start;
    if (overlaps) {
      reasons.push(
        `Overlaps existing booking ${minutesToLabel(b.start)}–${minutesToLabel(
          b.end
        )}.`
      );
    }
  }

  return reasons.length === 0
    ? { kind: "available" }
    : { kind: "unavailable", reasons };
}
