import { useNavigate } from 'react-router-dom'
import { ClipboardList, ChevronRight, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

export function AuditPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('audit.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('audit.pageSubtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/audit/access-log')}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-indigo-600 shrink-0" />
                <div>
                  <CardTitle className="text-base">{t('audit.accessLog.cardTitle')}</CardTitle>
                  <CardDescription className="mt-1">
                    {t('audit.accessLog.cardDescription')}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            </div>
          </CardHeader>
          <CardContent />
        </Card>

        <Card
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/audit/system-activity')}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-rose-600 shrink-0" />
                <div>
                  <CardTitle className="text-base">{t('audit.systemActivity.cardTitle')}</CardTitle>
                  <CardDescription className="mt-1">
                    {t('audit.systemActivity.cardDescription')}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            </div>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </div>
  )
}
