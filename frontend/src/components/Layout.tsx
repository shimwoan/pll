import { useContext } from 'react'
import { UserContext } from '@/App'
import { Header } from './Header'

export function Layout({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  const userName = useContext(UserContext)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={userName} />
      <main className={`max-w-7xl mx-auto px-6 ${compact ? 'py-2' : 'py-2'}`}>{children}</main>
    </div>
  )
}
