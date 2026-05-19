import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { CategoryBadge } from '@/components/CategoryBadge'
import { caseApi, emailApi, type CaseDetail, type Email } from '@/lib/api'
import { useEmailStore } from '@/store/emailStore'
import { ChevronRight, Check, Pin, Mail, CheckCircle2, X, Search, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EMAIL_CATEGORIES = ['Settlement', 'Medical', 'Client', 'Insurance', 'Police', 'Other']

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', opts ?? { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

function daysLeft(dueDate: string | null) {
  if (!dueDate) return null
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000)
  return diff
}

// ── Stage tracker ──────────────────────────────────────────────────────────

const STAGES = ['Intake', 'Pre-Litigation', 'Medical Collection', 'Demand', 'Negotiation', 'Litigation', 'Settlement']

const STAGE_MAP: Record<string, number> = {
  'Claim':              0,
  'Pre-Litigation':     1,
  'Medical Collection': 2,
  'Demand':             3,
  'Negotiation':        4,
  'Litigation':         5,
  'Settlement':         6,
}

const CLAIM_PREFIX_MAP: Record<string, string> = {
  'SF': 'State Farm',
  'PR': 'Progressive',
  'AL': 'Allstate',
  'GE': 'GEICO',
  'TT': 'Travelers',
  'AA': 'AAA',
  'LB': 'Liberty Mutual',
}

function StageTracker({ stage }: { stage: string }) {
  const current = Math.max(STAGE_MAP[stage] ?? 0, 1)
  return (
    <div className="flex items-center">
      {STAGES.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5 min-w-0">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                done ? 'bg-blue-600 border-blue-600 text-white' :
                active ? 'border-blue-600 bg-white text-blue-600' :
                'border-gray-200 bg-white text-gray-300'
              }`}>
                {done ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px]">{i + 1}</span>}
              </div>
              <span className={`text-[12px] text-center leading-tight whitespace-nowrap ${
                active ? 'font-semibold text-blue-600' : done ? 'text-gray-400' : 'text-gray-300'
              }`}>
                {s}
                {active && <><br /><span className="font-normal text-[9px]">In Progress</span></>}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-3 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

const DEMO_TIMELINE = [
  { dayCount: 0,  dateIn: '2026-01-15', transferredTo: 'Intake',       transferredDate: '2026-01-23', handler: 'John Doe' },
  { dayCount: 45, dateIn: '2026-03-01', transferredTo: 'Demand',       transferredDate: '2026-03-10', handler: 'Sarah Klein' },
  { dayCount: 90, dateIn: '2026-04-15', transferredTo: 'Negotiation',  transferredDate: '2026-04-20', handler: 'Emily Davis' },
]

function Timeline() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5">
      <div className="font-semibold text-sm text-gray-800 mb-0.5">Timeline</div>
      <div className="text-xs text-gray-400 mb-4">Case progress history</div>
      <div className="relative">
        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-blue-100" />
        <div className="flex flex-col gap-3">
          {DEMO_TIMELINE.map((t, i) => (
            <div key={i} className="relative flex gap-4">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white ring-1 ring-blue-200 shrink-0 mt-1 z-10" />
              <div className="flex-1 border border-gray-100 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-4 mb-2">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Day Count</div>
                    <div className="text-xs font-semibold text-gray-800">Day {t.dayCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Date In</div>
                    <div className="text-xs text-gray-700">
                      {new Date(t.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', weekday: 'short' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Transferred To</div>
                    <div className="text-xs text-orange-500 font-medium">{t.transferredTo}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-0.5">Transferred Date</div>
                    <div className="text-xs text-gray-700">
                      {new Date(t.transferredDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', weekday: 'short' })}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">Handler</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-semibold text-blue-600">
                      {initials(t.handler)}
                    </div>
                    <span className="text-xs text-gray-700">{t.handler}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Important Notice ───────────────────────────────────────────────────────

const DEMO_NOTICES = [
  'Settlement deadline: Mar 30, 2026',
  'Client deposition scheduled Apr 5',
]

function ImportantNotice() {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-2">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Pin size={12} className="text-amber-500" />
        </div>
        <span className="text-sm font-semibold text-gray-800">Important Notices</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {DEMO_NOTICES.map((n, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-white border border-amber-100 rounded-lg px-3 py-2">
            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="text-xs text-gray-700">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Memo & Emails Tab ──────────────────────────────────────────────────────

const MEMO_EMAIL_SUB_TABS = ['All', 'Memo', 'Email'] as const
type MemoEmailSubTab = typeof MEMO_EMAIL_SUB_TABS[number]

const CATEGORY_COLORS: Record<string, string> = {
  Settlement: 'bg-blue-50 text-blue-600',
  Medical:    'bg-green-50 text-green-600',
  Client:     'bg-orange-50 text-orange-500',
  Insurance:  'bg-purple-50 text-purple-600',
  Police:     'bg-red-50 text-red-500',
  Strategy:   'bg-teal-50 text-teal-600',
  Other:      'bg-gray-100 text-gray-500',
}

function MemoEmailsTab({ emails }: { emails: Email[] }) {
  const [subTab, setSubTab] = useState<MemoEmailSubTab>('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const confirmed = emails.filter((e) => e.status === 'CONFIRMED' || e.status === 'EDITED')

  const filtered = confirmed.filter((e) => {
    if (subTab === 'Email') return true
    if (subTab === 'Memo') return false
    return true
  }).filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.subject.toLowerCase().includes(q) ||
      (e.fromName || '').toLowerCase().includes(q) ||
      (e.fromAddress || '').toLowerCase().includes(q) ||
      (e.finalCategory || e.aiCategory || '').toLowerCase().includes(q)
    )
  })

  const category = (e: Email) => e.finalCategory || e.aiCategory || 'Other'
  const colorClass = (cat: string) => CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-base font-semibold text-gray-900">Memo & Emails</div>
          <div className="text-xs text-gray-400 mt-0.5">All case-related memos and email records</div>
        </div>
        <button className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg px-4 py-2">
          <Plus size={14} />
          New Memo
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-4">
        {MEMO_EMAIL_SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`pb-2 text-sm font-medium transition-colors ${
              subTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memos and emails..."
          className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-32">Category</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-48">Owner</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-xs text-gray-400">
                  {subTab === 'Memo' ? 'No memos yet.' : 'No emails found.'}
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const cat = category(e)
                return (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/emails/${e.id}`)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Pin size={11} className="text-amber-400 shrink-0" />
                        <Mail size={13} className="text-blue-400 shrink-0" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${colorClass(cat)}`}>
                        {cat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{e.subject}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {e.fromName || e.fromAddress}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(e.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Email panel ────────────────────────────────────────────────────────────

function EmailPanel({ emails, selected, onSelect, onConfirmed }: {
  emails: Email[]
  selected: Email | null
  onSelect: (e: Email | null) => void
  onConfirmed: (id: string) => void
}) {
  const { removeToast } = useEmailStore()
  const [confirming, setConfirming] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [category, setCategory] = useState(selected?.finalCategory || selected?.aiCategory || 'Other')
  const pending = emails.filter((e) => e.status === 'PENDING_REVIEW')
  const isAiSuggested = category === (selected?.aiCategory ?? '')

  useEffect(() => {
    setCategory(selected?.finalCategory || selected?.aiCategory || 'Other')
  }, [selected?.id])

  useEffect(() => {
    if (!selected) setListOpen(true)
  }, [selected?.id])

  if (pending.length === 0) return null

  const handleConfirm = async () => {
    if (!selected) return
    setConfirming(true)
    try {
      await emailApi.edit(selected.id, { finalCategory: category })
      removeToast(selected.id)
      onConfirmed(selected.id)
      onSelect(null)
    } finally { setConfirming(false) }
  }

  const restList = selected ? pending.filter((e) => e.id !== selected.id) : pending

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-3">

      {/* ── Pinned preview card ── */}
      {selected && (
        <div className="bg-blue-50 border-b-2 border-blue-500 px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Pin size={10} className="text-blue-500 shrink-0" />
                <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">New Email</span>
              </div>
              <div className="text-sm font-semibold text-gray-800 truncate">{selected.subject}</div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-gray-500 hover:text-gray-800 transition-colors p-0.5"
            >
              <X size={15} />
            </button>
          </div>

          {selected.aiSummary && (
            <div className="flex items-baseline gap-1.5 bg-white border border-blue-100 rounded-md px-3 py-2 mb-2">
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide shrink-0">AI Summary «</span>
              <p className="text-[12px] text-gray-600 leading-snug">{selected.aiSummary}</p>
            </div>
          )}

          <div className="text-[13px] leading-snug whitespace-pre-wrap bg-white rounded-md px-3 py-2 mb-3 max-h-[356px] overflow-y-auto" style={{ color: '#242424' }}>
            {(selected.body || selected.bodyPreview).replace(/\n{2,}/g, '\n\n')}
          </div>

          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v) }}>
              <SelectTrigger className="h-7 text-xs w-44 border-blue-200 !bg-white">
                <span className="flex items-center gap-1 truncate">
                  {isAiSuggested && (
                    <span className="text-[10px] font-semibold text-blue-400 shrink-0">AI:</span>
                  )}
                  <span>{category}</span>
                </span>
              </SelectTrigger>
              <SelectContent side="top" alignItemWithTrigger={false}>
                {EMAIL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm py-2">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={handleConfirm}
              disabled={confirming || selected.status === 'CONFIRMED'}
              className="flex items-center gap-1.5 h-7 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md px-3 transition-colors"
            >
              <CheckCircle2 size={11} />
              {selected.status === 'CONFIRMED' ? 'Confirmed' : confirming ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── List header (hidden when pinned and no others) ── */}
      {restList.length > 0 && (
      <button
        onClick={() => setListOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <Mail size={13} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-800">
          {selected ? 'Another Unclassified Emails' : 'Unclassified Emails'}
        </span>
        <span className="text-xs text-gray-400">{restList.length} pending</span>
        <span className="ml-auto text-[10px] text-blue-500">
          {listOpen ? '▲ Collapse' : '▼ Expand'}
        </span>
      </button>
      )}

      {/* ── List body ── */}
      {restList.length > 0 && listOpen && (
        <div className="divide-y divide-gray-50 border-t border-gray-100">
          {restList.map((e) => {
            return (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className="w-full text-left px-4 py-3 transition-colors relative hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate text-gray-800">
                      {e.subject}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      {e.aiSummary || e.bodyPreview.slice(0, 60)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400">{fmt(e.receivedAt)}</span>
                    {e.actionCategory && <CategoryBadge category={e.actionCategory} />}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Case Summary ───────────────────────────────────────────────────────────

function CaseSummary({ c }: { c: CaseDetail }) {
  const items = [
    { label: 'Case Number',   value: c.caseNumber },
    { label: 'Client Name',   value: c.clientName },
    { label: 'Handler (CM)',  value: c.handler },
    { label: 'Stage',         value: c.stage },
    { label: 'Date of Loss',  value: fmt(c.dateOfLoss) },
    { label: 'Due Date',      value: fmt(c.dueDate) },
    { label: 'Claim Numbers', value: c.claimNumbers.join(', ') || '—' },
  ]
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5">
      <div className="font-semibold text-sm text-gray-800 mb-4">Case Summary</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-xs font-medium text-gray-800">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const STAGE_BADGE: Record<string, string> = {
  'Intake':             'bg-slate-100 text-slate-600',
  'Pre-Litigation':     'bg-indigo-50 text-indigo-600',
  'Medical Collection': 'bg-sky-50 text-sky-600',
  'Demand':             'bg-yellow-50 text-yellow-700',
  'Negotiation':        'bg-teal-50 text-teal-600',
  'Settlement':         'bg-green-50 text-green-600',
  'Litigation':         'bg-red-50 text-red-500',
}

const DETAIL_TABS = [
  { label: 'Dashboard',      active: true },
  { label: 'Summary',        active: false },
  { label: 'Parties',        active: false },
  { label: 'Documents',      active: false },
  { label: 'Tasks & Review', active: false },
  { label: 'Memo & Emails',  active: true },
  { label: 'Litigation',     active: false },
  { label: 'Fee',            active: false },
]

export function MatterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const toasts = useEmailStore((s) => s.toasts)
  const sseToastId = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    caseApi.get(id).then(setC).finally(() => setIsLoading(false))
  }, [id])

  // Auto-select only when a new SSE toast arrives (not on restore/page-load)
  useEffect(() => {
    const latest = toasts[0]
    if (!latest || latest.id === sseToastId.current) return
    if (latest.matchedCaseId !== id) return
    sseToastId.current = latest.id
    caseApi.get(id!).then((updated) => {
      setC((prev) => prev ? { ...prev, emails: updated.emails } : updated)
      const email = updated.emails.find((e) => e.id === latest.id)
      if (email) setSelectedEmail(email)
    })
  }, [toasts, id])

  if (isLoading) return <Layout><div className="text-xs text-gray-400 py-10 text-center">Loading...</div></Layout>
  if (!c) return <Layout><div className="text-xs text-gray-400 py-10 text-center">Matter not found</div></Layout>

  const days = daysLeft(c.dueDate)
  const prefix = c.claimNumbers[0]?.split('-')[0]?.toUpperCase()
  const insurer = prefix ? (CLAIM_PREFIX_MAP[prefix] ?? c.claimNumbers[0]) : 'Unknown'
  const lastName = c.clientName.split(' ').slice(-1)[0]
  const caseTitle = `${lastName} v. ${insurer}`

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
        <button onClick={() => navigate('/matters')} className="hover:text-gray-600 transition-colors">Matters</button>
        <ChevronRight size={12} />
        <span className="text-gray-600">{c.caseNumber}</span>
      </div>

      {/* Header + Stage tracker */}
      <div className="bg-white border border-gray-100 rounded-lg px-6 py-4 mb-4">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900 mb-1.5">{caseTitle}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-600">Active</span>
            </div>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Date of Loss</div>
              <div className="text-xs font-medium text-gray-800">{fmt(c.dateOfLoss)}</div>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">SOL</div>
              <div className="text-xs font-medium text-gray-800">{fmt(c.dueDate)}</div>
              {days !== null && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${days < 90 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                  {days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
                </span>
              )}
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Case Manager</div>
              <div className="text-xs font-medium text-gray-800">{c.handler}</div>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Attorney</div>
              <div className="text-xs font-medium text-gray-800">—</div>
            </div>
            <button className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              Edit Matter
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-2">
          <StageTracker stage={c.stage} />
        </div>
      </div>

      {/* Tab menu */}
      <div className="flex border-b border-gray-200 mb-4">
        {DETAIL_TABS.map(({ label, active }) =>
          active ? (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === label
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ) : (
            <span
              key={label}
              title="Coming soon"
              className="px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed select-none whitespace-nowrap"
            >
              {label}
            </span>
          )
        )}
      </div>

      {/* Tab body */}
      {activeTab === 'Memo & Emails' ? (
        <MemoEmailsTab emails={c.emails} />
      ) : (
        <div className="grid grid-cols-[1fr_560px] gap-4">
          {/* Left: Timeline */}
          <div className="flex flex-col gap-4">
            <Timeline />
          </div>

          {/* Right: Emails + Important Notice + Case Summary */}
          <div className="flex flex-col">
            <EmailPanel
              emails={c.emails}
              selected={selectedEmail}
              onSelect={setSelectedEmail}
              onConfirmed={(id) => setC((prev) => prev ? { ...prev, emails: prev.emails.filter((e) => e.id !== id) } : prev)}
            />
            <ImportantNotice />
            <div className="mt-3">
              <CaseSummary c={c} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
