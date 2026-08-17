import { describe, expect, it } from 'vitest'
import { createUserSchema, editUserSchema, passwordResetSchema } from './UserManagementPage'
import { hasRole } from '@/utils/roleGuard'

const t = (key: string) => key

describe('admin user management rules', () => {
  it('allows only administrators through the page role rule', () => {
    expect(hasRole('admin', ['admin'])).toBe(true)
    expect(hasRole('radiologist', ['admin'])).toBe(false)
    expect(hasRole('staff', ['admin'])).toBe(false)
  })

  it('requires a full name for staff and radiologists', () => {
    const base = { email: 'user@example.com', password: 'password1', password_confirmation: 'password1' }
    expect(createUserSchema(t).safeParse({ ...base, full_name: '', role: 'staff' }).success).toBe(false)
    expect(createUserSchema(t).safeParse({ ...base, full_name: '', role: 'radiologist' }).success).toBe(false)
    expect(createUserSchema(t).safeParse({ ...base, full_name: '', role: 'admin' }).success).toBe(true)
  })

  it('requires matching passwords of at least eight characters', () => {
    const schema = passwordResetSchema(t)
    expect(schema.safeParse({ new_password: 'short', password_confirmation: 'short' }).success).toBe(false)
    expect(schema.safeParse({ new_password: 'password1', password_confirmation: 'password2' }).success).toBe(false)
    expect(schema.safeParse({ new_password: 'password1', password_confirmation: 'password1' }).success).toBe(true)
  })

  it('validates names after role changes while editing', () => {
    expect(editUserSchema(t).safeParse({ email: 'user@example.com', full_name: '', role: 'staff', is_active: true }).success).toBe(false)
  })
})
