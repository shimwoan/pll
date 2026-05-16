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
      <div className="text-center py-12 text-gray-400 text-sm">Loading emails...</div>
    )
  }

  if (!emails.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">No emails found.</div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-8"></th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Case</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">From</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Date</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => navigate(`/emails/${email.id}`)}
              className={`border-b border-gray-100 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                email.status === 'PENDING_REVIEW' ? 'bg-amber-50/40' : ''
              }`}
            >
              <td className="px-4 py-3">
                {email.status === 'UNCLASSIFIED' ? (
                  <AlertTriangle size={14} className="text-amber-500" />
                ) : (
                  <Mail size={14} className="text-blue-400" />
                )}
              </td>
              <td className="px-4 py-3">
                <CategoryBadge category={email.finalCategory || email.aiCategory} />
              </td>
              <td className="px-4 py-3 max-w-xs">
                <span className="truncate block font-medium text-gray-900">{email.subject}</span>
                <span className="truncate block text-xs text-gray-400">{email.bodyPreview.slice(0, 60)}...</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {email.case ? (
                  <span className="text-blue-600 font-medium">{email.case.caseNumber}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                <span className="block">{email.fromName || email.fromAddress}</span>
                <span className="block text-xs text-gray-400">{email.fromAddress}</span>
              </td>
              <td className="px-4 py-3">
                <EmailStatusBadge status={email.status} />
              </td>
              <td className="px-4 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                {format(new Date(email.receivedAt), 'MMM d, yyyy')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
