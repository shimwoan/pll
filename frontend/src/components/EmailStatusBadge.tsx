const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', dot: 'bg-amber-400', text: 'text-gray-600' },
  CONFIRMED: { label: 'Confirmed', dot: 'bg-gray-400', text: 'text-gray-500' },
  EDITED: { label: 'Edited', dot: 'bg-gray-400', text: 'text-gray-500' },
  UNCLASSIFIED: { label: 'Unclassified', dot: 'bg-gray-300', text: 'text-gray-400' },
}

export function EmailStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNCLASSIFIED
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span className={`text-xs ${config.text}`}>{config.label}</span>
    </span>
  )
}
