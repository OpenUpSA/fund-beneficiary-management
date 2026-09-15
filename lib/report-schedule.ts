import { ReportFrequency } from "@prisma/client"

export interface PeriodInfo {
  year: number
  period: number
  periodStart: Date
  periodEnd: Date
  availableDate: Date
  dueDate: Date
}

export interface ScheduleConfig {
  frequency: ReportFrequency
  availableDaysBefore: number
  dueDaysAfterPeriodEnd: number
}

/**
 * Get the number of periods per year for a given frequency
 */
export function getPeriodsPerYear(frequency: ReportFrequency): number {
  switch (frequency) {
    case "MONTHLY":
      return 12
    case "QUARTERLY":
      return 4
    case "BIANNUALLY":
      return 2
    case "ANNUALLY":
      return 1
    default:
      return 4
  }
}

/**
 * Get period label for display
 */
export function getPeriodLabel(frequency: ReportFrequency, period: number): string {
  switch (frequency) {
    case "MONTHLY":
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return months[period - 1] || `Month ${period}`
    case "QUARTERLY":
      return `Q${period}`
    case "BIANNUALLY":
      return period === 1 ? "H1 (Jan-Jun)" : "H2 (Jul-Dec)"
    case "ANNUALLY":
      return "Full Year"
    default:
      return `Period ${period}`
  }
}

// Period boundaries are calendar days stored at UTC midnight (the same
// convention as serializeFormPeriodDate), so they display and count the same
// way regardless of the server or browser timezone. periodEnd is the last day
// of the period, not an end-of-day timestamp.
const utcDay = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month, day))

/**
 * Get period date range for a given frequency, year, and period number
 */
export function getPeriodDateRange(frequency: ReportFrequency, year: number, period: number): { start: Date; end: Date } {
  switch (frequency) {
    case "MONTHLY":
      return { start: utcDay(year, period - 1, 1), end: utcDay(year, period, 0) }

    case "QUARTERLY":
      const quarterStartMonth = (period - 1) * 3
      return { start: utcDay(year, quarterStartMonth, 1), end: utcDay(year, quarterStartMonth + 3, 0) }

    case "BIANNUALLY":
      if (period === 1) {
        return { start: utcDay(year, 0, 1), end: utcDay(year, 6, 0) }
      } else {
        return { start: utcDay(year, 6, 1), end: utcDay(year, 12, 0) }
      }

    case "ANNUALLY":
    default:
      return { start: utcDay(year, 0, 1), end: utcDay(year, 12, 0) }
  }
}

/**
 * Add days to a date (UTC arithmetic so UTC-midnight days stay at midnight)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

/**
 * Calculate available date based on period end and days before
 */
export function calculateAvailableDate(periodEnd: Date, daysBefore: number): Date {
  return addDays(periodEnd, -daysBefore)
}

/**
 * Calculate due date based on period end and days after (can be negative for before)
 */
export function calculateDueDate(periodEnd: Date, daysAfter: number): Date {
  return addDays(periodEnd, daysAfter)
}

/**
 * Generate all period schedules for a given year and config
 */
export function generatePeriodSchedules(year: number, config: ScheduleConfig): PeriodInfo[] {
  const periodsCount = getPeriodsPerYear(config.frequency)
  const schedules: PeriodInfo[] = []

  for (let period = 1; period <= periodsCount; period++) {
    const { start, end } = getPeriodDateRange(config.frequency, year, period)
    
    schedules.push({
      year,
      period,
      periodStart: start,
      periodEnd: end,
      availableDate: calculateAvailableDate(end, config.availableDaysBefore),
      dueDate: calculateDueDate(end, config.dueDaysAfterPeriodEnd),
    })
  }

  return schedules
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Get frequency display label
 */
export function getFrequencyLabel(frequency: ReportFrequency): string {
  switch (frequency) {
    case "MONTHLY":
      return "Monthly"
    case "QUARTERLY":
      return "Quarterly"
    case "BIANNUALLY":
      return "Every 6 months"
    case "ANNUALLY":
      return "Annually"
    default:
      return frequency
  }
}
