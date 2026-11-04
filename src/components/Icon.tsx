const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 6-2.5 5.5L8 16l2.5-5.5L16 8Z',
  calendar: 'M4 5h16v15H4V5Zm4-3v6m8-6v6M4 10h16m-12 4h2m4 0h2m-8 3h2',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v5l3 2',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
  chart: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  trophy: 'M7 3h10v5c0 5-2 7-5 7s-5-2-5-7V3Zm0 2H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4m-4 3v5m-4 1h8',
  settings: 'm9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3H9Zm3 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  logout: 'M10 4H4v16h6m5-13 5 5-5 5m-7-5h12',
  shield: 'm12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  echo: 'M5 5v5h5M5 10a8 8 0 1 1-1 6m8-9v5l3 2',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  logic: 'M5 3h5v5H5V3Zm9 13h5v5h-5v-5ZM7 8v10h7m-4-12h7v10M3 16h8',
  math: 'M5 5h14M5 19h14M8 8l8 8m0-8-8 8',
  judgment: 'M12 3v17m-6 1h12M4 7h16M6 7l-4 7h8L6 7Zm12 0-4 7h8l-4-7Z',
  volume: 'M3 9h4l5-5v16l-5-5H3V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M3 9h4l5-5v16l-5-5H3V9Zm13 0 6 6m0-6-6 6',
  check: 'm5 12 4 4L19 6',
  cross: 'm6 6 12 12M18 6 6 18',
  flag: 'M5 21V3h14l-3 4 3 4H5',
  medal: 'm6 3 3 7m9-7-3 7M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4v4m-2-2h4',
}

export type IconName = keyof typeof paths

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
