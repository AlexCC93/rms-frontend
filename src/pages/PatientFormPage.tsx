import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useCreatePatient, useUpdatePatient, usePatient } from '@/hooks/usePatients'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage } from '@/api/client'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import type { Sex } from '@/types'

const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['male', 'female', 'other', 'unknown']),
  national_id: z.string().min(1, 'National ID is required').max(20),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type PatientFormData = z.infer<typeof patientSchema>

export function PatientFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const isEditing = id !== undefined

  const { data: patient, isLoading: isLoadingPatient } = usePatient(isEditing ? id : undefined)

  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      sex: 'male' as Sex,
      national_id: '',
      phone: '',
      email: '',
      notes: '',
    },
  })

  // Update form when patient data loads in edit mode
  useEffect(() => {
    if (isEditing && patient) {
      form.reset({
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        sex: patient.sex,
        national_id: patient.national_id,
        phone: patient.phone || '',
        email: patient.email || '',
        notes: patient.notes || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, patient])

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (isEditing) {
        await updatePatient.mutateAsync({
          id: id!,
          data: {
            ...data,
            phone: data.phone || undefined,
            email: data.email || undefined,
            notes: data.notes || undefined,
          },
        })
        toast({
          title: 'Patient updated',
          description: 'Patient information has been updated successfully.',
        })
      } else {
        const newPatient = await createPatient.mutateAsync({
          ...data,
          phone: data.phone || undefined,
          email: data.email || undefined,
          notes: data.notes || undefined,
        })
        toast({
          title: 'Patient created',
          description: 'New patient has been created successfully.',
        })
        navigate(`/patients/${newPatient.id}`)
        return
      }
      navigate(`/patients/${id}`)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: isEditing ? 'Update failed' : 'Creation failed',
        description: getErrorMessage(error),
      })
    }
  }

  if (isEditing && isLoadingPatient) {
    return <LoadingSpinner text="Loading patient..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/patients')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Edit Patient' : 'New Patient'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update patient demographic and contact information'
              : 'Enter patient demographic and contact information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...form.register('first_name')}
                  placeholder="John"
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...form.register('last_name')}
                  placeholder="Doe"
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.last_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...form.register('date_of_birth')}
                />
                {form.formState.errors.date_of_birth && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.date_of_birth.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex">Sex *</Label>
                <Select
                  value={form.watch('sex')}
                  onValueChange={(value) => form.setValue('sex', value as Sex)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.sex && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.sex.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="national_id">National ID *</Label>
                <Input
                  id="national_id"
                  {...form.register('national_id')}
                  placeholder="123456789"
                />
                {form.formState.errors.national_id && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.national_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register('phone')}
                  placeholder="+1234567890"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="patient@example.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  {...form.register('notes')}
                  placeholder="Additional notes..."
                />
                {form.formState.errors.notes && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEditing ? `/patients/${id}` : '/patients')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPatient.isPending || updatePatient.isPending}
              >
                {createPatient.isPending || updatePatient.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Patient'
                  : 'Create Patient'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
