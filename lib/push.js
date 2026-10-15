/**
 * lib/push.js — push notifications to the studio's devices (server only).
 *
 * VAPID keys are created automatically the first time they're needed and
 * stored encrypted with the other keys (or come from VAPID_PUBLIC_KEY /
 * VAPID_PRIVATE_KEY). Devices are stored in push_subscriptions.
 */
import webpush from 'web-push'
import { loadStudioConfig, saveStudioSecrets, canStoreSecrets } from './studioConfig'
import { iconVersion } from './appIcon'

const subject = config => `mailto:${config.branding.studioEmail || 'hello@elliesheartstrings.com'}`

// Returns the studio's VAPID keys, creating and saving them on first use.
export async function ensureVapidKeys(db, config) {
  const { vapidPublicKey, vapidPrivateKey } = config.secrets
  if (vapidPublicKey && vapidPrivateKey) return { publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
  if (!canStoreSecrets()) throw new Error('Set SETTINGS_ENCRYPTION_KEY on the server to turn on notifications')
  const keys = webpush.generateVAPIDKeys()
  await saveStudioSecrets(db, config.userId, { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey })
  return keys
}

// Sends one notification to every device of the studio that wants this
// type. Never throws: a failed notification must not break the action that
// triggered it. Devices that unsubscribed or expired are removed.
export async function notifyStudio(db, userId, { type, title, body, url = '/', tag }) {
  try {
    const config = await loadStudioConfig(db, userId)
    if (type && config.integrations.notify?.[type] === false) return { skipped: 'disabled' }
    const { vapidPublicKey, vapidPrivateKey } = config.secrets
    if (!vapidPublicKey || !vapidPrivateKey) return { skipped: 'not set up' }
    const { data: devices, error } = await db.from('push_subscriptions').select('id, endpoint, keys').eq('user_id', userId)
    if (error || !devices?.length) return { skipped: 'no devices' }

    const payload = JSON.stringify({
      title, body: String(body || '').slice(0, 240), url, tag,
      icon: `/api/app-icon/icon-192.png?v=${iconVersion(config.branding)}`,
    })
    const options = { TTL: 60 * 60 * 24, urgency: 'high', vapidDetails: { subject: subject(config), publicKey: vapidPublicKey, privateKey: vapidPrivateKey } }
    let sent = 0
    await Promise.all(devices.map(async device => {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, payload, options)
        sent++
        await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', device.id)
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', device.id)
        else console.error('[push] send failed', err.statusCode || '', err.body || err.message)
      }
    }))
    return { sent }
  } catch (error) {
    console.error('[push]', error)
    return { error: error.message }
  }
}
