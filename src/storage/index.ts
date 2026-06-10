import { IdbRepository } from './idb/IdbRepository'
import type { Repository } from './Repository'

export type { Repository } from './Repository'

let instance: Repository | null = null

/**
 * Single entry point for persistence. v1 returns the IndexedDB adapter; later
 * this reads config to return a SQLite/OPFS or HTTP adapter — no call-site changes.
 */
export function getRepository(): Repository {
  if (!instance) instance = new IdbRepository()
  return instance
}
