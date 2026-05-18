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
  const dot = CATEGORY_DOT[category] ?? CATEGORY_DOT.Other
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-xs text-gray-600">{category}</span>
    </span>
  )
}
