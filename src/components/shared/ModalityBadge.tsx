import { Badge } from '@/components/ui/badge'
import type { Modality } from '@/types'
import { cn } from '@/lib/utils'

interface ModalityBadgeProps {
  modality: Modality
}

export function ModalityBadge({ modality }: ModalityBadgeProps) {
  const getModalityStyles = (modality: Modality) => {
    switch (modality) {
      case 'XR':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200'
      case 'CT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'US':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'MRI':
        return 'bg-violet-100 text-violet-800 border-violet-200'
      case 'MAMMO':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return ''
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-semibold', getModalityStyles(modality))}
    >
      {modality}
    </Badge>
  )
}
