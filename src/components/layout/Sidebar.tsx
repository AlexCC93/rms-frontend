import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: 'Patients',
      path: '/patients',
      icon: Users,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: 'Appointments',
      path: '/appointments',
      icon: Calendar,
      roles: ['admin', 'radiologist', 'staff'],
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: FileText,
      roles: ['admin', 'radiologist'],
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
        <span className="text-xl font-bold">RMS-lite</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(
          (item) =>
            canViewItem(item.roles) && (
              <Link
                key={item.path}
                to={item.path}
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
