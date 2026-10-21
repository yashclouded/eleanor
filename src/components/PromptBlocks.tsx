import type { Block } from '../../supabase/functions/_shared/content/types.ts'

interface PromptBlocksProps {
  blocks: Block[]
  className?: string
}

export function PromptBlocks({ blocks, className = '' }: PromptBlocksProps) {
  if (!blocks || !Array.isArray(blocks)) {
    return null
  }

  return (
    <div className={`prompt-blocks ${className}`.trim()}>
      {blocks.map((block, idx) => {
        switch (block.t) {
          case 'p':
            return (
              <p key={idx} className="prompt-p" style={{ marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
                {block.text}
              </p>
            )

          case 'note':
            return (
              <aside
                key={idx}
                className="prompt-note"
                style={{
                  background: 'var(--accent-soft)',
                  borderLeft: '3px solid var(--accent)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  marginBottom: 'var(--space-3)',
                  color: 'var(--text)',
                  fontSize: '0.9375rem',
                }}
              >
                {block.text}
              </aside>
            )

          case 'code':
            return (
              <pre
                key={idx}
                className="prompt-code"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  overflowX: 'auto',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <code>{block.text}</code>
              </pre>
            )

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={idx}
                className="prompt-list"
                style={{
                  paddingLeft: 'var(--space-6)',
                  marginBottom: 'var(--space-3)',
                  lineHeight: 1.6,
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ListTag>
            )
          }

          case 'table':
            return (
              <div key={idx} style={{ overflowX: 'auto', marginBottom: 'var(--space-4)' }}>
                <table
                  className="prompt-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                  }}
                >
                  {block.caption && (
                    <caption
                      style={{
                        captionSide: 'top',
                        textAlign: 'left',
                        fontWeight: 600,
                        marginBottom: 'var(--space-2)',
                        color: 'var(--text)',
                      }}
                    >
                      {block.caption}
                    </caption>
                  )}
                  {block.head && block.head.length > 0 && (
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        {block.head.map((h, hIdx) => (
                          <th
                            key={hIdx}
                            scope="col"
                            style={{
                              textAlign: 'left',
                              padding: 'var(--space-2) var(--space-3)',
                              fontWeight: 600,
                              color: 'var(--text)',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: rIdx % 2 === 1 ? 'var(--surface-hover)' : 'transparent',
                        }}
                      >
                        {row.map((cell, cIdx) =>
                          cIdx === 0 ? (
                            <th
                              key={cIdx}
                              scope="row"
                              style={{
                                textAlign: 'left',
                                padding: 'var(--space-2) var(--space-3)',
                                fontWeight: 500,
                                color: 'var(--text)',
                              }}
                            >
                              {cell}
                            </th>
                          ) : (
                            <td
                              key={cIdx}
                              style={{
                                padding: 'var(--space-2) var(--space-3)',
                                color: 'var(--text)',
                              }}
                            >
                              {cell}
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}
