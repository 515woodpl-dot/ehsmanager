// Brings a company's PIBASE project up to date with this version of the app.
//
//   node scripts/migrate.mjs [path/to/.env.local]
//
// A new, empty project gets pibase-schema.sql (the full schema). Then every
// pibase-migration-*.sql file is applied in order. PIBASE records each one by
// name (public.pibase_migrations) and skips it next time, so this is safe to
// run on every deploy. Projects set up by hand before this script existed
// are fine too: the numbered migrations can all run again.
//
// Never edit a migration file after it has been released: PIBASE refuses a
// migration whose name it knows with different contents. Add a new
// numbered file instead.
//
// Needs NEXT_PUBLIC_PIBASE_URL, PIBASE_SERVICE_KEY and PIBASE_PROJECT_ID (from
// the env file or the environment), and scripts/pibase-cli.sh able to reach
// PIBASE.
import { readFileSync, readdirSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readEnv } from './migrate-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = process.argv[2] || join(root, '.env.local')

const env = { ...readEnv(envFile), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(NEXT_PUBLIC_PIBASE_URL|PIBASE_SERVICE_KEY|PIBASE_PROJECT_ID)$/.test(k))) }
const fail = message => { console.error(`migrate: ${message}`); process.exit(1) }
for (const key of ['NEXT_PUBLIC_PIBASE_URL', 'PIBASE_SERVICE_KEY', 'PIBASE_PROJECT_ID']) if (!env[key]) fail(`${key} is not set (in ${envFile} or the environment)`)

// Does the project already have the app's tables?
async function hasSchema() {
  const response = await fetch(`${env.NEXT_PUBLIC_PIBASE_URL.replace(/\/$/, '')}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: env.PIBASE_SERVICE_KEY, Authorization: `Bearer ${env.PIBASE_SERVICE_KEY}` },
  }).catch(error => fail(`cannot reach PIBASE at ${env.NEXT_PUBLIC_PIBASE_URL}: ${error.message}`))
  if (response.ok) return true
  const body = await response.text()
  if (/42P01|does not exist|not found|unknown table|relation/i.test(body) || response.status === 404) return false
  fail(`unexpected answer from PIBASE (${response.status}): ${body.slice(0, 300)}`)
}

function apply(name, file) {
  const result = spawnSync(join(root, 'scripts', 'pibase-cli.sh'), ['migration-apply', env.PIBASE_PROJECT_ID, name], { input: readFileSync(file), encoding: 'utf8' })
  if (result.status !== 0) fail(`${name} failed:\n${(result.stderr || result.stdout || '').trim()}`)
  console.log(`  ${name}`)
}

const migrations = readdirSync(root).filter(f => /^pibase-migration-\d+.*\.sql$/.test(f)).sort()
console.log(`Updating PIBASE project ${env.PIBASE_PROJECT_ID}`)
if (!(await hasSchema())) {
  console.log('  new project: applying the full schema')
  apply('0000_schema', join(root, 'pibase-schema.sql'))
}
for (const file of migrations) apply(file.replace(/\.sql$/, ''), join(root, file))
console.log('Database is up to date.')
