import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkTypeSelect } from './WorkTypeSelect'
import { CategoryBadge } from './CategoryBadge'
import type { Email } from '@/lib/api'
import { Check, Pencil } from 'lucide-react'

const CATEGORIES = ['Response Required', 'Document Submission', 'Confirm Reply', 'Needs Review', 'For Reference', 'Unclassified']

interface ClassificationPanelProps {
  email: Email
  onConfirm: (data: { finalCategory: string; workTypeTitle: string }) => void
  onEdit: (data: { finalCategory: string; workTypeTitle: string }) => void
  isLoading?: boolean
}

export function ClassificationPanel({
  email,
  onConfirm,
  onEdit,
  isLoading,
}: ClassificationPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [category, setCategory] = useState(email.finalCategory || email.aiCategory || 'Other')
  const [workType, setWorkType] = useState(email.workTypeTitle || '')

  const handleEdit = () => {
    onEdit({ finalCategory: category, workTypeTitle: workType })
    setIsEditing(false)
  }

  const confidencePct = email.aiConfidence ? Math.round(email.aiConfidence * 100) : null

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-medium text-gray-700">AI Classification</div>
          <div className="text-xs text-gray-400">Auto-detected from email content</div>
        </div>
        {confidencePct && (
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
            {confidencePct}% confidence
          </span>
        )}
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Category</span>
          {isEditing ? (
            <Select value={category} onValueChange={(val) => { if (val !== null) setCategory(val) }}>
              <SelectTrigger className="h-6 text-xs w-36 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <CategoryBadge category={email.finalCategory || email.aiCategory} />
          )}
        </div>

        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Work Type</span>
          {isEditing ? (
            <div className="w-36">
              <WorkTypeSelect value={workType} onChange={setWorkType} />
            </div>
          ) : (
            <span className="text-xs text-gray-700">
              {email.workTypeTitle || <span className="text-gray-300">Not set</span>}
            </span>
          )}
        </div>

        {email.aiReason && (
          <div className="py-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Reason</div>
            <div className="text-xs text-gray-600 leading-relaxed">{email.aiReason}</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isEditing ? (
          <>
            {email.status === 'PENDING_REVIEW' && (
              <>
                <span className="text-xs text-gray-500 font-medium self-center">Category:</span>
                <Select value={category} onValueChange={(val) => { if (val) setCategory(val) }}>
                  <SelectTrigger className="h-7 text-xs w-32 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => onConfirm({ finalCategory: category, workTypeTitle: workType })}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs font-medium bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  <Check size={11} /> Confirm
                </button>
              </>
            )}
            {(email.status === 'CONFIRMED' || email.status === 'EDITED') && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
              </>
            )}
            {email.status === 'UNCLASSIFIED' && (
              <>
                <span className="text-xs text-gray-500 font-medium self-center">Category:</span>
                <Select value={category} onValueChange={(val) => { if (val) setCategory(val) }}>
                  <SelectTrigger className="h-7 text-xs w-32 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => onConfirm({ finalCategory: category, workTypeTitle: workType })}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs font-medium bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  <Check size={11} /> Confirm
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className="text-xs font-medium bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
