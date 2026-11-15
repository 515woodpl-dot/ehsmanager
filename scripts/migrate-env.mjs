// Reads KEY=value lines from an env file (the app's .env.local).
import { readFileSync, existsSync } from 'fs'

export function readEnv(file) {
  const out = {}
  if (!existsSync(file)) return out
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) out[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}
