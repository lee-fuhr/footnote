/**
 * AI-analysis sync gate.
 *
 * Free and Pro stay fully local — their walks never leave the device. Walk text
 * is only justified to leave when the user has AI Pack access AND has turned on
 * AI analysis (consent). That's the same condition under which we already send
 * walk text to Claude for insights, so server sync rides on the same promise.
 *
 * During the friends alpha hasAiPackAccess() returns true for everyone (the
 * ALPHA_AI_PACK_FREE flag), so the real gate is consent — which is exactly what
 * Lee wants: anyone who has flipped AI analysis on (including Lee) keeps syncing.
 */
import { getMeta } from '../db/index.js'
import { hasAiPackAccess } from '../tier.js'

export async function aiAnalysisEnabled() {
  if (!hasAiPackAccess()) return false
  const consent = await getMeta('insightsConsentGiven')
  return consent === true
}
