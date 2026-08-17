import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, EyeOff, History, KeyRound, Plus, Search, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  useCreateUser,
  useResetUserPassword,
  useUpdateUser,
  useUserAuditHistory,
  useUsers,
} from '@/hooks/useUsers'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User, UserRole, UserUpdate } from '@/types'

type Translate = (key: string, options?: Record<string, unknown>) => string

export const createUserSchema = (t: Translate) => z.object({
  email: z.string().email(t('users.validation.invalidEmail')),
  full_name: z.string(),
  role: z.enum(['admin', 'radiologist', 'staff']),
  password: z.string().min(8, t('users.validation.passwordLength')),
  password_confirmation: z.string(),
}).superRefine((data, ctx) => {
  if (data.role !== 'admin' && !data.full_name.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['full_name'], message: t('users.validation.nameRequired') })
  }
  if (data.password !== data.password_confirmation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password_confirmation'], message: t('users.validation.passwordsMatch') })
  }
})

export const editUserSchema = (t: Translate) => z.object({
  email: z.string().email(t('users.validation.invalidEmail')),
  full_name: z.string(),
  role: z.enum(['admin', 'radiologist', 'staff']),
  is_active: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.role !== 'admin' && !data.full_name.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['full_name'], message: t('users.validation.nameRequired') })
  }
})

export const passwordResetSchema = (t: Translate) => z.object({
  new_password: z.string().min(8, t('users.validation.passwordLength')),
  password_confirmation: z.string(),
}).refine((data) => data.new_password === data.password_confirmation, {
  path: ['password_confirmation'],
  message: t('users.validation.passwordsMatch'),
})

type CreateForm = z.infer<ReturnType<typeof createUserSchema>>
type EditForm = z.infer<ReturnType<typeof editUserSchema>>
type PasswordForm = z.infer<ReturnType<typeof passwordResetSchema>>

function RoleSelect({ value, onChange, t }: { value: UserRole; onChange: (value: UserRole) => void; t: Translate }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as UserRole)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">{t('users.roles.admin')}</SelectItem>
        <SelectItem value="radiologist">{t('users.roles.radiologist')}</SelectItem>
        <SelectItem value="staff">{t('users.roles.staff')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

function mutationError(error: unknown, t: Translate, finalAdminContext = false) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return t('users.errors.unauthorized')
    if (error.response?.status === 403) return t('users.errors.forbidden')
    if (error.response?.status === 409) {
      return finalAdminContext ? t('users.errors.finalAdmin') : t('users.errors.conflict')
    }
    if (error.response?.status === 422) return t('users.errors.nameRequired')
  }
  return getErrorMessage(error)
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const mutation = useCreateUser()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const form = useForm<CreateForm>({
    resolver: zodResolver(createUserSchema(t)),
    defaultValues: { email: '', full_name: '', role: 'staff', password: '', password_confirmation: '' },
  })
  const close = (next: boolean) => {
    if (!next) {
      form.reset()
      setShowPassword(false)
      setShowPasswordConfirmation(false)
    }
    onOpenChange(next)
  }
  const submit = async (data: CreateForm) => {
    try {
      await mutation.mutateAsync({
        email: data.email,
        full_name: data.full_name.trim() || null,
        role: data.role,
        password: data.password,
      })
      form.reset()
      setShowPassword(false)
      setShowPasswordConfirmation(false)
      onOpenChange(false)
      toast({ title: t('users.toasts.created'), description: t('users.toasts.createdDescription') })
    } catch (error) {
      form.setValue('password', '')
      form.setValue('password_confirmation', '')
      toast({ variant: 'destructive', title: t('users.toasts.createFailed'), description: mutationError(error, t) })
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('users.create.title')}</DialogTitle><DialogDescription>{t('users.create.description')}</DialogDescription></DialogHeader>
        <form id="create-user-form" onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="create-email">{t('users.fields.email')}</Label><Input id="create-email" autoComplete="off" {...form.register('email')} /><FieldError message={form.formState.errors.email?.message} /></div>
          <div className="space-y-2"><Label htmlFor="create-name">{t('users.fields.fullName')}</Label><Input id="create-name" {...form.register('full_name')} /><FieldError message={form.formState.errors.full_name?.message} /></div>
          <div className="space-y-2"><Label>{t('users.fields.role')}</Label><RoleSelect value={form.watch('role')} onChange={(value) => form.setValue('role', value, { shouldValidate: true })} t={t} /></div>
          <div className="space-y-2"><Label htmlFor="create-password">{t('users.fields.password')}</Label><div className="relative"><Input id="create-password" className="pr-10" type={showPassword ? 'text' : 'password'} autoComplete="new-password" {...form.register('password')} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('users.password.hide') : t('users.password.show')} title={showPassword ? t('users.password.hide') : t('users.password.show')}>{showPassword ? <EyeOff /> : <Eye />}</Button></div><FieldError message={form.formState.errors.password?.message} /></div>
          <div className="space-y-2"><Label htmlFor="create-password-confirm">{t('users.fields.confirmPassword')}</Label><div className="relative"><Input id="create-password-confirm" className="pr-10" type={showPasswordConfirmation ? 'text' : 'password'} autoComplete="new-password" {...form.register('password_confirmation')} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPasswordConfirmation((visible) => !visible)} aria-label={showPasswordConfirmation ? t('users.password.hide') : t('users.password.show')} title={showPasswordConfirmation ? t('users.password.hide') : t('users.password.show')}>{showPasswordConfirmation ? <EyeOff /> : <Eye />}</Button></div><FieldError message={form.formState.errors.password_confirmation?.message} /></div>
        </form>
        <DialogFooter><Button variant="outline" onClick={() => close(false)} disabled={mutation.isPending}>{t('common.cancel')}</Button><Button type="submit" form="create-user-form" disabled={mutation.isPending}>{mutation.isPending ? t('common.processing') : t('users.create.submit')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const mutation = useUpdateUser()
  const [pending, setPending] = useState<UserUpdate | null>(null)
  const form = useForm<EditForm>({
    resolver: zodResolver(editUserSchema(t)),
    values: user ? { email: user.email, full_name: user.full_name ?? '', role: user.role, is_active: user.is_active } : undefined,
  })
  if (!user) return null
  const execute = async (data: UserUpdate) => {
    try {
      await mutation.mutateAsync({ id: user.id, data })
      setPending(null)
      onClose()
      toast({ title: t('users.toasts.updated'), description: t('users.toasts.updatedDescription') })
    } catch (error) {
      setPending(null)
      const finalAdminContext = user.role === 'admin' && (data.role !== 'admin' || data.is_active === false)
      toast({ variant: 'destructive', title: t('users.toasts.updateFailed'), description: mutationError(error, t, finalAdminContext) })
    }
  }
  const submit = (data: EditForm) => {
    const update: UserUpdate = { email: data.email, full_name: data.full_name.trim() || null, role: data.role, is_active: data.is_active }
    const privileged = (user.is_active && !data.is_active) ||
      (user.role === 'admin' && data.role !== 'admin') ||
      (user.role !== 'admin' && data.role === 'admin')
    if (privileged) setPending(update)
    else void execute(update)
  }
  const confirmationMessage = pending?.is_active === false
    ? t('users.edit.confirmDeactivate')
    : user.role === 'admin' && pending?.role !== 'admin'
      ? t('users.edit.confirmDemote')
      : t('users.edit.confirmPromote')
  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('users.edit.title')}</DialogTitle><DialogDescription>{t('users.edit.description')}</DialogDescription></DialogHeader>
          <form id="edit-user-form" onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="edit-email">{t('users.fields.email')}</Label><Input id="edit-email" {...form.register('email')} /><FieldError message={form.formState.errors.email?.message} /></div>
            <div className="space-y-2"><Label htmlFor="edit-name">{t('users.fields.fullName')}</Label><Input id="edit-name" {...form.register('full_name')} /><FieldError message={form.formState.errors.full_name?.message} /></div>
            <div className="space-y-2"><Label>{t('users.fields.role')}</Label><RoleSelect value={form.watch('role')} onChange={(value) => form.setValue('role', value, { shouldValidate: true })} t={t} /></div>
            <div className="space-y-2"><Label>{t('users.fields.status')}</Label><Select value={form.watch('is_active') ? 'active' : 'inactive'} onValueChange={(value) => form.setValue('is_active', value === 'active')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t('common.active')}</SelectItem><SelectItem value="inactive">{t('common.inactive')}</SelectItem></SelectContent></Select></div>
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="h-5 w-5 shrink-0" /><span>{t('users.edit.sessionWarning')}</span></div>
          </form>
          <DialogFooter><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>{t('common.cancel')}</Button><Button type="submit" form="edit-user-form" disabled={mutation.isPending}>{mutation.isPending ? t('common.processing') : t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null) }} title={t('users.edit.confirmTitle')} message={confirmationMessage} confirmLabel={t('common.confirm')} variant="destructive" isLoading={mutation.isPending} onConfirm={() => pending && void execute(pending)} />
    </>
  )
}

function PasswordResetDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const mutation = useResetUserPassword()
  const form = useForm<PasswordForm>({ resolver: zodResolver(passwordResetSchema(t)), defaultValues: { new_password: '', password_confirmation: '' } })
  if (!user) return null
  const close = () => { form.reset(); onClose() }
  const submit = async (data: PasswordForm) => {
    try {
      await mutation.mutateAsync({ id: user.id, data: { new_password: data.new_password } })
      close()
      toast({ title: t('users.toasts.passwordReset'), description: t('users.toasts.passwordResetDescription') })
    } catch (error) {
      form.reset()
      toast({ variant: 'destructive', title: t('users.toasts.passwordResetFailed'), description: mutationError(error, t) })
    }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('users.password.title')}</DialogTitle><DialogDescription>{t('users.password.description', { email: user.email })}</DialogDescription></DialogHeader>
        <form id="password-reset-form" onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t('users.password.sessionWarning')}</div>
          <div className="space-y-2"><Label htmlFor="new-password">{t('users.fields.newPassword')}</Label><Input id="new-password" type="password" autoComplete="new-password" {...form.register('new_password')} /><FieldError message={form.formState.errors.new_password?.message} /></div>
          <div className="space-y-2"><Label htmlFor="reset-password-confirm">{t('users.fields.confirmPassword')}</Label><Input id="reset-password-confirm" type="password" autoComplete="new-password" {...form.register('password_confirmation')} /><FieldError message={form.formState.errors.password_confirmation?.message} /></div>
        </form>
        <DialogFooter><Button variant="outline" onClick={close} disabled={mutation.isPending}>{t('common.cancel')}</Button><Button type="submit" form="password-reset-form" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? t('common.processing') : t('users.password.submit')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function safeChanges(changes: Record<string, unknown>) {
  return Object.entries(changes).filter(([key]) => !key.toLowerCase().includes('password'))
}

function AuditDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { t } = useTranslation()
  const query = useUserAuditHistory(user?.id)
  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{t('users.audit.title')}</DialogTitle><DialogDescription>{user?.email}</DialogDescription></DialogHeader>
        {query.isLoading ? <LoadingSpinner text={t('users.audit.loading')} /> : query.error ? <ErrorAlert message={mutationError(query.error, t)} /> : !query.data?.length ? <p className="py-8 text-center text-muted-foreground">{t('users.audit.empty')}</p> : (
          <div className="divide-y rounded-md border">
            {query.data.map((entry) => (
              <div key={entry.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{entry.action}</span><time className="text-sm text-muted-foreground">{format(new Date(entry.timestamp), 'PPp')}</time></div>
                <p className="text-sm text-muted-foreground">{t('users.audit.actor')}: {entry.actor_user_id ?? t('users.audit.system')}</p>
                {safeChanges(entry.changes).length > 0 && <dl className="grid gap-1 text-sm">{safeChanges(entry.changes).map(([field, value]) => <div key={field} className="grid grid-cols-[minmax(7rem,1fr)_2fr] gap-2"><dt className="font-medium">{field.replace(/_/g, ' ')}</dt><dd className="break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>}
                {entry.action.toLowerCase().includes('password') && <p className="text-sm italic text-muted-foreground">{t('users.audit.passwordProtected')}</p>}
              </div>
            ))}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>{t('common.back')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserManagementPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.user)
  const { data: users, isLoading, error } = useUsers()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [auditing, setAuditing] = useState<User | null>(null)
  const filtered = useMemo(() => (users ?? []).filter((user) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || user.email.toLowerCase().includes(term) || (user.full_name ?? '').toLowerCase().includes(term)
    return matchesSearch && (role === 'all' || user.role === role) && (status === 'all' || String(user.is_active) === status)
  }), [users, search, role, status])

  if (isLoading) return <LoadingSpinner text={t('users.loading')} />
  if (error) return <ErrorAlert message={mutationError(error, t)} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold sm:text-3xl">{t('users.title')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('users.subtitle')}</p></div><Button onClick={() => setCreateOpen(true)}><Plus />{t('users.create.action')}</Button></div>
      <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem_12rem]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('users.filters.search')} aria-label={t('users.filters.search')} /></div>
        <Select value={role} onValueChange={setRole}><SelectTrigger aria-label={t('users.filters.role')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('users.filters.allRoles')}</SelectItem><SelectItem value="admin">{t('users.roles.admin')}</SelectItem><SelectItem value="radiologist">{t('users.roles.radiologist')}</SelectItem><SelectItem value="staff">{t('users.roles.staff')}</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label={t('users.filters.status')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('users.filters.allStatuses')}</SelectItem><SelectItem value="true">{t('common.active')}</SelectItem><SelectItem value="false">{t('common.inactive')}</SelectItem></SelectContent></Select>
      </div>
      {!filtered.length ? <div className="rounded-md border border-dashed py-12 text-center"><p className="font-medium">{t('users.empty')}</p><p className="mt-1 text-sm text-muted-foreground">{t('users.emptyDescription')}</p></div> : (
        <>
          <div className="hidden overflow-x-auto rounded-md border bg-white md:block"><Table><TableHeader><TableRow><TableHead>{t('users.fields.fullName')}</TableHead><TableHead>{t('users.fields.email')}</TableHead><TableHead>{t('users.fields.role')}</TableHead><TableHead>{t('users.fields.status')}</TableHead><TableHead>{t('users.fields.createdAt')}</TableHead><TableHead className="text-right">{t('users.fields.actions')}</TableHead></TableRow></TableHeader><TableBody>{filtered.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.full_name || t('common.noData')}{user.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">{t('users.you')}</span>}</TableCell><TableCell>{user.email}</TableCell><TableCell><Badge variant="outline">{t(`users.roles.${user.role}`)}</Badge></TableCell><TableCell><Badge variant="outline" className={user.is_active ? 'border-green-200 bg-green-100 text-green-800' : 'border-gray-200 bg-gray-100 text-gray-700'}>{user.is_active ? t('common.active') : t('common.inactive')}</Badge></TableCell><TableCell>{format(new Date(user.created_at), 'PP')}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title={t('common.edit')} aria-label={t('common.edit')} onClick={() => setEditing(user)}><Edit /></Button><Button size="icon" variant="ghost" title={t('users.password.action')} aria-label={t('users.password.action')} onClick={() => setResetting(user)}><KeyRound /></Button><Button size="icon" variant="ghost" title={t('users.audit.action')} aria-label={t('users.audit.action')} onClick={() => setAuditing(user)}><History /></Button></div></TableCell></TableRow>)}</TableBody></Table></div>
          <div className="grid gap-3 md:hidden">{filtered.map((user) => <article key={user.id} className="rounded-md border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold">{user.full_name || t('common.noData')}</h2><p className="break-all text-sm text-muted-foreground">{user.email}</p></div><Badge variant="outline" className={user.is_active ? 'border-green-200 bg-green-100 text-green-800' : ''}>{user.is_active ? t('common.active') : t('common.inactive')}</Badge></div><div className="mt-3 flex items-center justify-between"><div className="text-sm"><span className="capitalize">{t(`users.roles.${user.role}`)}</span><span className="mx-2 text-muted-foreground">|</span>{format(new Date(user.created_at), 'PP')}</div><div className="flex"><Button size="icon" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(user)}><Edit /></Button><Button size="icon" variant="ghost" aria-label={t('users.password.action')} onClick={() => setResetting(user)}><KeyRound /></Button><Button size="icon" variant="ghost" aria-label={t('users.audit.action')} onClick={() => setAuditing(user)}><History /></Button></div></div></article>)}</div>
        </>
      )}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <PasswordResetDialog user={resetting} onClose={() => setResetting(null)} />
      <AuditDialog user={auditing} onClose={() => setAuditing(null)} />
    </div>
  )
}
