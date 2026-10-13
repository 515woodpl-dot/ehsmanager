import { requireUser } from '../../lib/api-auth'
import { emailWrap, sendStudioEmail, signOffHtml } from '../../lib/email'
import { getStripe } from '../../lib/studioConfig'

// Checks a saved integration really works: sends a test email to the
// studio, or makes a read-only call to Stripe.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const auth = await requireUser(req, res)
  if (!auth) return
  const { config } = auth

  if (req.body?.kind === 'email') {
    if (!config.branding.studioEmail) return res.status(400).json({ error: 'Add your studio email first' })
    const result = await sendStudioEmail(config, {
      to: config.branding.studioEmail,
      subject: `Test email from ${config.branding.businessName}`,
      html: emailWrap(`<h1>Email is working</h1><p>This is how your emails to clients will look.</p>${signOffHtml(config)}`, config),
      replyToStudio: false,
    })
    if (result.error) return res.status(400).json({ error: result.error })
    return res.status(200).json({ message: `Test email sent to ${config.branding.studioEmail}` })
  }

  if (req.body?.kind === 'stripe') {
    const stripe = getStripe(config)
    if (!stripe) return res.status(400).json({ error: 'Add your Stripe secret key first' })
    try {
      const account = await stripe.accounts.retrieve()
      const mode = config.secrets.stripeSecretKey.includes('_test_') ? 'test mode' : 'live mode'
      return res.status(200).json({ message: `Connected to Stripe (${account.settings?.dashboard?.display_name || account.email || account.id}, ${mode})` })
    } catch (error) {
      return res.status(400).json({ error: `Stripe rejected the key: ${error.message}` })
    }
  }

  return res.status(400).json({ error: 'Unknown test' })
}
