Task #02. Define the Feature

User story. As a student, I want a short explanation of room availability so I understand the decision.

Scope. The feature is optional. The existing deterministic availability checker (src/availability.ts) remains the only source of truth. The explanation never decides availability and never creates or changes bookings.

Inputs
Field	Type	Source
roomLabel	string	existing room data
start, end	numbers (minutes after midnight), shown as HH:MM via minutesToLabel	student’s selected time
result.kind	"available" or "unavailable"	result of checkAvailability
result.reasons	string[] (only when unavailable)	result of checkAvailability


Only this minimal context is passed to the adapter. No personal data is used.

Output
{ explanation: string }
at most two sentences, plain text, respectful tone;
length and format are validated before display;
shown in a separate box labelled as generated.
Acceptance criteria (new)
AC7: Existing availability and overlap rules (AC1–AC6) remain unchanged, and all existing tests still pass.
AC8: The explanation agrees with the deterministic result and contains no invented booking details.
AC9: Empty, malformed or overly long input is rejected.
AC10: An adapter error, timeout or invalid output produces a safe fallback explanation.
AC11: A user can distinguish the generated explanation from the confirmed booking status.
Failure behavior

If the adapter fails, times out or returns invalid output (empty, too long, more than two sentences, contradicts the decision), the app shows a standard fallback text built from result.reasons (or “This time slot is available.” for an available result). The Available / Unavailable status and the booking data stay unchanged, and the UI shows no crash or blank screen.

Request flow
Student input
   │
   ▼
Input validation (empty / malformed / too long → rejected)
   │
   ▼
checkAvailability()  ◄── deterministic rule engine, DECIDES availability
   │  │  { kind, reasons }
   ▼
Explanation adapter (mock) ── only EXPLAINS the given result
   │
   ▼
Output validation (length, format, agrees with decision)
   │          └── invalid / error / timeout → fallback text
   ▼
UI: confirmed status (from rule engine)
    + labelled "Generated explanation" (separate box)

Trust boundary. User input and adapter output are treated as untrusted data. The deterministic checker, not the LLM, decides availability. There are no API keys in the client code, and the first version uses a clearly labelled mock adapter.