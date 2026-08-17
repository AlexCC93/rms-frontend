import { describe, expect, it } from 'vitest'
import { canAccessReports, canEditReport, canFinalizeReport } from './roleGuard'

describe('report role permissions', () => {
  it('allows administrators to view reports without modifying them', () => {
    expect(canAccessReports('admin')).toBe(true)
    expect(canEditReport('admin')).toBe(false)
    expect(canFinalizeReport('admin')).toBe(false)
  })

  it('allows radiologists to view, edit, and finalize reports', () => {
    expect(canAccessReports('radiologist')).toBe(true)
    expect(canEditReport('radiologist')).toBe(true)
    expect(canFinalizeReport('radiologist')).toBe(true)
  })

  it('does not grant report access to staff', () => {
    expect(canAccessReports('staff')).toBe(false)
    expect(canEditReport('staff')).toBe(false)
    expect(canFinalizeReport('staff')).toBe(false)
  })
})
