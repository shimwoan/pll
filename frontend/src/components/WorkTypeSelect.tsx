import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const WORK_TYPES = [
  'Settlement Negotiation Update',
  'Medical Records Request',
  'Insurance Adjuster Communication',
  'LOR Confirmation',
  'Client Status Update',
  'Police Report Follow-up',
  'Coverage / Liability Review',
  'DMV / Government Communication',
  'Other',
]

interface WorkTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

export function WorkTypeSelect({ value, onChange }: WorkTypeSelectProps) {
  const [isCustom, setIsCustom] = useState(false)

  const handleSelect = (val: string | null) => {
    if (val === null) return
    if (val === 'Other') {
      setIsCustom(true)
      onChange('')
    } else {
      setIsCustom(false)
      onChange(val)
    }
  }

  if (isCustom) {
    return (
      <Input
        placeholder="Enter custom work type..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
        autoFocus
      />
    )
  }

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="h-8 text-sm w-full">
        <SelectValue placeholder="Select work type..." />
      </SelectTrigger>
      <SelectContent>
        {WORK_TYPES.map((t) => (
          <SelectItem key={t} value={t} className="text-sm">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
