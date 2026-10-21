import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.tsx'
import { supabase } from '../lib/supabase.ts'

interface PlaybookNote {
  id: string
  concept_id: string
  concept_name?: string
  text: string
  created_at: string
  updated_at: string
}

export function Playbook() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<PlaybookNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editing state: noteId -> current draft text
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPlaybook = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch concepts for naming
      const { data: conceptsData } = await supabase
        .from('concepts')
        .select('id, name')
      const conceptMap = new Map<string, string>()
      if (conceptsData) {
        for (const c of conceptsData) {
          conceptMap.set(c.id, c.name)
        }
      }

      // 2. Fetch user's playbook notes
      const { data: notesData, error: notesErr } = await supabase
        .from('playbook')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (notesErr) {
        setError(notesErr.message)
      } else if (notesData) {
        const enriched: PlaybookNote[] = notesData.map((n) => ({
          ...n,
          concept_name: conceptMap.get(n.concept_id) ?? n.concept_id,
        }))
        setNotes(enriched)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load playbook'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPlaybook()
  }, [loadPlaybook])

  const handleStartEdit = (note: PlaybookNote) => {
    setEditingId(note.id)
    setEditText(note.text)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = async (noteId: string) => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed.length > 280) return
    setSaving(true)
    setError(null)

    try {
      const { error: updateErr } = await supabase
        .from('playbook')
        .update({
          text: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)

      if (updateErr) {
        setError(updateErr.message)
      } else {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, text: trimmed } : n))
        )
        setEditingId(null)
        setEditText('')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    setError(null)
    try {
      const { error: deleteErr } = await supabase
        .from('playbook')
        .delete()
        .eq('id', noteId)

      if (deleteErr) {
        setError(deleteErr.message)
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete note'
      setError(msg)
    }
  }

  // Group notes by concept
  const notesByConcept = new Map<string, PlaybookNote[]>()
  for (const n of notes) {
    const groupName = n.concept_name || n.concept_id
    const list = notesByConcept.get(groupName) ?? []
    list.push(n)
    notesByConcept.set(groupName, list)
  }

  return (
    <div className="container-dashboard" data-testid="playbook-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>
            Your Playbook
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            One-sentence insights saved during practice, grouped by concept.
          </p>
        </div>
        <Link to="/progress" className="btn btn-secondary btn-sm">
          Progress
        </Link>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading playbook...</p>
      ) : notes.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Your playbook is empty</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto var(--space-4) auto' }}>
            After resolving problems, save a one-sentence takeaway. It will appear here and return on future echoes.
          </p>
          <Link to="/today" className="btn btn-primary">
            Start a training set
          </Link>
        </div>
      ) : (
        <div>
          {Array.from(notesByConcept.entries()).map(([conceptName, conceptNotes]) => (
            <div key={conceptName} style={{ marginBottom: 'var(--space-8)' }}>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: 'var(--space-3)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 'var(--space-2)',
                }}
              >
                {conceptName}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {conceptNotes.map((note) => {
                  const isEditing = editingId === note.id

                  return (
                    <div
                      key={note.id}
                      className="form-card"
                      style={{ padding: 'var(--space-4)' }}
                      data-testid={`playbook-note-${note.id}`}
                    >
                      {isEditing ? (
                        <div>
                          <label
                            htmlFor={`note-textarea-${note.id}`}
                            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}
                          >
                            Edit Insight (max 280 characters)
                          </label>
                          <textarea
                            id={`note-textarea-${note.id}`}
                            data-testid={`note-input-${note.id}`}
                            className="form-input"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value.slice(0, 280))}
                            rows={3}
                            disabled={saving}
                            style={{ resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {editText.length} / 280
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleCancelEdit}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveEdit(note.id)}
                                disabled={saving || !editText.trim()}
                                data-testid={`save-note-${note.id}`}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 var(--space-2) 0', fontSize: '1rem', lineHeight: 1.5, color: 'var(--text)' }}>
                              {note.text}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Saved on {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStartEdit(note)}
                              data-testid={`edit-note-${note.id}`}
                              aria-label="Edit note"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDelete(note.id)}
                              data-testid={`delete-note-${note.id}`}
                              aria-label="Delete note"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
