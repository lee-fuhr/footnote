// A quiet, single-instance undo toast. Used for soft-destructive actions like
// letting a walk go: the action is deferred for a grace window, during which a
// tap on Undo cancels it. If the window elapses untouched, the action commits.
// One reusable element, mirroring ConfirmSheet, so there is no per-call DOM churn.

let _el = null
let _timer = null
let _onCommit = null
let _onUndo = null

function ensureEl() {
  if (_el) return _el

  const toast = document.createElement('div')
  toast.className = 'undo-toast'
  toast.setAttribute('role', 'status')
  toast.innerHTML = `
    <span class="undo-toast-msg"></span>
    <button class="undo-toast-btn">Undo</button>
  `
  document.body.appendChild(toast)

  _el = {
    toast,
    msg: toast.querySelector('.undo-toast-msg'),
    btn: toast.querySelector('.undo-toast-btn'),
  }

  _el.btn.addEventListener('click', () => {
    // Undo: cancel the pending commit and drop the toast. The deferred action
    // never runs; onUndo lets the caller reverse any optimistic UI change.
    if (_timer) { clearTimeout(_timer); _timer = null }
    _onCommit = null
    const undo = _onUndo
    _onUndo = null
    hide()
    if (undo) undo()
  })

  return _el
}

function hide() {
  if (_el) _el.toast.classList.remove('open')
}

// Shows the toast and schedules `onCommit` after `delay` ms unless Undo is
// tapped first. A second call commits any still-pending action immediately so
// toasts never silently stack.
export function undoToast(message, { onCommit, onUndo, delay = 5000 } = {}) {
  const el = ensureEl()

  if (_timer) { clearTimeout(_timer); _timer = null }
  if (_onCommit) { _onCommit(); _onCommit = null }

  el.msg.textContent = message
  _onCommit = onCommit ?? null
  _onUndo = onUndo ?? null
  el.toast.classList.add('open')

  _timer = setTimeout(() => {
    _timer = null
    const commit = _onCommit
    _onCommit = null
    _onUndo = null
    hide()
    if (commit) commit()
  }, delay)
}
