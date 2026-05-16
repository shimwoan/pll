import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { emailApi } from '@/lib/api'
import type { Email } from '@/lib/api'

export function UnclassifiedPage() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    emailApi.unclassified().then(setEmails).catch(() => setEmails([])).finally(() => setIsLoading(false))
  }, [])

  return (
    <Layout>
      <Button variant="ghost" size="sm" onClick={() => navigate('/emails')} className="mb-4 gap-2 text-gray-500">
        <ArrowLeft size={14} /> Back to Emails
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unclassified Emails</h1>
          <p className="text-sm text-gray-500 mt-1">Emails with no matching case — manual review required</p>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{emails.length} emails</span>
      </div>

      <EmailTable emails={emails} isLoading={isLoading} />
    </Layout>
  )
}
