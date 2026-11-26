import { APP_VERSION, APP_COMMIT, APP_BUILT } from '../../lib/version'

// Public, non-sensitive: which build is running. e.g. curl https://manager.elliesheartstrings.com/api/version
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ version: APP_VERSION, commit: APP_COMMIT, built: APP_BUILT })
}
