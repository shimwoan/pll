import { Mail, LayoutDashboard, Users, BarChart2, Settings, CheckSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { authApi } from '@/lib/api'

const navItems = [
  { label: 'Task', icon: CheckSquare, href: '#' },
  { label: 'Matter', icon: LayoutDashboard, href: '#' },
  { label: 'Contact', icon: Users, href: '#' },
  { label: 'Emails', icon: Mail, href: '/emails' },
  { label: 'Report', icon: BarChart2, href: '#' },
  { label: 'Admin', icon: Settings, href: '#' },
]

export function Header({ userName }: { userName?: string }) {
  const location = useLocation()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-14 gap-8">
        <Link to="/emails" className="flex items-center gap-3 shrink-0">
          <div
            className="w-9 h-9 flex items-center justify-center border-2 font-bold text-sm"
            style={{ borderColor: '#B8960C', color: '#B8960C' }}
          >
            PL
          </div>
          <span className="font-semibold text-gray-900 text-sm tracking-wide hidden sm:block">
            PACIFIC LIBERTY LAW
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map(({ label, icon: Icon, href }) => {
            const active = location.pathname.startsWith(href) && href !== '#'
            return (
              <Link
                key={label}
                to={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? 'text-blue-600 font-medium bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {userName && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{userName}</span>
            <button
              onClick={authApi.logout}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
