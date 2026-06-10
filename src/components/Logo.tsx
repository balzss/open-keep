/** The app mark — same artwork as the favicon (blue card with note lines). */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Open Keep"
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" fill="#38bdf8" />
      <rect x="16" y="18" width="32" height="5" rx="2.5" fill="#202124" />
      <rect x="16" y="29.5" width="32" height="5" rx="2.5" fill="#202124" />
      <rect x="16" y="41" width="20" height="5" rx="2.5" fill="#202124" />
    </svg>
  )
}
