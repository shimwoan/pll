import { Mail, AlertTriangle } from 'lucide-react'
import type { Email } from '@/lib/api'
import { CategoryBadge } from './CategoryBadge'
import { EmailStatusBadge } from './EmailStatusBadge'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface EmailTableProps {
  emails: Email[]
  isLoading?: boolean
}

export function EmailTable({ emails, isLoading }: EmailTableProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="text-center py-10 text-gray-400 text-xs">Loading emails...</div>
    )
  }

  if (!emails.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-xs">No emails found.</div>
    )
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-6"></th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Category</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Subject</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Case</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">From</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
            <th className="text-right px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => navigate(`/emails/${email.id}`)}
              className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                email.status === 'PENDING_REVIEW' ? 'bg-amber-50/30' : ''
              }`}
            >
              <td className="px-4 py-2.5">
                {email.status === 'UNCLASSIFIED' ? (
                  <AlertTriangle size={12} className="text-amber-400" />
                ) : (
                  <Mail size={12} className="text-gray-300" />
                )}
              </td>
              <td className="px-4 py-2.5">
                <CategoryBadge category={email.finalCategory || email.aiCategory} />
              </td>
              <td className="px-4 py-2.5 max-w-xs">
                <span className="truncate block text-xs font-medium text-gray-800">{email.subject}</span>
                <span className="truncate block text-xs text-gray-400">
                  {email.aiSummary || (email.bodyPreview.length > 60 ? email.bodyPreview.slice(0, 60) + '...' : email.bodyPreview)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {email.case ? (
                  <span className="text-gray-700 font-medium">{email.case.caseNumber}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <span className="block text-xs text-gray-700">{email.fromName || email.fromAddress}</span>
                <span className="block text-xs text-gray-400">{email.fromAddress}</span>
              </td>
              <td className="px-4 py-2.5">
                <EmailStatusBadge status={email.status} />
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-400 whitespace-nowrap">
                {format(new Date(email.receivedAt), 'MMM d, yyyy HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
