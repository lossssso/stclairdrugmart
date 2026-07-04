/* Cross-page fade transitions — internal link clicks fade the page out via a
   sky-tinted overlay, then navigate; the destination page (which also loads
   this script) fades back in. Only runs when the previous page set the
   sessionStorage handoff flag, so direct visits/SEO/no-JS see no overlay at
   all. Reduced-motion users are left untouched. */
(function () {
  'use strict';
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) { return; }

  var DURATION = 240;
  var overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText =
    'position:fixed;inset:0;background:#d7fbfc;pointer-events:none;' +
    'z-index:2147483647;opacity:0;transition:opacity ' + DURATION + 'ms ease;';

  var arriving = false;
  try { arriving = sessionStorage.getItem('pagefade') === '1'; sessionStorage.removeItem('pagefade'); } catch (e) {}

  /* This script loads synchronously in <head>, before <body> exists — attach
     the overlay to <html> so an arriving page is covered before first paint. */
  if (arriving) overlay.style.opacity = '1';
  document.documentElement.appendChild(overlay);

  function fadeIn() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.style.opacity = '0'; });
    });
  }
  if (arriving) {
    /* Reveal as soon as rendering starts — never gate on DOMContentLoaded,
       which can stall behind slow subresources and trap the user behind
       the overlay. The page paints progressively underneath the fade. */
    fadeIn();
  }
  /* watchdog: whatever happens, nobody stays stuck behind the overlay */
  setTimeout(function () {
    if (overlay.style.pointerEvents !== 'auto') overlay.style.opacity = '0';
  }, 900);

  /* Back/forward cache restores must never leave the page covered */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) overlay.style.opacity = '0';
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    /* same-page anchors (#booking etc.) scroll, they don't navigate */
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    try { sessionStorage.setItem('pagefade', '1'); } catch (err) {}
    overlay.style.pointerEvents = 'auto';
    overlay.style.opacity = '1';
    setTimeout(function () { location.href = url.href; }, DURATION);
  }, true);
})();
