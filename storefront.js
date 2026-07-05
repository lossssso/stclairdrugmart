/* ── Storefront cinematic — St. Clair Drug Mart ─────────────────────────────
   Scroll-scrubbed "walk inside" on the welcome section's storefront photo.
   Fully swappable: this file + the <style id="sf-styles"> block in index.html
   are the entire feature; delete both and the plain photo remains.

   Scoped-down by design (see plan notes: two earlier, bigger versions of this
   effect were built and rejected — 848 KB of vendored WebGL and up to 460% of
   pinned scroll runway). This version:
     • adds ZERO extra scroll distance — no pin; the timeline scrubs against
       the photo's natural transit through the viewport,
     • stays inside the photo's own card in the welcome grid (text, pills and
       map remain visible alongside — no full-screen takeover),
     • loads GSAP + ScrollTrigger (~117 KB) from the approved CDN only when
       the effect will actually run — reduced-motion visitors, and anyone
       without the stage in the DOM, never download them.

   Tiers (shared data-perf-tier signal set by the cloud perf-guard, with a
   local fallback so this file works standalone):
     tier 1 desktop  — depth planes + vignette + logo pulse + 3D door
     tier 2 / weak   — simple exterior→interior crossfade
     mobile (<768px) — single-image zoom + door only, coarser scrub
     reduced motion  — static interior via CSS; no JS work, no GSAP fetch   */
(function () {
  'use strict';

  function init() {
    var stage = document.querySelector('.sf__stage');
    if (!stage) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Load GSAP + ScrollTrigger (approved CDN, pinned 3.12.5) only now that we
    // know the effect will run.
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', function () {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', function () {
        if (window.gsap && window.ScrollTrigger) build(stage);
      });
    });
  }

  function loadScript(src, onload) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = onload;
    document.head.appendChild(s);
  }

  function build(stage) {
    gsap.registerPlugin(ScrollTrigger);

    var tier = document.documentElement.getAttribute('data-perf-tier') ||
               ((navigator.hardwareConcurrency && navigator.hardwareConcurrency > 4) ? '1' : '2');
    var mobile = window.matchMedia('(max-width: 767px)').matches;
    var can3d = window.CSS && CSS.supports && CSS.supports('transform-style', 'preserve-3d');

    var photo    = stage.querySelector('.sf__photo');
    var sign     = stage.querySelector('.sf__plane--sign');
    var tree     = stage.querySelector('.sf__plane--tree');
    var logo     = stage.querySelector('.sf__logo');
    var vignette = stage.querySelector('.sf__vignette');
    var doorL    = stage.querySelector('.sf__door--l');
    var doorR    = stage.querySelector('.sf__door--r');
    var interior = stage.querySelector('.sf__interior');
    var doors    = [doorL, doorR];

    // Everything zooms toward the shop door (door-stage sits at ~26-44% x, 46-87% y).
    var ORIGIN = '35% 66%';
    gsap.set([photo, sign, tree], { transformOrigin: ORIGIN });

    var active = (tier === '1' && !mobile) ? [photo, sign, tree] : [photo];

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top 78%',      // begins as the photo enters the viewport…
        end: 'bottom 22%',     // …ends as it leaves — zero added scroll runway, no pin
        scrub: mobile ? 2 : 0.8,
        onEnter:     function () { gsap.set(active, { willChange: 'transform' }); },
        onEnterBack: function () { gsap.set(active, { willChange: 'transform' }); },
        onLeave:     function () { gsap.set(active, { willChange: 'auto' }); },
        onLeaveBack: function () { gsap.set(active, { willChange: 'auto' }); }
      }
    });

    if (tier !== '1' && !mobile) {
      // Tier 2 — simple opacity crossfade only.
      tl.to(interior, { opacity: 1, duration: 0.4 }, 0.5);
      return;
    }

    if (mobile) {
      // Mobile — single-image zoom + door, no parallax planes.
      gsap.set([sign, tree], { display: 'none' });
      tl.to(photo, { scale: 1.12, duration: 0.55 }, 0)
        .to(vignette, { opacity: 0.3, duration: 0.4 }, 0.1);
    } else {
      // Tier 1 — full depth-plane pass.
      tl.to(photo, { scale: 1.14, duration: 0.55 }, 0)
        .to(sign,  { scale: 1.26, filter: 'contrast(1.22) brightness(1.06)', duration: 0.55 }, 0)
        .to(tree,  { scale: 1.45, opacity: 0, duration: 0.5 }, 0)
        .to(vignette, { opacity: 0.32, duration: 0.4 }, 0.1)
        .to(logo, { opacity: 1, duration: 0.08 }, 0.35)
        .to(logo, { scale: 1.08, duration: 0.05, yoyo: true, repeat: 1 }, 0.45)
        .to(logo, { opacity: 0, duration: 0.08 }, 0.6);
    }

    // Door: fade the glass leaves in, swing them open (3D where supported),
    // then the interior takes over.
    tl.to(doors, { opacity: 1, duration: 0.06 }, 0.52);
    if (can3d) {
      tl.to(doorL, { rotateY: -105, duration: 0.22 }, 0.6)
        .to(doorR, { rotateY: 105, duration: 0.22 }, 0.6);
    } else {
      tl.to(doors, { opacity: 0, duration: 0.22 }, 0.6);
    }
    tl.to(interior, { opacity: 1, duration: 0.28 }, 0.68);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
