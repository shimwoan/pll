const CATEGORY_DOT: Record<string, string> = {
  Settlement: 'bg-purple-400',
  Medical: 'bg-blue-400',
  Client: 'bg-orange-400',
  Insurance: 'bg-cyan-500',
  Police: 'bg-red-400',
  Other: 'bg-gray-300',
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-gray-300 text-xs">—</span>
  const known = CATEGORY_DOT[category]
  if (!known || category === 'Unclassified') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400 animate-pulse" />
        <span className="text-xs font-medium text-red-600">{category}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${known}`} />
      <span className="text-xs text-gray-600">{category}</span>
    </span>
  )
}
