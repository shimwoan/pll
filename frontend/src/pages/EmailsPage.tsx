import { useEffect, useRef, useState } from 'react'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Confirmed', value: 'CONFIRMED' },
]

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Response Required', value: 'Response Required' },
  { label: 'Document Submission', value: 'Document Submission' },
  { label: 'Confirm Reply', value: 'Confirm Reply' },
  { label: 'Needs Review', value: 'Needs Review' },
  { label: 'For Reference', value: 'For Reference' },
  { label: 'Unclassified', value: 'Unclassified' },
]

export function EmailsPage() {
  const { emails, allEmails, filters, isLoading, isSyncing, fetchEmails, syncEmails, setFilter } = useEmailStore()
  const navigate = useNavigate()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSync = async () => {
    const result = await syncEmails()
    if (result.error) {
      if (result.error.toLowerCase().includes('token expired') || result.error.toLowerCase().includes('not authenticated')) {
        authApi.login()
        return
      }
      setSyncMessage(result.error)
    } else {
      setSyncMessage(`Synced ${result.synced} new email${result.synced === 1 ? '' : 's'} from Outlook`)
    }
    setTimeout(() => setSyncMessage(null), 5000)
  }

  const summary = {
    pending: allEmails.filter((e) => e.status === 'PENDING_REVIEW').length,
    confirmed: allEmails.filter((e) => e.status === 'CONFIRMED' || e.status === 'EDITED').length,
    unclassified: allEmails.filter((e) => e.status === 'UNCLASSIFIED').length,
  }

  // Debounced filter-driven fetch
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      fetchEmails()
    }, filters.search ? 300 : 0)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [filters])

  // Polling fallback every 3s in case SSE drops
  useEffect(() => {
    const interval = setInterval(() => fetchEmails(true), 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Layout>
      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Email Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">Incoming emails pending classification and review</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMessage && <span className="text-xs text-gray-400">{syncMessage}</span>}
          <button
            onClick={() => navigate('/emails/unclassified')}
            className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle size={12} />
            {summary.unclassified} unclassified
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">Total</div>
          <div className="text-xl font-semibold text-gray-800 leading-tight">{summary.pending + summary.confirmed + summary.unclassified}</div>
          <div className="text-xs text-gray-400 mt-0.5">all emails</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">Pending Review</div>
          <div className="text-xl font-semibold text-gray-800 leading-tight">{summary.pending}</div>
          <div className="text-xs text-gray-400 mt-0.5">awaiting action</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">Confirmed</div>
          <div className="text-xl font-semibold text-gray-800 leading-tight">{summary.confirmed}</div>
          <div className="text-xs text-gray-400 mt-0.5">reviewed & classified</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg px-4 py-2.5">
          <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">Unclassified</div>
          <div className="text-xl font-semibold text-gray-800 leading-tight">{summary.unclassified}</div>
          <div className="text-xs text-gray-400 mt-0.5">no case match</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter('status', tab.value)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filters.status === tab.value
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Select value={filters.category || 'all'} onValueChange={(v) => setFilter('category', v === 'all' || v === null ? '' : v)}>
          <SelectTrigger className="w-36 h-8 text-xs border-gray-200">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search emails..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="flex-1 h-8 text-xs border-gray-200"
        />
      </div>

      <EmailTable emails={emails} isLoading={isLoading} />
    </Layout>
  )
}
