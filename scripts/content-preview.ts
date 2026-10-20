import * as fs from 'node:fs'
import * as path from 'node:path'
import { TEMPLATES } from '../supabase/functions/_shared/registry.ts'
import { buildInstance, itemId } from '../supabase/functions/_shared/instance.ts'
import type { Block } from '../supabase/functions/_shared/content/types.ts'

function renderBlock(block: Block): string {
  switch (block.t) {
    case 'p':
      return `${block.text}\n`
    case 'note':
      return `> **Note:** ${block.text}\n`
    case 'code':
      return `\`\`\`\n${block.text}\n\`\`\`\n`
    case 'list':
      return (
        block.items
          .map((item, idx) => `${block.ordered ? `${idx + 1}.` : '-'} ${item}`)
          .join('\n') + '\n'
      )
    case 'table': {
      const header = `| ${block.head.join(' | ')} |`
      const divider = `| ${block.head.map(() => '---').join(' | ')} |`
      const rows = block.rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
      const caption = block.caption ? `*${block.caption}*\n\n` : ''
      return `${header}\n${divider}\n${rows}\n${caption}`
    }
  }
}

function renderBlocks(blocks: Block[]): string {
  return blocks.map(renderBlock).join('\n')
}

export function generatePreview(templateId: string): string {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    const available = TEMPLATES.map((t) => t.id).join(', ')
    throw new Error(
      `Template '${templateId}' not found in registry. Available templates: ${available}`,
    )
  }

  const lines: string[] = []
  lines.push(`# Content Review: ${template.id} (v${template.version})\n`)
  lines.push(`- **Concept:** \`${template.concept}\``)
  lines.push(`- **Family:** \`${template.family}\``)
  lines.push(`- **Track:** \`${template.track}\``)
  lines.push(`- **Status:** \`${template.status}\``)
  lines.push(`- **Author:** ${template.review.author}`)
  lines.push(`- **Reviewer:** ${template.review.reviewer ?? 'Unassigned'}`)
  if (template.review.notes) {
    lines.push(`- **Notes:** ${template.review.notes}`)
  }
  lines.push('\n---\n')

  for (const lvl of template.levels) {
    lines.push(`## Level ${lvl.level} (Initial Rating: ${lvl.initialRating})\n`)

    for (const skin of template.skins) {
      lines.push(`### Skin: \`${skin}\`\n`)

      // Render 3 seeds per level and skin
      const sampleSeeds = [1, 2, 3]
      for (const seed of sampleSeeds) {
        const itemIdentifier = itemId(template, lvl.level)
        const instance = buildInstance(template, lvl.level, seed, skin)

        lines.push(`#### Seed ${seed} (Item: \`${itemIdentifier}\`)\n`)
        lines.push('##### Prompt\n')
        lines.push(renderBlocks(instance.prompt))

        lines.push('##### Answer')
        const ans = Array.isArray(instance.secret.answer)
          ? `[${instance.secret.answer.join(', ')}]`
          : typeof instance.secret.answer === 'number'
            ? `${instance.secret.answer.toFixed(2)}${
                instance.answerSpec.type === 'number' && instance.answerSpec.unit
                  ? ` ${instance.answerSpec.unit}`
                  : ''
              }`
            : String(instance.secret.answer)
        lines.push(`- **Canonical Answer:** ${ans}`)
        lines.push(`- **Answer Type:** \`${instance.answerSpec.type}\`\n`)

        lines.push('##### Misconceptions\n')
        if (instance.secret.misconceptions.length === 0) {
          lines.push('*(None active for this seed)*\n')
        } else {
          for (const m of instance.secret.misconceptions) {
            const mVal = Array.isArray(m.value)
              ? `[${m.value.join(', ')}]`
              : typeof m.value === 'number'
                ? m.value.toFixed(2)
                : String(m.value)
            lines.push(`- **\`${m.id}\`** (Value: ${mVal})`)
            lines.push(`  - *Feedback:* ${m.feedback}`)
          }
          lines.push('')
        }

        lines.push('##### Repair Ladder (Steps)\n')
        if (instance.secret.steps.length === 0) {
          lines.push('*(No steps)*\n')
        } else {
          for (let sIdx = 0; sIdx < instance.secret.steps.length; sIdx++) {
            const step = instance.secret.steps[sIdx]
            lines.push(`**Step ${sIdx + 1}:**`)
            lines.push(renderBlocks(step.prompt).trim())
            lines.push(`- *Answer:* ${step.answer}`)
            lines.push(`- *Explanation:* ${renderBlocks(step.explain).trim()}\n`)
          }
        }

        lines.push('##### Worked Solution\n')
        lines.push(renderBlocks(instance.secret.solution))
        lines.push('---\n')
      }
    }
  }

  return lines.join('\n')
}

// CLI Execution
if (process.argv[1]?.endsWith('content-preview.ts')) {
  const templateId = process.argv[2]
  if (!templateId) {
    const available = TEMPLATES.map((t) => t.id).join(', ')
    console.error('Usage: npm run content:preview -- <templateId>')
    console.error(`Available templates: ${available}`)
    process.exit(1)
  }

  try {
    const markdown = generatePreview(templateId)
    const outDir = path.resolve(process.cwd(), 'build/review')
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, `${templateId}.md`)
    fs.writeFileSync(outFile, markdown, 'utf8')
    console.log(`✅ Review preview written to build/review/${templateId}.md`)
  } catch (err: unknown) {
    console.error(`❌ ${(err as Error).message}`)
    process.exit(1)
  }
}
