import { useState } from 'react'
import { isSoundEnabled, setSoundEnabled } from '../lib/feedback.ts'
import { Icon } from './Icon.tsx'

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled)
  return <button className="sound-toggle" type="button" aria-label="Sound effects" aria-pressed={enabled}
    title={enabled ? 'Turn sound effects off' : 'Turn sound effects on'}
    onClick={() => { setSoundEnabled(!enabled); setEnabled(!enabled) }}>
    <Icon name={enabled ? 'volume' : 'muted'} size={18} />
    <span className="sound-label">Sound {enabled ? 'on' : 'off'}</span>
  </button>
}
