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
} as const

export function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
