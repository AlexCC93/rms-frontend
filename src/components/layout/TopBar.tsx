import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

interface TopBarProps {
  onMenuToggle?: () => void
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const user = useAuthStore((state) => state.user)
  const { logout } = useAuth()
  const { t } = useTranslation()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'radiologist':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'staff':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return ''
    }
  }

  if (!user) return null

  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-3 md:px-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <LanguageSwitcher />
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden sm:inline text-sm font-medium">{user.full_name}</span>
          <Badge
            variant="outline"
            className={getRoleBadgeColor(user.role)}
          >
            {user.role.toUpperCase()}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('auth.myAccount')}</DropdownMenuLabel>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
