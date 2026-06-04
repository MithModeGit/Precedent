/**
 * Device identity for anonymous, no-auth sessions.
 *
 * `localStorage` holds one stable per-device UUID. Every review (a row in the
 * `sessions` table) gets its own `id`, but all of a device's reviews share this
 * `device_id`, which is how the home screen, rate limit, and one-active-session
 * constraint scope records to the current browser.
 */
const DEVICE_KEY = 'precedent_session_uuid'

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateDeviceId called server-side')
  }

  const existing = window.localStorage.getItem(DEVICE_KEY)
  if (existing) return existing

  const newId = crypto.randomUUID()
  window.localStorage.setItem(DEVICE_KEY, newId)
  return newId
}
