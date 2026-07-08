# Modernization — Progress Tracker

Base branch: `dev` (work branch tracks `origin/dev`). Palette LOCKED to 4 brand teals + white/ink.
Full rationale + audits live in each `NN-*.md` spec file. Implement in order; one commit + one
push per WP (never batch); verify at 375px + 1280px before the next.

## Already-wired dependencies (what a future session can assume exists)
- **Design tokens** (index.html `:root` ~146-169): `--teal-dark #00737c`, `--teal-bright #21a1a8`,
  `--teal-mid #5cb9bc`, `--teal-ice #d7fbfc`, `--shadow-card`, `--shadow-hover`, `--ease-apple`
  (`cubic-bezier(.25,.1,.25,1)`), `--ease-spring` (`cubic-bezier(.175,.885,.32,1.275)`),
  `--radius 14px`. Fonts: Plus Jakarta Sans (display) / DM Sans (body), loaded ~142.
- **Vendored 3D/anim** in `vendor/`: `three.core.min.js` (376 KB), `three.module.min.js` (357 KB),
  `gsap.min.js` (71 KB), `ScrollTrigger.min.js` (43.5 KB). Loaded LAZILY + capability-gated by
  `walkin3d.js` (the welcome WebGL store tour) — never eagerly, never on weak/reduced-motion.
- **walkin3d.js** — welcome-section Three.js scroll walk-in. Mounts into `<canvas id="w3d-canvas">`
  inside `.w3d__stage`; sets `html.w3d-on` when active (hides classic pills). Well-gated
  (hardwareConcurrency<=2 / deviceMemory<=2 / no-WebGL / reduced-motion / lite-clouds all bail)
  with a 2-stage FPS watchdog. KNOWN GAPS (WP9): no `webglcontextlost` fallback; no tab-hidden pause.
- **About scroll-sequence** — vanilla 2D-canvas crossfade of the 6 gallery photos, no library,
  at index.html ~7372-7482 (`#abt-seq-canvas`, `html.abtseq-on`). This is the CLAUDE-preferred
  "canvas image-sequence" technique — reference implementation for any future 3D down-convert.
- **Reusable interaction seeds** (WP3 generalizes these): magnetic nav CTA IIFE ~7282-7309;
  IntersectionObserver count-up + `.rv-in` stagger reveal ~6372-6426 (reviews) and ~6428-6460 (team).
- **`.btn` tactile recipe** ~702-718: spring hover `translateY(-2px) scale(1.03)` + layered hover
  shadow + `:active scale(.97)` — the button gold standard to propagate.

> Line numbers are from `origin/dev` at session start (index.html ~7,485 lines) and WILL drift as
> WPs land. Always `grep` the selector/keyword before editing; never trust a raw line number.

## Status
| WP | File | Status | Notes |
|----|------|--------|-------|
| — | scaffolding | Done | this folder + tracker (commit c8ca4d9) |
| 1 | 01-shadow-radius-tokens.md | Done | commit bfc21d5 — see notes below |
| 2 | 02-tactile-button-system.md | Done | commit 8b015cb — press states + nav CTA pill |
| 3 | 03-extract-js-utils.md | Done | commit c74b79d — 3 globals + .reveal-ready recipe |
| 4 | 04-apply-magnetic-press.md | Done | commit 6c9f83e — see notes + QA gotcha below |
| 5 | 05-scroll-reveal-safe-sections.md | Done | commit cdcc09e — see notes + deviation below |
| 6 | 06-card-tilt-touch.md | Done | commit 5cc46cf — see notes + cascade-bug fixes below |
| 7 | 07-section-rhythm-focal-depth.md | Done | commit c41dc34 — see notes below |
| 8 | 08-emoji-to-svg-icons.md | In Progress | batch 1/3 done, commit bfc5341 — see notes below |
| 9 | 09-welcome-3d-guardrails.md | Not Started | walkin3d.js compliance |

## Decision log
- (session start) Palette ban on Three.js was lifted on `dev` → graduated perf-gated 3D rule;
  canvas image-sequence preferred over WebGL engine. Welcome hero uses WebGL (walkin3d.js);
  flagged for possible future canvas-sequence down-convert (separate approval, NOT in these WPs).
- Motion scope = CURATED: modernize everything, heavy scroll-3D only where safe; forms/tools/map
  get polish + entrance reveals, never scroll-motion on the tool itself.
- Touch = first-class: every pointer effect gated to fine-pointer + ships a real touch branch
  (press `:active`, or scroll-driven tilt). Never leave touch with nothing.

## Per-WP handoff notes
- **WP1 (done, bfc21d5):** All resting/hover shadows on shop/info-strip/reviews-badges+buttons/
  vaccine/medscheck/pa-card/blog-card/step now use `--shadow-card`/`--shadow-hover`. pa-card ink
  fixed to token palette. Dead duplicate `.reviews-metric:hover` removed (metric hover works now).
  `.btn` radius 6px→`--radius`. Verified computed shadows resolve to token at 375+1280, no page
  errors (only sandbox-blocked external ERR_CONNECTION_RESET, present on untouched site too).
  LEFT FOR LATER: full radius unification (nav__cta 7px, modal 30px, contact-float) deferred to
  WP2 where the button pass touches those anyway. Uber green shadows intentionally kept (brand).
  The flat `--shadow` back-compat alias still exists in `:root` — harmless, a few non-card spots
  still use it; can retire once all call sites migrate.

- **WP2 (done, 8b015cb):** Shared `:active` press rule added (grouped selector after `.btn:active`)
  covering pa-card, welcome-box, shop__card, reviews btns+badges, contact-float toggle, nav CTA,
  find-us logo btns. Nav CTA now 100px pill + token shadows + apple easing. All press targets
  have `transform` in their base transition so the press animates. NEXT SESSION: WP4 will add
  `initMagnetic` to some of these same elements — it must COMPOSE its `translate()` with the
  `:active scale(.97)` (put translate on the element, keep scale on :active) so they don't clobber
  each other's `transform`. `.find-us__logo-btn:active` press assumes that class exists — verify.

- **WP3 (done, c74b79d):** Three globals now available for WP4-6: `initMagnetic(el,opts)`,
  `revealOnce(el,cb,opts)`, `staggerReveal(container,opts)`. CSS recipe `.reveal-ready > *`
  (hidden) + `.is-revealed` (plays rvSlideIn), crawler-safe (JS adds `.reveal-ready`; no-JS shows
  all). Reduced-motion + fine-pointer gating computed once at top of the util IIFE.
  - **WP4 compose note:** for cards with a hover `transform` (pa-card translateY, etc.), call
    `initMagnetic(el, {compose:true})` AND give that element CSS
    `transform: translate(var(--mag-x,0),var(--mag-y,0)) <its own hover/scale>` so magnetic +
    hover + `:active` press don't clobber each other. For plain buttons/badges/FAB, default
    (direct transform) is fine. Nav CTA uses default and still works.
  - **WP5 usage:** `staggerReveal(document.querySelector('.welcome__boxes'))` etc. Children get
    `animation-delay` automatically. Existing reviews/team count-ups were NOT re-pointed (left
    working as-is) to keep this WP a pure add; optional cleanup later.

- **WP5 (done, cdcc09e):** `staggerReveal()` wired to `.welcome__boxes`, `.staff-grid`,
  `.blog-grid`, `.steps` (new-patients) — all verified reaching opacity 1 after scroll-in at
  375+1280, reduced-motion instant end-state. Call sites live in a small script block right
  after the WP3 utils IIFE (search "WP5: staggered scroll-reveal"). Reviews/team count-ups were
  left on their original observers (not migrated), per the WP3 note.

- **WP4 (done, 6c9f83e):** Magnetic wired on `.pa-cards--top .pa-card` (2 cards), `.shop__card`
  (×3), `.reviews-google-btn`/`.reviews-uber-btn`/`.reviews-read-btn`, `.contact-float__toggle`
  — all via `initMagnetic(el, {compose:true, ...})`. Each target's base rule now carries
  `transform: translate(var(--mag-x,0),var(--mag-y,0))` and its hover/:active variants extend
  that same translate with the original hover/press transform; the *old* hover rules (further
  down in the file) had their redundant `transform` stripped so they don't fight the new
  composed rule on the cascade (same selector specificity — later-source wins per property, so
  leaving stale `transform` there would have silently overridden the compose). If you add
  magnetic to any NEW element later, follow this same pattern: put the compose base rule BEFORE
  the element's original hover rule in source order, and strip `transform` from the original.
  **QA gotcha worth knowing**: the welcome promo modal (`#welcomeModal`) opens via
  `setTimeout(...,1400)` on every fresh load unless `welcomeModalDismissedUntil_v2` is already
  in localStorage AT THE TIME THE PAGE'S OWN SCRIPT RUNS — setting it via `page.evaluate()`
  *after* `page.goto()` is too late (the timer's already scheduled) and it reopens 1.4s later,
  intercepting all pointer events. Must use `page.addInitScript()` before `page.goto()` in any
  Playwright QA that involves hover/click on main-page content.

- **WP6 (done, 5cc46cf):** `initTilt(el, opts)` added (4th global, alongside WP3's three) —
  same rAF-spring pattern as `initMagnetic` but writes `--tilt-x`/`--tilt-y` (deg) instead of
  `--mag-x`/`--mag-y` (px), so it composes on the same element. Wired to `.welcome-box` (max 5°),
  `.pa-cards--top .pa-card` (max 4°), `.shop__card` (max 5°), `.staff-card` (max 3°, deliberately
  subtler — faces shouldn't spin much). `perspective: 900px` added to the 4 parent grids inside
  `@supports (transform-style: preserve-3d)`. Flat fallback (no rotate) is the default/outside-
  `@supports` rule for every element; the 3D rotate only applies inside the supports block, per
  CLAUDE.md's CSS Rules. Touch/coarse-pointer gets zero tilt init (matches `initMagnetic`'s
  existing gating) — its feedback is the WP2 `:active scale(.97)` press, already present on all
  four targets.
  - **Two CSS cascade bugs found + fixed while wiring this (important for WP7/WP8):**
    1. `staggerReveal`'s `.is-revealed > *` rule played `animation: rvSlideIn ... forwards`. A
       forwards-filled animation keeps *animation-level* ownership of every property it animates
       (here `opacity` + `transform`) even after finishing — this beats plain stylesheet rules on
       those same properties regardless of specificity/source order, because animations are a
       higher origin in the cascade than normal declarations. Any card that both scroll-revealed
       AND had a hover/tilt/magnetic transform (`.welcome-box`, `.staff-card`) stayed frozen at
       the animation's final `transform` value and ignored later JS-driven `--tilt-x`/`--mag-x`
       changes. **Fix:** `staggerReveal` now adds an `animationend` listener per child that first
       pins `style.opacity = '1'` inline, THEN sets `style.animation = 'none'` (order matters —
       clearing the animation before pinning opacity would flash back to the base rule's
       `opacity:0` for one frame). Once `animation` is cleared, normal cascade rules govern
       `transform`/`opacity` again.
    2. Even after fix #1, `.staff-card` alone was still stuck (showed `translateY(22px)`, the
       *static* `.reveal-ready > *` rule's declared transform — not the animation, the plain
       rule). Root cause: `.reveal-ready > *` and `.staff-card`'s own base tilt rule
       (`.staff-card { transform: rotateX(...) }`) have EQUAL specificity (0,1,0 each), and
       `.reveal-ready > *` was declared later in the stylesheet (near the `rvSlideIn` keyframe,
       far below the WP2/WP4/WP6 component blocks), so it won by source order alone for any
       `.staff-card` that is also a `.reveal-ready` child (i.e. any card inside `.staff-grid`,
       per WP5). `.welcome-box` didn't show this in ad-hoc `:hover` testing only because
       `:hover` (0,2,0) naturally outranks it — the same latent bug was there on `.welcome-box`'s
       base (non-hover) tilt rule too, which matters since tilt updates continuously via
       `mousemove`, not just on `:hover`. **Fix:** hoisted the whole `.reveal-ready > *` /
       `.reveal-ready.is-revealed > *` / reduced-motion recipe from its old spot (near
       `rvSlideIn`) to directly above the WP2/WP4/WP6 interactive compose rules (now right before
       `.welcome__boxes` at ~line 620). **Standing rule for WP7/WP8:** any new compose-safe
       interactive rule for an element that might live inside a `.reveal-ready` container must be
       declared AFTER this hoisted recipe (i.e. anywhere below ~line 632) — it already is, since
       everything in the file lives below that point; just don't reintroduce a second copy of the
       `.reveal-ready` recipe further down.
  - Verified via Playwright: 1280px desktop — `.staff-card`/`.welcome-box`/`.pa-card` all show
    non-identity `matrix3d(...)` with `opacity:1` after scroll-reveal + hover/mousemove. 375px
    touch emulation — `.staff-card` shows identity `matrix(1,0,0,1,0,0)` (no tilt), confirming
    the pointer gate holds. `prefers-reduced-motion` — flat `transform:none`, `opacity:1`,
    instant, no `--tilt-x` set. No new console errors beyond the pre-existing sandboxed
    `ERR_CONNECTION_RESET` on external resources (present on untouched site too).

- **WP7 (done, c41dc34):** New `:root` tokens `--sec-pad-sm/-md/-lg` (3.25rem/5rem/7rem,
  1.5rem sides). Base `section{padding:var(--sec-pad-md)}` unchanged in value; `#booking,
  #reviews` bumped to `--sec-pad-lg`, `#drug-checker, .faq` tightened to `--sec-pad-sm`. Left
  `#flags` alone — it already has its own dedicated `#flags{padding:.75rem 1.5rem 2.5rem}`
  override later in the file that would've silently beaten a rhythm-scale assignment anyway
  (same id-selector specificity, later source wins); didn't touch `#shop`'s inline
  `style="padding-top:2rem"` for the same reason (inline always wins). The `@media (max-width:
  480px) { section{padding:2rem .875rem} }` global small-phone override (existing, ~1453) still
  applies on top of all of this unchanged — verified booking/new-patients padding-top values at
  375px reflect it correctly.
  - New `.section__eyebrow` (small tracked uppercase label + short rule) applied to Services
    ("What We Treat") and Team ("The Team"); `.section__title--center` / `.section__lead--center`
    modifiers applied to Reviews only. 3 sections get a distinct signature; everything else keeps
    the standard left-aligned title+underline molecule, per spec ("variety ≠ chaos").
  - Focal card promotion: `.welcome-box--focal` (added to the free/OHIP-covered Medication
    Reviews box — 1st of 6) spans 2 grid columns with a badge + tinted gradient bg; explicit
    `grid-column: span 1` override inside the existing `max-width:480px` breakpoint (where
    `.welcome__boxes` itself drops to `1fr`) so it collapses cleanly instead of leaving an
    invalid/ignored span. `.reviews-metric--focal` (added to the "59 Google Reviews" metric —
    1st of 6) gets a solid `--teal-bright` fill instead of the shared `--teal-ice` card look.
  - Sectional depth: `#services` background is now a layered
    `linear-gradient(180deg,var(--teal-ice),transparent 220px), var(--white)` — a background
    LAYER on the element itself, not a `::before` pseudo-element, specifically to dodge a
    stacking-context/z-index trap (an absolutely-positioned pseudo-element with default
    `position:relative` on a non-z-indexed parent paints ABOVE non-positioned in-flow content
    unless given `z-index:-1`, which then risks bleeding into the *previous* section if the
    parent doesn't establish its own stacking context — layering it into `background` sidesteps
    this entirely since backgrounds always paint behind an element's own content). `.reviews-hero`
    got a matching treatment: teal-ice-to-transparent gradient panel + border + `--shadow-card` +
    padding, reading as "an elevated panel behind the focal group" per spec.
  - Note: there are two duplicate `#services{background:...}` rules in the file (an older dead
    one at ~698, the real one used by the live accordion markup at ~1690 — only the latter was
    edited, since later-source wins for equal id specificity and the first was already
    inert/pre-existing dead weight, not introduced by this WP).
  - Verified via Playwright: 1280px — focal welcome-box measured 728px vs 356px sibling width
    (correct 2:1 span), `#booking` padding-top computed 112px (=7rem), `#new-patients` 80px
    (=5rem, unaffected). 375px — focal welcome-box measured 347px = sibling width (correctly
    collapsed to span 1), `#new-patients` padding-top 32px (=2rem, correctly picking up the
    existing global 480px override), zero horizontal scroll overflow at either width. Screenshots
    confirm: eyebrow labels render above Services/Team titles, Reviews title/lead centered with
    the elevated panel and focal teal metric tile visible, no layout breaks or overlap.

- **WP8 batch 1/3 (done, bfc5341):** Shared icon infrastructure now exists for the remaining
  batches to reuse — a `<svg style="display:none">` `<symbol>` sprite inserted right after
  `<body>` (search `WP8 shared icon sprite`), and a generic `.icon` CSS class
  (`width/height:1em; fill:none; stroke:currentColor; stroke-width:1.6`) defined in the
  "Sections shared" CSS block (search `.icon {`). **To add a new icon for batch 2/3:** add a
  `<symbol id="i-name" viewBox="0 0 24 24">...</symbol>` to the existing sprite `<defs>`, then
  use it anywhere as `<svg class="icon" aria-hidden="true"><use href="#i-name"></use></svg>`. No
  new CSS needed per call site — any container that already sized its emoji via `font-size`
  (which is most of them, e.g. `.pa-card__icon`, `.ailment-card__icon`) sizes the SVG identically
  for free via the 1em rule.
  22 symbols exist so far: `i-clipboard, i-stethoscope, i-syringe, i-pencil, i-testtube,
  i-refresh, i-thermometer, i-pill, i-bandage, i-plane, i-no-smoking, i-lifebuoy, i-baby,
  i-virus, i-droplet, i-leaf, i-check, i-star, i-eye, i-spot, i-wind, i-flame, i-flower` — reuse
  any that fit a batch-2/3 concept (e.g. `i-droplet` for another blood/liquid-related condition,
  `i-thermometer` for another fever-adjacent one) rather than inventing near-duplicates.
  **Hard-won lesson (re-verify for every new icon, don't skip this):** hand-written icon paths
  that look plausible in the abstract can render as illegible blobs at real call-site size
  (~14-30px) — this happened to the first-draft syringe, point-of-care test, pill, plane,
  no-smoking, and leaf icons here, only caught by actually screenshotting the rendered page at
  3x device-scale zoom (`deviceScaleFactor:3` + `page.screenshot({clip: boundingBox})` on the
  container), NOT by eyeballing the SVG source. Prefer simple axis-aligned primitives (circles,
  rects, straight lines) over multi-point curved paths; for anything that needs to read at an
  angle, build it upright with simple shapes inside a `<g>` and rotate the whole group once
  (`transform="rotate(-45 12 12)"` on the `<g>`, not per-child) rather than rotating individual
  shapes around different centers, which is what produced the first broken syringe.
  Star icon kept `#FBBF24` (the site's existing `.reviews-stars-fill` amber) via an inline
  `style="color:#FBBF24"` on that one `<svg>` — a pre-existing brand exception (same category as
  the Uber green), not a new hue.
  **Scope done this batch:** all 6 `.welcome-box__icon`, all 10 `.welcome__pill`, and the
  welcome-modal badge + rating + 6 condition tags (`.welcome-modal__badge`,
  `.welcome-modal__rating`, `.welcome-modal__tag`) — batch 1 exactly as scoped in the spec.
  **NOT done yet (batches 2 and 3, still Not Started):** `.pa-card__icon`,
  `.pa-row-heading__icon`, the dozens of `.ailment-card__icon` + `.ailments-triage__btn` icons,
  and the `AILMENT_DB` icon field in JS (batch 2); `.reviews-metric__icon`, hero status glyphs,
  any remaining emoji (batch 3). Batch 2 is the largest remaining surface — budget real time for
  it and expect to add ~15-20 more symbols to the sprite (condition-specific: UTI/pink-eye/etc.
  already exist from the modal tags, but the full `AILMENT_DB` list is longer). Verify no leftover
  emoji per batch with the same programmatic check used here (regex `[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]`
  over `.textContent` of the batch's container selectors).

## Deviations from original plan
- WP1 spec included radius unification; only `.btn` radius moved in WP1. Remaining radius
  outliers folded into WP2 (button system) to keep each commit coherent. Not a scope change,
  just resequencing within the approved plan.
- WP5 spec named `.services__grid` as a reveal target — that class doesn't exist on `origin/dev`;
  `services` is actually an accordion (`.svc-acc` with 3 `.svc-acc__group` children, not a card
  grid). Substituted a lighter per-group reveal (3 groups, not per-accordion-item), consistent
  with the site audit's explicit "services: lean still, at most a per-group fade-in" guidance —
  not a scope expansion, a correction to match what's actually in the DOM.
