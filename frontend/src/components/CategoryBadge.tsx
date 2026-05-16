const CATEGORY_COLORS: Record<string, string> = {
  Settlement: 'bg-purple-100 text-purple-700',
  Medical: 'bg-blue-100 text-blue-700',
  Client: 'bg-orange-100 text-orange-700',
  Insurance: 'bg-cyan-100 text-cyan-700',
  Police: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
}

export function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null
  const cls = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {category}
    </span>
  )
}
