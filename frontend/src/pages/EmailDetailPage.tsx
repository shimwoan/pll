import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { ClassificationPanel } from '@/components/ClassificationPanel'
import { EmailStatusBadge } from '@/components/EmailStatusBadge'
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

  return (
    <Layout compact>
      <button
        onClick={() => navigate('/emails')}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft size={12} /> Back to Emails
      </button>

      <div className="grid grid-cols-5 gap-3">
        {/* Email body — left 3 cols */}
        <div className="col-span-3 bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-4">
              <div className="text-sm font-semibold text-gray-800 leading-snug mb-1.5">{selectedEmail.subject}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                <span className="text-gray-600 font-medium">{selectedEmail.fromName || selectedEmail.fromAddress}</span>
                {selectedEmail.fromName && <><span>·</span><span>{selectedEmail.fromAddress}</span></>}
                <span>·</span>
                <span>{format(new Date(selectedEmail.receivedAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
            <EmailStatusBadge status={selectedEmail.status} />
          </div>

          {selectedEmail.case && (
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
              <span className="text-xs text-gray-500 font-medium">Matched:</span>
              <span className="text-xs text-gray-800 font-semibold">{selectedEmail.case.caseNumber}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-600">{selectedEmail.case.clientName}</span>
              <span className="text-xs text-gray-400 ml-auto">via {selectedEmail.matchMethod?.replace(/_/g, ' ')}</span>
            </div>
          )}

          {selectedEmail.aiSummary && (
            <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="text-xs text-blue-400 font-medium uppercase tracking-wide mr-2">AI 요약</span>
              <span className="text-xs text-blue-800">{selectedEmail.aiSummary}</span>
            </div>
          )}

          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Full Body</span>
              <button
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
                onClick={() => selectedEmail.webLink ? window.open(selectedEmail.webLink, '_blank', 'noopener,noreferrer') : null}
                disabled={!selectedEmail.webLink}
              >
                <ExternalLink size={11} /> Open in Outlook
              </button>
            </div>
            {selectedEmail.body
              ? <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{selectedEmail.body}</pre>
              : <div className="text-xs text-gray-400 italic py-2">본문 불러오는 중...</div>
            }
          </div>
        </div>

        {/* Classification panel — right 2 cols */}
        <div className="col-span-2">
          <ClassificationPanel
            email={selectedEmail}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            onUnclassify={handleUnclassify}
            isLoading={isLoading}
          />
        </div>
      </div>
    </Layout>
  )
}
