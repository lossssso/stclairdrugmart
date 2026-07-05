# St. Clair Drug Mart — Pharmacy Website

Static marketing/informational site for St. Clair Drug Mart Pharmacy (1203 St. Clair Ave W,
Toronto, ON). Deployed at `www.stclairdrugmart.ca` (see `CNAME`) — no build step, no
package.json, no framework. Plain HTML/CSS/JS served as-is.

## Structure

- `index.html` — the homepage. Large single file (~7,200 lines) with the site's CSS in one
  `<style>` block and JS in several inline `<script>` blocks. Contains hero, welcome section,
  conditions/services list, team, reviews, FAQ (with client-side smart search), patient
  portal preview, find-us/map, and footer. Also carries most of the SEO metadata (OG/Twitter
  tags, `Pharmacy` JSON-LD schema).
- `portal.html` — patient portal landing page (appointment booking categories, links out to
  PharmAssess at `app.pharmassess.ca`).
- `braces-supports.html` — standalone service/landing page (braces & supports offering).
- `404.html` — custom 404 page, styled to match the homepage (clouds, nav, frosted card).
- `contact/index.html`, `find-us/index.html` — thin redirect/alias stubs for clean URLs.
- `blog/` — static blog:
  - `blog/index.html` — blog listing page with static FAQ schema and static post cards.
  - `blog/posts/*.html` — individual posts, one file per post.
  - `blog/posts.json` — post metadata index (title, slug, date, etc.) consumed by the listing
    page and by the generator script.
  - `blog/post.css`, `blog/post.js` — shared styling/behavior for post pages.
- `scripts/generate_blog.py` — generates a new SEO-targeted blog post via the Anthropic API
  (`anthropic` Python package). Has a fixed `PHARMACY` details dict and a `TOPICS` list of
  (description, primary keyword, secondary keywords) tuples to draft from.
- `.github/workflows/blog.yml` — runs `generate_blog.py` every Monday 9 AM ET (and on manual
  dispatch), commits the new post + updated `posts.json`, and pushes directly to the branch
  the workflow runs on. Requires the `ANTHROPIC_API_KEY` repo secret.
- Images: root-level `*.webp`/`*.png` (storefront, interior, neighbourhood photos), `team/`
  (staff photos), `logos/` (partner/service logos — Uber, TTC, Green P, OCP, PharmAssess,
  Bike Share), `flags/` (country flag SVGs, used for language/community sections).
- `sitemap.xml`, `robots.txt` — kept in sync manually with actual pages (see TODO.md history
  of "sitemap fix" commits).
- `TODO.md` — running list of open follow-ups, deferred features, and business/owner action
  items (not code state — read it for context on what's intentionally unfinished).

## Conventions

- No bundler, no npm, no build/test command. Edit HTML/CSS/JS files directly; changes are
  live as soon as they're committed/deployed (GitHub Pages via `CNAME`).
- Key business facts are hardcoded in many places and must stay consistent across files
  when changed: phone `(416) 654-8181`, address `1203 St. Clair Avenue West`, OCP
  accreditation No. 306667, rating "4.9★ / 59 reviews" (repeated ~18+ places — see TODO.md),
  hours (closed Sunday, Sat 9–2). Grep across `index.html`, `portal.html`,
  `braces-supports.html`, `blog/`, and JSON-LD blocks when updating any of these.
- SEO/AEO structured data (JSON-LD `Pharmacy` schema, FAQ schema) lives inline in the pages
  it describes — keep it in sync with visible content when editing copy.
- Booking/appointments link out to PharmAssess (`app.pharmassess.ca/appointment/306667`);
  don't assume any booking logic lives in this repo.
- Google Analytics (`G-2YQ9FDLMCV`) tag is inlined near the top of `<head>` on every page —
  replicate it if adding a new top-level page.
- Prefer editing existing inline `<style>`/`<script>` blocks over introducing new files or a
  build tool; the site is intentionally dependency-free.

## Working branch

Active development happens on `claude/review-claude-md-cxv4mc` (the repo's dev branch for
Claude sessions), not `main`. Commit and push there unless told otherwise.
