export function hostingHeaders(supabaseUrl: string): string {
  const url = new URL(supabaseUrl)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('Supabase must use HTTPS, or local HTTP for testing')
  }
  const denied = ['accelerometer', 'ambient-light-sensor', 'autoplay', 'battery', 'camera', 'clipboard-read', 'display-capture', 'document-domain', 'encrypted-media', 'fullscreen', 'gamepad', 'geolocation', 'gyroscope', 'hid', 'idle-detection', 'local-fonts', 'magnetometer', 'microphone', 'midi', 'otp-credentials', 'payment', 'picture-in-picture', 'publickey-credentials-create', 'publickey-credentials-get', 'screen-wake-lock', 'serial', 'usb', 'xr-spatial-tracking']
  return `/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' ${url.origin}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Permissions-Policy: ${denied.map((name) => `${name}=()`).join(', ')}, clipboard-write=(self), web-share=(self)
`
}
