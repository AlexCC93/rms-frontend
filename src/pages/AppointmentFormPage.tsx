import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useMemo } from 'react'
import { useCreateAppointment, useUpdateAppointment, useAppointment } from '@/hooks/useAppointments'
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
import { ArrowLeft, X } from 'lucide-react'
import type { Modality } from '@/types'

const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  referring_physician: z.string().optional().or(z.literal('')),
  modality: z.enum(['XR', 'CT', 'US', 'MRI', 'MAMMO']),
  study_description: z.string().min(1, 'Study description is required').max(200),
  clinical_indication: z.string().optional().or(z.literal('')),
  scheduled_at: z.string().min(1, 'Scheduled date and time is required'),
  duration_minutes: z.coerce.number().min(5, 'Duration must be at least 5 minutes').max(480),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export function AppointmentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const isEditing = id !== undefined

  const { data: appointment, isLoading: isLoadingAppointment } = useAppointment(isEditing ? id : undefined)
  const { data: patients, isLoading: isLoadingPatients } = usePatients({ limit: 1000 })
  const { data: currentPatient } = usePatient(appointment?.patient_id)
  const { data: physicians, isLoading: isLoadingPhysicians } = usePhysicians()

  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: '',
      referring_physician: '',
      modality: 'XR' as Modality,
      study_description: '',
      clinical_indication: '',
      scheduled_at: '',
      duration_minutes: 30,
    },
  })

  // Update form when appointment data loads in edit mode
  useEffect(() => {
    if (isEditing && appointment) {
      form.reset({
        patient_id: appointment.patient_id,
        referring_physician: appointment.referring_physician_id || '',
        modality: appointment.modality,
        study_description: appointment.study_description,
        clinical_indication: appointment.clinical_indication || '',
        scheduled_at: appointment.scheduled_at.slice(0, 16), // Format for datetime-local input
        duration_minutes: appointment.duration_minutes,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, appointment])

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      // Convert scheduled_at to ISO format
      const scheduled_at = new Date(data.scheduled_at).toISOString()

      // Prepare the payload - map referring_physician to referring_physician_id
      const payload = {
        patient_id: data.patient_id,
        referring_physician_id: data.referring_physician || undefined,
        modality: data.modality,
        study_description: data.study_description,
        clinical_indication: data.clinical_indication || undefined,
        scheduled_at,
        duration_minutes: data.duration_minutes,
      }

      if (isEditing) {
        await updateAppointment.mutateAsync({
          id: id!,
          data: payload,
        })
        toast({
          title: 'Appointment updated',
          description: 'Appointment has been updated successfully.',
        })
      } else {
        await createAppointment.mutateAsync(payload)
        toast({
          title: 'Appointment created',
          description: 'New appointment has been created successfully.',
        })
        navigate('/appointments')
        return
      }
      navigate(`/appointments/${id}`)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: isEditing ? 'Update failed' : 'Creation failed',
        description: getErrorMessage(error),
      })
    }
  }

  if (isEditing && isLoadingAppointment) {
    return <LoadingSpinner text="Loading appointment..." />
  }

  if (isLoadingPatients || isLoadingPhysicians) {
    return <LoadingSpinner text="Loading form data..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/appointments')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Edit Appointment' : 'New Appointment'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Information</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update appointment details'
              : 'Enter appointment details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                {isEditing && currentPatient ? (
                  <Input
                    value={`${currentPatient.last_name}, ${currentPatient.first_name} - ${currentPatient.national_id}`}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.watch('patient_id')}
                    onValueChange={(value) => form.setValue('patient_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.last_name}, {patient.first_name} - {patient.national_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {form.formState.errors.patient_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.patient_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referring_physician">Referring Physician</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.watch('referring_physician') || ''}
                    onValueChange={(value) => form.setValue('referring_physician', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a physician (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {physicians?.map((physician) => (
                        <SelectItem key={physician.id} value={physician.id}>
                          {physician.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.watch('referring_physician') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue('referring_physician', '')}
                      title="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {form.formState.errors.referring_physician && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.referring_physician.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modality">Modality *</Label>
                <Select
                  value={form.watch('modality')}
                  onValueChange={(value) => form.setValue('modality', value as Modality)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XR">X-Ray (XR)</SelectItem>
                    <SelectItem value="CT">CT Scan</SelectItem>
                    <SelectItem value="US">Ultrasound (US)</SelectItem>
                    <SelectItem value="MRI">MRI</SelectItem>
                    <SelectItem value="MAMMO">Mammography</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.modality && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.modality.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="study_description">Study Description *</Label>
                <Input
                  id="study_description"
                  {...form.register('study_description')}
                  placeholder="Chest X-Ray PA/Lateral"
                />
                {form.formState.errors.study_description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.study_description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Scheduled Date and Time *</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  {...form.register('scheduled_at')}
                />
                {form.formState.errors.scheduled_at && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.scheduled_at.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  {...form.register('duration_minutes')}
                  placeholder="30"
                  min="5"
                  max="480"
                />
                {form.formState.errors.duration_minutes && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.duration_minutes.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clinical_indication">Clinical Indication</Label>
                <Input
                  id="clinical_indication"
                  {...form.register('clinical_indication')}
                  placeholder="Suspected pneumonia, cough for 2 weeks"
                />
                {form.formState.errors.clinical_indication && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.clinical_indication.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEditing ? `/appointments/${id}` : '/appointments')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAppointment.isPending || updateAppointment.isPending}
              >
                {createAppointment.isPending || updateAppointment.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Appointment'
                  : 'Create Appointment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
