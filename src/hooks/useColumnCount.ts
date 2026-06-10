import { useMediaQuery } from './useMediaQuery'

/**
 * Responsive column count for the note grid. Mobile-first: a single full-width
 * column on phones, widening to 2/3/4 as the viewport grows.
 */
export function useColumnCount(): number {
  const md = useMediaQuery('(min-width: 768px)')
  const lg = useMediaQuery('(min-width: 1024px)')
  const xl = useMediaQuery('(min-width: 1280px)')
  if (xl) return 4
  if (lg) return 3
  if (md) return 2
  return 1
}
