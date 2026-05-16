import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmailsPage } from '@/pages/EmailsPage'
import { EmailDetailPage } from '@/pages/EmailDetailPage'
import { UnclassifiedPage } from '@/pages/UnclassifiedPage'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/emails" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/emails/unclassified" element={<UnclassifiedPage />} />
        <Route path="/emails/:id" element={<EmailDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
