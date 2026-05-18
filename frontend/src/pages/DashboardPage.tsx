import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Layout } from '@/components/Layout'
import { AlertTriangle, Mail } from 'lucide-react'

const settlementTrend = [
  { month: 'Nov', amount: 312000 },
  { month: 'Dec', amount: 485000 },
  { month: 'Jan', amount: 291000 },
  { month: 'Feb', amount: 620000 },
  { month: 'Mar', amount: 543000 },
  { month: 'Apr', amount: 710000 },
  { month: 'May', amount: 488000 },
]

const stagePipeline = [
  { stage: 'Intake', count: 8 },
  { stage: 'Claim', count: 14 },
  { stage: 'Medical', count: 22 },
  { stage: 'Demand', count: 11 },
  { stage: 'Negotiation', count: 9 },
  { stage: 'Settlement', count: 5 },
  { stage: 'Litigation', count: 7 },
]

const cmWorkload = [
  { name: 'Sarah K.', active: 18, overdue: 3 },
  { name: 'James L.', active: 22, overdue: 5 },
  { name: 'Maria C.', active: 15, overdue: 1 },
  { name: 'David P.', active: 20, overdue: 4 },
  { name: 'Linda T.', active: 12, overdue: 0 },
]

const solAlerts = [
  { caseNo: 'PI-2024-0142', client: 'Kim, John', type: 'Auto Accident', daysLeft: 28, severity: 'critical' },
  { caseNo: 'PI-2024-0189', client: 'Park, Susan', type: 'City Claim', daysLeft: 41, severity: 'warning' },
  { caseNo: 'PI-2023-0387', client: 'Lee, Michael', type: 'Slip & Fall', daysLeft: 53, severity: 'warning' },
]

const recentActivity = [
  { time: '10m ago', event: 'Settlement reached', detail: 'PI-2024-0098 · $145,000' },
  { time: '32m ago', event: 'Demand sent', detail: 'PI-2024-0134 · State Farm' },
  { time: '1h ago', event: 'Medical records received', detail: 'PI-2023-0389 · Cedars Sinai' },
]

const kpis = [
  { label: 'Active Cases', value: '76', delta: '+4 this week' },
  { label: 'Avg. Settlement', value: '$498K', delta: '+12% vs last quarter' },
  { label: 'Pending Tasks', value: '143', delta: '18 overdue' },
  { label: 'Closed This Month', value: '9', delta: '$1.2M disbursed' },
]

const stageColor = (stage: string) => {
  const map: Record<string, string> = {
    Litigation: '#9ca3af',
    Settlement: '#6b7280',
    Negotiation: '#78716c',
    Demand: '#92400e',
    Medical: '#374151',
    Claim: '#1e3a5f',
    Intake: '#475569',
  }
  return map[stage] ?? '#9ca3af'
}

const solBadge = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  notice: 'text-gray-500',
}

const solDot = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
  notice: 'bg-gray-300',
}

const customTooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  boxShadow: 'none',
  color: '#374151',
}

const criticalSol = solAlerts.filter(a => a.severity === 'critical').length
const warningSol = solAlerts.filter(a => a.severity === 'warning').length

export function DashboardPage() {
  return (
    <Layout>
      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Operations Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Firm-wide performance and case activity</p>
        </div>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Alert Strip */}
      <div className="flex items-stretch gap-3 mb-6">
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-4 flex-1">
          <AlertTriangle size={13} className="text-red-500 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide leading-none mb-0.5">SOL Critical</div>
            <div className="text-xs text-red-800">
              <span className="font-semibold">{criticalSol}</span> case{criticalSol !== 1 ? 's' : ''} within 30 days
              {warningSol > 0 && <span className="text-red-400 ml-1.5">+{warningSol} warnings</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-lg px-4 py-4 flex-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-none mb-0.5">Overdue Tasks</div>
            <div className="text-xs text-gray-800">
              <span className="font-semibold">18</span> tasks past due across <span className="font-semibold">5</span> staff
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-lg px-4 py-4 flex-1">
          <Mail size={13} className="text-gray-400 shrink-0" />
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-none mb-0.5">Email Queue</div>
            <div className="text-xs text-gray-800">
              <span className="font-semibold">34</span> unreviewed · <span className="font-semibold text-gray-500">12</span> unclassified
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.map(({ label, value, delta }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-lg px-4 py-2.5">
            <div className="text-xs text-gray-400 mb-0.5 uppercase tracking-wide font-medium">{label}</div>
            <div className="text-xl font-semibold text-gray-800 leading-tight">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{delta}</div>
          </div>
        ))}
      </div>

      {/* Operational: SOL + Pipeline + CM */}
      <div className="grid grid-cols-5 gap-3 mb-6 items-stretch">
        <div className="col-span-2 bg-white border border-gray-100 rounded-lg p-4 flex flex-col">
          <div className="text-sm font-medium text-gray-700 mb-0.5">SOL Deadlines</div>
          <div className="text-xs text-gray-400 mb-2">Statute of limitations tracking</div>
          <div className="flex-1 flex flex-col justify-around space-y-0">
            {solAlerts.map((item) => (
              <div key={item.caseNo} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${solDot[item.severity as keyof typeof solDot]}`} />
                  <div>
                    <div className="text-xs font-medium text-gray-700 leading-tight">{item.client}</div>
                    <div className="text-xs text-gray-400 leading-tight">{item.caseNo} · {item.type}</div>
                  </div>
                </div>
                <div className={`text-xs font-semibold tabular-nums ${solBadge[item.severity as keyof typeof solBadge]}`}>
                  {item.daysLeft}d
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white border border-gray-100 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-0.5">Case Pipeline</div>
          <div className="text-xs text-gray-400 mb-2">Active cases by stage</div>
          <ResponsiveContainer width="100%" height={148}>
            <BarChart data={stagePipeline} layout="vertical" barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {stagePipeline.map((entry) => (
                  <Cell key={entry.stage} fill={stageColor(entry.stage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-1 bg-white border border-gray-100 rounded-lg p-4 flex flex-col">
          <div className="text-sm font-medium text-gray-700 mb-0.5">CM Workload</div>
          <div className="text-xs text-gray-400 mb-2">Active · Overdue</div>
          <div className="flex-1 flex flex-col justify-around">
            {cmWorkload.map(({ name, active, overdue }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{name}</span>
                  <div className="flex items-center gap-1.5 text-xs tabular-nums">
                    <span className="text-gray-700 font-medium">{active}</span>
                    {overdue > 0 && <span className="text-amber-600">{overdue}!</span>}
                  </div>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 rounded-full" style={{ width: `${(active / 25) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trends + Activity */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-4 bg-white border border-gray-100 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-0.5">Settlement Trend</div>
          <div className="text-xs text-gray-400 mb-2">Monthly closed settlement amount</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={settlementTrend} margin={{ top: 16, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#374151" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#374151" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Settlement']} contentStyle={customTooltipStyle} />
              <Area type="monotone" dataKey="amount" stroke="#374151" strokeWidth={1.5} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-1 bg-white border border-gray-100 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-0.5">Recent Activity</div>
          <div className="text-xs text-gray-400 mb-3">Latest events</div>
          <div className="space-y-2.5">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 leading-tight">{item.event}</span>
                  <span className="text-xs text-gray-300 shrink-0 ml-1">{item.time}</span>
                </div>
                <span className="text-xs text-gray-400 truncate leading-tight">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
