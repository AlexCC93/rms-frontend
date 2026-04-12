import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { useCreateAppointment, useUpdateAppointment, useAppointment } from '@/hooks/useAppointments'
import { useAvailableSlots } from '@/hooks/useSchedule'
import { usePatients, usePatient } from '@/hooks/usePatients'
import { usePhysicians } from '@/hooks/usePhysicians'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Clock, User, X, RefreshCw, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Modality, AvailableSlot, Patient } from '@/types'
import { useTranslation } from 'react-i18next'

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  referring_physician: z.string().optional().or(z.literal('')),
  modality: z.enum(['XR', 'CT', 'US', 'MRI', 'MAMMO']),
  study_description: z.string().min(1, 'Study description is required').max(200),
  clinical_indication: z.string().optional().or(z.literal('')),
  scheduled_at: z.string().min(1, 'Please select a time slot'),
  duration_minutes: z.coerce.number().min(5).max(480),
  radiologist_id: z.string().optional().or(z.literal('')),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export function AppointmentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { toast } = useToast()
  const { t } = useTranslation()
  const isEditing = id !== undefined

  // Support both ?patient_id= and ?patientId= query params
  const prefilledPatientId = searchParams.get('patientId') || searchParams.get('patient_id') || undefined
  // Patient data passed via router state (avoids 403 when radiologist can't fetch the patient)
  const statePatient = (location.state as { patient?: Patient } | null)?.patient ?? undefined

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [modalityForSlots, setModalityForSlots] = useState<Modality>('XR')

  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(isEditing ? id : undefined)
  const { data: patients, isLoading: isLoadingPatients } = usePatients({ limit: 1000 })
  const { data: currentPatient } = usePatient(appointment?.patient_id)
  // Only fetch if we have a prefilledPatientId but no state patient (e.g. navigated via PatientDetailPage)
  const { data: fetchedPrefilledPatient } = usePatient(!isEditing && !statePatient ? prefilledPatientId : undefined)
  const prefilledPatient = statePatient ?? fetchedPrefilledPatient
  const { data: physicians, isLoading: isLoadingPhysicians } = usePhysicians()

  const slotsParams = useMemo(() => {
    if (!selectedDate) return null
    return { date: selectedDate, modality: modalityForSlots } as const
  }, [selectedDate, modalityForSlots])

  const {
    data: slotsData,
    isLoading: isFetchingSlots,
    isError: slotsError,
    refetch: refetchSlots,
  } = useAvailableSlots(slotsParams)

  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: prefilledPatientId || '',
      referring_physician: '',
      modality: 'XR' as Modality,
      study_description: '',
      clinical_indication: '',
      scheduled_at: '',
      duration_minutes: 30,
      radiologist_id: '',
    },
  })

  useEffect(() => {
    if (isEditing && appointment) {
      form.reset({
        patient_id: appointment.patient_id,
        referring_physician: appointment.referring_physician_id || '',
        modality: appointment.modality,
        study_description: appointment.study_description,
        clinical_indication: appointment.clinical_indication || '',
        scheduled_at: appointment.scheduled_at,
        duration_minutes: appointment.duration_minutes,
        radiologist_id: appointment.radiologist_id || '',
      })
      setSelectedDate(appointment.scheduled_at.slice(0, 10))
      setModalityForSlots(appointment.modality)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, appointment])

  // Merge prefilled patient into the patient list for the dropdown
  const patientOptions = useMemo(() => {
    const list = patients ?? []
    if (prefilledPatient && !list.some((p) => p.id === prefilledPatient.id)) {
      return [prefilledPatient, ...list]
    }
    return list
  }, [patients, prefilledPatient])

  const watchedModality = form.watch('modality')
  useEffect(() => {
    setModalityForSlots(watchedModality)
    if (selectedSlot) {
      setSelectedSlot(null)
      form.setValue('scheduled_at', '')
      form.setValue('radiologist_id', '')
      form.setValue('duration_minutes', 30)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedModality])

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    form.setValue('scheduled_at', slot.start, { shouldValidate: true })
    form.setValue('duration_minutes', differenceInMinutes(parseISO(slot.end), parseISO(slot.start)))
    form.setValue('radiologist_id', slot.radiologist_id)
  }

  const handleClearSlot = () => {
    setSelectedSlot(null)
    form.setValue('scheduled_at', '')
    form.setValue('radiologist_id', '')
    form.setValue('duration_minutes', 30)
  }

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const payload = {
        patient_id: data.patient_id,
        referring_physician_id: data.referring_physician || undefined,
        radiologist_id: data.radiologist_id || undefined,
        modality: data.modality,
        study_description: data.study_description,
        clinical_indication: data.clinical_indication || undefined,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        duration_minutes: data.duration_minutes,
      }

      if (isEditing) {
        await updateAppointment.mutateAsync({ id: id!, data: payload })
        toast({ title: t('appointments.appointmentUpdated'), description: t('appointments.appointmentUpdatedDesc') })
        navigate(`/appointments/${id}`)
      } else {
        await createAppointment.mutateAsync(payload)
        toast({ title: t('appointments.appointmentCreated'), description: t('appointments.appointmentCreatedDesc') })
        navigate('/appointments')
      }
    } catch (error) {
      if ((error as any)?.response?.status === 409) {
        toast({
          variant: 'destructive',
          title: t('appointments.slotNoLongerAvailable'),
          description: t('appointments.slotNoLongerAvailableDesc'),
        })
        handleClearSlot()
        refetchSlots()
      } else if ((error as any)?.response?.status === 404 && form.getValues('radiologist_id')) {
        toast({
          variant: 'destructive',
          title: t('appointments.radiologistUnavailable'),
          description: t('appointments.radiologistUnavailableDesc'),
        })
      } else {
        toast({
          variant: 'destructive',
          title: isEditing ? t('appointments.updateFailed') : t('appointments.creationFailed'),
          description: getErrorMessage(error),
        })
      }
    }
  }

  if (isEditing && isLoadingAppointment) return <LoadingSpinner text={t('appointments.loadingAppointment')} />
  if (isLoadingPatients || isLoadingPhysicians) return <LoadingSpinner text={t('appointments.loadingFormData')} />

  const currentScheduledAt = form.watch('scheduled_at')
  const currentRadiologistId = form.watch('radiologist_id')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/appointments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? t('appointments.editAppointment') : t('appointments.newAppointment')}
        </h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Section 1: Patient & Clinical Info ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t('appointments.patientClinicalInfo')}</CardTitle>
            <CardDescription>{t('appointments.basicDetails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Patient */}
              <div className="space-y-2">
                <Label>{t('appointments.patient')} *</Label>
                {(isEditing && currentPatient) || prefilledPatientId ? (
                  <Input
                    value={(() => {
                      const p = isEditing ? currentPatient : prefilledPatient
                      return p ? `${p.last_name}, ${p.first_name} — ${p.national_id}` : t('common.loading')
                    })()}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.watch('patient_id')}
                    onValueChange={(v) => form.setValue('patient_id', v, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('appointments.selectPatient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {patientOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.last_name}, {p.first_name} — {p.national_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.patient_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.patient_id.message}</p>
                )}
              </div>

              {/* Modality */}
              <div className="space-y-2">
                <Label>{t('appointments.modality')} *</Label>
                <Select
                  value={form.watch('modality')}
                  onValueChange={(v) => form.setValue('modality', v as Modality, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XR">{t('modalities.XR')}</SelectItem>
                    <SelectItem value="CT">{t('modalities.CT')}</SelectItem>
                    <SelectItem value="US">{t('modalities.US')}</SelectItem>
                    <SelectItem value="MRI">{t('modalities.MRI')}</SelectItem>
                    <SelectItem value="MAMMO">{t('modalities.MAMMO')}</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.modality && (
                  <p className="text-sm text-destructive">{form.formState.errors.modality.message}</p>
                )}
              </div>

              {/* Study Description */}
              <div className="space-y-2">
                <Label>{t('appointments.studyDescription')} *</Label>
                <Input {...form.register('study_description')} placeholder="Chest X-Ray PA/Lateral" />
                {form.formState.errors.study_description && (
                  <p className="text-sm text-destructive">{form.formState.errors.study_description.message}</p>
                )}
              </div>

              {/* Referring Physician */}
              <div className="space-y-2">
                <Label>{t('appointments.referringPhysician')}</Label>
                <div className="flex gap-2">
                  <Controller
                    control={form.control}
                    name="referring_physician"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={(v) => field.onChange(v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={t('appointments.selectPhysician')} />
                        </SelectTrigger>
                        <SelectContent>
                          {physicians?.map((ph) => (
                            <SelectItem key={ph.id} value={ph.id}>{ph.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.watch('referring_physician') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue('referring_physician', '')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Clinical Indication */}
              <div className="space-y-2 md:col-span-2">
                <Label>{t('appointments.clinicalIndication')}</Label>
                <Input
                  {...form.register('clinical_indication')}
                  placeholder="Suspected pneumonia, cough for 2 weeks"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Radiologist & Time Slot ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t('appointments.radiologistTimeSlot')}</CardTitle>
            <CardDescription>
              {t('appointments.radiologistTimeSlotDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('appointments.date')} *</Label>
              <Input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  handleClearSlot()
                }}
                className="max-w-xs"
              />
            </div>

            {selectedDate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Available slots — {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                    {modalityForSlots ? ` · ${modalityForSlots}` : ''}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchSlots()}
                    disabled={isFetchingSlots}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isFetchingSlots && 'animate-spin')} />
                    {t('common.refresh')}
                  </Button>
                </div>

                {isFetchingSlots ? (
                  <LoadingSpinner text={t('appointments.fetchingSlots')} />
                ) : slotsError ? (
                  <p className="text-sm text-destructive">{t('appointments.failedLoadSlots')}</p>
                ) : slotsData && slotsData.slots.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t('appointments.noSlotsAvailable')}
                  </div>
                ) : slotsData ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {slotsData.slots.map((slot) => {
                      const slotKey = `${slot.radiologist_id}-${slot.start}`
                      const isSelected =
                        selectedSlot?.radiologist_id === slot.radiologist_id &&
                        selectedSlot?.start === slot.start
                      return (
                        <button
                          key={slotKey}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={cn(
                            'flex flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors',
                            'hover:border-primary hover:bg-primary/5',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border bg-background'
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {slot.radiologist_name}
                          </span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {format(parseISO(slot.start), 'h:mm a')} – {format(parseISO(slot.end), 'h:mm a')}
                          </span>
                          <span className="text-xs text-muted-foreground">{slot.slot_duration_minutes} min</span>
                          {isSelected && (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              <CalendarCheck className="h-3 w-3" /> {t('common.selected')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {/* Selected slot summary */}
            {selectedSlot ? (
              <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 p-3">
                <div className="text-sm">
                  <p className="font-semibold text-primary">{t('appointments.slotSelected')}</p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedSlot.radiologist_name}</span>
                    {' '}· {format(parseISO(selectedSlot.start), 'h:mm a')} – {format(parseISO(selectedSlot.end), 'h:mm a')}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearSlot}>
                  <X className="h-4 w-4 mr-1" /> {t('common.clear')}
                </Button>
              </div>
            ) : isEditing && currentScheduledAt && currentRadiologistId ? (
              <div className="rounded-md border bg-muted p-3 text-sm">
                <p className="font-medium">{t('appointments.currentAssignment')}</p>
                <p className="text-muted-foreground">
                  Radiologist ID: {currentRadiologistId.slice(0, 8)}…
                  {' '}· {format(parseISO(currentScheduledAt), 'PPp')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('appointments.selectNewSlot')}
                </p>
              </div>
            ) : null}

            {form.formState.errors.scheduled_at && !selectedSlot && !currentScheduledAt && (
              <p className="text-sm text-destructive">{form.formState.errors.scheduled_at.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditing ? `/appointments/${id}` : '/appointments')}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createAppointment.isPending || updateAppointment.isPending}
          >
            {createAppointment.isPending || updateAppointment.isPending
              ? t('common.saving')
              : isEditing
              ? t('appointments.updateAppointment')
              : t('appointments.createAppointment')}
          </Button>
        </div>
      </form>
    </div>
  )
}
