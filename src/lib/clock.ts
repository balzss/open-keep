import type { Timestamp } from '@/domain/types'

/**
 * Single source of "now" so the sync phase can swap epoch-ms for a hybrid
 * logical clock in one place without touching call sites.
 */
export function now(): Timestamp {
  return Date.now()
}
