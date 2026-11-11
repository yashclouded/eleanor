import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { readBrowserPreferences } from '../lib/preferences.ts'
import { createSuccessSound } from '../lib/success-sound.ts'

const FeedbackContext = createContext<{ prepare: () => void; celebrate: (id: string, correct: boolean) => void }>({ prepare() {}, celebrate() {} })

// eslint-disable-next-line react-refresh/only-export-components
export function useAnswerFeedback() { return useContext(FeedbackContext) }

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [preferences, setPreferences] = useState(() => {
    try { return readBrowserPreferences(document.cookie) }
    catch { return readBrowserPreferences('') }
  })
  const [storageError, setStorageError] = useState(false)
  const [burst, setBurst] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const sound = useRef(createSuccessSound())
  const celebrated = useRef(new Set<string>())
  const soundEnabled = profile?.sound_enabled ?? preferences.sound
  const celebrationsEnabled = profile?.celebrations_enabled ?? preferences.celebrations

  useEffect(() => {
    const audio = sound.current
    return () => audio.dispose()
  }, [])

  useEffect(() => {
    if (!burst) return
    const timeout = window.setTimeout(() => setBurst(null), 1200)
    return () => clearTimeout(timeout)
  }, [burst])

  const chooseCookies = (consent: 'essential' | 'preferences') => {
    const next = { ...preferences, consent }
    setPreferences(next)
    try {
      const attributes = `; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
      document.cookie = `eleanor_consent=${consent}; Max-Age=15552000${attributes}`
      document.cookie = consent === 'preferences'
        ? `eleanor_preferences=${Number(next.sound)}${Number(next.celebrations)}; Max-Age=15552000${attributes}`
        : `eleanor_preferences=; Max-Age=0${attributes}`
      setStorageError(readBrowserPreferences(document.cookie).consent !== consent)
    } catch { setStorageError(true) }
    dialog.current?.close()
  }

  return (
    <FeedbackContext.Provider value={{
      prepare: () => { if (soundEnabled) sound.current.prepare() },
      celebrate: (id, correct) => {
        if (!correct || celebrated.current.has(id)) return
        celebrated.current.add(id)
        if (soundEnabled) sound.current.play()
        if (celebrationsEnabled && !profile?.reduced_motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) setBurst(id)
      },
    }}>
      {children}
      {burst && <div key={burst} className="answer-celebration" data-testid="answer-celebration" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => <i key={index} style={{
          '--x': `${(index % 2 ? 1 : -1) * (30 + (index * 29) % 230)}px`,
          '--y': `${35 + (index * 37) % 145}px`,
          '--turn': `${(index % 2 ? 1 : -1) * (90 + index * 23)}deg`,
          '--delay': `${(index % 4) * 24}ms`,
        } as CSSProperties} />)}
      </div>}
      {!preferences.consent && <section className="cookie-notice" aria-label="Cookie choices">
        <div><h2>A small choice about cookies</h2><p>Essential storage keeps sign-in working. Optional cookies remember this browser’s practice effects. No ads or tracking.</p></div>
        <div className="cookie-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => chooseCookies('essential')}>Essential only</button>
          <button className="btn btn-secondary btn-sm" onClick={() => chooseCookies('preferences')}>Allow preferences</button>
        </div>
      </section>}
      <footer className="app-utility-footer">
        <span>Practice with intention.</span>
        <div><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><button type="button" onClick={() => dialog.current?.showModal()}>Cookie settings</button></div>
        {storageError && <p role="status">Cookies are blocked. Your choice applies for this visit.</p>}
      </footer>
      <dialog ref={dialog} className="cookie-dialog" aria-labelledby="cookie-title">
        <h2 id="cookie-title">Cookie settings</h2>
        <p>Choose what this browser remembers. You can change your mind here at any time.</p>
        <div className="cookie-detail"><strong>Essential storage · always active</strong><p>Sign-in uses local storage. A cookie remembers your cookie choice for 180 days.</p></div>
        <div className="cookie-detail"><strong>Preference cookie · optional</strong><p>Remembers sound and celebration choices for signed-out practice for 180 days. No analytics or advertising cookies.</p></div>
        {!profile ? <fieldset className="guest-feedback-options"><legend>Practice effects for this browser</legend>
          <label><input type="checkbox" checked={preferences.sound} onChange={(event) => setPreferences({ ...preferences, sound: event.target.checked })} />Sound effects</label>
          <label><input type="checkbox" checked={preferences.celebrations} onChange={(event) => setPreferences({ ...preferences, celebrations: event.target.checked })} />Answer celebrations</label>
          <p>These choices apply for this visit with essential-only cookies.</p>
        </fieldset> : <p>Your signed-in sound and celebration choices are saved with your account in <Link to="/settings" onClick={() => dialog.current?.close()}>Settings</Link>.</p>}
        <div className="cookie-actions">
          <button type="button" className="btn btn-secondary" onClick={() => chooseCookies('essential')}>Essential only</button>
          <button type="button" className="btn btn-secondary" onClick={() => chooseCookies('preferences')}>Allow preferences</button>
          <button type="button" className="cookie-close" onClick={() => dialog.current?.close()}>Close</button>
        </div>
      </dialog>
    </FeedbackContext.Provider>
  )
}
