/* ═══════════════════════════════════════════════════════════════════
   Storefront fly-in — hyperreal scroll zoom into the real shop photo.

   The storefront photo is layered into depth planes (interior patch,
   building face, sign, logo badge, tree/foliage, door leaves) cut from
   the actual photograph (storefront/*.webp). GSAP ScrollTrigger scrubs
   a pinned timeline: the camera zooms toward the door Google-Earth
   style, foreground foliage flies past, the sign racks into focus
   (contrast/saturate on composited layers only), the door swings open
   (rotateY) and you land inside, where the "What brings you in today?"
   chat conversation lives.

   Wholly self-contained: injects its own scoped CSS (.sf-*), builds its
   own DOM into #storefront-mount, lazy-loads vendored GSAP. Delete this
   file + the mount div and the site is untouched.

   Tiers:
     full   — layered parallax + 3D door (fine-pointer, >4 cores, 3D ok)
     flat   — single-plane zoom + door (mobile <768px)
     fade   — simple exterior→interior crossfade (<=4 cores or no 3D)
     static — interior + chat immediately (prefers-reduced-motion)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var mount = document.getElementById('storefront-mount');
  if (!mount) return;

  /* ── tier detection ─────────────────────────────────────────────── */
  var reduced = false, mobile = false, touch = false;
  try {
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    mobile  = matchMedia('(max-width: 767px)').matches;
    touch   = matchMedia('(hover: none), (pointer: coarse)').matches;
  } catch (e) {}
  var lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  var has3d = false;
  try { has3d = CSS.supports('transform-style', 'preserve-3d') && CSS.supports('perspective', '1px'); } catch (e) {}

  var tier = reduced ? 'static' : lowPower ? 'fade' : mobile ? 'flat' : has3d ? 'full' : 'fade';
  var scrub = touch ? 2 : 1;

  /* ── layer geometry — % of the 850×1190 photo box ───────────────── */
  var G = {
    sign:   { l: 18.824, t: 28.992, w: 73.529 },
    logo:   { l: 20.941, t: 32.185, w: 14.588 },
    door:   { l: 10.353, t: 46.639, w: 28.706, h: 41.429 },
    ftl:    { l: 0,      t: 0,      w: 40 },
    ftr:    { l: 64.47,  t: 0,      w: 35.529 },
    trunk:  { l: 0,      t: 22.689, w: 12.941 },
    origin: '24.7% 67.35%'   /* door centre — the zoom target */
  };

  /* ── scoped CSS (one block, injected) ───────────────────────────── */
  var css = [
    '.sf { position: relative; }',
    '.sf__stage { position: relative; height: 100vh; height: 100svh; overflow: hidden;',
    '  background: linear-gradient(180deg,#eafcfd 0%,#cdf3f5 60%,#b6ecef 100%); }',
    '.sf__scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }',
    '.sf__photo { position: relative; height: 90%; aspect-ratio: 850/1190; border-radius: 18px;',
    '  overflow: hidden; box-shadow: 0 24px 70px rgba(6,60,66,.32); will-change: transform;',
    '  transform-origin: ' + G.origin + '; }',
    '.sf__photo > img, .sf__layer { position: absolute; display: block; }',
    '.sf__base { inset: 0; width: 100%; height: 100%; object-fit: cover; will-change: transform, filter; }',
    '.sf__sign  { left:' + G.sign.l + '%; top:' + G.sign.t + '%; width:' + G.sign.w + '%; will-change: transform, filter; }',
    '.sf__logo  { left:' + G.logo.l + '%; top:' + G.logo.t + '%; width:' + G.logo.w + '%; will-change: transform; }',
    '.sf__hole  { left:' + G.door.l + '%; top:' + G.door.t + '%; width:' + G.door.w + '%; height:' + G.door.h + '%;',
    '  overflow: hidden; background: #1d2a2c; }',
    '.sf__hole img { width: 100%; height: 100%; object-fit: cover; will-change: transform; }',
    '.sf__doors { left:' + G.door.l + '%; top:' + G.door.t + '%; width:' + G.door.w + '%; height:' + G.door.h + '%; }',
    '@supports (transform-style: preserve-3d) { .sf__doors { perspective: 900px; transform-style: preserve-3d; } }',
    '.sf__leaf { position: absolute; top: 0; height: 100%; width: 50%; overflow: hidden; will-change: transform;',
    '  backface-visibility: hidden; }',
    '.sf__leaf--l { left: 0; transform-origin: left center; }',
    '.sf__leaf--r { right: 0; transform-origin: right center; }',
    '.sf__leaf img { position: absolute; top: 0; left: 0; width: 200%; max-width: none; height: 100%; object-fit: fill; }',
    '.sf__leaf--r img { left: -100%; }',
    '.sf__ftl   { left: 0; top: 0; width:' + G.ftl.w + '%; will-change: transform, opacity; }',
    '.sf__ftr   { left:' + G.ftr.l + '%; top: 0; width:' + G.ftr.w + '%; will-change: transform, opacity; }',
    '.sf__trunk { left: 0; top:' + G.trunk.t + '%; width:' + G.trunk.w + '%; will-change: transform, opacity; }',
    /* interior end-state */
    '.sf__interior { position: absolute; inset: 0; opacity: 0; visibility: hidden; }',
    '.sf--static .sf__interior { opacity: 1; visibility: visible; }',
    '.sf__interior > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; will-change: transform; }',
    '.sf__veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(9,50,55,.14) 0%, rgba(9,50,55,0) 30%, rgba(9,50,55,.42) 100%); }',
    /* chat conversation */
    '.sf__chat { position: absolute; left: 50%; bottom: 7vh; transform: translateX(-50%);',
    '  width: min(620px, 92vw); display: flex; flex-direction: column; gap: .5rem; }',
    '.sf__msg { max-width: 78%; padding: .62rem .95rem; border-radius: 18px; font-weight: 600;',
    '  font-size: .92rem; line-height: 1.35; box-shadow: 0 4px 18px rgba(0,0,0,.22); }',
    '.sf__msg--q { align-self: flex-start; background: #fff; color: #0d2d2e; border-bottom-left-radius: 5px;',
    '  font-size: 1rem; font-weight: 700; }',
    '.sf__msg--a { align-self: flex-end; border: 0; cursor: pointer; text-align: left; font: inherit;',
    '  font-weight: 700; font-size: .9rem; color: #fff; border-bottom-right-radius: 5px;',
    '  background: linear-gradient(135deg, #21a1a8, #00737c);',
    '  transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .2s; }',
    '.sf__msg--a:hover { transform: scale(1.045); box-shadow: 0 8px 26px rgba(0,0,0,.3); }',
    '.sf__msg--a:active { transform: scale(.97); }',
    '.sf__msg--a:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }',
    '.sf__answers { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }',
    '.sf__answers .sf__msg--a { max-width: none; }',
    /* HUD */
    '.sf__hint { position: absolute; bottom: 4vh; left: 50%; transform: translateX(-50%); color: #00737c;',
    '  font-weight: 800; font-size: .95rem; text-shadow: 0 1px 10px rgba(255,255,255,.9); pointer-events: none;',
    '  animation: sf-bob 1.7s ease-in-out infinite; }',
    '@keyframes sf-bob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,7px); } }',
    '.sf__skip { position: absolute; bottom: 3.5vh; right: 3.5vw; background: rgba(5,44,49,.55); color: #fff;',
    '  border: 1px solid rgba(255,255,255,.35); border-radius: 999px; padding: .45rem .95rem;',
    '  font-size: .78rem; font-weight: 700; cursor: pointer; }',
    '.sf--static .sf__hint, .sf--static .sf__skip { display: none; }',
    '@media (max-width: 767px) {',
    '  .sf__photo { height: auto; width: 92%; max-height: 88svh; }',
    '  .sf__chat { bottom: 3.5vh; } .sf__msg { font-size: .85rem; } .sf__msg--q { font-size: .92rem; }',
    '}'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.id = 'sf-css';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── DOM ────────────────────────────────────────────────────────── */
  function el(tag, cls, parent, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function img(src, cls, parent, alt) {
    var e = el('img', cls, parent, { src: src, alt: alt || '', 'aria-hidden': alt ? 'false' : 'true', decoding: 'async' });
    return e;
  }

  var section = el('section', 'sf sf--' + tier, mount, { id: 'store-flyin', 'aria-label': 'Step inside our pharmacy' });
  var stage = el('div', 'sf__stage', section);
  var scene = el('div', 'sf__scene', stage);
  var photo = el('div', 'sf__photo', scene);

  var base = img('storefront_studio.webp', 'sf__base', photo, 'St. Clair Drug Mart storefront at 1203 St. Clair Ave W');
  var hole = null, leafL = null, leafR = null, patch = null,
      sign = null, logo = null, ftl = null, ftr = null, trunk = null;

  if (tier === 'full' || tier === 'flat') {
    hole = el('div', 'sf__layer sf__hole', photo);
    patch = img('storefront/interior-patch.webp', '', hole);
    var doors = el('div', 'sf__layer sf__doors', photo);
    leafL = el('div', 'sf__leaf sf__leaf--l', doors);
    img('storefront/door.webp', '', leafL);
    leafR = el('div', 'sf__leaf sf__leaf--r', doors);
    img('storefront/door.webp', '', leafR);
  }
  if (tier === 'full') {
    sign  = img('storefront/sign.webp', 'sf__layer sf__sign', photo);
    logo  = img('storefront/logo-badge.webp', 'sf__layer sf__logo', photo);
    trunk = img('storefront/trunk.webp', 'sf__layer sf__trunk', photo);
    ftl   = img('storefront/foliage-tl.webp', 'sf__layer sf__ftl', photo);
    ftr   = img('storefront/foliage-tr.webp', 'sf__layer sf__ftr', photo);
  }

  var interior = el('div', 'sf__interior', stage);
  img('interior_wide.webp', '', interior, 'Inside St. Clair Drug Mart Pharmacy');
  el('div', 'sf__veil', interior);

  /* chat conversation — the "what brings you in?" answers */
  var chat = el('div', 'sf__chat', interior);
  var q = el('div', 'sf__msg sf__msg--q', chat);
  q.textContent = '👋 Welcome in! What brings you in today?';
  var answers = el('div', 'sf__answers', chat);

  function act(accId) {
    try {
      if (typeof window.openAcc === 'function') window.openAcc(accId);
      var t = document.getElementById(accId);
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
  }
  var ANSWERS = [
    ['🤒 I’m feeling ill', function () { act('acc-ailments'); }],
    ['🤰 I think I’m pregnant!', function () { act('acc-poct'); }],
    ['🩹 I’m running out of my medication', function () {
      var r = document.getElementById('rx-extensions');
      if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'center' });
        r.classList.remove('rx-ext--flash'); void r.offsetWidth; r.classList.add('rx-ext--flash'); }
    }],
    ['✈️ I’m travelling — need vaccines', function () { act('acc-vaccines'); }],
    ['💊 Questions about my meds', function () { act('acc-med-reviews'); }],
    ['🆘 I need a free naloxone kit', function () { act('acc-naloxone'); }],
    ['🚭 I want to quit smoking', function () { act('acc-cessation'); }]
  ];
  ANSWERS.forEach(function (a) {
    var b = el('button', 'sf__msg sf__msg--a', answers, { type: 'button' });
    b.textContent = a[0];
    b.addEventListener('click', a[1]);
  });

  var hint = el('div', 'sf__hint', stage);
  hint.innerHTML = 'Scroll to step inside<br>&#9662;';
  var skip = el('button', 'sf__skip', stage, { type: 'button' });
  skip.innerHTML = 'Skip &darr;';
  skip.addEventListener('click', function () {
    var y = window.scrollY + section.getBoundingClientRect().bottom - window.innerHeight + 2;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });

  /* ── static tier: done — interior + chat visible, no animation ──── */
  if (tier === 'static') {
    stage.style.position = 'relative';
    return;
  }

  /* ── GSAP (vendored) loads lazily; effect activates when ready ──── */
  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function build(gsap, ST) {
    gsap.registerPlugin(ST);
    gsap.set(interior, { autoAlpha: 0 });
    var bubbles = [q].concat([].slice.call(answers.children));
    gsap.set(bubbles, { y: 26, autoAlpha: 0 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=' + (tier === 'fade' ? '140%' : '280%'),
        pin: stage,
        scrub: scrub,
        anticipatePin: 1
      }
    });

    tl.to(hint, { autoAlpha: 0, duration: .05 }, .02);
    tl.to(skip, { autoAlpha: 0, duration: .06 }, .6);

    if (tier === 'fade') {
      /* low-power: simple cinematic crossfade */
      tl.to(photo, { scale: 1.12, transformOrigin: G.origin, ease: 'power1.inOut', duration: .5 }, 0);
      tl.to(interior, { autoAlpha: 1, duration: .22 }, .42);
      tl.fromTo(interior.querySelector('img'), { scale: 1.12 }, { scale: 1.02, duration: .4, ease: 'power1.out' }, .42);
      tl.to(bubbles, { y: 0, autoAlpha: 1, stagger: .03, duration: .12, ease: 'power2.out' }, .68);
      return;
    }

    /* full + flat share the zoom & door; full adds the depth planes */
    tl.to(photo, { scale: mobile ? 2.6 : 3.15, transformOrigin: G.origin, ease: 'power2.inOut', duration: .62 }, 0);
    /* hyperreal rack focus — composited layers only */
    tl.fromTo(base, { filter: 'contrast(1) saturate(1)' }, { filter: 'contrast(1.15) saturate(1.2)', ease: 'power1.in', duration: .5 }, .06);

    if (tier === 'full') {
      tl.fromTo(sign, { filter: 'contrast(1) saturate(1)' }, { yPercent: -7, filter: 'contrast(1.15) saturate(1.2)', duration: .55 }, 0);
      tl.to(logo,  { yPercent: -9, duration: .55 }, 0);
      tl.to(trunk, { xPercent: -170, autoAlpha: 0, ease: 'power1.in', duration: .4 }, 0);
      tl.to(ftl,   { scale: 1.95, xPercent: -42, yPercent: -38, autoAlpha: 0, ease: 'power1.in', duration: .44, transformOrigin: '0% 0%' }, 0);
      tl.to(ftr,   { scale: 1.95, xPercent: 44, yPercent: -36, autoAlpha: 0, ease: 'power1.in', duration: .44, transformOrigin: '100% 0%' }, 0);
      /* logo pulse — a small welcome acknowledgment right before the door */
      tl.to(logo, { scale: 1.08, duration: .035, ease: 'power1.out' }, .46);
      tl.to(logo, { scale: 1, duration: .035, ease: 'power1.in' }, .495);
    }

    /* door swings open at peak zoom */
    if (has3d) {
      tl.to(leafL, { rotationY: -82, ease: 'power2.in', duration: .16 }, .5);
      tl.to(leafR, { rotationY: 82, ease: 'power2.in', duration: .16 }, .5);
    } else {
      tl.to(leafL, { xPercent: -100, ease: 'power2.in', duration: .16 }, .5);
      tl.to(leafR, { xPercent: 100, ease: 'power2.in', duration: .16 }, .5);
    }
    tl.fromTo(patch, { scale: 1.14 }, { scale: 1, duration: .3 }, .44);

    /* through the door: interior takes over */
    tl.to(interior, { autoAlpha: 1, duration: .16 }, .66);
    tl.fromTo(interior.querySelector('img'), { scale: 1.16 }, { scale: 1.02, duration: .32, ease: 'power1.out' }, .66);

    /* the conversation begins */
    tl.to(bubbles, { y: 0, autoAlpha: 1, stagger: .028, duration: .12, ease: 'power2.out' }, .78);
  }

  function boot() {
    var p = window.gsap ? Promise.resolve() : load('vendor/gsap.min.js');
    p.then(function () { return window.ScrollTrigger ? null : load('vendor/ScrollTrigger.min.js'); })
      .then(function () { build(window.gsap, window.ScrollTrigger); })
      .catch(function () {
        /* GSAP failed: degrade to the static experience */
        section.className = 'sf sf--static';
        interior.style.opacity = '1';
        interior.style.visibility = 'visible';
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
