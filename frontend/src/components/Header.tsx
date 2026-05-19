import { Mail, LayoutDashboard, Users, BarChart2, Settings, CheckSquare, FolderOpen, LogOut, ChevronDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Task', icon: CheckSquare, href: '#' },
  { label: 'Matter', icon: FolderOpen, href: '/matters' },
  { label: 'Contact', icon: Users, href: '#' },
  { label: 'Emails', icon: Mail, href: '/emails' },
  { label: 'Report', icon: BarChart2, href: '#' },
  { label: 'Admin', icon: Settings, href: '#' },
]

export function Header({ userName }: { userName?: string }) {
  const location = useLocation()

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-12 gap-20">
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.png" alt="PLL" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold tracking-widest text-gray-800 uppercase">Pacific Liberty Law</span>
        </Link>

        <nav className="flex items-center gap-0.5 flex-1">
          {navItems.map(({ label, icon: Icon, href }) => {
            const isDisabled = href === '#'
            const active = !isDisabled && location.pathname.startsWith(href)
            if (isDisabled) {
              return (
                <span
                  key={label}
                  title="Coming soon"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed select-none"
                >
                  <Icon size={14} />
                  {label}
                </span>
              )
            }
            return (
              <Link
                key={label}
                to={href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                {label}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gray-900 rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {userName && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 outline-none group">
                <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-white leading-none tracking-tight">JM</span>
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{userName}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal text-gray-500">{userName}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={authApi.logout} className="text-xs gap-2">
                  <LogOut size={12} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
