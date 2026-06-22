import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Activity,
  CalendarClock,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()

  const navItems = [
    {
      label: t('nav.dashboard'),
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: t('nav.patients'),
      path: '/patients',
      icon: Users,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: t('nav.appointments'),
      path: '/appointments',
      icon: Calendar,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: t('nav.reports'),
      path: '/reports',
      icon: FileText,
      roles: ['admin', 'radiologist'],
    },
    {
      label: t('nav.schedules'),
      path: '/schedule',
      icon: CalendarClock,
      roles: ['admin'],
    },
    {
      label: t('nav.audit'),
      path: '/audit',
      icon: ClipboardList,
      roles: ['admin'],
    },
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const canViewItem = (itemRoles: string[]) => {
    if (!user) return false
    return itemRoles.includes(user.role)
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gray-50">
      <div className="flex h-16 items-center border-b px-6">
        <Activity className="mr-2 h-6 w-6 text-primary" />
        <span className="text-xl font-bold">{t('common.appName')}</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(
          (item) =>
            canViewItem(item.roles) && (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-200'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
        )}
      </nav>
    </div>
  )
}
