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
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide w-48">Category</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Case</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
            <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Subject</th>
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
              className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-white transition-colors ${
                email.status === 'PENDING_REVIEW' ? 'bg-amber-50/30' : ''
              }`}
            >
              <td className="px-4 py-2.5 whitespace-nowrap">
                <CategoryBadge category={email.finalCategory || email.aiCategory} />
              </td>
              <td className="px-4 py-2.5 text-sm">
                {email.case ? (
                  <span className="text-gray-700 font-medium">{email.case.caseNumber}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-sm">
                {email.case ? (
                  <span className="text-gray-700">{email.case.clientName}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 max-w-xs">
                <span className="truncate block text-sm font-bold text-gray-800">{email.subject}</span>
                {email.aiSummary && (
                  <span className="block text-[13px] font-medium text-gray-600 line-clamp-2">
                    <span className="text-gray-400 font-semibold">AI: </span>{email.aiSummary}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <span className="block text-sm text-gray-700">{email.fromName || email.fromAddress}</span>
                <span className="block text-sm text-gray-400">{email.fromAddress}</span>
              </td>
              <td className="px-4 py-2.5">
                <EmailStatusBadge status={email.status} />
              </td>
              <td className="px-4 py-2.5 text-right text-sm text-gray-400 whitespace-nowrap">
                {format(new Date(email.receivedAt), 'MMM d, yyyy HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
