import { title as getTitle } from '../../supabase/functions/_shared/model.ts'

export interface TitleBadgeProps {
  title?: string
  rating?: number
  className?: string
}

export function TitleBadge({ title, rating, className = '' }: TitleBadgeProps) {
  const displayTitle = title ?? (rating !== undefined ? getTitle(rating) : 'Novice')
  const slug = displayTitle.toLowerCase()

  return (
    <span
      className={`title-badge title-${slug} ${className}`.trim()}
      data-testid="title-badge"
    >
      {displayTitle}
    </span>
  )
}
