export interface ExclusiveDateRange {
  start_at: string
  end_at: string
}

function parseDateInput(dateStr: string): { year: number; monthIndex: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)

  if (!match) {
    throw new Error(`Invalid date input: ${dateStr}`)
  }

  const [, year, month, day] = match

  return {
    year: Number(year),
    monthIndex: Number(month) - 1,
    day: Number(day),
  }
}

export function toLocalDateStartIso(dateStr: string): string {
  const { year, monthIndex, day } = parseDateInput(dateStr)

  return new Date(year, monthIndex, day).toISOString()
}

export function toNextLocalDateStartIso(dateStr: string): string {
  const { year, monthIndex, day } = parseDateInput(dateStr)

  return new Date(year, monthIndex, day + 1).toISOString()
}

export function buildExclusiveLocalDateRange(startDate: string, endDate: string): ExclusiveDateRange {
  return {
    start_at: toLocalDateStartIso(startDate),
    end_at: toNextLocalDateStartIso(endDate),
  }
}
