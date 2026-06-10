import type { ID } from '@/domain/types'

/** Stable, collision-resistant id. Sync-safe (no central counter). */
export function newId(): ID {
  return crypto.randomUUID()
}
