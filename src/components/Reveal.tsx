import type { Block } from '../../supabase/functions/_shared/content/types.ts'
import { PromptBlocks } from './PromptBlocks.tsx'

interface RevealProps {
  solution: Block[]
  earlierNote?: string | null
}

export function Reveal({ solution, earlierNote }: RevealProps) {
  return (
    <div
      data-testid="reveal-panel"
      className="reveal-panel-card"
      style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-5)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
      role="region"
      aria-label="Solution reveal"
    >
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          marginBottom: 'var(--space-4)',
          color: 'var(--text)',
        }}
      >
        Worked Solution
      </h3>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <PromptBlocks blocks={solution} />
      </div>

      {earlierNote && (
        <div
          data-testid="earlier-note"
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--surface-hover)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            fontSize: '0.875rem',
            color: 'var(--text)',
          }}
        >
          <strong
            style={{
              display: 'block',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-1)',
            }}
          >
            Your earlier note on this problem family
          </strong>
          {earlierNote}
        </div>
      )}
    </div>
  )
}
