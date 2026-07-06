# WP2 — Unified tactile button system

**Goal:** every CTA feels physical and gives tactile "press" feedback — the primary TOUCH analog
to desktop magnetism. Propagate `.btn`'s gold-standard recipe.

## Do
Add the shared press + easing to every CTA missing it:
`:active { transform: scale(.97); transition-duration: .12s; }`
plus `transition: background .2s var(--ease-apple), transform .3s var(--ease-spring),
box-shadow .2s var(--ease-apple);` and a hover `translateY(-2px) scale(1.03)` where absent.

Targets currently lacking `:active`: `.pa-card`, `.welcome-box`, `.reviews-google-btn`,
`.reviews-uber-btn`, `.reviews-read-btn`, `.shop__card`, `.contact-float__toggle`, `.nav__cta a`,
`.find-us__logo-btn`, review/partner badges. (`.btn`, `.welcome__pill` already have press — leave.)

Apply the WP1 radius scale so all pill CTAs share 100px and card-buttons share `--radius`.

## Reuse
`.btn` (702-718) is the reference. `--ease-apple` / `--ease-spring` already defined.

## Constraints
Do not add `transform`-based hover to any element that will later receive `initMagnetic` (WP4)
without leaving room to compose — prefer putting the magnetic translate on the element and the
scale on `:hover`/`:active` so they don't fight. Note which WP4 targets get hover-scale here.

## Verify
Touch emulation: tapping any CTA visibly presses (scale .97) and releases. Desktop hover lifts.
375 + 1280 screenshots; no layout shift; all CTAs still navigate.
