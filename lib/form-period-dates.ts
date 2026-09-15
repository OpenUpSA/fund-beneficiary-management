/** Store the calendar day selected in a browser without its timezone offset. */
export function serializeFormPeriodDate(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString()
}

/** Restore date-only values to the local calendar used by the date picker. */
export function formPeriodDateForPicker(value?: Date | string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  }

  // Legacy timestamps used local midnight. Preserve their existing picker display
  // so re-selecting the intended day can correct them without guessing an offset.
  return date
}

const DAY_MS = 24 * 60 * 60 * 1000
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000

export type NormalizeRule = "already-midnight" | "local-midnight" | "end-of-day" | "assumed-sast"

/**
 * Map a legacy timestamp to the UTC midnight of the calendar day it was meant
 * to represent. Used by the one-off normalisation script for rows written
 * before serializeFormPeriodDate existed. Patterns seen in production data:
 *   - 22:00:00.000Z / 18:30:00.000Z  → browser local midnight (SAST / IST),
 *     so the intended day is the *next* UTC day
 *   - hh:59:59.999Z                  → end-of-day marker from the schedule
 *     generator; the intended day is the UTC day it falls in
 *   - anything else                  → the picker kept the wall-clock time of
 *     the moment the form was created; assume the South African calendar day
 */
export function normalizeToUtcDay(date: Date): { date: Date; rule: NormalizeRule } {
  const ms = date.getTime()
  const dayStart = Math.floor(ms / DAY_MS) * DAY_MS
  const tod = ms - dayStart
  if (tod === 0) return { date, rule: "already-midnight" }

  const isLocalMidnight = tod === 22 * 60 * 60 * 1000 || tod === 18.5 * 60 * 60 * 1000
  if (isLocalMidnight) return { date: new Date(dayStart + DAY_MS), rule: "local-midnight" }

  const isEndOfDay =
    date.getUTCMinutes() === 59 && date.getUTCSeconds() === 59 && date.getUTCMilliseconds() === 999
  if (isEndOfDay) return { date: new Date(dayStart), rule: "end-of-day" }

  const sastDayStart = Math.floor((ms + SAST_OFFSET_MS) / DAY_MS) * DAY_MS
  return { date: new Date(sastDayStart), rule: "assumed-sast" }
}
