import { useCallback, useMemo, useState } from "react";
import {
  Clock,
  DoorOpen,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Info,
  Building2,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  checkAvailability,
  labelToMinutes,
  minutesToLabel,
  type Booking,
  type Result,
} from "@/availability";
import { explainAvailability, type ExplainOutcome } from "@/explain";

const ROOM = {
  name: "Library Study Room 201",
  building: "Central Library · Floor 2",
  capacity: 8,
};

const NOW = 540;
const EXISTING: Booking[] = [{ start: 600, end: 660 }];

export default function App() {
  const [startLabel, setStartLabel] = useState("");
  const [endLabel, setEndLabel] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [explanation, setExplanation] = useState<ExplainOutcome | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);

  const startMin = useMemo(
    () => (startLabel ? labelToMinutes(startLabel) : null),
    [startLabel]
  );
  const endMin = useMemo(
    () => (endLabel ? labelToMinutes(endLabel) : null),
    [endLabel]
  );

  const inputValid =
    startMin !== null &&
    endMin !== null &&
    startMin >= 0 &&
    startMin < endMin &&
    endMin <= 1440;

  function handleCheck() {
    if (startMin === null || endMin === null) {
      setResult({
        kind: "unavailable",
        reasons: ["Please enter valid start and end times."],
      });
      return;
    }
    setExplanation(null);
    setResult(checkAvailability(startMin, endMin, NOW, blocked, EXISTING));
  }

  const handleExplain = useCallback(async () => {
    if (!result) return;
    setExplainLoading(true);
    try {
      const outcome = await explainAvailability({
        roomLabel: ROOM.name,
        start: startMin!,
        end: endMin!,
        result,
      });
      setExplanation(outcome);
    } finally {
      setExplainLoading(false);
    }
  }, [result, startMin, endMin]);

  function handleReset() {
    setStartLabel("");
    setEndLabel("");
    setResult(null);
    setExplanation(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-teal-600">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Smart Campus
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Room Availability Checker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Prototype v1 · Check whether a room is free for your requested time.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-teal-50 p-2.5 text-teal-600">
                <DoorOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {ROOM.name}
                </h2>
                <p className="text-sm text-slate-500">{ROOM.building}</p>
                <p className="text-sm text-slate-500">
                  Capacity: {ROOM.capacity} people
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                blocked
                  ? "bg-red-50 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {blocked ? "Blocked" : "Operational"}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-700">
              Room blocked
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={blocked}
              aria-label="Room blocked"
              onClick={() => {
                setBlocked((b) => !b);
                setResult(null);
                setExplanation(null);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                blocked ? "bg-red-500" : "bg-slate-300"
              }`
            }
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  blocked ? "translate-x-5" : "translate-x-0.5"
                }`
              }
              />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoTile
              icon={<Clock className="h-4 w-4" />}
              label="Current time"
              value={minutesToLabel(NOW)}
              hint={`${NOW} min after midnight`}
            />
            <InfoTile
              icon={<CalendarClock className="h-4 w-4" />}
              label="Existing bookings"
              value={
                EXISTING.length === 0
                  ? "None"
                  : EXISTING.map((b) => `${minutesToLabel(b.start)}–${minutesToLabel(b.end)}`).join(", ")
              }
              hint={`${EXISTING.length} booking${EXISTING.length === 1 ? "" : "s"}`}
            />
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Check a time
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Enter a start and end time (24-hour). Max duration 120 minutes.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TimeField
              id="start"
              label="Start time"
              value={startLabel}
              onChange={(v) => {
                setStartLabel(v);
                setResult(null);
                setExplanation(null);
              }}
            />
            <TimeField
              id="end"
              label="End time"
              value={endLabel}
              onChange={(v) => {
                setEndLabel(v);
                setResult(null);
                setExplanation(null);
              }}
            />
          </div>

          {startMin !== null &&
            endMin !== null &&
            startMin < endMin && (
              <p className="mt-3 text-sm text-slate-500">
                Requested duration:{" "}
                <span className="font-medium text-slate-700">
                  {endMin - startMin} minutes
                </span>
              </p>
            )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCheck}
              disabled={inputValid === false}
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Check availability
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Clear
            </button>
          </div>
          {inputValid === false && startLabel && endLabel && (
            <p className="mt-3 text-sm text-amber-600">
              Enter a valid range where start is before end.
            </p>
          )}
        </section>

        {result && (
          <>
            <section
              className={`mt-5 rounded-2xl border p-5 shadow-sm sm:p-6 ${
                result.kind === "available"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.kind === "available" ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                )}
                <div>
                  <h3
                    className={`text-lg font-bold ${
                      result.kind === "available"
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {result.kind === "available"
                      ? "Available"
                      : "Unavailable"}
                  </h3>
                  {result.kind === "available" ? (
                    <p className="mt-1 text-sm text-emerald-700">
                      The room is free for your requested time. This is an
                      availability check only — no booking has been made.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-red-700">
                      {result.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-300 border-dashed bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-slate-500">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Generated explanation — not a booking confirmation
                </span>
              </div>

              {explanation && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700"
                >
                  {explanation.explanation}
                  {explanation.usedFallback && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      The generated text could not be shown; this is the standard
                      fallback explanation.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleExplain}
                disabled={explainLoading || startMin === null || endMin === null}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {explainLoading ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
                    />
                    Explaining…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Explain availability
                  </>
                )}
              </button>
            </section>
          </>
        )}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 sm:p-6">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="h-4 w-4" />
            <span className="font-semibold">How it works</span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Times are checked as minutes after midnight (0–1440).</li>
            <li>Start must be after the current time and before end.</li>
            <li>Maximum duration is 120 minutes (exactly 120 is allowed).</li>
            <li>
              Touching bookings (e.g. ending and starting at the same minute) do
              not overlap.
            </li>
            <li>This page only checks availability — it does not book.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </label>
  );
}
