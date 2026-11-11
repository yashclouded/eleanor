export function readBrowserPreferences(cookies: string) {
  const values = Object.fromEntries(cookies.split(';').map((entry) => entry.trim().split('=')))
  const consent = values.eleanor_consent === 'essential' || values.eleanor_consent === 'preferences'
    ? values.eleanor_consent : null
  const effects = consent === 'preferences' && /^[01]{2}$/.test(values.eleanor_preferences ?? '')
    ? values.eleanor_preferences : '11'
  return { consent, sound: effects[0] === '1', celebrations: effects[1] === '1' }
}
