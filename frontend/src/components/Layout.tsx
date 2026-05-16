import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import { Header } from './Header'
import { useNavigate } from 'react-router-dom'

export function Layout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string>()
  const [checked, setChecked] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    authApi.me().then((r) => {
      if (r.authenticated) {
        setUserName(r.name)
      } else {
        navigate('/login', { replace: true })
      }
    }).catch(() => {
      navigate('/login', { replace: true })
    }).finally(() => setChecked(true))
  }, [])

  if (!checked) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={userName} />
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
