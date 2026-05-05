// Resolves the API base URL at runtime.
//
// Norton (and similar reputation-based filters) sometimes block
// `api.bridge-classroom.com` for users it has decided not to trust on the
// `.com` zone, with no whitelist option exposed in the UI. To keep those
// users working when they fall back to `bridge-classroom.org`, we route
// API calls through `api.bridge-classroom.org` whenever the SPA itself
// was loaded from the `.org` host. The .org and .com APIs are both
// served by the same Cloudflare Tunnel pointing at this Mac on port
// 3000 — see `dot-com-vs-dot-org.md` for the deploy contract.
//
// Order of precedence:
//   1. `VITE_API_URL` if set (developer override via `.env`).
//   2. The TLD that matches the page's hostname.
//   3. `http://localhost:3000/api` for local `npm run dev`.

const ENV_API_URL = import.meta.env.VITE_API_URL

function resolve() {
  if (ENV_API_URL) return ENV_API_URL

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('bridge-classroom.org')) {
      return 'https://api.bridge-classroom.org/api'
    }
    if (host.endsWith('bridge-classroom.com')) {
      return 'https://api.bridge-classroom.com/api'
    }
  }

  return 'http://localhost:3000/api'
}

export const API_URL = resolve()
