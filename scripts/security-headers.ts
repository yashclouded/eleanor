export function securityHeaders(supabaseUrl?: string): string {
  let origin = ''
  if (supabaseUrl) {
    const url = new URL(supabaseUrl)
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
      throw new Error('Supabase must use HTTPS, or HTTP on a local loopback host, without URL credentials')
    }
    origin = ` ${url.origin}`
  }
  const denied = [
    'accelerometer', 'ambient-light-sensor', 'attribution-reporting', 'autoplay', 'bluetooth', 'browsing-topics',
    'camera', 'captured-surface-control', 'clipboard-read', 'compute-pressure', 'cross-origin-isolated',
    'deferred-fetch', 'deferred-fetch-minimal', 'display-capture', 'encrypted-media', 'fullscreen', 'gamepad',
    'geolocation', 'gyroscope', 'hid', 'identity-credentials-get', 'idle-detection', 'local-fonts',
    'local-network-access', 'magnetometer', 'microphone', 'midi', 'otp-credentials', 'payment',
    'picture-in-picture', 'publickey-credentials-create', 'publickey-credentials-get', 'screen-wake-lock',
    'serial', 'speaker-selection', 'storage-access', 'usb', 'window-management', 'xr-spatial-tracking',
  ].map((feature) => `${feature}=()`)
  return `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self'${origin}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  Permissions-Policy: ${[...denied, 'clipboard-write=(self)', 'web-share=(self)'].join(', ')}\n  X-Content-Type-Options: nosniff\n`
}
