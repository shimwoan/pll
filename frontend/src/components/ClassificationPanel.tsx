import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkTypeSelect } from './WorkTypeSelect'
import { CategoryBadge } from './CategoryBadge'
import type { Email } from '@/lib/api'
import { Check, Pencil, X } from 'lucide-react'

const CATEGORIES = ['Settlement', 'Medical', 'Client', 'Insurance', 'Police', 'Other']

interface ClassificationPanelProps {
  email: Email
  onConfirm: () => void
  onEdit: (data: { finalCategory: string; workTypeTitle: string }) => void
  onUnclassify: () => void
  isLoading?: boolean
}

export function ClassificationPanel({
  email,
  onConfirm,
  onEdit,
  onUnclassify,
  isLoading,
}: ClassificationPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [category, setCategory] = useState(email.aiCategory || 'Other')
  const [workType, setWorkType] = useState(email.workTypeTitle || '')

  const handleEdit = () => {
    onEdit({ finalCategory: category, workTypeTitle: workType })
    setIsEditing(false)
  }

  const confidencePct = email.aiConfidence ? Math.round(email.aiConfidence * 100) : null

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">AI Classification</h3>
        {confidencePct && (
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
            {confidencePct}% confidence
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Category</span>
          {isEditing ? (
            <Select value={category} onValueChange={(val) => { if (val !== null) setCategory(val) }}>
              <SelectTrigger className="h-7 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <CategoryBadge category={email.finalCategory || email.aiCategory} />
          )}
        </div>

        {email.aiReason && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-24 pt-0.5">Reason</span>
            <span className="text-xs text-gray-600 flex-1">{email.aiReason}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24">Work Type</span>
          {isEditing ? (
            <div className="flex-1">
              <WorkTypeSelect value={workType} onChange={setWorkType} />
            </div>
          ) : (
            <span className="text-xs text-gray-700">
              {email.workTypeTitle || <span className="text-gray-400">Not set</span>}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {!isEditing ? (
          <>
            {email.status === 'PENDING_REVIEW' && (
              <>
                <Button size="sm" onClick={onConfirm} disabled={isLoading} className="gap-1.5">
                  <Check size={13} /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil size={13} /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={onUnclassify} disabled={isLoading} className="gap-1.5 text-gray-500">
                  <X size={13} /> Unclassify
                </Button>
              </>
            )}
            {(email.status === 'CONFIRMED' || email.status === 'EDITED') && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
            )}
          </>
        ) : (
          <>
            <Button size="sm" onClick={handleEdit} disabled={isLoading}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  )
}
