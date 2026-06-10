import { generateKeyBetween } from 'fractional-indexing'
import type { OrderKey } from '@/domain/types'

/**
 * Fractional ordering helpers. Reordering an item only rewrites that item's key
 * (no re-index of siblings), which is both fast and conflict-tolerant under sync.
 *
 * Convention: items are sorted ascending by `order`. `null` means "open end".
 */

/** Key for a new item appended after the current last item. */
export function orderAtEnd(last: OrderKey | null): OrderKey {
  return generateKeyBetween(last, null)
}

/** Key for a new item inserted before the current first item. */
export function orderAtStart(first: OrderKey | null): OrderKey {
  return generateKeyBetween(null, first)
}

/** Key that sorts strictly between `a` and `b` (either may be null = open end). */
export function orderBetween(a: OrderKey | null, b: OrderKey | null): OrderKey {
  return generateKeyBetween(a, b)
}

/** Ascending comparator on a fractional order field. */
export function byOrder<T extends { order: OrderKey }>(a: T, b: T): number {
  return a.order < b.order ? -1 : a.order > b.order ? 1 : 0
}
