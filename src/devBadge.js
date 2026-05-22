// Dev build badge — a small "M/D HH:MM" pill in the bottom-right that records
// the build time. It is a developer aid only and MUST stay out of shipped
// builds: left ungated it leaks debug chrome into the alpha and collides with
// the bottom-right Insights swipe hint.
//
// Gate: only render when localStorage.fn_dev === '1'.

/**
 * Decide whether the dev build badge should mount.
 * @param {Pick<Storage, 'getItem'>} storage - a localStorage-like object
 * @returns {boolean}
 */
export function shouldShowDevBadge(storage) {
  try {
    return storage?.getItem('fn_dev') === '1'
  } catch {
    return false
  }
}

/**
 * Format the build-time pill label as "M/D H:MM".
 * @param {Date} date
 * @returns {string}
 */
export function formatBadgeLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Mount the dev badge into the document body when gated on.
 * @param {{ buildTime: number, doc?: Document, storage?: Storage }} opts
 * @returns {HTMLElement|null} the badge element, or null when not shown
 */
export function mountDevBadge({ buildTime, doc = document, storage = localStorage }) {
  if (!shouldShowDevBadge(storage)) return null
  const badge = doc.createElement('div')
  badge.id = 'fn-build-badge'
  badge.textContent = formatBadgeLabel(new Date(buildTime))
  doc.body.appendChild(badge)
  return badge
}
