// Pure helper for the Coda summary line.
// Word-form for 0-9, numeric for 10+, empty string for nonsense input.
// Caught — active without aggressive. Evokes the motion of the walk.

const WORDS = ['Nothing', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']

export function caughtCount(n) {
  const num = typeof n === 'string' ? parseInt(n, 10) : n
  if (typeof num !== 'number' || !Number.isFinite(num) || num < 0) return ''
  if (num < 10) return `${WORDS[num]} caught.`
  return `${num} caught.`
}
