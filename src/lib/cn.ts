/** Tiny classnames joiner — concatenates truthy parts. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
