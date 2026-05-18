import { useNavigate } from 'react-router-dom'
import { useEmailStore } from '@/store/emailStore'
import type { ToastItem } from '@/lib/api'

const CATEGORY_STYLE: Record<string, { border: string; shadow: string; dot: string; text: string }> = {
  '답변 필요': {
    border: 'border-red-300',
    shadow: '[box-shadow:0_2px_8px_rgba(239,68,68,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-red-300',
    text: 'text-red-600',
  },
  '서류 제출': {
    border: 'border-amber-300',
    shadow: '[box-shadow:0_2px_8px_rgba(245,158,11,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-amber-300',
    text: 'text-amber-700',
  },
  '답변 확인': {
    border: 'border-blue-300',
    shadow: '[box-shadow:0_2px_8px_rgba(59,130,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-blue-300',
    text: 'text-blue-600',
  },
  '검토 필요': {
    border: 'border-violet-300',
    shadow: '[box-shadow:0_2px_8px_rgba(139,92,246,0.10),0_1px_3px_rgba(0,0,0,0.04)]',
    dot: 'bg-violet-300',
    text: 'text-violet-600',
  },
}

const DEFAULT_STYLE = {
  border: 'border-gray-200',
  shadow: '[box-shadow:0_1px_3px_rgba(0,0,0,0.04)]',
  dot: 'bg-gray-300',
  text: 'text-gray-400',
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`
  return `${Math.floor(diff / 86400)}일`
}

function ToastCard({ item }: { item: ToastItem }) {
  const navigate = useNavigate()
  const style = CATEGORY_STYLE[item.actionCategory] ?? DEFAULT_STYLE

  return (
    <div
      onClick={() => navigate(`/emails/${item.id}`)}
      className={`bg-white rounded-lg border ${style.border} ${style.shadow} px-3.5 py-2.5 cursor-pointer hover:brightness-95 transition-all`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[10px] font-semibold tracking-wide ${style.text}`}>
              {item.actionCategory}
            </span>
            <span className="text-[10px] text-gray-300">{timeAgo(item.receivedAt)}</span>
          </div>
          <p className="text-[11px] font-medium text-gray-700 truncate">{item.subject}</p>
          {item.aiSummary && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.aiSummary}</p>
          )}
          <p className="text-[10px] text-gray-300 mt-0.5">{item.fromName}</p>
        </div>
      </div>
    </div>
  )
}

export function ToastPanel() {
  const toasts = useEmailStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 max-h-[calc(100vh-80px)] overflow-y-auto flex flex-col gap-1.5">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
