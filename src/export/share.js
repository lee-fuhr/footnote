import { sessionToMarkdown } from './markdown.js'
import { sessionToText } from './text.js'
import { logger } from '../logger.js'

function formatFilename(session) {
  const d = new Date(session.startedAt)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `footnote-${date}`
}

export async function shareSessionAsMarkdown(session, lines) {
  const content = sessionToMarkdown(session, lines)
  const filename = `${formatFilename(session)}.md`

  if (navigator.share && navigator.canShare) {
    const file = new File([content], filename, { type: 'text/markdown' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Foot.Note Export' })
        logger.info('export', 'shared_markdown', { filename })
        return
      } catch (err) {
        if (err.name !== 'AbortError') logger.warn('export', 'share_failed', { error: err.message })
      }
    }
  }

  // Fallback: download
  downloadText(content, filename)
}

export async function shareSessionAsText(session, lines) {
  const content = sessionToText(session, lines)
  const filename = `${formatFilename(session)}.txt`
  downloadText(content, filename)
}

function downloadText(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  logger.info('export', 'downloaded', { filename })
}
