import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'
import { prepareProfilePhoto } from '../lib/profile-photo.ts'
import { Avatar } from './Avatar.tsx'

export function ProfileEditor() {
  const { profile, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [photo, setPhoto] = useState(profile?.avatar_data_url ?? null)
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  if (!profile) return null

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!profile || preparing || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: name.trim() || null, avatar_data_url: photo,
      }).eq('id', profile.id).select('id').single()
      if (error) throw error
      await refreshProfile()
      setSaved(true)
    } catch { setError('Your profile could not be saved. Your edits are still here; please try again.') }
    finally { setSaving(false) }
  }

  return <section className="card profile-editor" aria-labelledby="edit-profile-title">
    <div><p className="eyebrow">Your account</p><h2 id="edit-profile-title">Make yourself at home.</h2><p>Your name and photo appear on your public profile when leaderboard visibility is on.</p></div>
    <form onSubmit={save}>
      <fieldset disabled={saving || preparing}>
        <div className="profile-photo-row">
          <Avatar name={name || profile.handle} photo={photo} large />
          <div><label htmlFor="profile-photo" className="form-label">Profile picture</label>
            <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="profile-photo-help" onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setPreparing(true)
              setError(null)
              setSaved(false)
              try { setPhoto(await prepareProfilePhoto(file)) }
              catch (error) { setError(error instanceof Error ? error.message : 'Could not prepare this photo.') }
              finally { setPreparing(false) }
            }} />
            <p id="profile-photo-help">JPEG, PNG or WebP, up to 5 MB. Cropped to a square; saved when you save your profile.</p>
            {photo && <button type="button" className="cookie-close" onClick={() => { setPhoto(null); setSaved(false) }}>Remove photo</button>}
          </div>
        </div>
        <label htmlFor="display-name" className="form-label">Display name</label>
        <input id="display-name" className="form-input" value={name} maxLength={60} autoComplete="nickname" aria-describedby="display-name-help" onChange={(event) => { setName(event.target.value); setSaved(false) }} />
        <p id="display-name-help">Optional. Your unique handle stays @{profile.handle}.</p>
      </fieldset>
      <div className="profile-save-row"><button type="submit" className="btn btn-primary" disabled={saving || preparing}>{preparing ? 'Preparing photo…' : saving ? 'Saving…' : 'Save profile'}</button>
        {saved && <span role="status">Profile saved.</span>}
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
    </form>
  </section>
}
