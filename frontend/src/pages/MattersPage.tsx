import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Input } from '@/components/ui/input'
import { caseApi, type Case } from '@/lib/api'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'

const STAGE_STYLES: Record<string, { dot: string; text: string }> = {
  'Intake':             { dot: 'bg-slate-400',   text: 'text-slate-500'   },
  'Pre-Litigation':     { dot: 'bg-indigo-400',  text: 'text-indigo-500'  },
  'Medical Collection': { dot: 'bg-sky-400',     text: 'text-sky-600'     },
  'Demand':             { dot: 'bg-amber-400',   text: 'text-amber-600'   },
  'Negotiation':        { dot: 'bg-violet-400',  text: 'text-violet-600'  },
  'Settlement':         { dot: 'bg-teal-400',    text: 'text-teal-600'    },
  'Litigation':         { dot: 'bg-rose-400',    text: 'text-rose-500'    },
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_STYLES[stage] ?? { dot: 'bg-gray-300', text: 'text-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {stage}
    </span>
  )
}

export function MattersPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetch = (q: string) => {
    setIsLoading(true)
    caseApi.list(q ? { search: q } : undefined)
      .then(setCases)
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { fetch('') }, [])

  const handleSearch = (v: string) => {
    setSearch(v)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetch(v), 300)
  }

  const stats = {
    active: cases.length,
    litigation: cases.filter((c) => c.stage === 'Litigation').length,
    settlement: cases.filter((c) => c.stage === 'Settlement').length,
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Matters</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage all case files and litigation</p>
        </div>
        <button className="flex items-center gap-1.5 h-[30px] text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors rounded px-3">
          <Plus size={11} />
          New Matter
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search matters by name, client, or case number..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-[34px] text-xs border-gray-200"
          />
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded px-3 h-[34px] hover:bg-gray-50 transition-colors">
          <SlidersHorizontal size={11} />
          Filter
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Active Cases',    value: stats.active },
          { label: 'In Litigation',   value: stats.litigation },
          { label: 'Settlement Phase', value: stats.settlement },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded px-5 py-3.5">
            <div className="text-xl font-semibold text-gray-800 tabular-nums">{s.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Matter', 'Client Name', 'Date of Loss', 'Type', 'Status', 'Due Date', 'Handler'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">Loading...</td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No matters found</td>
              </tr>
            ) : cases.map((c) => {
              const fmtDate = (d: string | null) =>
                d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'
              const isOverdue = c.dueDate ? new Date(c.dueDate) < new Date() : false
              return (
                <tr key={c.id} onClick={() => navigate(`/matters/${c.id}`)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-700">{c.caseNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{c.clientName}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{fmtDate(c.dateOfLoss)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">Auto v. Auto</td>
                  <td className="px-4 py-3">
                    <StageBadge stage={c.stage} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs tabular-nums ${isOverdue ? 'text-rose-400' : 'text-gray-500'}`}>
                      {fmtDate(c.dueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.handler}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
