## Project
Smart Campus room availability checker; one room, fictional booking data, fixed current time.
## Project Structure
- src/App.tsx: React user interface.
- src/availability.ts: pure booking rules.
- src/availability.test.ts: availability regression tests.
## Acceptance Criteria (must be preserved)
- AC1: Reject start >= end and requests in the past.
- AC2: Enforce the maximum duration of 120 minutes.
- AC3: Reject a blocked room.
- AC4: Reject overlaps; allow bookings that only touch at endpoints.
- AC5: Return Available / Unavailable without changing booking data.
- AC6: Preserve clear UI feedback on desktop and mobile.
## Constraints
Preserve AC1-AC6 and the existing UI. No backend, login, database, or booking
creation. No secrets or API keys in code or files. No external deployments or
external services. Do not add or use @supabase/supabase-js.
## Engineering Rules
Prefer pure functions and minimal changes. Use at most two justified patterns and
name them in the change summary. Do not mutate booking fixtures. Keep responsive
UI feedback. Do not refactor unrelated code.
## Commands
- Tests: npm test
- Type check: npm run typecheck
- Lint: npm run lint
- Build: npm run build
## Forbidden Actions
Do not delete tests, weaken assertions, change the fixed current time, publish or
deploy, or merge changes. Do not edit files outside the requested scope.
## Verification and Review
Run the tests, typecheck and build before proposing acceptance, and report real
command output. Report changed files, rationale, commands, results and evidence.
A human must review the diff and approve before any change is accepted.
