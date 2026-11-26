// Filled in at build time by next.config.js
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT || 'dev'
export const APP_BUILT = process.env.NEXT_PUBLIC_APP_BUILT || ''
export const versionLabel = () => {
  const built = APP_BUILT ? new Date(APP_BUILT).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  return `v${APP_VERSION} · ${APP_COMMIT}${built ? ` · ${built}` : ''}`
}
