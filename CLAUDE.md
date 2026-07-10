# St. Clair Drug Mart — Pharmacy Website

Static marketing/informational site for St. Clair Drug Mart Pharmacy (1203 St. Clair Ave W,
Toronto, ON). Deployed at `www.stclairdrugmart.ca` (see `CNAME`). See "Project Rules" below
for the stack and design/dev rules.

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

- Edit HTML/CSS/JS files directly; changes are live as soon as they're committed/deployed
  (GitHub Pages via `CNAME`).
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
- Prefer editing existing inline `<style>`/`<script>` blocks over introducing new files.

## Working branch

Active development happens on `claude/review-claude-md-cxv4mc` (the repo's dev branch for
Claude sessions), not `main`. See "Git Rules" below for push policy.

# St. Clair Drug Mart — Project Rules
## What This Project Is
A modern community pharmacy website (stclairdrugmart.ca) serving a general Toronto population — seniors, patients on older/slower devices, all mobile types. The goal is a premium, distinctive, non-generic look that feels trusted and modern, like Apple.com or Linear.app, while loading fast for everyone. This is a healthcare site — accessibility and speed are never sacrificed for aesthetics.
## Stack
- Plain HTML/CSS/JS only
- No React, no npm, no build tools, no package.json
- Hosted on GitHub Pages (main branch = live site)
- Previewed on Cloudflare Pages (dev branch)
- Domain via Canspace DNS
- Do not change the stack under any circumstances
## File Structure
- index.html — main page
- storefront.js — storefront animation only, self-contained, swappable
- All JS at bottom of body or using defer
- One scoped <style> block per major feature section
## Code Review
- Day-to-day checks on the working diff: use the native `/review` / built-in code-review skill.
- The installed `code-review` plugin is only for actual pull requests — and run it as
  `/code-review medium`, never inheriting a higher session effort setting.
## Git Rules
- Never push to GitHub without explicit instruction
- Dev branch only — never push to main
- One commit per completed task — never commit after every small change
- Always state what you are about to commit before doing it
## Design Direction (critical — read before writing any CSS)
This site must NOT look AI-generated. Before writing any CSS, commit to a clear aesthetic direction and execute it with intention.
- Aesthetic target: luxury/refined pharmacy — think Apple.com meets a premium European clinic
- Typography: use Plus Jakarta Sans or DM Sans via Google Fonts — never Inter, Roboto, Arial, or Space Grotesk
- Color: dominant brand color with sharp accents — avoid timid evenly-distributed palettes and purple gradients
- Layouts: use asymmetry, overlap, generous negative space — avoid generic card grids stacked on top of each other
- Borders: 1px brand-color borders with layered box-shadow for depth — never flat single shadow or gradient glow borders
- Motion: one well-orchestrated reveal per section — never scattered micro-interactions everywhere
- Backgrounds: create atmosphere and depth — never default to plain white or solid color sections
- Every screen needs one single strong visual anchor — never fill every inch with content
## Performance Rules (non-negotiable)
- Only animate transform and opacity — never top, left, width, margin, height, or box-shadow
- prefers-reduced-motion fallback on every animation — show static state immediately
- will-change: transform only on actively animating elements, removed after via onLeave callback
- No animation on off-screen elements
- All images need width and height attributes to prevent layout shift
- No render-blocking scripts
## CSS Rules
- Mobile-first — base styles for mobile, scale up with min-width media queries
- Under 768px: collapse parallax to fewer/simpler depth layers by default (this is a layout
  simplification for smaller viewports, separate from the capability-based gating below —
  a phone can still be high-powered, and a desktop can still be weak hardware)
- All CSS 3D inside @supports (transform-style: preserve-3d) with flat fallback
## Approved CDN Libraries (no npm — link tags only)
- GSAP: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
- ScrollTrigger: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
- AOS: https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js
- Normalize.css: https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css
- Lazysizes: https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js
- Lucide Icons: https://unpkg.com/lucide@latest
- `<model-viewer>` (preferred when a real 3D model/object is needed — handles DPR capping,
  progressive loading, and iOS AR fallback out of the box):
  https://unpkg.com/@google/model-viewer@4.3.1/dist/model-viewer.min.js
- Three.js (only for the one scoped 3D feature described below, with all required gating):
  https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.min.js
## Library Selection Rule
Choose the lightest possible tool for each task. Prefer CSS-only solutions first, then vanilla
JS, then a CDN library via script tag only if genuinely needed. Never use anything that
requires npm install or a build step.

For "premium 3D-feel" moments (product reveals, storefront/interior tours), default to a
**canvas scroll-scrubbed image sequence** — pre-rendered/photographed frames drawn to
`<canvas>` and scrubbed by scroll position. This is how Apple.com's own "3D product" pages
actually work: it reads as real 3D, has no WebGL context to lose, no shader compilation, and
performs identically on old and new phones. Try this before reaching for a 3D engine.

WebGL (Three.js or `<model-viewer>`) is allowed, but only for a single, clearly-scoped
feature — never general page decoration — and only when it ships with ALL of the following:
- A capability gate before any WebGL context is created: bail to the flat/static fallback on
  `navigator.hardwareConcurrency <= 2`, `navigator.deviceMemory <= 2` (where available), no
  WebGL support, or `prefers-reduced-motion`.
- A live FPS sentinel once running: sample real frame times; if a meaningful share run slower
  than ~34ms (under ~29fps), drop pixel ratio first, then fully bail to the static fallback.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — never render at native DPR.
- The render loop pauses when the element is off-screen or the tab is hidden.
- A real fallback image, not a blank canvas, if the WebGL context is lost.

Babylon.js, A-Frame, and Spline remain out of scope for this project. Three.js (hand-rolled,
for a bespoke scene) or `<model-viewer>` (preferred for displaying a single 3D object/model)
are the only 3D-engine options, and only under the gating above.
## Skills
You have access to Claude skills. Use them when they genuinely improve output quality.
**Full installed plugin/skill inventory (what's available, sources, when to use each):
see `CLAUDE_PLUGINS.md`.** Quick version below.
Preferred skills for this project: impeccable (design/redesign/audit/critique/polish — 23
`/impeccable` commands) and frontend-design (non-generic aesthetics), plus gsap-scrolltrigger
(for scroll animation). impeccable and frontend-design are installed at PROJECT scope (see
`.claude/settings.json`) so they auto-load on every device/session working on this repo. Use
lightweight-3d-effects or similar for CSS/canvas techniques first; only reach for a 3D-engine
skill when a scoped WebGL feature is justified under the Library Selection Rule above.
Never activate a skill that pulls in npm dependencies or a build tool *into the site's own
stack* — this rule governs shipped site assets, not Claude's tooling. (impeccable itself runs
local Node `.mjs` helper scripts and a PostToolUse hook; that is harness tooling, it adds
nothing to the deployed site and does not touch the no-build/no-npm rule for `index.html` et al.)
## Welcome-Section 3D Walk-In (`walkin3d.js` — live on dev)
A scroll-driven Three.js walk-through of a stylized, procedurally-built St. Clair Drug Mart
(flat-color primitives — no photo textures), embedded in `#welcome` after `.welcome__boxes`.
The real `logo.png` is composited into the sign + back-wall textures at runtime. The ten
"What brings you in today?" consultation pills live *inside* the scene as `.w3d-spot`
hotspots (world-space `data-pos`, projected to screen each frame); the classic text-column
pills are hidden only under `html.w3d-on`, so every gated-off visitor keeps them.
Guardrails (all in `walkin3d.js`, markup/CSS in `index.html` `#w3d-styles` — fully swappable):
- Boot gate: bails on `prefers-reduced-motion`, `hardwareConcurrency <= 2`,
  `deviceMemory <= 2`, `lite-clouds` (the measured perf-guard signal), no
  IntersectionObserver, or no WebGL — the `.w3d` block stays `display:none` (classic page).
  Do NOT gate on core counts above 2: modern iPhones report as few as 4 cores.
- Lazy boot: GSAP → ScrollTrigger → Three.js (all vendored in `vendor/`) fetch only when
  scroll nears the section (IO rootMargin 150%); reduced-motion visitors download zero bytes.
- Runtime FPS sentinel: 90-frame rolling window; >35% frames slower than 34ms → first drop
  pixel ratio to 1x, then kill the effect and revert to the classic page live.
- Pixel ratio capped at 1.5; render loop fully stops when the section is off-screen.
- Stage pinning is hand-rolled (`pin()`), NOT ScrollTrigger's pin — `body{overflow-x:hidden}`
  breaks native pinning. Never add a transform/filter to `#welcome` ancestors (breaks fixed).

## About-Section Photo Sequence (`#abt-seq` — live on dev)
Apple-style scroll-scrubbed 2D-canvas crossfade through the six real gallery photos
(street → storefront → inside), vanilla JS inline near the end of `<body>`, styles in
`#abtseq-styles`. Activates `html.abtseq-on` (which hides the static `.gallery`); the static
gallery is the reduced-motion / no-JS / pre-activation state. It observes `#about` (not its
own hidden block — `display:none` elements never intersect). No WebGL, no library; DPR
capped at 2; draws only on scroll-progress change.
## Accessibility
- Descriptive alt text on all images
- All interactive elements keyboard accessible
- WCAG AA color contrast minimum
- Critical pharmacy information never hidden inside animations
