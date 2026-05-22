import { openDB } from './db/index.js'
import { startWatching } from './gps/index.js'
import { initSession } from './session/manager.js'
import { requestPersistence } from './storage/quota.js'
import { Editor } from './ui/Editor.js'
import { JournalScroll } from './ui/JournalScroll.js'
import { InstallBanner } from './ui/InstallBanner.js'
import { StorageBanner } from './ui/StorageBanner.js'
import { logger } from './logger.js'
import { initInsights } from './ui/InsightsSheet.js'
import { mountDevBadge } from './devBadge.js'

// Legacy event relay: old deployments fire 'footnote:stack-complete'.
// Re-dispatch as the new event name so any long-lived tab keeps working.
// TODO 2026-05-24: remove this relay after 30 days of rename ship.
document.addEventListener('footnote:stack-complete', e => {
  document.dispatchEvent(new CustomEvent('footnote:coda-complete', { detail: e.detail }))
})

// One-shot cleanup of orphan localStorage keys from the deleted AlphaThanksSheet
// and founder-identity flow. Removes any user-name string that may be sitting in
// localStorage from earlier alpha versions. Safe to remove this block 30 days
// after the cleanup ships.
;(() => {
  const orphans = ['footnote_alpha_thanks_shown', 'footnote_export_tag', 'footnote_about_opt_in_name']
  orphans.forEach(k => {
    if (localStorage.getItem(k) !== null) localStorage.removeItem(k)
  })
})()

async function boot() {
  // DB first — everything depends on it
  await openDB()

  // Request persistence early (iOS 15.4+)
  requestPersistence()

  const appEl = document.getElementById('app')
  const bannerSlot = document.getElementById('banner-slot')

  // Install banner (iOS share sheet prompt)
  InstallBanner(bannerSlot)

  // Storage banner (async, non-blocking)
  StorageBanner(bannerSlot)

  // Editor + journal
  const editor = Editor(document.getElementById('editor'), {
    onLineAdded: () => {},
    // Re-render the flat journal and land on the walk just finished, attaching
    // its quiet inline Keep / Let it go affordance to that section.
    onSessionEnd: (justEndedId) => journal.render({ justEndedId }),
  })

  const journal = JournalScroll(editor.journalHistory, {
    canvasBody: editor.canvasBody,
    onDelete: () => {},
  })

  // Insights swipe navigation — wires gesture to canvas, no Editor dependency
  initInsights(editor.canvasBody)

  // Check for in-progress session from last app open
  const resumed = await initSession((session, reason) => {
    logger.info('app', 'auto_new_session', { reason })
  })

  if (resumed) {
    await editor.handleResume(resumed)
    logger.info('app', 'session_resumed', { sessionId: resumed.id })
  }

  // GPS — non-blocking, starts in parallel
  startWatching().then(status => {
    logger.info('app', 'gps_permission', { status })
  })

  // Render journal history (scrolls to bottom after)
  await journal.render()

  logger.info('app', 'booted')
}

// iOS standalone PWAs don't fire navigation events, so the SW never detects
// updates on its own. Poll every 60s and reload when a new SW takes over.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => {
    setInterval(() => reg.update(), 60_000)
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

boot().catch(err => {
  logger.error('app', 'boot_failed', { error: err.message })
  document.getElementById('app').innerHTML = '<p class="error">Failed to start. Please refresh.</p>'
})

// Dev-only build badge. Gated on localStorage.fn_dev so it never ships in the
// alpha (where it leaked a debug pill and collided with the Insights hint).
mountDevBadge({ buildTime: __BUILD_TIME__ })
