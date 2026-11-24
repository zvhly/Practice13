# Project memory

## Product intent & audience

- Smart Campus availability checker for campus room/booking checks.
- Newly added optional “Explain availability” feature: generates a short natural-language explanation of an availability result on demand, without affecting booking logic or status.
- Audience: users checking room availability who want a human-readable summary; explanation is explicitly non-authoritative and not a booking confirmation.

## Brand personality & voice

- Practical, safety-conscious, transparent. Explanations are short and factual, with clear disclaimers that generated text is not a booking confirmation.

## Visual design & UX direction

- React + Vite + Tailwind CSS, Lucide React icons, `@/` path alias to `src/`.
- Explanation shown in a separate box labelled “Generated explanation — not a booking confirmation”, visually distinct from Available/Unavailable status (dashed border).
- Status panel (colored Available/Unavailable) must remain visually and logically separate from explanation.
- Responsive UI feedback on desktop and mobile: spinner while explaining, clear/reset explanation when inputs change.
- Fallback explanation noted in UI when used.

## Decisions, constraints & rationale

- `checkAvailability` in `src/availability.ts` is authoritative and must not be modified; explanation never decides or changes availability/bookings.
- Preserve AC1–AC6 and existing tests (13 original tests).
- Explanation adapter implemented as a mock in `src/explain.ts`: no real LLM/network calls; uses only provided facts (roomLabel, start, end, result).
- Input validation: reject empty, malformed, or overly long input.
- Output validation: non-empty, ≤2 sentences, length limit, must agree with `result.kind`, no invented times/details.
- Safe fallback on adapter error/timeout/invalid output: built from `result.reasons`, or “This time slot is available.” for available results.
- No login, backend, database, real personal data, external services, API keys, or fixture mutation; no unrelated refactors.
- Tests added in `src/explain.test.ts` (21 new tests). Total: 34 passing.
- Patterns used: (1) Adapter + validate-at-the-boundary (swappable untrusted source, all I/O checked before display); (2) Graceful degradation via fallback (all failure paths resolve to reasons-based fallback, UI never crashes/blanks).

## Open questions & assumptions

- Assumed HH:MM time format for explanation text construction.
- Assumed future real adapter can be injected behind same validation boundary without UI/logic changes.
- No formal spec for exact length cap beyond “overly long”; enforced with reasonable internal limits.