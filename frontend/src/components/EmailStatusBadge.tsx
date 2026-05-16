const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
  EDITED: { label: 'Edited', className: 'bg-blue-100 text-blue-800' },
  UNCLASSIFIED: { label: 'Unclassified', className: 'bg-gray-100 text-gray-600' },
}

export function EmailStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.UNCLASSIFIED
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
