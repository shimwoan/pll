import { useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'

export function UnclassifiedPage() {
  const navigate = useNavigate()
  const { emails, isLoading, fetchEmails } = useEmailStore()
  const unclassified = emails.filter((e) => e.status === 'UNCLASSIFIED')

  useEffect(() => {
    fetchEmails()
  }, [])

  return (
    <Layout compact>
      <button
        onClick={() => navigate('/emails')}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft size={12} /> Back to Emails
      </button>

      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Unclassified Emails</h1>
          <p className="text-xs text-gray-400 mt-0.5">No matching case found — manual review required</p>
        </div>
        <span className="text-xs text-gray-400 bg-white border border-gray-100 rounded-lg px-3 py-1.5">{unclassified.length} emails</span>
      </div>

      <EmailTable emails={unclassified} isLoading={isLoading} />
    </Layout>
  )
}
