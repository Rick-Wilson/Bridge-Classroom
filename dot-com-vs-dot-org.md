# Supporting both `.com` and `.org`

## Why we run two domains

Norton's reputation filtering blocks `bridge-classroom.com` (and any
`*.bridge-classroom.com` subdomain) for some of its users. There is **no
end-user whitelist option** — the affected user can't override the
block from inside Norton. We learned this when long-time users
(e.g. Maggie at Norton Bridge Club) suddenly couldn't load the site or
hit the API and had no path forward on the `.com` zone.

`bridge-classroom.org` is the workaround: a parallel hostname under a
different TLD, served from the same source tree, so blocked users can
fall back without losing data, accounts, or progress.

This doc is the contract for how the dual-domain build works. If you
change anything in here you almost certainly need to update both of:

- The Vite/frontend build (this repo).
- The Cloudflare Tunnel config on the Mac (`~/.cloudflared/config.yml`).

## Hostname map

| Surface              | `.com`                        | `.org`                        | Served by                                    |
| -------------------- | ----------------------------- | ----------------------------- | -------------------------------------------- |
| Static landing + SPA | `bridge-classroom.com`        | `bridge-classroom.org`        | GitHub Pages (`.com`), Cloudflare Worker (`.org`) |
| API                  | `api.bridge-classroom.com`    | `api.bridge-classroom.org`    | Same Cloudflare Tunnel → `localhost:3000`    |

Both static surfaces are produced by **the same build** — see CLAUDE.md
"Deployment Architecture". Every push to `main` rebuilds both domains
identically. Don't ever try to deploy them from divergent sources.

Both API surfaces are served by **the same Rust binary** through the
same Cloudflare Tunnel, with two ingress hostnames. There is no
separate `.org` API server; the names are just two front doors into the
same Mac on port 3000.

## How the frontend picks its API host

The SPA must call an API host **on the same TLD** as the page that
loaded it. If a Norton-blocked user is on `.org`, an API call to
`api.bridge-classroom.com` will be silently dropped exactly the way the
SPA on `.com` was. So we resolve at runtime, not at build time.

Implementation: [src/utils/apiUrl.js](src/utils/apiUrl.js) exports a
single `API_URL` constant whose value is decided once at module load:

1. If `VITE_API_URL` is set non-empty in the active `.env`, use it
   verbatim. (Used by `.env` for dev → `http://localhost:3000/api`,
   and available as a deliberate override for staging targets.)
2. Otherwise, look at `window.location.hostname`:
   - ends with `bridge-classroom.org` → `https://api.bridge-classroom.org/api`
   - ends with `bridge-classroom.com` → `https://api.bridge-classroom.com/api`
3. Fall back to `http://localhost:3000/api` (covers SSR / unknown hosts
   / running Vitest).

Every composable and component imports `API_URL` from this module.
**Do not reintroduce inline `import.meta.env.VITE_API_URL` fallbacks**
in new code — they bake a single host into the bundle and re-break
`.org` users. There's a one-liner test you can run after any build:

```bash
grep -oE "api\.bridge-classroom\.(com|org)" dist/assets/index-*.js \
  | sort | uniq -c
```

You should see one occurrence of each host. If `.org` is missing, the
runtime resolver got tree-shaken — check that `.env.production`
explicitly clears `VITE_API_URL` (it must contain `VITE_API_URL=`,
otherwise Vite inherits the localhost value from `.env` and folds the
resolver away).

## How the API is served on both hosts

The Cloudflare Tunnel config on the Mac (`~/.cloudflared/config.yml`)
declares two ingress hostnames pointing at the same local port:

```yaml
tunnel: f1fae255-82da-4016-ab0e-de93365574e1
credentials-file: /Users/rick/.cloudflared/f1fae255-82da-4016-ab0e-de93365574e1.json

ingress:
  - hostname: api.bridge-classroom.com
    service: http://localhost:3000
  - hostname: api.bridge-classroom.org
    service: http://localhost:3000
  - hostname: api.harmonicsystems.com
    service: http://localhost:3000
  - service: http_status:404
```

For each hostname listed there, a corresponding **DNS record** must
exist in the Cloudflare zone for that TLD, pointing at the tunnel
(CNAME to `<tunnel-id>.cfargotunnel.com`). The `cloudflared tunnel
route dns` subcommand creates the record automatically when the zone is
on Cloudflare.

CORS on the Rust server (see `bridge-classroom-api/.env`
`ALLOWED_ORIGINS`) must list **both** `https://bridge-classroom.com`
and `https://bridge-classroom.org` (and the `www.` variants). Today it
does. If you add a new origin (subdomain, preview deploy, …), extend
that list.

## Adding a new `.org` hostname end-to-end

If `api.bridge-classroom.org` (or any future `*.bridge-classroom.org`
service) ever needs to be set up from scratch, the steps are:

1. Edit `~/.cloudflared/config.yml`, add an `ingress` entry above the
   catch-all `http_status:404` line.
2. `cloudflared tunnel route dns f1fae255-82da-4016-ab0e-de93365574e1 api.bridge-classroom.org`
   to create the DNS record (one-time per hostname).
3. Restart the tunnel: `launchctl kickstart -k gui/$(id -u) <cloudflared-launchd-label>`
   (or whatever label is registered — check
   `launchctl list | grep cloudflare`).
4. Verify: `curl -sS -o /dev/null -w "%{http_code}\n" https://api.bridge-classroom.org/api/announcements/active`
   should return `200`.
5. If the SPA needs to call this new host, extend the resolver in
   `src/utils/apiUrl.js`.
6. If the new host is an SPA origin (not just an API host), extend
   `ALLOWED_ORIGINS` in `bridge-classroom-api/.env` and restart the
   API: `launchctl kickstart -k gui/$(id -u)/com.bridgeclassroom.api`.

## Things that look tempting but aren't right

- **"Just hardcode the API URL based on `import.meta.env.PROD`."**
  That gives you one host per build. Norton blocks the build that
  bakes `.com`, regardless of which page delivered it. The resolver
  has to look at the live `window.location`.

- **"Proxy `/api/*` from the `.org` Cloudflare Worker to
  `api.bridge-classroom.com`."** Server-to-server that fetch isn't
  blocked by Norton, so it would technically work. But it adds a
  Worker hop to every API call (latency, request quota, an extra place
  for things to break) and hides the client's TLD from the API logs.
  The two-hostname Tunnel is simpler and free.

- **"Just tell users to whitelist us in Norton."** Norton consumer
  products don't expose a per-site whitelist for the SafeWeb
  reputation block. We've confirmed this with affected users. The
  workaround has to be on our side.

- **"Migrate everyone to `.org` and retire `.com`."** Tempting, but the
  `.com` is the historical domain users have bookmarked, that links
  point to from BBO/Discord/Patreon, and that has the reputation +
  inbound traffic. We need both.

## Quick mental model

> The TLD on the address bar must equal the TLD on every API request
> the page makes. The build supports either TLD on the same bundle.
> The Tunnel serves the same Rust binary under either TLD. So the
> only thing that has to be smart is the API-host picker — and it
> looks at `window.location` to decide.
