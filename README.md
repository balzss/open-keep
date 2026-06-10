# Open Keep

A lightweight, mobile-first Google Keep clone — a fast, installable PWA for
note-taking. Built to be small and snappy first, with strong UX on phones and
desktop alike.

## Features (v1)

- **Text notes** and **checklists**, with one-tap conversion between them.
- **Tags/labels** — create on the fly, filter by label, manage in bulk.
- **Search** across titles, body text, and checklist items.
- **Archive**, **trash/restore**, and **drag-to-reorder**.
- **Dark mode** (follows system, with a manual toggle).
- **Offline-first PWA** — installable, works with no network. All data is local.
- **Export / import** your data as JSON (backup, and the seam for future sync).

## Stack

Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand · dnd-kit ·
IndexedDB (via `idb`) · vite-plugin-pwa · Biome · Vitest.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Other scripts:

```bash
pnpm build      # type-check + production build (emits a service worker)
pnpm preview    # serve the production build locally
pnpm test       # run unit + integration tests (Vitest)
pnpm lint       # Biome (lint + format check)
pnpm format     # Biome auto-format
```

PWA icons are generated from scratch (no image deps):
`node scripts/generate-icons.mjs`.

## Architecture

Strict one-way dependencies keep the persistence layer swappable:

```
features/ ──▶ store/ ──▶ storage/ ──▶ domain/
```

- **`domain/`** — the data model (`Note`, `ChecklistItem`, `Tag`). Designed
  sync-ready: stable UUIDs, fractional ordering keys, soft-delete tombstones,
  and `updatedAt`.
- **`storage/`** — a single async `Repository` interface. v1 ships
  `IdbRepository` (IndexedDB). Because every method is async, swapping in a
  SQLite/OPFS or self-hosted HTTP adapter later is a zero-call-site change —
  just return a different class from `getRepository()`.
- **`store/`** — Zustand stores. Notes live in memory for instant filtering and
  search; writes are optimistic (UI updates first, then persists, rolls back on
  failure). The store is the only caller of the repository.
- **`features/` + `layout/`** — UI. Components subscribe via narrow selectors so
  editing one note doesn't re-render the grid.

### Roadmap

The model and storage seam are built for what's next, none of which requires
touching the UI or store:

1. **SQLite option** — a `SqliteRepository` (wa-sqlite/OPFS on the client, or an
   HTTP client to a self-hosted server) implementing the same interface.
2. **Self-hosting** — serve the same PWA against that server.
3. **Multi-device sync** — UUIDs + `updatedAt` + tombstones + fractional order +
   JSON export are already in place; the open call for that phase is LWW-per-note
   vs a CRDT (e.g. Yjs) for concurrent body edits.

## Testing

`pnpm test` covers the storage adapter (CRUD, export/import round-trip), the
selectors (view/tag/search filtering and sort), the store (optimistic actions
with rollback-on-failure, reorder, tag cascade), and app-level integration tests
that drive the real React tree (compose a note, reload-persistence, checklist
rendering, text→checklist conversion, search).
