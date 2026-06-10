import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom has no matchMedia; default to desktop so layout components render.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList
}
