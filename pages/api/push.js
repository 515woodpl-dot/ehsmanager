import { requireUser } from '../../lib/api-auth'
import { ensureVapidKeys, notifyStudio } from '../../lib/push'

const validSubscription = s => s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
  typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'

// Studio-only: manage this studio's notification devices.
//   GET                          → { publicKey, devices }
//   POST { subscription, device } → save this device
//   POST { action: 'test' }       → send a test notification
//   DELETE { endpoint }           → remove this device
export default async function handler(req, res) {
  const auth = await requireUser(req, res)
  if (!auth) return
  if (auth.config.migrationNeeded) return res.status(409).json({ error: 'Apply the database updates (migrations 003 and 004) first.' })

  if (req.method === 'GET') {
    try {
      const { publicKey } = await ensureVapidKeys(auth.db, auth.config)
      const { data: devices, error } = await auth.db.from('push_subscriptions').select('endpoint, device, created_at, last_used_at').eq('user_id', auth.user.id).order('created_at', { ascending: false })
      if (error) return res.status(409).json({ error: 'Apply pibase-migration-004-push.sql to your database first.' })
      return res.status(200).json({ publicKey, devices: devices || [] })
    } catch (error) {
      return res.status(503).json({ error: error.message })
    }
  }

  if (req.method === 'POST' && req.body?.action === 'test') {
    const result = await notifyStudio(auth.db, auth.user.id, { title: 'Notifications are on 🎉', body: `You'll hear about client messages, bookings and more from ${auth.config.branding.businessName}.`, url: '/?view=settings', tag: 'test' })
    if (!result.sent) return res.status(400).json({ error: result.error || (result.skipped === 'no devices' ? 'Turn on notifications on this device first' : 'Notifications are not set up yet') })
    return res.status(200).json({ message: `Test sent to ${result.sent} device${result.sent === 1 ? '' : 's'}` })
  }

  if (req.method === 'POST') {
    const subscription = req.body?.subscription
    if (!validSubscription(subscription)) return res.status(400).json({ error: 'Invalid subscription' })
    const device = String(req.body?.device || 'This device').slice(0, 80)
    const { error } = await auth.db.from('push_subscriptions').upsert({
      user_id: auth.user.id, endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }, device,
    }, { onConflict: 'endpoint' })
    if (error) return res.status(500).json({ error: `Unable to save this device: ${error.message}` })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const endpoint = String(req.body?.endpoint || '')
    await auth.db.from('push_subscriptions').delete().eq('user_id', auth.user.id).eq('endpoint', endpoint)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
