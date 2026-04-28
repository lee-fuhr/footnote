// KNOWN DEBT (2026-04-24):
// Tier is client-controlled via localStorage. Any user can set themselves to 'pro'
// via DevTools. This is ACCEPTABLE for alpha — no real purchases exist yet.
// Phase 3 MUST replace this with server-issued tier token verified on every
// tier-gated action (Coda completion, AI Pack calls). Until then, no server-side
// code may trust getTier() output.
// Revisit condition: when Phase 3 ships (real purchase flow).

const TIER_KEY = 'footnote_tier'

// During alpha, default everyone to 'pro'. Flip to 'free' at alpha-end and redeploy.
// Alpha users retain 'pro' in their localStorage; new users get 'free'.
export const ALPHA_DEFAULT_TIER = 'pro'

export function getTier() {
  return localStorage.getItem(TIER_KEY) || ALPHA_DEFAULT_TIER
}

export function setTier(tier) {
  if (!['free', 'pro', 'ai-pack'].includes(tier)) return
  localStorage.setItem(TIER_KEY, tier)
}

export function canUseCoda() {
  const t = getTier()
  return t === 'pro' || t === 'ai-pack'
}

export function canAutoCoda() {
  return getTier() === 'ai-pack'
}
