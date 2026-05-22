import { getMeta, storeMeta, getAllSessions } from '../db/index.js'
import { requestFolder, downloadJournalFile } from '../export/icloud.js'
import { FEATURES } from '../features.js'
import { openICloudSetup } from './ICloudSetupSheet.js'
import { requestConsent } from './ConsentSheet.js'

const VERSION = '0.1.0'

const GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`

export { GEAR_SVG }

let _el = null

function _ensureEl() {
  if (_el) return _el

  const scrim = document.createElement('div')
  scrim.className = 'settings-sheet-scrim'

  const sheet = document.createElement('div')
  sheet.className = 'settings-sheet'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Settings')
  sheet.innerHTML = `
    <div class="settings-sheet-header">
      <span class="settings-sheet-title">Settings</span>
      <button class="settings-sheet-close" aria-label="Close settings">×</button>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Journal</div>
      <div class="settings-row ${typeof globalThis.showDirectoryPicker !== 'function' ? 'settings-row--action' : ''}">
        <div class="settings-row-info">
          <div class="settings-row-name">Autosave</div>
          <div class="settings-row-desc settings-folder-name">Saved in app</div>
        </div>
        ${typeof globalThis.showDirectoryPicker === 'function'
          ? '<button class="settings-folder-btn">Choose folder</button>'
          : '<span class="settings-row-chevron" aria-hidden="true">›</span>'}
      </div>
      <div class="settings-row settings-row--quiet">
        <div class="settings-row-info">
          <div class="settings-row-name">Export journal</div>
          <div class="settings-row-desc">Download everything you’ve written as one markdown file.</div>
        </div>
        <button class="settings-export-btn">Export</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Privacy</div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-name">AI analysis</div>
          <div class="settings-row-desc">Your walk text is sent to Claude to find patterns, then discarded. Off by default.</div>
        </div>
        <label class="settings-toggle" aria-label="Enable AI analysis">
          <input type="checkbox" class="settings-ai-toggle" />
          <span class="settings-toggle-track">
            <span class="settings-toggle-thumb"></span>
          </span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-label">Coming soon</div>
      ${FEATURES.map(f => `
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-name">${f.label}</div>
            <div class="settings-row-desc">${f.desc.split('.')[0]}.</div>
          </div>
          <label class="settings-toggle" aria-label="Enable ${f.label}">
            <input type="checkbox" class="settings-toggle-input" data-feature="${f.id}" />
            <span class="settings-toggle-track">
              <span class="settings-toggle-thumb"></span>
            </span>
          </label>
        </div>
      `).join('')}
    </div>

    <div class="settings-section settings-section--about">
      <div class="settings-section-label">About</div>
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-name">Version</div>
        </div>
        <span class="settings-version">footnote ${VERSION}</span>
      </div>
    </div>

    <button class="settings-done-btn">Done</button>
  `

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  const closeBtn   = sheet.querySelector('.settings-sheet-close')
  const doneBtn    = sheet.querySelector('.settings-done-btn')
  const folderBtn  = sheet.querySelector('.settings-folder-btn')
  const folderName = sheet.querySelector('.settings-folder-name')
  const aiToggle   = sheet.querySelector('.settings-ai-toggle')
  const exportBtn  = sheet.querySelector('.settings-export-btn')

  const dismiss = () => {
    sheet.classList.remove('open')
    scrim.classList.remove('open')
  }

  closeBtn.addEventListener('click', dismiss)
  doneBtn.addEventListener('click', dismiss)
  scrim.addEventListener('click', dismiss)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('open')) dismiss()
  })

  if (folderBtn) {
    folderBtn.addEventListener('click', async () => {
      const handle = await requestFolder()
      if (handle) {
        folderName.textContent = handle.name
        folderBtn.textContent = 'Change'
      }
    })
  } else {
    const autosaveRow = sheet.querySelector('.settings-row--action')
    autosaveRow?.addEventListener('click', openICloudSetup)
  }

  exportBtn.addEventListener('click', async () => {
    const sessions = (await getAllSessions()).filter(s => s.endedAt !== null)
    if (sessions.length === 0) return
    downloadJournalFile(sessions)
  })

  aiToggle.addEventListener('change', async () => {
    if (!aiToggle.checked) {
      await storeMeta('insightsConsentGiven', false)
    } else {
      const agreed = await requestConsent()
      if (!agreed) aiToggle.checked = false
    }
  })

  sheet.querySelectorAll('.settings-toggle-input').forEach(input => {
    input.addEventListener('change', () => {
      storeMeta(`feature_${input.dataset.feature}`, input.checked)
    })
  })

  _el = { sheet, scrim, folderName, folderBtn, aiToggle }
  return _el
}

export async function settingsSheet() {
  const el = _ensureEl()

  const folderHandle = await getMeta('folderHandle')
  if (el.folderBtn) {
    if (folderHandle) {
      el.folderName.textContent = folderHandle.name
      el.folderBtn.textContent = 'Change'
    } else {
      el.folderName.textContent = 'Saved in app'
      el.folderBtn.textContent = 'Choose folder'
    }
  } else {
    el.folderName.textContent = 'Auto-downloads as .md. Set Safari → Downloads → iCloud Drive.'
  }

  el.aiToggle.checked = (await getMeta('insightsConsentGiven')) === true

  const inputs = el.sheet.querySelectorAll('.settings-toggle-input')
  await Promise.all([...inputs].map(async input => {
    input.checked = (await getMeta(`feature_${input.dataset.feature}`)) ?? false
  }))

  el.sheet.classList.add('open')
  el.scrim.classList.add('open')
}
