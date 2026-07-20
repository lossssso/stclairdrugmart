/* ── Google Analytics: custom event tracking ─────────────────
   Shared by every page on the site (loaded via
   <script src="/analytics-events.js" defer></script>).

   GA4 already auto-tracks page views, scroll depth, outbound clicks and
   site search (Enhanced Measurement). This adds the pharmacy-specific
   actions that matter — bookings, assessments, calls, directions, tool
   use, language choice, and which sections visitors actually reach.

   Every branch is null-guarded, so pages that lack a booking card, the
   drug checker, chat, or <section> elements simply never fire those
   events — the script is safe to load everywhere.

   NOTE: the GA4 measurement ID (G-2YQ9FDLMCV) is set in the two tags at
   the top of each page's <head>. If GA verification shows a different or
   newer ID, replace it in those spots — nothing here needs changing. */
(function(){
  function ev(name, params){
    if (typeof gtag === 'function') gtag('event', name, params || {});
  }
  function txt(el){ return (el && el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80); }

  // One delegated click listener covers every link/button on the page.
  document.addEventListener('click', function(e){
    var a = e.target.closest('a, button');
    if (!a) return;
    var href = a.getAttribute && a.getAttribute('href') || '';

    // Booking / assessment intent
    if (a.classList.contains('js-condition')) {
      var card = a.closest('.ailment-card');
      ev('assessment_start', { condition: txt(card && card.querySelector('.ailment-card__name')) || txt(a) });
      return;
    }
    if (a.classList.contains('js-pa-select') || a.closest('.pa-card') ||
        (a.classList.contains('nav__cta') || a.parentElement && a.parentElement.classList.contains('nav__cta')) ||
        href === '#booking') {
      ev('book_click', { label: a.dataset && a.dataset.label ? a.dataset.label : txt(a) });
      return;
    }
    // Contact actions
    if (href.indexOf('tel:') === 0)      { ev('phone_click',      { location: txt(a) }); return; }
    if (href.indexOf('mailto:') === 0)   { ev('email_click',      {}); return; }
    // Reviews — separate "write a review" intent (the g.page/review or writereview
    // links, and the badge) from directions. action:'write' is the one that matters
    // for a review drive; action:'view' is opening our listing to read reviews.
    if (href.indexOf('g.page') !== -1 || href.indexOf('writereview') !== -1 ||
        (a.classList && a.classList.contains('reviews-google-badge'))) {
      ev('review_click', { action: (href.indexOf('review') !== -1 || href.indexOf('g.page') !== -1) ? 'write' : 'view' });
      return;
    }
    if (href.indexOf('google.com/maps') !== -1 || href.indexOf('maps.google.com') !== -1) { ev('directions_click', {}); return; }
    if (href.indexOf('ubereats.com') !== -1)    { ev('uber_click', {}); return; }
    if (href.indexOf('facebook.com') !== -1)  { ev('social_click', { network: 'facebook' }); return; }
    if (href.indexOf('instagram.com') !== -1) { ev('social_click', { network: 'instagram' }); return; }
    if (href.indexOf('linkedin.com') !== -1)  { ev('social_click', { network: 'linkedin' }); return; }
    // Language
    if (a.closest('.nav__lang-menu')) {
      ev('language_select', { language: (href.match(/\/(fr|es|pt|it|tr)\//) || [,'en'])[1] });
      return;
    }
  }, true);

  // Tool usage
  var dcCheck = document.getElementById('dc-check');
  if (dcCheck) dcCheck.addEventListener('click', function(){ if (!dcCheck.disabled) ev('drug_checker_check', {}); });
  var chatOpen = document.getElementById('sdmChatOpen');
  if (chatOpen) chatOpen.addEventListener('click', function(){ ev('chat_open', {}); });
  var chatForm = document.getElementById('sdmChatForm');
  if (chatForm) chatForm.addEventListener('submit', function(){ ev('chat_question', {}); });

  // Section reach — which parts of the ONE-PAGE HOMEPAGE visitors actually
  // scroll to. Hash navigation (#services etc.) is NOT a pageview in GA4, so
  // this fills the gap: one event per section per pageload.
  //
  // Standalone pages (data-page attr, e.g. /portal/) reuse homepage section
  // markup/ids (id="booking") so their booking cards work, but they are NOT
  // a scrolled-to section of a long page — they're their own destination,
  // already measured cleanly by GA4's automatic page_view on /portal/. If we
  // didn't skip this here, loading /portal/ would fire the exact same
  // section_view:booking event as scrolling to #booking on the homepage,
  // conflating "visited the Patient Portal page" with "scrolled through the
  // homepage" in every report. See ANALYTICS-GUIDE.md.
  if ('IntersectionObserver' in window && !document.documentElement.hasAttribute('data-page')) {
    // Fire when a section crosses the middle of the viewport, so it works
    // for tall sections too (a 40%-visible threshold never triggers on
    // sections taller than the screen).
    var secIO = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){
          ev('section_view', { section_id: en.target.id });
          secIO.unobserve(en.target);
        }
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('section[id]').forEach(function(s){ secIO.observe(s); });
  }

  // Site search — the overlay filters live and never writes the query to the
  // URL, so GA4's built-in site-search tracking can't see it. Capture the
  // finished query (debounced 1.1s after the last keystroke, min 3 chars) plus
  // how many results it returned. A search_term with results:0 is a content
  // gap — something a visitor wanted that the site didn't surface.
  var searchInput = document.getElementById('siteSearchInput');
  if (searchInput){
    var sT, lastSent = '';
    searchInput.addEventListener('input', function(){
      clearTimeout(sT);
      var q = this.value.trim();
      if (q.length < 3) return;
      sT = setTimeout(function(){
        if (q === lastSent) return;            // don't re-log an unchanged query
        lastSent = q;
        var results = document.querySelectorAll('#siteSearchResults .site-search__result').length;
        ev('site_search', { search_term: q.slice(0, 100), results: results });
      }, 1100);
    });
  }
})();
