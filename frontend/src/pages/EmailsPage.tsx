import { useEffect, useRef, useState } from 'react'
import { useEmailStore } from '@/store/emailStore'
import { Layout } from '@/components/Layout'
import { EmailTable } from '@/components/EmailTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { emailApi } from '@/lib/api'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Confirmed', value: 'CONFIRMED' },
]

const CATEGORIES = ['Settlement', 'Medical', 'Client', 'Insurance', 'Police', 'Other']

export function EmailsPage() {
  const { emails, filters, isLoading, isSyncing, fetchEmails, syncEmails, setFilter } = useEmailStore()
  const navigate = useNavigate()
  const [summary, setSummary] = useState({ pending: 0, confirmed: 0, unclassified: 0 })
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch unfiltered summary for stat cards
  useEffect(() => {
    emailApi.list().then((all) => {
      setSummary({
        pending: all.filter((e) => e.status === 'PENDING_REVIEW').length,
        confirmed: all.filter((e) => e.status === 'CONFIRMED' || e.status === 'EDITED').length,
        unclassified: all.filter((e) => e.status === 'UNCLASSIFIED').length,
      })
    })
  }, [emails])

  // Debounced filter-driven fetch
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      fetchEmails()
    }, filters.search ? 300 : 0)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [filters])

  const handleSync = async () => {
    const result = await syncEmails()
    setSyncMessage(`${result.synced} emails synced from Outlook`)
    setTimeout(() => setSyncMessage(null), 3000)
  }

  return (
    <Layout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-ingested from Outlook · AI classified</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/emails/unclassified')}
            className="gap-2"
          >
            <AlertTriangle size={14} className="text-amber-500" />
            Unclassified ({summary.unclassified})
          </Button>
          <Button size="sm" onClick={handleSync} disabled={isSyncing} className="gap-2">
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {syncMessage}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{summary.pending + summary.confirmed + summary.unclassified}</div>
          <div className="text-sm text-gray-500">Total Emails</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
          <div className="text-sm text-gray-500">Pending Review</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{summary.confirmed}</div>
          <div className="text-sm text-gray-500">Confirmed</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter('status', tab.value)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
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
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search emails..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="flex-1 h-9 text-sm"
        />
      </div>

      <EmailTable emails={emails} isLoading={isLoading} />
    </Layout>
  )
}
