import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmailsPage } from '@/pages/EmailsPage'
import { EmailDetailPage } from '@/pages/EmailDetailPage'
import { UnclassifiedPage } from '@/pages/UnclassifiedPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MattersPage } from '@/pages/MattersPage'
import { authApi } from '@/lib/api'
import { ToastPanel } from '@/components/ToastPanel'
import { useEmailStore } from '@/store/emailStore'

export const UserContext = React.createContext<string | undefined>(undefined)

function SseListener() {
  const { fetchEmails, addToast } = useEmailStore()

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    let es: EventSource
    let retryDelay = 1000
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let closed = false

    function connect() {
      es = new EventSource(`${apiUrl}/emails/events`, { withCredentials: true })

      es.onopen = () => { retryDelay = 1000 }

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          if (parsed.type === 'new_email' && parsed.email) {
            addToast(parsed.email)
            fetchEmails(true)
          }
        } catch {
          // comment or non-JSON keepalive — ignore
        }
      }

      es.onerror = () => {
        es.close()
        if (closed) return
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000)
          connect()
        }, retryDelay)
      }
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      es.close()
    }
  }, [])

  return null
}

function ProtectedRoute({ children, authenticated }: { children: React.ReactNode; authenticated: boolean | null }) {
  if (authenticated === null) return null
  if (!authenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    authApi.me().then((r) => {
      setAuthenticated(r.authenticated)
      if (r.authenticated) setUserName(r.name)
    }).catch(() => setAuthenticated(false))
  }, [])

  return (
    <UserContext.Provider value={userName}>
      <BrowserRouter>
        {authenticated && <SseListener />}
        {authenticated && <ToastPanel />}
        <Routes>
          <Route path="/login" element={authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute authenticated={authenticated}><DashboardPage /></ProtectedRoute>} />
          <Route path="/matters" element={<ProtectedRoute authenticated={authenticated}><MattersPage /></ProtectedRoute>} />
          <Route path="/emails" element={<ProtectedRoute authenticated={authenticated}><EmailsPage /></ProtectedRoute>} />
          <Route path="/emails/unclassified" element={<ProtectedRoute authenticated={authenticated}><UnclassifiedPage /></ProtectedRoute>} />
          <Route path="/emails/:id" element={<ProtectedRoute authenticated={authenticated}><EmailDetailPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  )
}
