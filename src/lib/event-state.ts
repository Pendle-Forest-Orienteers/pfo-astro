// Helpers for deciding whether an event is upcoming or has moved to results.
//
// Rules agreed with the committee:
//   1. If the event has a startTime, the event moves to "Results" once that
//      start time has passed on the event date.
//   2. If the event has no startTime, it moves to "Results" at 8:00pm on the
//      event date.
//
// This keeps the listing accurate the moment an event has actually started,
// rather than waiting for the calendar day to flip over.

/** Parses a free-form startTime string like "7:00pm", "10:30am", "18:30",
 *  "18:30pm", "7pm", "10.30am" into { hours, minutes }. Returns null if
 *  the string is empty or unparseable. */
export function parseStartTime(raw: unknown): { hours: number; minutes: number } | null {
  if (typeof raw !== 'string') return null;
  const s = raw.toLowerCase().trim();
  if (!s) return null;
  const ampm = s.includes('am') ? 'am' : s.includes('pm') ? 'pm' : null;
  const stripped = s.replace(/(am|pm)/g, '').replace(/\./g, ':').trim();
  const [hStr, mStr] = stripped.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return null;
  const m = mStr ? parseInt(mStr, 10) : 0;
  let hours = h;
  // Only adjust for am/pm if the hour is in the 12-hour range. If someone
  // writes "18:30pm" we treat the 18 as already 24-hour and ignore the pm.
  if (h < 13) {
    if (ampm === 'pm' && h < 12) hours = h + 12;
    if (ampm === 'am' && h === 12) hours = 0;
  }
  return { hours, minutes: isNaN(m) ? 0 : m };
}

/** Returns the precise moment an event moves from "upcoming" to "results". */
export function eventTransitionTime(event: { date: Date; startTime?: string }): Date {
  const d = new Date(event.date);
  const t = parseStartTime(event.startTime);
  if (t) {
    d.setHours(t.hours, t.minutes, 0, 0);
  } else {
    d.setHours(20, 0, 0, 0); // 8:00pm fallback
  }
  return d;
}

/** True if the event's transition time is in the past relative to `now`. */
export function isEventPast(event: { date: Date; startTime?: string }, now: Date = new Date()): boolean {
  return now >= eventTransitionTime(event);
}

/** True if the event hasn't yet reached its transition time. */
export function isEventUpcoming(event: { date: Date; startTime?: string }, now: Date = new Date()): boolean {
  return !isEventPast(event, now);
}
