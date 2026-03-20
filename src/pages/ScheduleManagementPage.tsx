import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSchedules, useCreateSchedule, useDeleteSchedule } from '@/hooks/useSchedule'
import { useUsers } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, CalendarClock } from 'lucide-react'
import type { Modality } from '@/types'
import { useTranslation } from 'react-i18next'

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const scheduleSchema = z.object({
  radiologist_id: z.string().min(1, 'Radiologist is required'),
  day_of_week: z.coerce.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  slot_duration_minutes: z.coerce.number().min(5, 'Minimum 5 minutes').max(480),
  modality: z.enum(['XR', 'CT', 'US', 'MRI', 'MAMMO', '']).optional(),
})

type ScheduleFormData = z.infer<typeof scheduleSchema>

export function ScheduleManagementPage() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [filterRadiologistId, setFilterRadiologistId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: schedules, isLoading, isError } = useSchedules(
    filterRadiologistId ? { radiologist_id: filterRadiologistId } : undefined
  )
  const { data: users } = useUsers()
  const createSchedule = useCreateSchedule()
  const deleteSchedule = useDeleteSchedule()

  const radiologists = users?.filter((u) => u.role === 'radiologist' && u.is_active) ?? []

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      radiologist_id: '',
      day_of_week: 0,
      start_time: '08:00',
      end_time: '16:00',
      slot_duration_minutes: 30,
      modality: '',
    },
  })

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      await createSchedule.mutateAsync({
        radiologist_id: data.radiologist_id,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        slot_duration_minutes: data.slot_duration_minutes,
        modality: (data.modality as Modality) || undefined,
      })
      toast({ title: t('schedule.scheduleAdded'), description: t('schedule.scheduleAddedDesc') })
      form.reset({
        radiologist_id: data.radiologist_id,
        day_of_week: 0,
        start_time: '08:00',
        end_time: '16:00',
        slot_duration_minutes: 30,
        modality: '',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('schedule.failedToAddSchedule'),
        description: getErrorMessage(error),
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSchedule.mutateAsync(deleteTarget)
      toast({ title: t('schedule.scheduleRemoved'), description: t('schedule.scheduleRemovedDesc') })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('schedule.deleteFailed'),
        description: getErrorMessage(error),
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const getRadiologistName = (id: string) =>
    users?.find((u) => u.id === id)?.full_name ?? id.slice(0, 8) + '…'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t('schedule.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('schedule.subtitle')}
          </p>
        </div>
      </div>

      {/* ── Add availability window ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> {t('schedule.addAvailabilityWindow')}
          </CardTitle>
          <CardDescription>
            {t('schedule.addAvailabilityDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Radiologist */}
              <div className="space-y-2">
                <Label>{t('schedule.radiologist')} *</Label>
                <Select
                  value={form.watch('radiologist_id')}
                  onValueChange={(v) => form.setValue('radiologist_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedule.selectRadiologist')} />
                  </SelectTrigger>
                  <SelectContent>
                    {radiologists.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.radiologist_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.radiologist_id.message}</p>
                )}
              </div>

              {/* Day of week */}
              <div className="space-y-2">
                <Label>{t('schedule.dayOfWeek')} *</Label>
                <Select
                  value={String(form.watch('day_of_week'))}
                  onValueChange={(v) => form.setValue('day_of_week', Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_KEYS.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{t(`schedule.${day}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modality (optional) */}
              <div className="space-y-2">
                <Label>{t('schedule.modality')}</Label>
                <Select
                  value={form.watch('modality') || '__none__'}
                  onValueChange={(v) => form.setValue('modality', v === '__none__' ? '' : v as Modality)}
                >
                  <SelectTrigger><SelectValue placeholder={t('schedule.allModalities')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('schedule.allModalities')}</SelectItem>
                    <SelectItem value="XR">{t('modalities.XR')}</SelectItem>
                    <SelectItem value="CT">{t('modalities.CT')}</SelectItem>
                    <SelectItem value="US">{t('modalities.US')}</SelectItem>
                    <SelectItem value="MRI">{t('modalities.MRI')}</SelectItem>
                    <SelectItem value="MAMMO">{t('modalities.MAMMO')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start time */}
              <div className="space-y-2">
                <Label>{t('schedule.startTime')} *</Label>
                <Input type="time" {...form.register('start_time')} />
                {form.formState.errors.start_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
                )}
              </div>

              {/* End time */}
              <div className="space-y-2">
                <Label>{t('schedule.endTime')} *</Label>
                <Input type="time" {...form.register('end_time')} />
                {form.formState.errors.end_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.end_time.message}</p>
                )}
              </div>

              {/* Slot duration */}
              <div className="space-y-2">
                <Label>{t('schedule.slotDuration')} *</Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  {...form.register('slot_duration_minutes')}
                />
                {form.formState.errors.slot_duration_minutes && (
                  <p className="text-sm text-destructive">{form.formState.errors.slot_duration_minutes.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending ? t('common.saving') : t('schedule.addAvailabilityWindow')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Existing schedules ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('schedule.activeTemplates')}</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">{t('schedule.filterByRadiologist')}</Label>
              <Select
                value={filterRadiologistId || '__all__'}
                onValueChange={(v) => setFilterRadiologistId(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('schedule.allRadiologists')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('schedule.allRadiologists')}</SelectItem>
                  {radiologists.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterRadiologistId && (
                <Button variant="ghost" size="sm" onClick={() => setFilterRadiologistId('')}>
                  {t('common.clear')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text={t('schedule.loadingSchedules')} />
          ) : isError ? (
            <ErrorAlert message={t('schedule.failedToLoadSchedules')} />
          ) : !schedules || schedules.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('schedule.noTemplatesFound')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('schedule.radiologist')}</TableHead>
                  <TableHead>{t('schedule.day')}</TableHead>
                  <TableHead>{t('schedule.hours')}</TableHead>
                  <TableHead>{t('schedule.slotDurationCol')}</TableHead>
                  <TableHead>{t('schedule.modalityCol')}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.radiologist?.full_name ?? getRadiologistName(s.radiologist_id)}
                    </TableCell>
                    <TableCell>{t(`schedule.${DAY_KEYS[s.day_of_week]}`)}</TableCell>
                    <TableCell>
                      {s.start_time} – {s.end_time}
                    </TableCell>
                    <TableCell>{s.slot_duration_minutes} min</TableCell>
                    <TableCell>
                      {s.modality ? (
                        <Badge variant="secondary">{s.modality}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t('common.all')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(s.id)}
                        title={t('schedule.removeAvailabilityWindow')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('schedule.removeAvailabilityWindow')}
        message={t('schedule.removeAvailabilityMsg')}
        confirmLabel={t('common.remove')}
        onConfirm={handleDelete}
        isLoading={deleteSchedule.isPending}
      />
    </div>
  )
}
