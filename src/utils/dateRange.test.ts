import { afterAll, describe, expect, it } from 'vitest'

import { buildExclusiveLocalDateRange } from './dateRange'

declare const process: {
  env: {
    TZ?: string
  }
}

const originalTimezone = process.env.TZ

afterAll(() => {
  process.env.TZ = originalTimezone
})

describe('buildExclusiveLocalDateRange', () => {
  it.each([
    {
      timezone: 'America/New_York',
      expectedStartAt: '2026-07-09T04:00:00.000Z',
      expectedEndAt: '2026-07-10T04:00:00.000Z',
    },
    {
      timezone: 'Asia/Tokyo',
      expectedStartAt: '2026-07-08T15:00:00.000Z',
      expectedEndAt: '2026-07-09T15:00:00.000Z',
    },
  ])(
    'builds a full single-day exclusive range in $timezone',
    ({ timezone, expectedStartAt, expectedEndAt }) => {
      process.env.TZ = timezone

      expect(buildExclusiveLocalDateRange('2026-07-09', '2026-07-09')).toEqual({
        start_at: expectedStartAt,
        end_at: expectedEndAt,
      })
    },
  )
})
