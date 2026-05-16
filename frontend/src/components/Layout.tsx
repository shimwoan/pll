import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>()

  useEffect(() => {
    authApi.me().then((r) => {
      if (r.authenticated) setUserName(r.name)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={userName} />
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
