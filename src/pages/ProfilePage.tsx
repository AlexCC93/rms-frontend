import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useRadiologistProfile, useUpdateRadiologistProfile } from '@/hooks/useRadiologistProfile'
import { SignaturePad } from '@/components/shared/SignaturePad'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/api/client'
import { sanitizeSvg } from '@/utils/sanitizeSvg'
import { Info } from 'lucide-react'

const MAX_SVG_BYTES = 50 * 1024 // 50 KB

const profileSchema = z.object({
  initials: z
    .string()
    .max(10, 'initialsMaxLength')
    .optional(),
  license_number: z
    .string()
    .max(50, 'licenseMaxLength')
    .optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const ROLE_BADGE_COLOR: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  radiologist: 'bg-blue-100 text-blue-800 border-blue-200',
  staff: 'bg-green-100 text-green-800 border-green-200',
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)

  const isRadiologist = user?.role === 'radiologist'

  const { data: profile, isLoading, error } = useRadiologistProfile(
    isRadiologist ? user?.id : undefined
  )

  const { mutateAsync: updateProfile, isPending } = useUpdateRadiologistProfile()

  // Drawn SVG from the signature pad (null = cleared, undefined = not yet drawn this session)
  const pendingSignatureRef = useRef<string | null | undefined>(undefined)
  const [signatureError, setSignatureError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      initials: profile?.initials ?? '',
      license_number: profile?.license_number ?? '',
    },
  })

  if (!user) return null

  if (isRadiologist && isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text={t('profile.loadingProfile')} />
      </div>
    )
  }

  if (isRadiologist && error) {
    return (
      <div className="p-6">
        <ErrorAlert message={getErrorMessage(error)} />
      </div>
    )
  }

  const onSubmit = async (formData: ProfileFormData) => {
    if (!user) return
    setSignatureError(null)

    // Determine the signature to save
    let signatureToSave: string | null | undefined = undefined
    const pending = pendingSignatureRef.current

    if (pending !== undefined) {
      // User interacted with the pad this session
      if (pending !== null) {
        const sanitized = sanitizeSvg(pending)
        const byteLength = new TextEncoder().encode(sanitized).length
        if (byteLength > MAX_SVG_BYTES) {
          setSignatureError(t('profile.signatureTooLarge'))
          return
        }
        signatureToSave = sanitized
      } else {
        // Cleared
        signatureToSave = null
      }
    }

    // Build payload — only include fields that differ from the saved profile
    const payload: Record<string, string | null> = {}
    if (formData.initials !== undefined) payload.initials = formData.initials || null
    if (formData.license_number !== undefined) payload.license_number = formData.license_number || null
    if (signatureToSave !== undefined) payload.signature = signatureToSave

    try {
      await updateProfile({ userId: user.id, data: payload })
      toast({ title: t('profile.profileSaved') })
    } catch (err) {
      const status = (err as any)?.response?.status
      if (status === 409) {
        setError('license_number', {
          type: 'manual',
          message: t('profile.licenseInUse'),
        })
        return
      }
      toast({
        title: t('common.error'),
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {/* ── User Info ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.userInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-sm">
            <span className="text-muted-foreground">{t('profile.name')}</span>
            <span className="sm:col-span-2 font-medium">{user.full_name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-sm">
            <span className="text-muted-foreground">{t('profile.email')}</span>
            <span className="sm:col-span-2">{user.email}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-sm items-center">
            <span className="text-muted-foreground">{t('profile.role')}</span>
            <Badge
              variant="outline"
              className={ROLE_BADGE_COLOR[user.role] ?? ''}
            >
              {user.role.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Radiologist Profile ───────────────────────────────── */}
      {isRadiologist ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.radiologistProfile')}</CardTitle>
            <CardDescription>{t('profile.radiologistProfileDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!profile && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 mb-4">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t('profile.profileNotConfigured')}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Signature */}
              <div className="space-y-2">
                <Label>{t('profile.signature')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.signatureDescription')}
                </p>
                <SignaturePad
                  key={profile?.user_id ?? 'empty'}
                  initialSvg={profile?.signature ?? null}
                  onChange={(svg) => {
                    pendingSignatureRef.current = svg
                  }}
                />
                {signatureError && (
                  <p className="text-sm text-destructive">{signatureError}</p>
                )}
              </div>

              {/* Initials */}
              <div className="space-y-2">
                <Label htmlFor="initials">{t('profile.initials')}</Label>
                <Input
                  id="initials"
                  placeholder={t('profile.initialsPlaceholder')}
                  maxLength={10}
                  {...register('initials')}
                  className="max-w-[160px]"
                />
                {errors.initials && (
                  <p className="text-sm text-destructive">
                    {t(`profile.${errors.initials.message}`)}
                  </p>
                )}
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <Label htmlFor="license_number">{t('profile.licenseNumber')}</Label>
                <Input
                  id="license_number"
                  placeholder={t('profile.licenseNumberPlaceholder')}
                  maxLength={50}
                  {...register('license_number')}
                  className="max-w-[280px]"
                />
                {errors.license_number && (
                  <p className="text-sm text-destructive">
                    {errors.license_number.message?.startsWith('profile.')
                      ? t(errors.license_number.message)
                      : errors.license_number.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.saving') : t('profile.saveProfile')}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('profile.noRadiologistProfile')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
