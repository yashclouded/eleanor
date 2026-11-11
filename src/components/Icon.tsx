const paths = {
  today: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  daily: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',
  progress: 'M4 4v16h16M8 14l4-5 4 2 5-7',
  leaderboard: 'M8 3h8v5a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 5 4m7-6h4v2a4 4 0 0 1-5 4m-3 1v6m-4 3h8m-6-3h4v3',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  echo: 'M8 7a7 7 0 1 1-2 9M3 7h5V2m1 10a3 3 0 1 0 3-3',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  flag: 'M5 21V3h14l-3 5 3 5H5',
  mail: 'M4 5h16v14H4Zm0 1 8 7 8-7',
  book: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2.5 5.5L8 16l2.5-5.5L16 8Z',
  calendar: 'M4 5h16v15H4V5Zm4-3v6m8-6v6M4 10h16m-12 4h2m4 0h2m-8 3h2',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v5l3 2',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
  chart: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  trophy: 'M7 3h10v5c0 5-2 7-5 7s-5-2-5-7V3Zm0 2H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4m-4 3v5m-4 1h8',
  logout: 'M10 4H4v16h6m5-13 5 5-5 5m-7-5h12',
  shield: 'm12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  logic: 'M5 3h5v5H5V3Zm9 13h5v5h-5v-5ZM7 8v10h7m-4-12h7v10M3 16h8',
  math: 'M5 5h14M5 19h14M8 8l8 8m0-8-8 8',
  judgment: 'M12 3v17m-6 1h12M4 7h16M6 7l-4 7h8L6 7Zm12 0-4 7h8l-4-7Z',
  volume: 'M3 9h4l5-5v16l-5-5H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M3 9h4l5-5v16l-5-5H3V9Zm13 0 6 6m0-6-6 6',
  cross: 'm6 6 12 12M18 6 6 18',
  medal: 'm6 3 3 7m9-7-3 7M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4v4m-2-2h4',
} as const

export function Icon({ name, className = '', size }: { name: keyof typeof paths; className?: string; size?: number }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} style={{ width: size, height: size }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 16C-2 16 2-2 12 5c3 2 4 6 4 11Zm0 0C16-2 34 2 27 12c-2 3-6 4-11 4Zm0 0c18 0 14 18 4 11-3-2-4-6-4-11Zm0 0c0 18-18 14-11 4 2-3 6-4 11-4Z" />
    </svg>
  )
}
