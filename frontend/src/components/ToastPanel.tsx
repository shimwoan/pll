import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import type { ToastItem } from '@/lib/api'

const CATEGORY_STYLE: Record<string, { border: string; shadow: string; dot: string; text: string; hoverBg: string }> = {
  'Response Required': {
    border: 'border-red-300',
    shadow: '[box-shadow:0_2px_8px_rgba(239,68,68,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-red-300',
    text: 'text-red-600',
    hoverBg: '#fef9f9',
  },
  'Document Submission': {
    border: 'border-amber-300',
    shadow: '[box-shadow:0_2px_8px_rgba(245,158,11,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-amber-300',
    text: 'text-amber-700',
    hoverBg: '#fefdf8',
  },
  'Confirm Reply': {
    border: 'border-blue-300',
    shadow: '[box-shadow:0_2px_8px_rgba(59,130,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-blue-300',
    text: 'text-blue-600',
    hoverBg: '#f8fbff',
  },
  'Needs Review': {
    border: 'border-violet-300',
    shadow: '[box-shadow:0_2px_8px_rgba(139,92,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-violet-300',
    text: 'text-violet-600',
    hoverBg: '#faf8ff',
  },
  'For Reference': {
    border: 'border-gray-200',
    shadow: '[box-shadow:0_2px_8px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-gray-300',
    text: 'text-gray-500',
    hoverBg: '#fafafa',
  },
}

const DEFAULT_STYLE = {
  border: 'border-red-200',
  shadow: '[box-shadow:0_2px_8px_rgba(239,68,68,0.12),0_1px_3px_rgba(0,0,0,0.04)]',
  dot: 'bg-red-400',
  text: 'text-red-500',
  hoverBg: '#fef9f9',
}

function timeAgo(iso: string, now: number): string {
  const diff = Math.floor((now - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 7200) return '1h ago'
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ToastCard({ item, now, fresh, onDismiss }: { item: ToastItem; now: number; fresh: boolean; onDismiss: () => void }) {
  const navigate = useNavigate()
  const { clearFreshToast } = useEmailStore()
  const style = CATEGORY_STYLE[item.actionCategory] ?? DEFAULT_STYLE
  const [visible, setVisible] = useState(!fresh)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!fresh) return
    const id = requestAnimationFrame(() => setVisible(true))
    clearFreshToast()
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      onClick={() => item.matchedCaseId ? navigate(`/matters/${item.matchedCaseId}`) : navigate(`/emails/${item.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease, background-color 0.15s ease',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        backgroundColor: hovered ? style.hoverBg : '#ffffff',
      }}
      className={`relative rounded-lg border ${style.border} ${style.shadow} px-3.5 py-2.5 cursor-pointer`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss() }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
      <div className="flex gap-2.5">
        <span className={`w-1.5 h-1.5 mt-2.5 rounded-full shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0 pr-3">
          <span className={`mb-1.5 text-[13px] font-semibold tracking-wide ${style.text}`}>
              {item.actionCategory}
            </span>
          <p className="text-[13px] font-medium text-gray-700 truncate">{item.subject}</p>
          {item.aiSummary && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              <span className="font-semibold text-blue-400 mr-1">AI:</span>
              {item.aiSummary}
            </p>
          )}
          <p className="text-right text-xs text-gray-400 mt-1">from: {item.fromName} · {timeAgo(item.receivedAt, now)}</p>
        </div>
      </div>
    </div>
  )
}

export function ToastPanel() {
  const toasts = useEmailStore((s) => s.toasts)
  const freshToastId = useEmailStore((s) => s.freshToastId)
  const [now, setNow] = useState(Date.now)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const visible = toasts.filter((t) => !dismissed.has(t.id))
  if (visible.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 max-h-[calc(100vh-80px)] overflow-y-auto flex flex-col gap-1.5 overflow-x-hidden">
      {visible.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          now={now}
          fresh={item.id === freshToastId}
          onDismiss={() => setDismissed((prev) => new Set(prev).add(item.id))}
        />
      ))}
    </div>
  )
}
