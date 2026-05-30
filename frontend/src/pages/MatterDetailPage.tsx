import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { CategoryBadge } from '@/components/CategoryBadge'
import { caseApi, emailApi, type CaseDetail, type Email } from '@/lib/api'
import { useEmailStore } from '@/store/emailStore'
import { ChevronRight, Check, Pin, Mail, CheckCircle2, X, Search, Plus, FileText, Send, Upload, Clock, Eye, MessageSquare } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const EMAIL_CATEGORIES = ['Response Required', 'Document Submission', 'Confirm Reply', 'Needs Review', 'For Reference', 'Unclassified']

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
                done ? 'bg-[#4B6CB7] border-[#4B6CB7] text-white' :
                active ? 'border-[#4B6CB7] bg-white text-[#4B6CB7]' :
                'border-gray-200 bg-white text-gray-300'
              }`}>
                {done ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px]">{i + 1}</span>}
              </div>
              <span className={`text-[12px] text-center leading-tight whitespace-nowrap ${
                active ? 'font-semibold text-[#4B6CB7]' : done ? 'text-gray-400' : 'text-gray-300'
              }`}>
                {s}
                {active && <><br /><span className="font-normal text-[9px]">In Progress</span></>}
              </span>
              {active && i < STAGES.length - 1 && (
                <button className="mt-1 text-[9px] text-[#4B6CB7] border border-[#4B6CB7] rounded px-1.5 py-0.5 hover:bg-[#4B6CB7] hover:text-white transition-colors whitespace-nowrap">
                  Next →
                </button>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-3 ${i < current ? 'bg-[#4B6CB7]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Stage Checklist ────────────────────────────────────────────────────────

const ACTION_CATEGORIES_FOR_CHECKLIST = new Set(['Response Required', 'Document Submission', 'Confirm Reply'])

type DynamicCheckItem = { id: string; label: string; isNew: boolean }

const STAGE_CHECKLISTS: Record<string, { id: string; label: string }[]> = {
  'Negotiation': [
    { id: 'neg-counter', label: 'Counter-offer sent to insurance adjuster' },
    { id: 'neg-response', label: 'Insurance response received & reviewed' },
    { id: 'neg-client', label: 'Client updated on negotiation status' },
    { id: 'neg-strategy', label: 'Litigation decision made if no resolution' },
  ],
  'Demand': [
    { id: 'dem-package', label: 'Demand package compiled & sent' },
    { id: 'dem-ack', label: 'Adjuster acknowledgment confirmed' },
    { id: 'dem-deadline', label: '30-day response deadline calendared' },
    { id: 'dem-client', label: 'Client notified of demand amount' },
  ],
  'Medical Collection': [
    { id: 'med-records', label: 'All medical records collected from providers' },
    { id: 'med-billing', label: 'Final billing summary compiled' },
    { id: 'med-lien', label: 'Medicare/Medi-Cal lien status confirmed' },
    { id: 'med-summary', label: 'Medical summary prepared for demand' },
  ],
  'Litigation': [
    { id: 'lit-complaint', label: 'File Complaint with court' },
    { id: 'lit-served', label: 'Serve Summons & Complaint via Process Server' },
  ],
  'Settlement': [
    { id: 'set-release', label: 'Release agreement signed by client' },
    { id: 'set-check', label: 'Settlement check received & deposited to trust' },
    { id: 'set-lien', label: 'Lien negotiation completed' },
    { id: 'set-disburse', label: 'Client disbursement processed' },
  ],
}

function StageChecklist({ stage, dynamicItems = [] }: { stage: string; dynamicItems?: DynamicCheckItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const staticItems = STAGE_CHECKLISTS[stage]
  if (!staticItems && dynamicItems.length === 0) return null

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="bg-white border border-gray-100 rounded px-4 py-3.5 mb-0">
      <div className="text-xs font-medium text-gray-700 mb-0.5">Checklist</div>
      <div className="text-[11px] text-gray-400 mb-3">{stage}</div>
      <div className="flex flex-col gap-2">
        {dynamicItems.map(({ id, label, isNew }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={`flex items-center gap-2.5 text-left group ${isNew ? 'checklist-item-new' : ''}`}
          >
            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
              checked[id] ? 'bg-gray-800 border-gray-800' : 'border-red-300 bg-white group-hover:border-red-400'
            }`}>
              {checked[id] && <Check size={8} strokeWidth={3} className="text-white" />}
            </div>
            <span className={`text-xs transition-colors ${checked[id] ? 'line-through text-gray-300' : 'text-gray-700'}`}>
              {label}
            </span>
          </button>
        ))}
        {staticItems?.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
              checked[id] ? 'bg-gray-800 border-gray-800' : 'border-gray-300 bg-white group-hover:border-gray-500'
            }`}>
              {checked[id] && <Check size={8} strokeWidth={3} className="text-white" />}
            </div>
            <span className={`text-xs transition-colors ${checked[id] ? 'line-through text-gray-300' : 'text-gray-600'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

type TimelineFile = { name: string; size: string }
type TimelineEntry =
  | { type: 'stage';    day: number; date: string; stage: string; handler: string; note?: string; files?: TimelineFile[] }
  | { type: 'call';     day: number; date: string; handler: string; duration: string; with: string; summary: string }
  | { type: 'document'; day: number; date: string; handler: string; files: TimelineFile[]; note: string }
  | { type: 'alert';    day: number; date: string; handler: string; message: string }

const DEMO_TIMELINE: TimelineEntry[] = [
  {
    type: 'stage',
    day: 0,
    date: '2026-01-15',
    stage: 'Intake',
    handler: 'Sarah Klein',
    note: 'Client walked in — rear-end collision on I-405. Retainer signed. Police report requested.',
    files: [
      { name: 'Retainer_Agreement_Kim.pdf', size: '284 KB' },
      { name: 'Accident_Photo_001.jpg', size: '1.2 MB' },
    ],
  },
  {
    type: 'call',
    day: 3,
    date: '2026-01-18',
    handler: 'Sarah Klein',
    duration: '12 min',
    with: 'Client (James Kim)',
    summary: 'Client confirmed ER visit at Cedars-Sinai on 1/15. Complaining of neck and lower back pain. Has not yet received police report. Advised to follow up with primary care and begin chiropractic treatment. Will send LOR to State Farm today.',
  },
  {
    type: 'stage',
    day: 8,
    date: '2026-01-23',
    stage: 'Claim Open',
    handler: 'Sarah Klein',
    note: 'LOR sent to State Farm. Claim # SF-2026-04471 confirmed. Adjuster: Mike Torres. Liability appears clear — at-fault driver cited.',
    files: [
      { name: 'LOR_StateFarm_SF-2026-04471.pdf', size: '118 KB' },
    ],
  },
  {
    type: 'call',
    day: 21,
    date: '2026-02-05',
    handler: 'Sarah Klein',
    duration: '8 min',
    with: 'Adjuster Mike Torres (State Farm)',
    summary: 'State Farm acknowledged LOR. Liability accepted at 100%. PD claim already opened by client. BI claim under review — adjuster requested medical records upon treatment completion. Noted policy limit $50K/$100K.',
  },
  {
    type: 'document',
    day: 34,
    date: '2026-02-18',
    handler: 'Sarah Klein',
    note: 'Received ER records from Cedars-Sinai and initial chiro billing. Uploaded to file.',
    files: [
      { name: 'CedarsSinai_ER_Records.pdf', size: '2.4 MB' },
      { name: 'CedarsSinai_Billing_01.pdf', size: '340 KB' },
      { name: 'ChiroCare_Initial_Treatment.pdf', size: '512 KB' },
    ],
  },
  {
    type: 'alert',
    day: 45,
    date: '2026-03-01',
    handler: 'System',
    message: "Follow-up overdue: No response from Dr. Patel's office re: medical records request sent 2/10. Reminder sent automatically.",
  },
  {
    type: 'call',
    day: 52,
    date: '2026-03-08',
    handler: 'Emily Davis',
    duration: '6 min',
    with: 'Client (James Kim)',
    summary: 'Client completed chiropractic care (20 sessions). Still experiencing intermittent neck pain. Referred to orthopedic specialist Dr. Reyes for final evaluation. Client approved demand amount range discussion.',
  },
  {
    type: 'stage',
    day: 89,
    date: '2026-04-14',
    stage: 'Medical Collection',
    handler: 'Emily Davis',
    note: 'All records collected. Total medical specials: $28,450. Final ortho report received — 8% permanent impairment rating.',
    files: [
      { name: 'DrReyes_Ortho_FinalReport.pdf', size: '890 KB' },
      { name: 'ChiroCare_Final_Billing.pdf', size: '620 KB' },
      { name: 'Medical_Summary_Kim_v1.pdf', size: '1.1 MB' },
    ],
  },
  {
    type: 'stage',
    day: 101,
    date: '2026-04-26',
    stage: 'Demand',
    handler: 'Emily Davis',
    note: 'Demand package sent to State Farm. Demand amount: $150,000 (policy limit). 30-day response window.',
    files: [
      { name: 'Demand_Package_Kim_v1.pdf', size: '3.8 MB' },
    ],
  },
  {
    type: 'call',
    day: 118,
    date: '2026-05-13',
    handler: 'Emily Davis',
    duration: '15 min',
    with: 'Adjuster Mike Torres (State Farm)',
    summary: 'State Farm counter-offer: $42,000. Adjuster cited gap in treatment (Feb–Mar) and disputed permanency. Rejected — below acceptable range. Advised will proceed to litigation if no improvement. Next call scheduled in 2 weeks.',
  },
  {
    type: 'stage',
    day: 125,
    date: '2026-05-20',
    stage: 'Negotiation',
    handler: 'Emily Davis',
    note: 'Counter at $120,000. Attached updated pain & suffering analysis and orthopedic permanency report.',
    files: [
      { name: 'Counter_Demand_Kim_120k.pdf', size: '1.4 MB' },
    ],
  },
]


function TimelineFiles({ files }: { files: TimelineFile[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors">
          <FileText size={10} className="text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-700 max-w-[160px] truncate">{f.name}</span>
          <span className="text-[10px] text-gray-400">{f.size}</span>
        </div>
      ))}
    </div>
  )
}

function CallSummaryField({ summary }: { summary: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(summary)
  const [saved, setSaved] = useState(value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleEdit = () => {
    setEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleSave = () => {
    setSaved(value)
    setEditing(false)
  }

  const handleCancel = () => {
    setValue(saved)
    setEditing(false)
  }

  return (
    <div className="border-l-2 border-gray-200 pl-3 py-0.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Summary</span>
        {!editing && (
          <button
            onClick={handleEdit}
            className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full text-xs text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleSave}
              className="text-[11px] font-medium text-white bg-gray-800 hover:bg-gray-900 rounded px-2.5 py-1 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-600 leading-relaxed">{saved}</p>
      )}
    </div>
  )
}

const TYPE_LABEL: Record<TimelineEntry['type'], string> = {
  stage:    'Stage',
  call:     'Call',
  document: 'Documents',
  alert:    'Alert',
}

const TYPE_COLOR: Record<TimelineEntry['type'], string> = {
  stage:    'text-[#4B6CB7]',
  call:     'text-[#0D9488]',
  document: 'text-violet-400',
  alert:    'text-amber-500',
}

const TYPE_DOT: Record<TimelineEntry['type'], string> = {
  stage:    'bg-[#4B6CB7]',
  call:     'bg-[#0D9488]',
  document: 'bg-violet-400',
  alert:    'bg-amber-400',
}

function Timeline() {
  return (
    <div className="bg-white border border-gray-100 rounded flex flex-col">
      <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-800">Timeline</div>
        <div className="text-xs text-gray-400 mt-0.5">Stage transitions, calls, documents, alerts</div>
      </div>
      <div className="overflow-y-auto px-5 py-4">
        <div className="relative">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-100" />
          <div className="flex flex-col gap-0">
            {[...DEMO_TIMELINE].reverse().map((t, i) => {
              const dateStr = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return (
                <div key={i} className="relative flex gap-4 pb-4">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 z-10 ${TYPE_DOT[t.type]}`} />
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-[11px] font-semibold ${TYPE_COLOR[t.type]}`}>
                          {t.type === 'call' ? `Call · ${t.duration}` :
                           t.type === 'stage' ? `→ ${t.stage}` :
                           TYPE_LABEL[t.type]}
                        </span>
                        {t.type === 'call' && (
                          <span className="text-[11px] text-gray-400">w/ {t.with}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-300 tabular-nums">Day {t.day}</span>
                        <span className="text-[10px] text-gray-400">{dateStr}</span>
                      </div>
                    </div>

                    {/* Content */}
                    {(t.type === 'stage' || t.type === 'document') && t.note && (
                      <p className="text-xs text-gray-500 leading-relaxed">{t.note}</p>
                    )}
                    {t.type === 'call' && (
                      <CallSummaryField summary={t.summary} />
                    )}
                    {t.type === 'alert' && (
                      <p className="text-xs text-amber-600 leading-relaxed">{t.message}</p>
                    )}

                    {/* Files */}
                    {'files' in t && t.files && t.files.length > 0 && <TimelineFiles files={t.files} />}

                    {/* Handler */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-gray-300">{t.handler}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
    <div className="bg-white border border-gray-100 rounded px-4 py-3.5 mb-2">
      <div className="flex items-center gap-2 mb-2.5">
        <Pin size={11} className="text-amber-400 shrink-0" />
        <span className="text-xs font-medium text-gray-700">Notices</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {DEMO_NOTICES.map((n, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[10px] text-gray-300 mt-0.5 tabular-nums shrink-0">{i + 1}</span>
            <span className="text-xs text-gray-600 leading-snug">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Memo & Emails Tab ──────────────────────────────────────────────────────

const MEMO_EMAIL_SUB_TABS = ['All', 'Response Required', 'Document Submission', 'Confirm Reply', 'Needs Review', 'For Reference', 'Unclassified'] as const
type MemoEmailSubTab = typeof MEMO_EMAIL_SUB_TABS[number]

const CATEGORY_COLORS: Record<string, string> = {
  Settlement: 'bg-slate-50 text-[#4B6CB7]',
  Medical:    'bg-teal-50 text-[#0D9488]',
  Client:     'bg-orange-50 text-orange-400',
  Insurance:  'bg-indigo-50 text-indigo-400',
  Police:     'bg-rose-50 text-rose-400',
  Strategy:   'bg-teal-50 text-teal-500',
  Other:      'bg-gray-100 text-gray-500',
}

function MemoEmailsTab({ emails }: { emails: Email[] }) {
  const [subTab, setSubTab] = useState<MemoEmailSubTab>('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const confirmed = emails.filter((e) => e.status === 'CONFIRMED' || e.status === 'EDITED')

  const filtered = confirmed.filter((e) => {
    if (subTab === 'All') return true
    return (e.actionCategory || 'Unclassified') === subTab
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
        <button className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#4B6CB7] hover:bg-[#3d5a9e] transition-colors rounded-lg px-4 py-2">
          <Plus size={14} />
          New Memo
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-none">
        {MEMO_EMAIL_SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`pb-2 text-sm font-medium transition-colors ${
              subTab === tab
                ? 'text-[#4B6CB7] border-b-2 border-[#4B6CB7] -mb-px'
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
          className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#4B6CB7]/40"
        />
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-16">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-48">Category</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-48">Owner</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide w-28">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-xs text-gray-400">
                  {subTab === 'All' ? 'No emails found.' : `No "${subTab}" emails.`}
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
                        <Mail size={13} className="text-[#4B6CB7] opacity-70 shrink-0" />
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
  onConfirmed: (email: Email) => void
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
      onConfirmed({ ...selected, finalCategory: category, actionCategory: selected.actionCategory ?? category })
      onSelect(null)
    } finally { setConfirming(false) }
  }

  const restList = selected ? pending.filter((e) => e.id !== selected.id) : pending

  return (
    <div className="bg-white border border-gray-100 rounded overflow-hidden mb-3">

      {/* ── Pinned preview card ── */}
      {selected && (
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gray-400 mb-0.5">New Email</div>
              <div className="text-sm font-medium text-gray-800 truncate">{selected.subject}</div>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-gray-300 hover:text-gray-600 transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          </div>

          {selected.aiSummary && (
            <div className="border-l-2 border-gray-200 pl-3 py-0.5 mb-2">
              <p className="text-[11px] text-gray-500 leading-snug">{selected.aiSummary}</p>
            </div>
          )}

          <div className="text-[12px] leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded px-3 py-2 mb-3 max-h-[356px] overflow-y-auto text-gray-700">
            {(selected.body || selected.bodyPreview).replace(/\n{2,}/g, '\n\n')}
          </div>

          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v) }}>
              <SelectTrigger className="h-7 text-xs w-44 border-gray-200 !bg-white">
                <span className="flex items-center gap-1 truncate">
                  {isAiSuggested && (
                    <span className="text-[10px] text-gray-400 shrink-0">AI</span>
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
              className="flex items-center gap-1.5 h-7 text-[11px] font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-40 rounded px-3 transition-colors"
            >
              <CheckCircle2 size={11} />
              {selected.status === 'CONFIRMED' ? 'Confirmed' : confirming ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── List header (hidden when pinned and no others) ── */}
      {restList.length > 0 && (
      <button
        onClick={() => setListOpen((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors border-t border-gray-50"
      >
        <Mail size={12} className="text-gray-300" />
        <span className="text-xs text-gray-600">
          {selected ? 'Other unclassified' : 'Unclassified emails'}
        </span>
        <span className="text-[10px] text-gray-400 tabular-nums">{restList.length}</span>
        <span className="ml-auto text-[10px] text-gray-300">
          {listOpen ? '▲' : '▼'}
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
    <div className="bg-white border border-gray-100 rounded p-4">
      <div className="text-xs font-medium text-gray-700 mb-3">Case Summary</div>
      <div className="flex flex-col gap-2.5">
        {items.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <span className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
              {label === 'Client Name' && (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />
              )}
              {label}
            </span>
            <span className="text-[11px] text-gray-700 text-right">{value}</span>
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
  { label: 'Retainer',       active: true },
  { label: 'Litigation',     active: false },
  { label: 'Fee',            active: false },
]

// ── Retainer Tab ───────────────────────────────────────────────────────────

type RetainerMethod = 'send' | 'upload'
type DeliveryMethod = 'email' | 'sms'

interface RetainerRecord {
  date: string
  method: 'email' | 'sms' | 'upload'
  sentTo: string
  status: 'sent' | 'signed' | 'pending'
  filename: string
}

const MOCK_HISTORY: RetainerRecord[] = [
  { date: '05/28/2026', method: 'email', sentTo: 'sarah.kim@email.com', status: 'sent',   filename: 'Retainer_Kim.pdf' },
  { date: '05/15/2026', method: 'upload', sentTo: 'In-person',          status: 'signed', filename: 'Retainer_v1_Kim.pdf' },
]

function RetainerTab({ clientName }: { clientName: string }) {
  const [method, setMethod] = useState<RetainerMethod>('send')
  const [delivery, setDelivery] = useState<DeliveryMethod>('email')
  const [email, setEmail] = useState('sarah.kim@email.com')
  const [phone, setPhone] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const statusBadge = (s: RetainerRecord['status']) => {
    if (s === 'signed')  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600"><Check size={9} strokeWidth={3} />Signed</span>
    if (s === 'sent')    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">Sent</span>
    return                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600"><Clock size={9} />Pending</span>
  }

  const methodIcon = (m: RetainerRecord['method']) => {
    if (m === 'email')  return <Mail size={12} className="text-gray-400" />
    if (m === 'sms')    return <MessageSquare size={12} className="text-gray-400" />
    return                     <Upload size={12} className="text-gray-400" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-base font-semibold text-gray-900">Retainer Agreement</div>
          <div className="text-xs text-gray-400 mt-0.5">Send for signature or upload signed copy</div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
          <Clock size={11} />
          Pending Signature
        </span>
      </div>

      {/* DocuSeal info */}
      <div className="flex items-center gap-2 bg-[#eff4ff] border border-[#c7d7f9] rounded-lg px-3 py-2 text-xs text-[#3b5fc9] mb-4">
        <FileText size={13} className="shrink-0" />
        <span>Powered by <strong>DocuSeal</strong> — HIPAA-compliant eSignature. BAA on file.</span>
      </div>

      {/* Method selector */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setMethod('send')}
          className={`flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-all ${
            method === 'send' ? 'border-[#4B6CB7] bg-[#eff4ff]' : 'border-gray-200 hover:border-[#4B6CB7] hover:bg-[#f8faff]'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${method === 'send' ? 'bg-[#4B6CB7] text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Send size={16} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">Send to Client</div>
            <div className="text-xs text-gray-500">Email or SMS via DocuSeal</div>
          </div>
        </button>

        <button
          onClick={() => setMethod('upload')}
          className={`flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-all ${
            method === 'upload' ? 'border-[#4B6CB7] bg-[#eff4ff]' : 'border-gray-200 hover:border-[#4B6CB7] hover:bg-[#f8faff]'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${method === 'upload' ? 'bg-[#4B6CB7] text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Upload size={16} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">Already Signed</div>
            <div className="text-xs text-gray-500">Upload signed PDF from in-person meeting</div>
          </div>
        </button>
      </div>

      {/* Send form */}
      {method === 'send' && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-4">
            <Send size={12} />
            Send Retainer for Signature
          </div>

          {/* Delivery toggle */}
          <div className="flex gap-2 mb-4">
            {(['email', 'sms'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDelivery(d)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  delivery === d ? 'bg-[#4B6CB7] text-white border-[#4B6CB7]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {d === 'email' ? <Mail size={11} /> : <MessageSquare size={11} />}
                {d === 'email' ? 'Email' : 'SMS'}
              </button>
            ))}
          </div>

          <div className="flex gap-2.5 mb-2.5">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">Client Name</label>
              <input
                className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:ring-1 focus:ring-[#4B6CB7]/40 focus:border-[#4B6CB7]"
                value={clientName}
                readOnly
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">
                {delivery === 'email' ? 'Email' : 'Phone'}
              </label>
              {delivery === 'email' ? (
                <input
                  className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:ring-1 focus:ring-[#4B6CB7]/40 focus:border-[#4B6CB7]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              ) : (
                <input
                  className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:ring-1 focus:ring-[#4B6CB7]/40 focus:border-[#4B6CB7]"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <label className="text-[11px] text-gray-500 font-medium">Template</label>
            <input
              className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-gray-100 text-gray-500 outline-none"
              value="Standard PI Retainer Agreement"
              readOnly
            />
          </div>

          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4B6CB7] hover:bg-[#3d5a9e] text-white text-xs font-semibold rounded-lg transition-colors">
              <Send size={12} />
              Send via DocuSeal
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-colors">
              <Eye size={12} />
              Preview
            </button>
          </div>
        </div>
      )}

      {/* Upload form */}
      {method === 'upload' && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-4">
            <Upload size={12} />
            Upload Signed Retainer
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false) }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center gap-2 mb-4 ${
              dragOver ? 'border-[#4B6CB7] bg-[#eff4ff]' : 'border-gray-300 hover:border-[#4B6CB7] hover:bg-[#f8faff]'
            }`}
          >
            <FileText size={28} className="text-gray-300" />
            <div className="text-xs font-medium text-gray-700">Drop signed PDF here, or click to browse</div>
            <div className="text-[11px] text-gray-400">PDF only · Max 20MB</div>
          </div>

          <div className="flex gap-2.5 mb-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">Date Signed</label>
              <input
                type="date"
                className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:ring-1 focus:ring-[#4B6CB7]/40 focus:border-[#4B6CB7]"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 font-medium">Signed By</label>
              <input
                className="h-8 px-2.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:ring-1 focus:ring-[#4B6CB7]/40 focus:border-[#4B6CB7]"
                value={clientName}
                readOnly
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4B6CB7] hover:bg-[#3d5a9e] text-white text-xs font-semibold rounded-lg transition-colors">
              <Upload size={12} />
              Upload & Save
            </button>
            <button
              onClick={() => setMethod('send')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="text-xs font-semibold text-gray-700 mb-2">Signature History</div>
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Method</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sent To</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Document</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_HISTORY.map((r, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5 text-xs text-gray-700">{r.date}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    {methodIcon(r.method)}
                    {r.method === 'email' ? 'Email' : r.method === 'sms' ? 'SMS' : 'Upload'}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{r.sentTo}</td>
                <td className="px-4 py-2.5">{statusBadge(r.status)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded px-2 py-0.5 text-[11px] text-gray-600">
                    <FileText size={10} />
                    {r.filename}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MatterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [dynamicCheckItems, setDynamicCheckItems] = useState<DynamicCheckItem[]>([])
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

  const handleEmailConfirmed = (email: Email) => {
    setC((prev) => prev ? { ...prev, emails: prev.emails.filter((e) => e.id !== email.id) } : prev)
    const cat = email.finalCategory || email.actionCategory || ''
    if (ACTION_CATEGORIES_FOR_CHECKLIST.has(cat)) {
      const label = email.aiSummary || email.subject
      const newItem: DynamicCheckItem = { id: email.id, label, isNew: true }
      setDynamicCheckItems((prev) => {
        if (prev.some((it) => it.id === email.id)) return prev
        return [newItem, ...prev]
      })
      setTimeout(() => {
        setDynamicCheckItems((prev) => prev.map((it) => it.id === email.id ? { ...it, isNew: false } : it))
      }, 5000)
    }
  }

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
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <button onClick={() => navigate('/matters')} className="hover:text-gray-600 transition-colors">Matters</button>
        <ChevronRight size={12} />
        <span className="text-gray-600">{c.caseNumber}</span>
      </div>

      {/* Header + Stage tracker */}
      <div className="bg-white border border-gray-100 rounded px-6 py-4 mb-2">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900 tracking-tight">{caseTitle}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-[#0D9488]">Active</span>
            </div>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Date of Loss</div>
              <div className="text-xs text-gray-700">{fmt(c.dateOfLoss)}</div>
            </div>
            <div className="w-px h-6 bg-gray-100" />
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">SOL</div>
              <div className="text-xs text-gray-700">{fmt(c.dueDate)}</div>
              {days !== null && (
                <span className={`text-[10px] tabular-nums ${days < 90 ? 'text-red-500' : 'text-gray-400'}`}>
                  {days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
                </span>
              )}
            </div>
            <div className="w-px h-6 bg-gray-100" />
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Case Manager</div>
              <div className="text-xs text-gray-700">{c.handler}</div>
            </div>
            <div className="w-px h-6 bg-gray-100" />
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">Attorney</div>
              <div className="text-xs text-gray-700">—</div>
            </div>
            <button className="text-xs text-gray-500 border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 transition-colors">
              Edit
            </button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-3">
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
                  ? 'text-[#4B6CB7] border-b-2 border-[#4B6CB7] -mb-px'
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
      ) : activeTab === 'Retainer' ? (
        <RetainerTab clientName={c.clientName} />
      ) : (
        <div className="grid grid-cols-[1fr_560px] gap-4">
          {/* Left: Timeline */}
          <div className="flex flex-col gap-4">
            <Timeline />
          </div>

          {/* Right: Checklist + Emails + Important Notice + Case Summary */}
          <div className="flex flex-col sticky top-[56px] self-start">
            <div className="mb-3">
              <StageChecklist stage={c.stage} dynamicItems={dynamicCheckItems} />
            </div>
            <EmailPanel
              emails={c.emails}
              selected={selectedEmail}
              onSelect={setSelectedEmail}
              onConfirmed={handleEmailConfirmed}
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
