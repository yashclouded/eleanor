export function TrackArt({ track, className = '' }: { track: string; className?: string }) {
  return (
    <svg className={`track-art ${className}`} viewBox="0 0 200 160" fill="none" aria-hidden="true">
      {track === 'judgment' ? (
        <g transform="translate(100 80)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse key={angle} rx="21" ry="48" cy="-24" transform={`rotate(${angle})`} fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth=".8" />
          ))}
          <circle r="15" fill="currentColor" />
          <circle r="5" fill="var(--art-paper)" />
        </g>
      ) : track === 'logic' ? (
        <g stroke="currentColor" strokeWidth="1.5">
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={40 + i * 9} y={23 + i * 9} width="78" height="78" rx="16" fill="var(--art-paper)" />)}
          <path d="m89 72 24 24-24 24" />
        </g>
      ) : track === 'math' ? (
        <g stroke="currentColor" strokeWidth="1.2">
          {[22, 34, 46, 58, 70].map((r) => <circle key={r} cx="100" cy="80" r={r} />)}
          <path d="M30 80h140M100 10v140" strokeOpacity=".3" />
          <circle cx="137" cy="37" r="9" fill="currentColor" stroke="var(--art-paper)" strokeWidth="4" />
          <circle cx="100" cy="80" r="5" fill="currentColor" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="1.5">
          <rect x="38" y="18" width="124" height="124" rx="28" transform="rotate(10 100 80)" strokeOpacity=".25" />
          <rect x="38" y="18" width="124" height="124" rx="28" transform="rotate(-10 100 80)" strokeOpacity=".5" />
          <rect x="38" y="18" width="124" height="124" rx="28" fill="var(--art-paper)" />
          <path d="m80 59-21 21 21 21m40-42 21 21-21 21m-13-49-14 56" strokeWidth="3" />
        </g>
      )}
    </svg>
  )
}
