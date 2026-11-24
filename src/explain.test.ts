import { describe, expect, it } from "vitest";
import { checkAvailability } from "@/availability";
import {
  buildFallback,
  explainAvailability,
  ExplainValidationError,
  FALLBACK_AVAILABLE,
  mockExplainAdapter,
  MAX_EXPLANATION_LENGTH,
} from "@/explain";

const base = {
  roomLabel: "Library Study Room 201",
  start: 630,
  end: 690,
  now: 540,
  existing: [{ start: 600, end: 660 }],
};

function unavailableInput() {
  return {
    roomLabel: base.roomLabel,
    start: base.start,
    end: base.end,
    result: checkAvailability(base.start, base.end, base.now, false, base.existing),
  };
}

function availableInput() {
  return {
    roomLabel: base.roomLabel,
    start: 660,
    end: 720,
    result: checkAvailability(660, 720, base.now, false, base.existing),
  };
}

describe("mockExplainAdapter", () => {
  it("explains an available result using only the given facts", async () => {
    const input = availableInput();
    const text = await mockExplainAdapter(input);
    expect(text).toContain(base.roomLabel);
    expect(text).toContain("11:00");
    expect(text).toContain("12:00");
  });

  it("explains an unavailable result and includes the reason", async () => {
    const text = await mockExplainAdapter(unavailableInput());
    expect(text).toContain("cannot be booked");
    expect(text).toContain("Overlaps existing booking 10:00–11:00");
  });
});

describe("explainAvailability — input validation (AC9)", () => {
  it("rejects an empty room label", async () => {
    await expect(
      explainAvailability({ ...unavailableInput(), roomLabel: "   " })
    ).rejects.toThrow(ExplainValidationError);
  });

  it("rejects a room label that is too long", async () => {
    await expect(
      explainAvailability({
        ...unavailableInput(),
        roomLabel: "r".repeat(201),
      })
    ).rejects.toThrow(ExplainValidationError);
  });

  it("rejects malformed minutes (start not before end)", async () => {
    await expect(
      explainAvailability({
        ...unavailableInput(),
        start: 700,
        end: 660,
      })
    ).rejects.toThrow(ExplainValidationError);
  });

  it("rejects non-integer or out-of-range minutes", async () => {
    const bad = [
      { ...unavailableInput(), start: 600.5 },
      { ...unavailableInput(), start: -10 },
      { ...unavailableInput(), end: 1441 },
    ];
    for (const input of bad) {
      await expect(explainAvailability(input)).rejects.toThrow(
        ExplainValidationError
      );
    }
  });

  it("rejects an unavailable result with no reasons", async () => {
    await expect(
      explainAvailability({
        roomLabel: base.roomLabel,
        start: 600,
        end: 660,
        result: { kind: "unavailable", reasons: [] },
      })
    ).rejects.toThrow(ExplainValidationError);
  });

  it("falls back when the adapter receives valid but unavailable input", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => Promise.resolve(""),
    });
    expect(outcome.usedFallback).toBe(true);
  });
});

describe("explainAvailability — output validation (AC8, AC10)", () => {
  it("falls back when the adapter throws", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => Promise.reject(new Error("boom")),
    });
    expect(outcome.usedFallback).toBe(true);
    expect(outcome.explanation).toContain("unavailable for the following reasons");
  });

  it("falls back on timeout", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => new Promise<string>(() => {}),
      timeoutMs: 20,
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation is empty", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => Promise.resolve("   "),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation is too long", async () => {
    const long = "x".repeat(MAX_EXPLANATION_LENGTH + 1);
    const outcome = await explainAvailability(availableInput(), {
      adapter: () => Promise.resolve(long),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation has more than two sentences", async () => {
    const outcome = await explainAvailability(availableInput(), {
      adapter: () =>
        Promise.resolve("One sentence. Two sentences. Three sentences here."),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation contradicts an unavailable result", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => Promise.resolve("The room is available at that time."),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation contradicts an available result", async () => {
    const outcome = await explainAvailability(availableInput(), {
      adapter: () => Promise.resolve("The room is unavailable at that time."),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation contradicts an unavailable result with positive wording (F3)", async () => {
    const outcome = await explainAvailability(unavailableInput(), {
      adapter: () => Promise.resolve("Good news, you can reserve this room."),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation invents booking details (F4)", async () => {
    const outcome = await explainAvailability(availableInput(), {
      adapter: () =>
        Promise.resolve(
          "Library Study Room 201 is free from 11:00 to 12:00 and was booked by Alice."
        ),
    });
    expect(outcome.usedFallback).toBe(true);
  });

  it("falls back when the explanation invents a time not present in the input", async () => {
    const outcome = await explainAvailability(availableInput(), {
      adapter: () =>
        Promise.resolve(
          "Library Study Room 201 is free from 11:00 to 12:00, not 23:59 to 00:01. The check passed."
        ),
    });
    expect(outcome.usedFallback).toBe(true);
  });
});

describe("explainAvailability — valid paths", () => {
  it("returns the adapter text for a valid unavailable explanation", async () => {
    const input = unavailableInput();
    const outcome = await explainAvailability(input);
    expect(outcome.usedFallback).toBe(false);
    expect(outcome.explanation).toContain("cannot be booked");
    expect(outcome.explanation.length).toBeLessThanOrEqual(MAX_EXPLANATION_LENGTH);
  });

  it("returns the adapter text for a valid available explanation", async () => {
    const outcome = await explainAvailability(availableInput());
    expect(outcome.usedFallback).toBe(false);
    expect(outcome.explanation).toContain("is free");
  });

  it("keeps a reason-quoted time while rejecting an invented one", async () => {
    const outcome = await explainAvailability(unavailableInput());
    expect(outcome.explanation).toContain("10:00");
    expect(outcome.usedFallback).toBe(false);
  });

  it("still accepts a valid mockExplainAdapter explanation for each kind", async () => {
    const unavailable = await explainAvailability(unavailableInput());
    expect(unavailable.usedFallback).toBe(false);
    const available = await explainAvailability(availableInput());
    expect(available.usedFallback).toBe(false);
  });
});

describe("buildFallback", () => {
  it("returns the standard sentence for an available result", () => {
    expect(buildFallback({ kind: "available" })).toBe(FALLBACK_AVAILABLE);
  });

  it("builds the fallback from result.reasons", () => {
    const text = buildFallback({
      kind: "unavailable",
      reasons: ["The room is blocked."],
    });
    expect(text).toContain("unavailable for the following reasons");
    expect(text).toContain("The room is blocked.");
  });
});
