import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { ClassificationPanel } from '@/components/ClassificationPanel'
import { EmailStatusBadge } from '@/components/EmailStatusBadge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedEmail, fetchEmail, confirmEmail, editEmail, unclassifyEmail } = useEmailStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (id) fetchEmail(id)
  }, [id])

  if (!selectedEmail) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-400">Loading...</div>
      </Layout>
    )
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try { await confirmEmail(selectedEmail.id) }
    finally { setIsLoading(false) }
  }

  const handleEdit = async (data: { finalCategory: string; workTypeTitle: string }) => {
    setIsLoading(true)
    try { await editEmail(selectedEmail.id, data) }
    finally { setIsLoading(false) }
  }

  const handleUnclassify = async () => {
    setIsLoading(true)
    try { await unclassifyEmail(selectedEmail.id) }
    finally { setIsLoading(false) }
  }

  const previewLines = selectedEmail.bodyPreview.split('\n').slice(0, 5).join('\n')

  return (
    <Layout>
      <Button variant="ghost" size="sm" onClick={() => navigate('/emails')} className="mb-4 gap-2 text-gray-500">
        <ArrowLeft size={14} /> Back to Emails
      </Button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span>From: <span className="text-gray-700 font-medium">{selectedEmail.fromName || selectedEmail.fromAddress}</span></span>
              <span>·</span>
              <span>{selectedEmail.fromAddress}</span>
              <span>·</span>
              <span>{format(new Date(selectedEmail.receivedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
          <EmailStatusBadge status={selectedEmail.status} />
        </div>

        {selectedEmail.case && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg text-sm">
            <span className="text-blue-600 font-medium">Matched Case:</span>
            <span className="text-blue-700 font-bold">{selectedEmail.case.caseNumber}</span>
            <span className="text-blue-500">·</span>
            <span className="text-blue-600">{selectedEmail.case.clientName}</span>
            <span className="text-xs text-blue-400 ml-auto">via {selectedEmail.matchMethod?.replace(/_/g, ' ')}</span>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview (5 lines)</h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-gray-400 h-6 px-2"
              onClick={() => selectedEmail.webLink ? window.open(selectedEmail.webLink, '_blank') : null}
              disabled={!selectedEmail.webLink}
            >
              <ExternalLink size={11} /> Open in Outlook
            </Button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {previewLines}
          </pre>
        </div>
      </div>

      <ClassificationPanel
        email={selectedEmail}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        onUnclassify={handleUnclassify}
        isLoading={isLoading}
      />
    </Layout>
  )
}
