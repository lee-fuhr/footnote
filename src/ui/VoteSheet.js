import { getIdentity } from '../identity.js'
import { FEATURES } from '../features.js'

const QUEUE_KEY = 'footnote_vote_queue'

function VoteSheetEl() {
  const el = document.createElement('div')
  el.className = 'vote-sheet'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Vote on upcoming features')

  el.innerHTML = `
    <div class="vote-sheet-header">
      <p class="vote-sheet-title">What should we build next?</p>
      <button class="vote-sheet-close" aria-label="Close">&#215;</button>
    </div>
    <div class="vote-sheet-progress" aria-live="polite"></div>
    <div class="vote-sheet-cards"></div>
    <p class="vote-sheet-note">Your vote is the one thing in Footnote that leaves your device. No account, no sign-in. Just one vote per device, so I can see what to build next. Your walks stay put.</p>
    <div class="vote-sheet-footer">
      <div class="vote-sheet-nav">
        <button class="vote-sheet-prev" aria-label="Previous feature">&#8592;</button>
        <button class="vote-sheet-next" aria-label="Next feature">&#8594;</button>
      </div>
      <div class="vote-sheet-footer-right">
        <a class="vote-sheet-roadmap-link" href="/roadmap" target="_blank" rel="noopener">Full roadmap &#8594;</a>
      </div>
    </div>
  `

  document.body.appendChild(el)

  const progressEl = el.querySelector('.vote-sheet-progress')
  const cardsEl    = el.querySelector('.vote-sheet-cards')
  const closeBtn   = el.querySelector('.vote-sheet-close')
  const prevBtn    = el.querySelector('.vote-sheet-prev')
  const nextBtn    = el.querySelector('.vote-sheet-nav .vote-sheet-next')

  let _results = FEATURES.map(f => ({ ...f, taps: 0, people: 0, localTaps: 0 }))
  let _index = 0

  function open() {
    el.classList.add('open')
    el.focus()
    _drainQueue()
    _fetchResults()
    _render()
  }

  function close() {
    el.classList.remove('open')
  }

  function _render() {
    const f = _results[_index]
    progressEl.textContent = ''

    cardsEl.innerHTML = `
      <div class="vote-card">
        <p class="vote-card-label">${_esc(f.label)}</p>
        <p class="vote-card-desc">${_esc(f.desc)}</p>
        <button class="vote-card-tap" aria-label="Vote for ${_esc(f.label)}">
          <span class="vote-card-tap-icon">&#9825;</span>
          <span class="vote-card-tap-text">Tap to vote</span>
        </button>
      </div>
    `

    const tapBtn = cardsEl.querySelector('.vote-card-tap')
    tapBtn.addEventListener('click', () => _vote(f.id))

    prevBtn.disabled = _index === 0
    nextBtn.disabled = _index === _results.length - 1
  }

  function _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  async function _vote(featureId) {
    const f = _results.find(r => r.id === featureId)
    if (!f) return

    f.localTaps++
    _animateTap()
    _render()

    // Device-bound: the stable local device id is the only identity. No account,
    // no token. One vote per device, deduped server-side by this id.
    const { userId } = getIdentity()
    const payload = { featureId, userId }

    try {
      const r = await fetch('/api/vote/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error('cast failed')
    } catch {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
      queue.push({ featureId, userId, ts: Date.now() })
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    }
  }

  function _animateTap() {
    const icon = cardsEl.querySelector('.vote-card-tap-icon')
    if (!icon) return
    icon.classList.remove('vote-tap-pulse')
    void icon.offsetWidth
    icon.classList.add('vote-tap-pulse')
  }

  async function _drainQueue() {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    if (!queue.length) return

    const remaining = []
    for (const item of queue) {
      try {
        const r = await fetch('/api/vote/cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
        if (!r.ok) remaining.push(item)
      } catch {
        remaining.push(item)
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  }

  async function _fetchResults() {
    try {
      const r = await fetch('/api/vote/results')
      if (!r.ok) return
      const data = await r.json()
      _results = _results.map(local => {
        const remote = data.find(d => d.id === local.id)
        return remote ? { ...local, taps: remote.taps, people: remote.people } : local
      })
      _render()
    } catch {}
  }

  prevBtn.addEventListener('click', () => {
    if (_index > 0) { _index--; _render() }
  })

  nextBtn.addEventListener('click', () => {
    if (_index < _results.length - 1) { _index++; _render() }
  })

  closeBtn.addEventListener('click', close)

  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return }
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      if (_index < _results.length - 1) { _index++; _render() }
      return
    }
    if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      if (_index > 0) { _index--; _render() }
      return
    }
    if (e.key === 'Enter') {
      const f = _results[_index]
      if (f) _vote(f.id)
    }
  })

  el.setAttribute('tabindex', '-1')

  return { open, close }
}

let _instance = null
export function voteSheet() {
  if (!_instance) _instance = VoteSheetEl()
  _instance.open()
}
