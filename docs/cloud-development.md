# Local development with PIBASE

Use the existing checkouts in `/workspace`; do not create a worktree for setup.

1. In `/workspace/pibase`, run `./scripts/init-env.sh`, then `docker compose up --build -d`. Check `http://127.0.0.1:18080/healthz`.
2. Create an isolated project with `./scripts/create-project.sh "EHS local"`. Store the returned project ID and keys outside Git.
3. Apply `supabase-schema.sql` from this repository with PIBASE's `gateway migration-apply PROJECT_ID 0001_ehsmanager` command. The filename is historical; PIBASE is the only backend.
4. Sign up and verify a studio owner, then set `STUDIO_OWNER_USER_ID`. Copy `.env.local.example` to the ignored `.env.local`, enter the project URL and keys, and set `CONTRACT_SIGNING_SECRET` to a random value.
5. Run `npm ci`, `npm run dev`, and `npm run build`. The manager runs at `http://127.0.0.1:3000`, and the public booking page is `/booking`.

If the Docker builder cannot resolve Debian package hosts in this cloud environment, the optional PostgreSQL extension image can be replaced with `postgres:16-bookworm` through a temporary Compose override outside either repository. The EHS schema needs only the standard PostgreSQL image. Keep PIBASE's generated `.env`, EHS `.env.local`, and any owner credentials out of Git.

Production booking host: `booking.elliesheartstrings.com`. Configure DNS and the hosting proxy separately; the app's `next.config.js` routes that host's root to `/booking`.
