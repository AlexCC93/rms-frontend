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

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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
      toast({ title: 'Schedule added', description: 'Availability window created successfully.' })
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
        title: 'Failed to add schedule',
        description: getErrorMessage(error),
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSchedule.mutateAsync(deleteTarget)
      toast({ title: 'Schedule removed', description: 'Availability window deactivated.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
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
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage radiologist weekly availability templates
          </p>
        </div>
      </div>

      {/* ── Add availability window ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Availability Window
          </CardTitle>
          <CardDescription>
            Define a recurring weekly time block for a radiologist. Each block generates
            appointment slots of the specified duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Radiologist */}
              <div className="space-y-2">
                <Label>Radiologist *</Label>
                <Select
                  value={form.watch('radiologist_id')}
                  onValueChange={(v) => form.setValue('radiologist_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select radiologist" />
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
                <Label>Day of Week *</Label>
                <Select
                  value={String(form.watch('day_of_week'))}
                  onValueChange={(v) => form.setValue('day_of_week', Number(v))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modality (optional) */}
              <div className="space-y-2">
                <Label>Modality (optional)</Label>
                <Select
                  value={form.watch('modality') || '__none__'}
                  onValueChange={(v) => form.setValue('modality', v === '__none__' ? '' : v as Modality)}
                >
                  <SelectTrigger><SelectValue placeholder="All modalities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All modalities</SelectItem>
                    <SelectItem value="XR">X-Ray (XR)</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="US">Ultrasound (US)</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="MAMMO">Mammography</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start time */}
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" {...form.register('start_time')} />
                {form.formState.errors.start_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
                )}
              </div>

              {/* End time */}
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" {...form.register('end_time')} />
                {form.formState.errors.end_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.end_time.message}</p>
                )}
              </div>

              {/* Slot duration */}
              <div className="space-y-2">
                <Label>Slot Duration (min) *</Label>
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
                {createSchedule.isPending ? 'Saving…' : 'Add Availability Window'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Existing schedules ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Availability Templates</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Filter by radiologist:</Label>
              <Select
                value={filterRadiologistId || '__all__'}
                onValueChange={(v) => setFilterRadiologistId(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All radiologists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All radiologists</SelectItem>
                  {radiologists.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterRadiologistId && (
                <Button variant="ghost" size="sm" onClick={() => setFilterRadiologistId('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading schedules…" />
          ) : isError ? (
            <ErrorAlert message="Failed to load schedules." />
          ) : !schedules || schedules.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No availability templates found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Radiologist</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Slot Duration</TableHead>
                  <TableHead>Modality</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.radiologist?.full_name ?? getRadiologistName(s.radiologist_id)}
                    </TableCell>
                    <TableCell>{DAY_NAMES[s.day_of_week]}</TableCell>
                    <TableCell>
                      {s.start_time} – {s.end_time}
                    </TableCell>
                    <TableCell>{s.slot_duration_minutes} min</TableCell>
                    <TableCell>
                      {s.modality ? (
                        <Badge variant="secondary">{s.modality}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(s.id)}
                        title="Remove availability window"
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
        title="Remove Availability Window"
        message="This will deactivate the schedule template. Existing appointments are not affected. Continue?"
        confirmLabel="Remove"
        onConfirm={handleDelete}
        isLoading={deleteSchedule.isPending}
      />
    </div>
  )
}
