import { minutesToLabel, type Result } from "@/availability";

export type ExplainInput = {
  roomLabel: string;
  start: number;
  end: number;
  result: Result;
};

export type ExplainAdapter = (input: ExplainInput) => Promise<string>;

export type ExplainOutcome = {
  explanation: string;
  usedFallback: boolean;
};

export const FALLBACK_AVAILABLE = "This time slot is available.";
export const MAX_ROOM_LABEL_LENGTH = 200;
export const MAX_REASON_LENGTH = 300;
export const MAX_EXPLANATION_LENGTH = 400;
export const MAX_SENTENCES = 2;
export const DEFAULT_TIMEOUT_MS = 2000;

export class ExplainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplainValidationError";
  }
}

function isMinute(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1440;
}

function assertValidInput(input: ExplainInput): void {
  if (typeof input !== "object" || input === null) {
    throw new ExplainValidationError("Input must be an object.");
  }
  const { roomLabel, start, end, result } = input;

  if (
    typeof roomLabel !== "string" ||
    roomLabel.trim().length === 0 ||
    roomLabel.length > MAX_ROOM_LABEL_LENGTH
  ) {
    throw new ExplainValidationError(
      `roomLabel must be a non-empty string of at most ${MAX_ROOM_LABEL_LENGTH} characters.`
    );
  }
  if (!isMinute(start) || !isMinute(end) || start >= end) {
    throw new ExplainValidationError(
      "start and end must be valid minutes after midnight with start < end."
    );
  }
  if (
    typeof result !== "object" ||
    result === null ||
    (result.kind !== "available" && result.kind !== "unavailable")
  ) {
    throw new ExplainValidationError('result.kind must be "available" or "unavailable".');
  }
  if (result.kind === "unavailable") {
    const { reasons } = result;
    if (!Array.isArray(reasons) || reasons.length === 0) {
      throw new ExplainValidationError(
        "An unavailable result must include at least one reason."
      );
    }
    for (const reason of reasons) {
      if (
        typeof reason !== "string" ||
        reason.trim().length === 0 ||
        reason.length > MAX_REASON_LENGTH
      ) {
        throw new ExplainValidationError(
          `Each reason must be a non-empty string of at most ${MAX_REASON_LENGTH} characters.`
        );
      }
    }
  }
}

function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0).length;
}

function extractTimes(text: string): string[] {
  return text.match(/\b\d{2}:\d{2}\b/g) ?? [];
}

const UNAVAILABLE_MARKER =
  /\bunavailable\b|\bnot available\b|\b(?:isn'?t|is not|not) free\b|\bcannot be (?:booked|reserved)\b|\bcan'?t be (?:booked|reserved)\b|\bblocked\b|\boverlaps?\b/i;

const POSITIVE_AVAILABILITY =
  /\bcan (?:be )?(?:reserved?|booked?)\b|\b(?:is|room) (?:open|free|available)\b|\bavailable\b/i;

function agreesWithKind(text: string, kind: Result["kind"]): boolean {
  if (kind === "available") {
    return !/\bunavailable\b|\bnot available\b|\bcannot be booked\b|\bblocked\b|\boverlaps?\b/i.test(
      text
    );
  }
  return UNAVAILABLE_MARKER.test(text) && !POSITIVE_AVAILABILITY.test(text);
}

const BOOKING_DETAIL_PATTERN =
  /\b(?:booked|reserved|held|approved)\s+by\b|\b(?:booked|reserved)\s+for\b|\bunder the name\b|\bbooking reference\b|\bconfirmation number\b/i;

function assertNoInventedDetails(text: string, input: ExplainInput): void {
  if (BOOKING_DETAIL_PATTERN.test(text)) {
    throw new ExplainValidationError(
      "Explanation mentions booking details that were not part of the input."
    );
  }
  const source = [
    input.roomLabel,
    input.result.kind === "unavailable" ? input.result.reasons.join(" ") : "",
  ].join(" ");
  const allowed = new Set<string>([
    ...(source.match(/\d+/g) ?? []),
    ...extractTimes(source),
  ]);
  let remainder = text;
  for (const t of extractTimes(text)) {
    remainder = remainder.split(t).join(" ");
  }
  for (const m of remainder.match(/\d+/g) ?? []) {
    if (!allowed.has(m)) {
      throw new ExplainValidationError(
        `Explanation invents a detail (${m}) that was not part of the input.`
      );
    }
  }
}

function assertValidOutput(text: string, input: ExplainInput): string {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new ExplainValidationError("Explanation must be a non-empty string.");
  }
  const trimmed = text.trim();
  if (trimmed.length > MAX_EXPLANATION_LENGTH) {
    throw new ExplainValidationError(
      `Explanation must be at most ${MAX_EXPLANATION_LENGTH} characters.`
    );
  }
  if (countSentences(trimmed) > MAX_SENTENCES) {
    throw new ExplainValidationError(
      `Explanation must contain at most ${MAX_SENTENCES} sentences.`
    );
  }
  if (!agreesWithKind(trimmed, input.result.kind)) {
    throw new ExplainValidationError(
      "Explanation contradicts the deterministic result."
    );
  }

  const allowedTimes = new Set([
    minutesToLabel(input.start),
    minutesToLabel(input.end),
  ]);
  const reasonText =
    input.result.kind === "unavailable" ? input.result.reasons.join(" ") : "";
  for (const t of extractTimes(reasonText)) allowedTimes.add(t);
  for (const t of extractTimes(input.roomLabel)) allowedTimes.add(t);
  for (const t of extractTimes(trimmed)) {
    if (!allowedTimes.has(t)) {
      throw new ExplainValidationError(
        `Explanation invents a time (${t}) that was not part of the input.`
      );
    }
  }
  assertNoInventedDetails(trimmed, input);
  return trimmed;
}

export const mockExplainAdapter: ExplainAdapter = async (input) => {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const startLabel = minutesToLabel(input.start);
  const endLabel = minutesToLabel(input.end);

  if (input.result.kind === "available") {
    return `${input.roomLabel} is free from ${startLabel} to ${endLabel}. This time slot passes all availability rules.`;
  }

  const reasonText = input.result.reasons
    .map((r) => r.trim().replace(/\.?$/, ""))
    .join("; ");
  return `${input.roomLabel} cannot be booked from ${startLabel} to ${endLabel}. Reason: ${reasonText}.`;
};

export function buildFallback(result: Result): string {
  if (result.kind === "available") return FALLBACK_AVAILABLE;
  return `This time slot is unavailable for the following reasons: ${result.reasons.join(
    " "
  )}`;
}

function withTimeout(promise: Promise<string>, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Explanation timed out.")),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function explainAvailability(
  input: ExplainInput,
  options: { adapter?: ExplainAdapter; timeoutMs?: number } = {}
): Promise<ExplainOutcome> {
  assertValidInput(input);
  const adapter = options.adapter ?? mockExplainAdapter;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let raw: string;
  try {
    raw = await withTimeout(adapter(input), timeoutMs);
  } catch {
    return { explanation: buildFallback(input.result), usedFallback: true };
  }

  try {
    return { explanation: assertValidOutput(raw, input), usedFallback: false };
  } catch {
    return { explanation: buildFallback(input.result), usedFallback: true };
  }
}
