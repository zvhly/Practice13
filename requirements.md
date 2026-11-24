Task #02. Specify the common contract

Goal. Define one set of requirements, inputs, outputs and test cases that both
solutions (code-based and low-code) must satisfy, before implementing the
low-code version.

User story. As a student, I want to check whether one fictional campus room is
free for a start time and duration, so I know whether I could book it. The tool
only checks availability; it never creates or changes bookings.

Shared acceptance criteria

| ID  | Criterion |
|-----|-----------|
| AC1 | The start time must be in the future (strictly later than the current time). |
| AC2 | The duration must be greater than zero and at most 120 minutes. |
| AC3 | Overlapping bookings are unavailable; touching at an endpoint is not an overlap. |
| AC4 | A blocked room is unavailable. |
| AC5 | A clear decision is displayed without changing existing bookings. |
| AC6 | Invalid input receives understandable feedback. |

Inputs
- Start time (HH:MM).
- Duration in minutes. In the existing project the user enters start and end
  time, so duration = end - start.
- Blocked flag (room blocked: yes/no).
- Fictional bookings: one booking, 10:00-11:00.
- Current time (fixed): 09:00.

Outputs
- Availability decision: Available or Unavailable.
- Reasons: a list of human-readable messages explaining why the room is
  unavailable (empty when available).
- Visible message in the interface.

Note. The lecture slide describes the output as "availability boolean, reason
code and visible message". The existing project returns a decision (kind) and
text reasons instead of numeric reason codes, and takes start/end instead of
start/duration. The booking rules were not changed to favor either approach;
the low-code version uses the same mapping and the same fixtures.

Common test inputs (prepared before implementation)

| ID | Input                                   | Expected result                  |
|----|-----------------------------------------|----------------------------------|
| T1 | 12:00-13:00, room not blocked           | Available                        |
| T2 | 10:30-11:30 (overlaps 10:00-11:00)      | Unavailable (overlap)            |
| T3 | 12:00-13:00, room blocked               | Unavailable (blocked)            |
| T4 | 12:00-12:00 (duration 0)                | Unavailable (validation error)   |
| T5 | 12:00-14:01 (duration 121 minutes)      | Unavailable (validation error)   |
| T6 | 08:20-09:20 (starts before 09:00)       | Unavailable (validation error)   |
| T7 | 11:00-12:00 (adjacent to the booking)   | Available                        |
| T8 | after running all checks                | Booking data unchanged           |

Conclusion. The contract, acceptance criteria and test cases are fixed in one
document and will be used unchanged for both the code-based and the low-code
implementation.