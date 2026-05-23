# Site analytics

## What we use

[**GoatCounter**](https://www.goatcounter.com/) (hosted, free tier).
Open-source, privacy-friendly, cookieless pageview tracker. One
`<script>` tag per HTML page, no cookie banner needed.

**Why this and not Cloudflare Web Analytics:**

- Free hosted tier handles up to 100k pageviews/month — plenty of
  headroom.
- Per-path drilldown and richer dashboard than Cloudflare's basics.
- 6-month retention on Cloudflare's free tier vs. forever on
  GoatCounter.
- Custom events are free (Cloudflare gates those behind a paid plan).
- CSV/JSON export and API access if we ever want to crunch numbers
  ourselves or migrate.
- Less commonly blocked by ad-blockers than
  `static.cloudflareinsights.com`.

**Why not Cloudflare zone analytics:**

`bridge-classroom.com` DNS is on Cloudflare but the records are
DNS-only (grey cloud) — Cloudflare resolves the name and the browser
goes straight to GitHub Pages. Zone analytics never sees the HTTP
requests, so it can't count pageviews for `.com`. Only the `.org`
side (Cloudflare Worker) would light up. A client-side beacon
sidesteps the asymmetry — same script on both domains, both report
into one dashboard.

## Where the data lives

- **Dashboard**: https://bridge-classroom.goatcounter.com
- **Admin email**: popperbiz@gmail.com
- **Plan**: free / non-commercial

## The snippet

Identical on every page:

```html
<script data-goatcounter="https://bridge-classroom.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

Loaded async, ~3KB, no cookies, no PII. Runs after the page is
interactive so it doesn't affect TTI.

## Where the snippet is installed

The snippet is inlined in the `<head>` of every HTML file that
ships, so it works the same whether the user is on `.com` or `.org`
(the same files are built into both domains' `dist/`).

**Vue SPA:**
- `index.html` (Vite entry, becomes `dist/solo-practice-app/index.html`)

**Static landing pages (`docs/`):**
- `docs/index.html` (hub)
- `docs/about.html`
- `docs/bbo-scenarios.html`
- `docs/bidding-practice.html`
- `docs/classrooms.html`
- `docs/deal-library.html`
- `docs/game-analysis.html`
- `docs/hand-curator.html`
- `docs/lesson-materials.html`
- `docs/solo-practice.html`
- `docs/teacher-utilities.html`

**Self-contained subapps:**
- `docs/curator/index.html` (Hand Curator — full React-in-HTML app)

**Deliberately excluded:**
- `docs/bidding-practice/index.html` — pure redirect stub.
  Its inline `<script>location.replace(...)</script>` fires
  synchronously during HTML parsing, before any async script could
  load. Adding the snippet here would never fire. The destination
  page (the SPA) carries the snippet, so the visit is still counted.

When adding a new HTML page under `docs/` or elsewhere, drop the
snippet into the `<head>` and update this list.

## Comparing `.com` vs `.org`

GoatCounter records the hostname on every pageview. In the
dashboard, both domains appear under one site — filter by
**Host** (in the path filter) or look at the **Hostnames** breakdown
to split them apart. This is the main reason GoatCounter was picked
over a per-domain setup; it answers "how is each domain being used?"
in one place.

## Custom events (future)

For interaction tracking — "lesson started", "convention card
opened", "bidding practice completed" — call:

```js
window.goatcounter && window.goatcounter.count({
  path:  'lesson-started',
  title: 'Lesson started',
  event: true,
})
```

No plan upgrade, no extra script. The free tier covers this.

## Excluding our own visits

GoatCounter has an **Ignore IPs** setting under Settings →
Main settings. Add the current IP (the dashboard offers a
one-click button) for any machine you use to develop or test from,
so dev traffic doesn't pollute the data. Rotate the list when ISPs
hand out new addresses.

Local development on `http://localhost:5173` also gets counted in
principle, but the GoatCounter script ships from `gc.zgo.at` and
won't fire on `localhost` unless `data-goatcounter` is set — which
it is. Adding the dev machine's public IP to the ignore list is the
clean fix.

## What it costs to remove

Just delete the `<script>` tag from each HTML file listed above.
Nothing in the app's business logic touches GoatCounter — it's a
pure side-effect beacon. Swap in another provider by changing the
URL and `data-` attribute.

## See also

- [dot-com-vs-dot-org.md](dot-com-vs-dot-org.md) — Why we run two
  domains and how the dual-build works. Analytics is one of the
  things that has to work identically across both.
- [CLAUDE.md](CLAUDE.md) — Deployment architecture and the
  `scripts/build-site.sh` flow that produces `dist/`.
