const ISSUES_URL = 'https://github.com/lee-fuhr/footnote/issues/new?template=idea.md&title=Idea%3A+&labels=idea'

function IdeaSheetEl() {
  const el = document.createElement('div')
  el.className = 'idea-sheet'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Share an idea')
  el.setAttribute('tabindex', '-1')

  el.innerHTML = `
    <div class="idea-sheet-inner">
      <p class="idea-sheet-heading">Got an idea?</p>
      <p class="idea-sheet-body">Footnote is open source. Ideas go straight to GitHub, no middleman.</p>
      <div class="idea-sheet-actions">
        <button class="idea-sheet-btn-cancel">Cancel</button>
        <button class="idea-sheet-btn-open">Open GitHub ↗</button>
      </div>
    </div>
  `

  document.body.appendChild(el)

  const cancelBtn = el.querySelector('.idea-sheet-btn-cancel')
  const openBtn   = el.querySelector('.idea-sheet-btn-open')

  function open() {
    el.classList.add('open')
    el.focus()
  }

  function close() {
    el.classList.remove('open')
  }

  cancelBtn.addEventListener('click', close)
  openBtn.addEventListener('click', () => {
    window.open(ISSUES_URL, '_blank', 'noopener')
    close()
  })

  el.addEventListener('keydown', e => { if (e.key === 'Escape') close() })
  el.addEventListener('click', e => { if (e.target === el) close() })

  return { open, close }
}

let _instance = null
export function ideaSheet() {
  if (!_instance) _instance = IdeaSheetEl()
  _instance.open()
}
