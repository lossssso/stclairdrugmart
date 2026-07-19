/* ── St. Clair Drug Mart shared behaviour ─────────────────────
   One file for every page (all languages). Loaded with
   <script src="/site.js?v=N" defer></script> BEFORE analytics-events.js.
   Per-page data stays inline in each page: window.FAQS,
   window.FAQ_CAT_META, window.AILMENT_DB, window.SITE_INDEX_CORE,
   window.PHARMA_BASE, and optional window.I18N overrides
   ({ search:{stop,clusters}, chat:{...}, ui:{...} }). English defaults
   are baked in below, so a page with no I18N works exactly as before. */

/* Standalone pages (e.g. /portal/) carry the booking section but not the
   other homepage sections/accordions. When a search hit targets a section
   that isn't on this page, return the homepage URL to navigate to instead
   of silently doing nothing. Returns null when the target exists here. */
window.paOffPageHref = function(anchor, openId){
  var ACC = {'acc-ailments':'/conditions','acc-vaccines':'/vaccines','acc-med-reviews':'/medication-reviews','acc-rx-renewal':'/#services','acc-cessation':'/smoking-cessation','acc-naloxone':'/naloxone','acc-transfer':'/transfer','acc-poct':'/testing','acc-insurance':'/insurance','acc-referrals':'/referrals'};
  var base = document.documentElement.getAttribute('data-base') || '';
  if (openId && !document.getElementById(openId)) return base + (ACC[openId] || '/#services');
  if (!openId && anchor && !document.querySelector(anchor)) return base + '/' + anchor;
  return null;
};

(function(){
  var svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var list = document.getElementById('faq-list');
  var catBar = document.getElementById('faq-cat-bar');
  if (!list || !window.FAQS) return;
  var catMeta = {};
  (window.FAQ_CAT_META || []).forEach(function(c){ catMeta[c.id] = c; });
  var lastCat = null;
  window.FAQS.forEach(function(faq, idx){
    if (faq.cat && faq.cat !== lastCat) {
      var hd = document.createElement('div');
      hd.className = 'faq-cat__hd';
      hd.dataset.cat = faq.cat;
      var meta = catMeta[faq.cat];
      hd.textContent = meta ? (meta.icon + ' ' + meta.label) : faq.cat;
      list.appendChild(hd);
      lastCat = faq.cat;
    }
    var item = document.createElement('div');
    item.className = 'faq-item';
    item.dataset.idx = idx;
    item.dataset.cat = faq.cat || '';
    var btn = document.createElement('button');
    btn.className = 'faq-item__q';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="faq-item__q-icon">' + (faq.icon || '💬') + '</span><span class="faq-item__q-text">' + faq.q + '</span>' + svg;
    var ans = document.createElement('div');
    ans.className = 'faq-item__a';
    ans.innerHTML = faq.a;
    btn.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function(i){
        i.classList.remove('open');
        i.querySelector('.faq-item__q').setAttribute('aria-expanded','false');
      });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
    });
    item.appendChild(btn);
    item.appendChild(ans);
    list.appendChild(item);
  });
  if (catBar) {
    var pillsHtml = '<button type="button" class="faq-cat-pill active" data-cat="all">All Questions</button>';
    (window.FAQ_CAT_META || []).forEach(function(c){
      if (!window.FAQS.some(function(f){ return f.cat === c.id; })) return;
      pillsHtml += '<button type="button" class="faq-cat-pill" data-cat="' + c.id + '">' + c.icon + ' ' + c.label + '</button>';
    });
    catBar.innerHTML = pillsHtml;
  }
})();

/* ─────────────────────────────────────────────────────────────
   Shared smart-search matcher, used by every search bar on the
   page (FAQ search, symptom/condition search, and the site-wide
   nav overlay) so they all rank results the same way.

   Goal: bring up things that relate to what a patient actually
   typed, in their own words. We tokenize the query and each item
   into whole words, then match each query word by:
     • exact word match,
     • short prefix match (3+ letters, so "vacc" → "vaccine"),
     • light stemming (so "hurting" / "hurts" / "hurt" all agree),
     • a curated synonym layer in plain patient language (so
       "hurting" / "ache" / "sore" surface pain conditions, "shot"
       finds vaccines, "stuffy" finds congestion, etc.).
   An item ranks highest when it matches everything that was typed
   (coverage gating); weaker partial matches still show, lower down,
   so the search is practical and never dead-ends.
   ───────────────────────────────────────────────────────────── */
window.SmartMatch = (function(){
  // Common filler words that carry no search intent. Dropping them
  // keeps queries like "i think i have a rash" focused on "rash".
  var LS = (window.I18N && window.I18N.search) || {};
  var STOP = LS.stop || {a:1,an:1,and:1,the:1,is:1,are:1,was:1,were:1,be:1,been:1,am:1,
    i:1,im:1,me:1,my:1,mine:1,we:1,our:1,us:1,you:1,your:1,it:1,its:1,
    of:1,to:1,for:1,in:1,on:1,at:1,by:1,with:1,from:1,as:1,or:1,if:1,so:1,
    do:1,does:1,did:1,can:1,could:1,would:1,should:1,shall:1,will:1,may:1,might:1,
    have:1,has:1,had:1,get:1,got:1,getting:1,need:1,needs:1,want:1,wants:1,
    how:1,what:1,whats:1,when:1,where:1,why:1,which:1,who:1,about:1,
    feel:1,feels:1,feeling:1,think:1,maybe:1,really:1,just:1,some:1,any:1,
    please:1,there:1,this:1,that:1,these:1,those:1};

  // Plain-language synonym clusters. Each variant a patient might type maps
  // to the canonical word(s) that actually appear in our condition/service
  // keywords, so everyday phrasing finds the right clinical entry.
  var CLUSTERS = LS.clusters || [
    { words:['hurt','hurts','hurting','hurted','pain','pains','painful','ache','aches','aching','achy','sore','sores','soreness','ouch','tender','throbbing'], canon:['pain','ache'] },
    { words:['stomach','tummy','belly','abdomen','abdominal','gut','queasy'], canon:['stomach','abdomen','nausea'] },
    { words:['itch','itchy','itches','itching','scratchy','prickly'], canon:['itch','itchy'] },
    { words:['burn','burns','burning','stinging','sting','stings','searing'], canon:['burn','burning'] },
    { words:['swell','swells','swelling','swollen','puffy','inflamed','inflammation','bloated'], canon:['swelling','swollen','inflamed'] },
    { words:['rash','rashes','breakout','breakouts','bump','bumps','spot','spots','hive','hives','welts','blotchy'], canon:['rash','bumps','hives'] },
    { words:['red','redness','reddish'], canon:['red'] },
    { words:['dry','dryness','flaky','flaking','flakes','peeling','cracked','cracking','scaly'], canon:['dry','flaky','cracked'] },
    { words:['discharge','pus','oozing','weeping','leaking','goopy','crusty'], canon:['discharge'] },
    { words:['nausea','nauseous','queasy','vomit','vomiting','puke','puking','sick'], canon:['nausea','vomiting','queasy'] },
    { words:['dizzy','dizziness','lightheaded','vertigo'], canon:['dizzy'] },
    { words:['fever','feverish','temperature'], canon:['fever'] },
    { words:['cough','coughing','coughs'], canon:['cough'] },
    { words:['congested','congestion','stuffy','stuffed','blocked'], canon:['congestion','stuffy','blocked'] },
    { words:['runny','runnynose','drip','dripping','sniffle','sniffles'], canon:['runny','sniffles'] },
    { words:['sneeze','sneezing','sneezes'], canon:['sneezing'] },
    { words:['pee','peeing','urinate','urinating','urination','wee'], canon:['pee','urination'] },
    { words:['poop','stool','stools','bowel','bowels'], canon:['stool','bowel'] },
    { words:['period','periods','menstrual','menstruation','cramp','cramps','cramping'], canon:['period','menstrual','cramps'] },
    { words:['pregnant','pregnancy','expecting'], canon:['pregnant','pregnancy'] },
    { words:['quit','quitting','stop','stopping','cessation'], canon:['quit'] },
    { words:['smoke','smokes','smoking','cigarette','cigarettes','vape','vapes','vaping','nicotine'], canon:['smoking','nicotine','vape'] },
    { words:['shot','shots','jab','jabs','vaccine','vaccines','vaccination','vaccinations','immunization','immunisation','immunize'], canon:['vaccine','immunization','shot'] },
    { words:['flu','influenza'], canon:['flu','influenza'] },
    { words:['eye','eyes','ocular'], canon:['eye'] },
    { words:['tired','tiredness','fatigue','fatigued','exhausted','exhaustion'], canon:['tired','fatigue'] },
    { words:['allergy','allergies','allergic'], canon:['allergy','allergic'] },
    { words:['heartburn','reflux','indigestion','acid'], canon:['heartburn','reflux','acid'] },
    { words:['refill','refills','renew','renews','renewing','renewal'], canon:['refill','renew'] },
    { words:['prescription','prescriptions','rx','script','meds','medication','medications','medicine','medicines'], canon:['prescription','medication'] },
    { words:['blister','blisters','blistering'], canon:['blister'] },
    { words:['weight','obesity','ozempic','wegovy','semaglutide'], canon:['weight','ozempic','wegovy','semaglutide'] }
  ];
  // Build a flat lookup: any variant word → array of canonical words.
  var SYN = {};
  CLUSTERS.forEach(function(c){
    c.words.forEach(function(w){
      SYN[w] = SYN[w] ? SYN[w].concat(c.canon) : c.canon.slice();
    });
  });

  function tokenize(s){
    // Unicode-aware: keeps accented letters (ñ, ç, ã, ğ, ü, é...) intact
    return (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  }
  // Light stemmer: collapse common English endings so verb/plural forms of
  // the same word agree (hurting/hurts/hurt, itching/itch, cramps/cramp).
  // Also drops a trailing "e" so ache/aches/aching reduce alike.
  function stem(w){
    if (w.length <= 3) return w;
    if (w.length > 4 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
    else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 4 && /es$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  // The meaningful words from a query (fillers removed). If a query is
  // nothing but fillers, fall back to the raw words so it still does something.
  function queryTokens(q){
    var raw = tokenize(q);
    var sig = raw.filter(function(w){ return w.length >= 2 && !STOP[w]; });
    return sig.length ? sig : raw;
  }
  // Everything a single query word should be allowed to match: itself, its
  // stem, and any plain-language synonyms (and their stems).
  function expand(tok){
    var set = {};
    set[tok] = 1;
    set[stem(tok)] = 1;
    var canon = SYN[tok] || SYN[stem(tok)];
    if (canon) canon.forEach(function(c){ set[c] = 1; set[stem(c)] = 1; });
    return Object.keys(set);
  }

  // fields: { title, kw, desc }, any may be omitted.
  function score(fields, q){
    var qtokens = queryTokens(q);
    if (!qtokens.length) return 0;
    var phrase = tokenize(q).join(' ');

    // For each field keep both the raw word list and a set of stems, so we
    // can match exact words, prefixes, and stemmed/synonym forms.
    function prep(text){
      var toks = tokenize(text);
      var stems = {};
      toks.forEach(function(t){ stems[stem(t)] = 1; });
      return { toks: toks, stems: stems };
    }
    var T = prep(fields.title), K = prep(fields.kw), D = prep(fields.desc);

    // Score one query word against one field. Exact / stem / synonym hits are
    // worth the full field weight; a looser prefix-only hit is worth one less.
    function fieldScore(field, tok, exps, strong, weak){
      var i, j;
      // exact word, stem-equality, or synonym (exps already include stems)
      for (i = 0; i < exps.length; i++){
        var e = exps[i];
        if (field.toks.indexOf(e) !== -1) return strong;
        if (field.stems[e]) return strong;
      }
      // prefix: a typed fragment of 3+ letters starting a word ("vacc"→vaccine)
      for (i = 0; i < exps.length; i++){
        var ex = exps[i];
        if (ex.length < 3) continue;
        for (j = 0; j < field.toks.length; j++){ if (field.toks[j].indexOf(ex) === 0) return weak; }
      }
      return 0;
    }
    function tokenScore(tok){
      var exps = expand(tok);
      var s = fieldScore(T, tok, exps, 6, 5);
      if (s) return s;
      s = fieldScore(K, tok, exps, 4, 3);
      if (s) return s;
      return fieldScore(D, tok, exps, 2, 1);
    }

    var total = 0, matched = 0;
    qtokens.forEach(function(tok){
      var c = tokenScore(tok);
      if (c > 0){ matched++; total += c; }
    });
    if (!matched) return 0;

    // Exact multi-word phrase appearing in the title/keywords is a strong
    // signal of relevance (e.g. "pink eye", "quit smoking", "burning pee").
    if (phrase.length >= 3){
      var titleStr = T.toks.join(' ');
      var kwStr = K.toks.join(' ');
      if (titleStr.indexOf(phrase) !== -1) total += 8;
      else if (kwStr.indexOf(phrase) !== -1) total += 5;
    }

    // Coverage gating: an item that matches every word you typed is far
    // more relevant than one that caught a single word. Full coverage keeps
    // the full score; partial matches are scaled down so they only surface
    // when nothing better exists.
    var coverage = matched / qtokens.length;
    if (coverage < 1) total *= coverage * 0.6;

    return total;
  }

  return { score: score, tokenize: tokenize, queryTokens: queryTokens, stem: stem, expand: expand };
})();

(function(){
  var input = document.getElementById('faqSearchInput');
  var clearBtn = document.getElementById('faqSearchClear');
  var status = document.getElementById('faqSearchStatus');
  var list = document.getElementById('faq-list');
  var catBar = document.getElementById('faq-cat-bar');
  var condBox = document.getElementById('faqConditionResults');
  var serviceBox = document.getElementById('faqServiceResults');
  if (!input || !list || !window.FAQS) return;

  var UMBRELLA_Q = 'Can a pharmacist prescribe medication in Ontario?';
  // Original grouped DOM order (category headers + items), captured once so
  // search/category filtering can always restore the canonical layout instead
  // of leaving items in whatever order a previous search left them in.
  var originalNodes = Array.prototype.slice.call(list.children);
  function restoreOrder(){ originalNodes.forEach(function(n){ list.appendChild(n); }); }
  var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));
  var plain = document.createElement('div');
  var idx = items.map(function(item, i){
    var faq = window.FAQS[i];
    plain.innerHTML = faq.a;
    return { item: item, q: faq.q, body: plain.textContent.trim() };
  });
  var emptyBox = null;
  var debounce;

  function setActivePill(catId){
    if (!catBar) return;
    catBar.querySelectorAll('.faq-cat-pill').forEach(function(p){
      p.classList.toggle('active', p.dataset.cat === catId);
    });
  }
  function clearMatchStyling(){
    idx.forEach(function(entry){
      entry.item.classList.remove('faq-best-match');
      entry.item.querySelector('.faq-item__q-text').innerHTML = entry.q;
    });
  }
  function applyCategoryFilter(catId){
    input.value = '';
    clearBtn.hidden = true;
    if (emptyBox) { emptyBox.remove(); emptyBox = null; }
    renderConditions([], '');
    renderServices([], '');
    status.innerHTML = '';
    closeAll();
    clearMatchStyling();
    restoreOrder();
    idx.forEach(function(entry, i){
      var show = catId === 'all' || window.FAQS[i].cat === catId;
      entry.item.classList.toggle('faq-hidden', !show);
    });
    list.querySelectorAll('.faq-cat__hd').forEach(function(hd){
      hd.classList.toggle('faq-hidden', !(catId === 'all' || hd.dataset.cat === catId));
    });
    setActivePill(catId);
  }
  if (catBar) {
    catBar.addEventListener('click', function(e){
      var pill = e.target.closest('.faq-cat-pill');
      if (pill) applyCategoryFilter(pill.dataset.cat);
    });
  }

  function scoreCondition(a, query){
    return window.SmartMatch.score({ title: a.name, kw: a.kw.join(' ') }, query);
  }

  function renderConditions(matches, query){
    if (!condBox) return;
    if (!matches.length) { condBox.classList.remove('has-results'); condBox.innerHTML = ''; return; }
    var html = '<div class="ailments-smartsearch__divider">Conditions matching "' + query + '"</div>';
    matches.forEach(function(x){
      var a = x.a;
      var href = a.call ? 'tel:+14166548181' : '#booking';
      var dataUrl = (!a.call && window.PHARMA_BASE) ? ' data-url="' + window.PHARMA_BASE + a.id + '"' : '';
      html += '<button class="ailments-smartsearch__hit js-faq-cond-hit" data-href="' + href + '"' + dataUrl + ' data-name="' + a.name + '" data-call="' + (a.call?'1':'') + '">'
        + '<span class="ailments-smartsearch__hit-icon">' + a.icon + '</span>'
        + '<span class="ailments-smartsearch__hit-body">'
        + '<span class="ailments-smartsearch__hit-name">' + highlight(a.name, query.toLowerCase().split(/\s+/).filter(function(w){ return w.length >= 2; })) + '</span>'
        + '<span class="ailments-smartsearch__hit-kw">' + (a.call ? 'Call us for treatment options' : 'Start pharmacist assessment online') + '</span>'
        + '</span>'
        + '<span class="ailments-smartsearch__hit-arrow">›</span>'
        + '</button>';
    });
    condBox.innerHTML = html;
    condBox.classList.add('has-results');
    condBox.querySelectorAll('.js-faq-cond-hit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var call = this.dataset.call === '1';
        var url = this.dataset.url;
        if (call) { window.location.href = 'tel:+14166548181'; return; }
        var paWrap = document.getElementById('pa-wrap');
        var paIframe = document.getElementById('pa-iframe');
        var paLabel = document.getElementById('pa-iframe-label-text');
        if (paWrap && paIframe && url) {
          paIframe.src = url;
          paIframe.style.height = '900px';
          if (paLabel) paLabel.textContent = '🩺 ' + this.dataset.name + ((window.I18N && window.I18N.ui || {}).assessSuffix || ', Assessment');
          if (window.setPaHint) window.setPaHint('');
          paWrap.style.display = '';
          paWrap.classList.remove('collapsed');
          document.querySelectorAll('.pa-card').forEach(function(c){ c.classList.remove('active'); });
        }
        // Land on the iframe wrapper so the blue instruction bar is visible
        // (falls back to the section top if the wrapper wasn't populated).
        var scrollTarget = (paWrap && paIframe && url) ? paWrap : document.getElementById('booking');
        if (scrollTarget) scrollTarget.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
  }

  // Score a service/vaccine/consult item from the shared SITE_INDEX so queries
  // like "flu shot", "quit smoking", "travel vaccine", "renew my prescription"
  // surface the relevant service, not just FAQ text matches.
  function scoreService(item, query){
    return window.SmartMatch.score({ title: item.title, kw: item.kw || '', desc: item.desc || '' }, query);
  }

  function renderServices(matches, query){
    if (!serviceBox) return;
    if (!matches.length) { serviceBox.classList.remove('has-results'); serviceBox.innerHTML = ''; return; }
    var html = '<div class="ailments-smartsearch__divider">Services &amp; vaccines matching "' + query + '"</div>';
    matches.forEach(function(x){
      var it = x.it;
      html += '<button class="ailments-smartsearch__hit js-faq-svc-hit" data-anchor="' + (it.anchor || '') + '" data-open="' + (it.open || '') + '" data-url="' + (it.url || '') + '">'
        + '<span class="ailments-smartsearch__hit-icon">' + it.icon + '</span>'
        + '<span class="ailments-smartsearch__hit-body">'
        + '<span class="ailments-smartsearch__hit-name">' + highlight(it.title, query.toLowerCase().split(/\s+/).filter(function(w){ return w.length >= 2; })) + '</span>'
        + '<span class="ailments-smartsearch__hit-kw">' + it.desc + '</span>'
        + '</span>'
        + '<span class="ailments-smartsearch__hit-arrow">›</span>'
        + '</button>';
    });
    serviceBox.innerHTML = html;
    serviceBox.classList.add('has-results');
    serviceBox.querySelectorAll('.js-faq-svc-hit').forEach(function(btn){
      btn.addEventListener('click', function(){
        var anchor = this.dataset.anchor;
        var openId = this.dataset.open;
        var url = this.dataset.url;
        if (url) { window.location.href = url; return; }
        var off = window.paOffPageHref(anchor, openId);
        if (off) { window.location.href = off; return; }
        if (openId && window.openAcc) {
          window.openAcc(openId);
          setTimeout(function(){ var el = document.getElementById(openId); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 120);
        } else if (anchor) {
          var el = document.querySelector(anchor); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      });
    });
  }

  function escapeRx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(text, terms){
    var out = text;
    terms.forEach(function(t){
      if (!t) return;
      out = out.replace(new RegExp('(' + escapeRx(t) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }
  function score(entry, query){
    return window.SmartMatch.score({ title: entry.q, desc: entry.body }, query);
  }
  function resetView(){
    restoreOrder();
    idx.forEach(function(entry){
      entry.item.classList.remove('faq-hidden', 'faq-best-match');
      entry.item.querySelector('.faq-item__q-text').innerHTML = entry.q;
    });
    list.querySelectorAll('.faq-cat__hd').forEach(function(hd){ hd.classList.remove('faq-hidden'); });
    if (catBar) { catBar.style.display = ''; setActivePill('all'); }
    if (emptyBox) { emptyBox.remove(); emptyBox = null; }
    renderConditions([], '');
    renderServices([], '');
    status.innerHTML = '';
    clearBtn.hidden = true;
  }
  function closeAll(){
    items.forEach(function(item){
      item.classList.remove('open');
      item.querySelector('.faq-item__q').setAttribute('aria-expanded', 'false');
    });
  }
  function runSearch(query){
    clearBtn.hidden = !query;
    if (emptyBox) { emptyBox.remove(); emptyBox = null; }
    if (!query) { resetView(); return; }

    // Category grouping/headers don't apply to ranked search results, hide
    // them while a query is active; resetView() brings them back.
    list.querySelectorAll('.faq-cat__hd').forEach(function(hd){ hd.classList.add('faq-hidden'); });
    if (catBar) catBar.style.display = 'none';

    var terms = query.toLowerCase().split(/\s+/).filter(function(w){ return w.length >= 3; });

    // Minor-ailment conditions matching the query (from the same AILMENT_DB the
    // ailment assessment search uses), so symptom-style queries like "rash"
    // surface relevant conditions, not just FAQ text matches.
    var ailmentDb = window.AILMENT_DB || [];
    var condMatches = ailmentDb.map(function(a){ return { a:a, s: scoreCondition(a, query) }; })
      .filter(function(x){ return x.s > 0; })
      .sort(function(a,b){ return b.s - a.s; })
      .slice(0, 5);
    renderConditions(condMatches, query);

    // Services, vaccines & consults from the shared SITE_INDEX (clinical items
    // only, Services & Tools, not About/Contact/Blog noise).
    var siteIdx = window.SITE_INDEX || [];
    var svcMatches = siteIdx.filter(function(it){ return it.tag === 'Service' || it.tag === 'Tool'; })
      .map(function(it){ return { it: it, s: scoreService(it, query) }; })
      .filter(function(x){ return x.s > 0; })
      .sort(function(a,b){ return b.s - a.s; })
      .slice(0, 4);
    renderServices(svcMatches, query);

    var scored = idx.map(function(entry){ return { entry: entry, s: score(entry, query) }; });
    if (condMatches.length) {
      // Whenever a symptom matches a minor ailment, also surface the general
      // "pharmacist can prescribe" / assessment FAQ alongside it.
      scored.forEach(function(x){
        if (x.entry.q === UMBRELLA_Q) x.s = Math.max(x.s, 7);
      });
    }
    var matches = scored.filter(function(x){ return x.s > 0; }).sort(function(a,b){ return b.s - a.s; });

    if (!matches.length) {
      closeAll();
      idx.forEach(function(entry){
        entry.item.classList.add('faq-hidden');
        entry.item.classList.remove('faq-best-match');
        entry.item.querySelector('.faq-item__q-text').innerHTML = entry.q;
      });
      var foundElsewhere = condMatches.length + svcMatches.length;
      if (foundElsewhere) {
        var bits = [];
        var UF = (window.I18N && window.I18N.ui || {});
        if (svcMatches.length) bits.push('<strong>' + svcMatches.length + '</strong> ' + (svcMatches.length === 1 ? (UF.svc1 || 'service') : (UF.svcN || 'services')));
        if (condMatches.length) bits.push('<strong>' + condMatches.length + '</strong> ' + (condMatches.length === 1 ? (UF.cond1 || 'condition') : (UF.condN || 'conditions')));
        status.innerHTML = bits.join(UF.and || ' and ') + (UF.faqMatchedElsewhere || ' matched “{Q}” above, with no FAQ matched directly, but here are some popular questions too:').replace('{Q}', query);
      } else {
        status.innerHTML = ((window.I18N && window.I18N.ui || {}).faqNoExact || 'No exact match for “<strong>{Q}</strong>”, here are some popular questions, or ask us directly:').replace('{Q}', query);
      }
      var topThree = idx.slice(0, 3);
      topThree.forEach(function(entry){ entry.item.classList.remove('faq-hidden'); list.appendChild(entry.item); });
      // Only push the "can't answer → call us" card when we found nothing at all
      // (no FAQ, no condition, no service), that's the assistant's fallback.
      if (!foundElsewhere) {
        emptyBox = document.createElement('div');
        emptyBox.className = 'faq-empty';
        emptyBox.innerHTML = (window.I18N && window.I18N.ui || {}).faqEmpty || '<p>Couldn\'t find that, and our FAQ didn\'t cover it. Call or message us and a pharmacist will answer directly.</p><a href="tel:+14166548181" class="btn">Call (416) 654-8181 →</a>';
        list.appendChild(emptyBox);
      }
      return;
    }

    closeAll();
    var matchedIds = {};
    matches.forEach(function(x, i){
      matchedIds[x.entry.item.dataset.idx] = true;
      x.entry.item.classList.remove('faq-hidden');
      x.entry.item.classList.toggle('faq-best-match', i === 0);
      x.entry.item.querySelector('.faq-item__q-text').innerHTML = highlight(x.entry.q, terms.length ? terms : [query]);
      list.appendChild(x.entry.item);
    });
    idx.forEach(function(entry){
      if (!matchedIds[entry.item.dataset.idx]) entry.item.classList.add('faq-hidden');
    });
    var top = matches[0].entry.item;
    top.classList.add('open');
    top.querySelector('.faq-item__q').setAttribute('aria-expanded', 'true');
    status.innerHTML = ((window.I18N && window.I18N.ui || {}).faqMatches || '<strong>{N}</strong> matching question{S} for “{Q}”, best match opened below.').replace('{N}', matches.length).replace('{S}', matches.length === 1 ? '' : 's').replace('{Q}', query);
  }

  input.addEventListener('input', function(){
    clearTimeout(debounce);
    var q = this.value.trim();
    debounce = setTimeout(function(){ runSearch(q); }, 200);
  });
  input.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      if (this.value) { this.value = ''; resetView(); }
      else { this.blur(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounce);
      runSearch(this.value.trim());
      var top = list.querySelector('.faq-best-match');
      if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  clearBtn.addEventListener('click', function(){
    input.value = '';
    input.focus();
    resetView();
  });
})();

    (function(){
      var grid = document.getElementById('blog-latest');
      if (!grid) return;
      fetch('blog/posts.json', { cache: 'no-cache' })
        .then(function(r){ return r.json(); })
        .then(function(posts){
          if (!posts || !posts.length) return;
          posts.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
          grid.innerHTML = posts.slice(0,3).map(function(p){
            var url = 'blog/posts/' + p.slug + '.html';
            return '<article class="blog-card">'
              + '<span class="blog-card__date">'+(p.dateLabel||p.date)+'</span>'
              + '<h3 class="blog-card__title"><a href="'+url+'">'+p.title+'</a></h3>'
              + '<p class="blog-card__excerpt">'+p.excerpt+'</p>'
              + '<a href="'+url+'" class="blog-card__link">Read more →</a>'
              + '</article>';
          }).join('');
        })
        .catch(function(){});
    })();

  // Close mobile menu on any link click (except the Services dropdown toggle)
  document.querySelectorAll('.nav__links a').forEach(link => {
    link.addEventListener('click', (e) => {
      const parent = link.closest('.nav__has-dropdown');
      if (parent && link === parent.querySelector(':scope > a') && window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        parent.classList.toggle('open');
        return;
      }
      document.querySelector('.nav__links').classList.remove('open');
      document.querySelector('.nav__toggle').classList.remove('open');
      document.querySelectorAll('.nav__has-dropdown').forEach(d => d.classList.remove('open'));
    });
  });
  // Close mobile nav on tap outside
  document.addEventListener('click', (e) => {
    const nav = document.querySelector('nav');
    if (!nav.contains(e.target)) {
      document.querySelector('.nav__links').classList.remove('open');
      document.querySelector('.nav__toggle').classList.remove('open');
      document.querySelectorAll('.nav__has-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
  // Contact float: tap to expand Email/Call options, close on outside tap or Escape.
  (() => {
    const contactFloat = document.getElementById('contactFloat');
    const toggle = document.getElementById('contactFloatToggle');
    if (!contactFloat || !toggle) return;
    toggle.addEventListener('click', () => {
      const isOpen = contactFloat.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!contactFloat.contains(e.target)) {
        contactFloat.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        contactFloat.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  })();
  // On mobile, hide the contact float while scrolling down (reading) so it
  // never sits on top of text; reveal it again on scroll-up or once idle near the top.
  (() => {
    const contactFloat = document.getElementById('contactFloat');
    if (!contactFloat) return;
    let lastY = window.scrollY;
    let idleTimer;
    window.addEventListener('scroll', () => {
      if (window.innerWidth > 768 || contactFloat.classList.contains('open')) return;
      const y = window.scrollY;
      if (y < 80) {
        contactFloat.classList.remove('contact-float--hide');
      } else if (y > lastY + 4) {
        contactFloat.classList.add('contact-float--hide');
      } else if (y < lastY - 4) {
        contactFloat.classList.remove('contact-float--hide');
      }
      lastY = y;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => contactFloat.classList.remove('contact-float--hide'), 2500);
    }, { passive: true });
  })();

  // PharmAssess tab switching
  const paIframe    = document.getElementById('pa-iframe');
  const paWrap      = document.querySelector('.pa-iframe-wrap');
  const paLabelText = document.getElementById('pa-iframe-label-text');
  const paHintEl    = document.getElementById('pa-iframe-hint');
  // Window title stays short and normal; booking guidance (which dropdown
  // option to pick in PharmAssess) lives in its own hint banner instead of
  // being crammed into the title text.
  window.setPaHint = function(html) {
    if (!paHintEl) return;
    if (html) {
      paHintEl.innerHTML = '💡 ' + html;
      paHintEl.classList.add('show');
    } else {
      paHintEl.classList.remove('show');
      paHintEl.innerHTML = '';
    }
  };

  // Set initial height and label from the default active card
  (function() {
    var active = document.querySelector('.pa-card.active');
    if (active) {
      paIframe.style.height = (active.dataset.iframeheight || '1050') + 'px';
      if (active.dataset.label) paLabelText.textContent = active.dataset.label;
      setPaHint(active.dataset.hint || '');
    }
  })();

  // Collapse/expand the iframe panel
  var paCloseBtn = document.getElementById('pa-iframe-close');
  function paOpen() {
    paWrap.style.display = '';
    paWrap.classList.remove('collapsed');
    paWrap.classList.remove('dropping');
    void paWrap.offsetWidth;
    paWrap.classList.add('dropping');
    paCloseBtn.textContent = '✕';
  }
  function paClose() {
    paWrap.classList.add('collapsed');
    paCloseBtn.textContent = '▼';
  }
  paCloseBtn.addEventListener('click', function() {
    paWrap.style.display = 'none';
    paWrap.classList.remove('collapsed');
    document.querySelectorAll('.pa-card').forEach(c => c.classList.remove('active'));
  });

  // Expand bar (safety valve for very long forms)
  var paExpanded = false;
  document.getElementById('pa-iframe-expand').addEventListener('click', function() {
    var active = document.querySelector('.pa-card.active');
    var base = parseInt(active ? active.dataset.iframeheight : 1350);
    if (!paExpanded) {
      paIframe.style.height = (base + 800) + 'px';
      this.textContent = (window.I18N && window.I18N.ui || {}).collapse || 'Collapse ↑';
      paExpanded = true;
    } else {
      paIframe.style.height = base + 'px';
      this.textContent = (window.I18N && window.I18N.ui || {}).expand || 'Need more room? Expand ↓';
      paExpanded = false;
    }
  });

  function switchPaTab(card, doScroll, labelOverride, hintOverride) {
    document.querySelectorAll('.pa-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    paIframe.style.height = (card.dataset.iframeheight || '1050') + 'px';
    paIframe.src = card.dataset.url;
    paExpanded = false;
    var expandBtn = document.getElementById('pa-iframe-expand');
    if (expandBtn) expandBtn.textContent = (window.I18N && window.I18N.ui || {}).expand || 'Need more room? Expand ↓';
    // A button can pass its own short title (e.g. "Vaccinations") to guide
    // the patient even when several buttons share one PharmAssess URL;
    // otherwise fall back to the destination card's label. Any booking
    // guidance (which PharmAssess dropdown option to pick) goes in the
    // separate hint banner below the title, not the title itself.
    var lbl = labelOverride || card.dataset.label;
    if (lbl) paLabelText.textContent = lbl;
    setPaHint(hintOverride || card.dataset.hint || '');
    // Move the panel into the same grid as the clicked card, directly after
    // the clicked card's own row, not just appended to the grid's end,
    // which only happens to land under the right row when that row is
    // already the grid's last (e.g. appending always put it after Smoking
    // Cessation/Naloxone correctly, but after Vaccinations/POCT/Medication
    // Extensions it would still end up below those later rows too).
    var parentGrid = card.closest('.pa-cards');
    if (parentGrid) {
      if (paWrap.parentElement) paWrap.parentElement.removeChild(paWrap);
      var rowTop = card.offsetTop;
      var lastInRow = card;
      Array.prototype.forEach.call(parentGrid.children, function(sib) {
        if (sib.classList && sib.classList.contains('pa-card') && sib.offsetParent !== null && sib.offsetTop === rowTop) {
          lastInRow = sib;
        }
      });
      lastInRow.insertAdjacentElement('afterend', paWrap);
    }
    paWrap.style.gridColumn = '';
    paOpen(); // always ensure the panel is visible
    // Only auto-scroll when triggered from elsewhere on the page (e.g. a jump
    // button). When the user clicks a portal card directly, leave them where
    // they are and let them scroll to the assessment themselves.
    if (doScroll) {
      setTimeout(function() {
        paWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }

  const conditionsCard  = document.getElementById('pa-card-conditions');
  const conditionsPanel = document.getElementById('conditions-panel');

  function closeAllPanels() {
    paWrap.style.display = 'none';
    paWrap.classList.remove('collapsed');
    conditionsPanel.classList.remove('open');
    document.querySelectorAll('.pa-card').forEach(c => c.classList.remove('active'));
  }

  document.querySelectorAll('.pa-card').forEach(card => {
    card.addEventListener('click', function() {
      if (this === conditionsCard) {
        const wasOpen = conditionsPanel.classList.contains('open');
        closeAllPanels();
        if (!wasOpen) {
          conditionsPanel.classList.add('open');
          this.classList.add('active');
          // Don't auto-scroll on open, leave the patient where they are. We
          // only scroll once they pick a category (see the triage handler),
          // to bring that category's conditions into view.
        }
      } else {
        const alreadyActive = this.classList.contains('active');
        const panelVisible = paWrap.style.display !== 'none';
        if (alreadyActive && panelVisible) {
          closeAllPanels();
        } else {
          closeAllPanels();
          switchPaTab(this);
        }
      }
    });
  });

  // Condition chip clicks
  function getConditionLabel(chip) {
    var card = chip.closest('.ailment-card');
    if (card) {
      var nameEl = card.querySelector('.ailment-card__name');
      var icon = card.querySelector('.ailment-card__icon');
      var name = nameEl ? nameEl.textContent.trim() : 'Condition';
      var iconText = icon ? icon.textContent.trim() : '🩺';
      return iconText + ' ' + name + ', Assessment';
    }
    return chip.textContent.trim() + ', Assessment';
  }
  document.querySelectorAll('.js-condition').forEach(chip => {
    chip.addEventListener('click', function(e) {
      e.preventDefault();
      const url = this.dataset.url;
      conditionsPanel.classList.remove('open');
      document.querySelectorAll('.pa-card').forEach(c => c.classList.remove('active'));
      conditionsCard.classList.add('active');
      paIframe.style.height = (conditionsCard.dataset.iframeheight || '1280') + 'px';
      paIframe.src = url;
      if (paLabelText) paLabelText.textContent = getConditionLabel(this);
      setPaHint('');
      // Move panel into primary grid (where the conditions card lives)
      var primaryGrid = conditionsCard.closest('.pa-cards');
      if (primaryGrid && paWrap.parentElement !== primaryGrid) {
        primaryGrid.appendChild(paWrap);
      }
      paWrap.style.gridColumn = '';
      paOpen(); // always show the panel, even if previously closed
      // From another section: one smooth scroll to the iframe (its
      // scroll-margin keeps the blue instruction bar visible). From inside
      // the portal: the tall conditions panel just collapsed, so snap
      // instantly to the iframe, with no travel, the view simply stays anchored
      // on the assessment instead of drifting into whatever slid up.
      var fromInsideBooking = !!this.closest('#booking');
      setTimeout(function() {
        paWrap.scrollIntoView({ behavior: fromInsideBooking ? 'instant' : 'smooth', block: 'start' });
      }, 80);
    });
  });

  // Auto-resize iframe from PharmAssess postMessage
  var paHeightReceived = false;
  window.addEventListener('message', function(e) {
    try {
      if (!String(e.origin).includes('pharmassess')) return;
      var d = e.data, h = null;
      if (typeof d === 'number') {
        h = d;
      } else if (typeof d === 'string') {
        var n = parseFloat(d);
        if (!isNaN(n) && n > 0) h = n;
      } else if (d && typeof d === 'object') {
        h = d.height || d.iframeHeight || d.frameHeight ||
            d.scrollHeight || d.contentHeight || d.documentHeight ||
            d.bodyHeight || d.value ||
            (d.data && d.data.height) ||
            (d.size && typeof d.size === 'number' ? d.size : null) || null;
      }
      if (h && +h > 50) {
        paIframe.style.height = (Math.round(+h) + 32) + 'px'; // +32px keeps submit button clear
        paHeightReceived = true;
        // If content shrunk back, reset expand state
        paExpanded = false;
        var expBtn = document.getElementById('pa-iframe-expand');
        if (expBtn) expBtn.textContent = (window.I18N && window.I18N.ui || {}).expand || 'Need more room? Expand ↓';
      }
    } catch (_) {}
  });

  // On iframe load, probe PharmAssess for height at multiple intervals
  paIframe.addEventListener('load', function() {
    paHeightReceived = false;
    var card = document.querySelector('.pa-card.active');
    var fallback = parseInt(card ? card.dataset.iframeheight : 700);
    // Attempt to nudge PharmAssess into sending a height message
    [250, 700, 1400, 2500].forEach(function(ms) {
      setTimeout(function() {
        if (paHeightReceived) return;
        try { paIframe.contentWindow.postMessage({ event: 'resize', type: 'resize', action: 'height' }, '*'); } catch(e) {}
        try { paIframe.contentWindow.postMessage('resize', '*'); } catch(e) {}
      }, ms);
    });
    // Hard fallback: if PharmAssess never responds, use data-iframeheight
    setTimeout(function() {
      if (!paHeightReceived) paIframe.style.height = fallback + 'px';
    }, 3200);
  });

  // Buttons elsewhere that jump to booking and pre-select a service tab
  document.querySelectorAll('.js-pa-select').forEach(el => {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      // Some triggers (e.g. the booking-card chips) are nested inside another
      // clickable .pa-card; stop the click bubbling so the parent card's
      // handler doesn't fire and close the panel we're about to open.
      e.stopPropagation();
      var url = this.dataset.url;
      var labelOverride = this.dataset.label || null;
      var hintOverride = this.dataset.hint || null;
      var target = document.querySelector('.pa-card[data-url="' + url + '"]');
      // Only scroll when arriving from another section, clicks made inside
      // the booking portal keep the viewport where it is.
      var doScroll = !this.closest('#booking');
      if (target) {
        switchPaTab(target, doScroll, labelOverride, hintOverride);
      } else {
        // No matching pa-card, load URL directly into the iframe
        document.querySelectorAll('.pa-card').forEach(c => c.classList.remove('active'));
        paIframe.src = url;
        paIframe.style.height = (this.dataset.iframeheight || '1280') + 'px';
        paExpanded = false;
        if (labelOverride && paLabelText) paLabelText.textContent = labelOverride;
        setPaHint(hintOverride || '');
        paOpen();
        if (doScroll) {
          setTimeout(function() { paWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
        }
      }
    });
  });

  // Divs with role="button" don't get a native click from the keyboard, 
  // wire up Enter/Space so they behave like real buttons.
  document.querySelectorAll('[role="button"][tabindex]').forEach(el => {
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });


  // ── Drug Interaction Checker ──
  (function () {
    const input = document.getElementById('dc-input');
    if (!input) return;
    const sugg     = document.getElementById('dc-suggestions');
    const chipsWrap= document.getElementById('dc-chips');
    const addBtn   = document.getElementById('dc-add');
    const checkBtn = document.getElementById('dc-check');
    const clearBtn = document.getElementById('dc-clear');
    const results  = document.getElementById('dc-results');
    let meds = []; // [{name, cui}]
    let activeIdx = -1, debounce;

    // Brand → generic alias map
    const ALIAS = {
      tylenol:'acetaminophen',paracetamol:'acetaminophen',tempra:'acetaminophen',
      advil:'ibuprofen',motrin:'ibuprofen',nurofen:'ibuprofen',
      aleve:'naproxen',naprosyn:'naproxen',
      asa:'aspirin',bayer:'aspirin',
      coumadin:'warfarin',jantoven:'warfarin',
      prozac:'fluoxetine',sarafem:'fluoxetine',
      zoloft:'sertraline',paxil:'paroxetine',celexa:'citalopram',
      lexapro:'escitalopram',cipralex:'escitalopram',
      effexor:'venlafaxine',cymbalta:'duloxetine',
      wellbutrin:'bupropion',zyban:'bupropion',
      nardil:'phenelzine',parnate:'tranylcypromine',elavil:'amitriptyline',
      voltaren:'diclofenac',celebrex:'celecoxib',
      lipitor:'atorvastatin',crestor:'rosuvastatin',zocor:'simvastatin',
      pravachol:'pravastatin',mevacor:'lovastatin',
      glucophage:'metformin',
      prinivil:'lisinopril',zestril:'lisinopril',vasotec:'enalapril',altace:'ramipril',
      norvasc:'amlodipine',cardizem:'diltiazem',
      lopressor:'metoprolol',toprol:'metoprolol',tenormin:'atenolol',coreg:'carvedilol',
      lasix:'furosemide',microzide:'hydrochlorothiazide',hctz:'hydrochlorothiazide',
      aldactone:'spironolactone',lanoxin:'digoxin',
      synthroid:'levothyroxine',eltroxin:'levothyroxine',
      cipro:'ciprofloxacin',zithromax:'azithromycin',biaxin:'clarithromycin',
      flagyl:'metronidazole',diflucan:'fluconazole',sporanox:'itraconazole',
      percocet:'oxycodone','oxycontin':'oxycodone',ultram:'tramadol',
      xanax:'alprazolam',ativan:'lorazepam',valium:'diazepam',klonopin:'clonazepam',
      ambien:'zolpidem',benadryl:'diphenhydramine',gravol:'dimenhydrinate',
      claritin:'loratadine',zyrtec:'cetirizine',reactine:'cetirizine',
      pepcid:'famotidine',nexium:'esomeprazole',prilosec:'omeprazole',
      pantoloc:'pantoprazole',tecta:'pantoprazole',
      plavix:'clopidogrel',xarelto:'rivaroxaban',eliquis:'apixaban',pradaxa:'dabigatran',
      eskalith:'lithium',lithobid:'lithium',
      depakote:'valproate',depakene:'valproate','valproic acid':'valproate',
      tegretol:'carbamazepine',dilantin:'phenytoin',
      seroquel:'quetiapine',zyprexa:'olanzapine',risperdal:'risperidone',haldol:'haloperidol',
      neurontin:'gabapentin',lyrica:'pregabalin',atarax:'hydroxyzine',remeron:'mirtazapine',
      cordarone:'amiodarone',zyloprim:'allopurinol',
      sandimmune:'cyclosporine',neoral:'cyclosporine',prograf:'tacrolimus',
      'st. john\'s wort':'st. john\'s wort',hypericum:'st. john\'s wort',
      "saint john's wort":'st. john\'s wort',
      // Antibiotic combinations
      septra:'trimethoprim-sulfamethoxazole',bactrim:'trimethoprim-sulfamethoxazole',
      cotrimoxazole:'trimethoprim-sulfamethoxazole','tmp-smx':'trimethoprim-sulfamethoxazole',
      // Gout
      colcrys:'colchicine',
      // OTC cough suppressant (found in Benylin DM, Robitussin DM, Delsym)
      'robitussin dm':'dextromethorphan','benylin dm':'dextromethorphan',delsym:'dextromethorphan',
      // Calcium channel blockers
      isoptin:'verapamil',verelan:'verapamil',
      // Theophylline
      'theo-dur':'theophylline',uniphyl:'theophylline',
      // Immunosuppressants
      imuran:'azathioprine',azasan:'azathioprine',
      // Nitrates (additional forms)
      'isosorbide mononitrate':'isosorbide mononitrate','isosorbide dinitrate':'isosorbide dinitrate',
      imdur:'isosorbide mononitrate',ismo:'isosorbide mononitrate',
      isordil:'isosorbide dinitrate',
      // PDE5 inhibitors
      viagra:'sildenafil',revatio:'sildenafil',cialis:'tadalafil',levitra:'vardenafil',
    };

    // Curated interaction database, fallback + supplement to RxNav
    // sev: 'contraindicated' | 'major' | 'moderate' | 'minor'
    const LOCAL_IX = [
      {a:'warfarin',b:'aspirin',sev:'major',desc:'Concurrent use significantly increases bleeding risk. Aspirin inhibits platelet function and may displace warfarin from protein binding. Monitor INR closely; assess benefit vs. risk.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'ibuprofen',sev:'major',desc:'NSAIDs inhibit platelet aggregation and cause GI irritation. Combined use with warfarin markedly increases haemorrhagic risk.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'naproxen',sev:'major',desc:'NSAIDs increase bleeding risk with warfarin through platelet inhibition and GI mucosal effects. Monitor closely.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'fluconazole',sev:'major',desc:'Fluconazole inhibits CYP2C9, warfarin\'s primary metabolising enzyme, causing significant INR elevation and bleeding risk.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'metronidazole',sev:'major',desc:'Metronidazole inhibits CYP2C9, markedly increasing warfarin levels. INR monitoring required within a few days of starting metronidazole.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'ciprofloxacin',sev:'major',desc:'Fluoroquinolones potentiate warfarin\'s anticoagulant effect, likely through gut flora disruption. Monitor INR within 3–5 days.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'azithromycin',sev:'major',desc:'Azithromycin may enhance the anticoagulant effect of warfarin. INR monitoring recommended during and after the antibiotic course.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'clarithromycin',sev:'major',desc:'CYP3A4 inhibition by clarithromycin increases warfarin levels. Monitor INR closely.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'amiodarone',sev:'major',desc:'Amiodarone is a potent inhibitor of CYP2C9 and CYP3A4 and dramatically increases warfarin\'s anticoagulant effect. Warfarin dose reductions of 30–50% are often required. Frequent INR monitoring is essential.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'st. john\'s wort',sev:'major',desc:'St. John\'s Wort induces CYP enzymes and P-glycoprotein, substantially reducing warfarin levels. INR may decrease by up to 50%, undermining anticoagulation.',src:'Clinical Pharmacology'},
      {a:'warfarin',b:'acetaminophen',sev:'moderate',desc:'Regular acetaminophen use (>2 g/day for more than one week) can moderately increase warfarin\'s anticoagulant effect and raise INR. Occasional use is generally safe.',src:'Clinical Pharmacology'},
      {a:'digoxin',b:'amiodarone',sev:'major',desc:'Amiodarone inhibits P-glycoprotein and CYP3A4, substantially increasing digoxin levels. Risk of digoxin toxicity (nausea, arrhythmia, visual changes). Reduce digoxin dose by ~50% and monitor levels.',src:'Clinical Pharmacology'},
      {a:'fluoxetine',b:'tramadol',sev:'major',desc:'Fluoxetine is a potent CYP2D6 inhibitor, it both increases tramadol exposure and blocks formation of its active analgesic metabolite. Serotonin syndrome risk is also present.',src:'Clinical Pharmacology'},
      {a:'sertraline',b:'tramadol',sev:'major',desc:'Both drugs are serotonergic. Concurrent use risks serotonin syndrome (agitation, tremor, hyperthermia, tachycardia). High-risk combination.',src:'ONC High Priority'},
      {a:'paroxetine',b:'tramadol',sev:'major',desc:'Paroxetine is the most potent CYP2D6 inhibitor among SSRIs, it increases tramadol exposure and raises serotonin syndrome risk.',src:'Clinical Pharmacology'},
      {a:'venlafaxine',b:'tramadol',sev:'major',desc:'Both are serotonergic. Concurrent use risks serotonin syndrome.',src:'ONC High Priority'},
      {a:'fluoxetine',b:'phenelzine',sev:'contraindicated',desc:'Risk of life-threatening serotonin syndrome. Allow ≥14 days washout after stopping the MAOI, or ≥5 weeks after stopping fluoxetine before starting an MAOI.',src:'Health Canada Monograph'},
      {a:'fluoxetine',b:'tranylcypromine',sev:'contraindicated',desc:'Risk of life-threatening serotonin syndrome. Contraindicated; requires washout period.',src:'Health Canada Monograph'},
      {a:'sertraline',b:'phenelzine',sev:'contraindicated',desc:'Risk of serotonin syndrome, potentially fatal. Allow ≥14 days washout between agents.',src:'Health Canada Monograph'},
      {a:'paroxetine',b:'phenelzine',sev:'contraindicated',desc:'Risk of serotonin syndrome. Contraindicated.',src:'Health Canada Monograph'},
      {a:'venlafaxine',b:'phenelzine',sev:'contraindicated',desc:'Risk of serotonin syndrome. Contraindicated.',src:'Health Canada Monograph'},
      {a:'bupropion',b:'phenelzine',sev:'contraindicated',desc:'Bupropion with MAOIs risks acute toxicity including seizures and hypertensive crisis. Allow ≥14 days washout.',src:'Health Canada Monograph'},
      {a:'tramadol',b:'phenelzine',sev:'contraindicated',desc:'Risk of serotonin syndrome and seizures. Contraindicated.',src:'Clinical Pharmacology'},
      {a:'tramadol',b:'tranylcypromine',sev:'contraindicated',desc:'Risk of serotonin syndrome and seizures. Contraindicated.',src:'Clinical Pharmacology'},
      {a:'lithium',b:'ibuprofen',sev:'major',desc:'NSAIDs reduce renal lithium clearance, elevating lithium levels and risking toxicity (tremor, confusion, arrhythmia). Monitor lithium levels closely if NSAIDs are necessary.',src:'Clinical Pharmacology'},
      {a:'lithium',b:'naproxen',sev:'major',desc:'NSAIDs reduce lithium renal clearance. Risk of lithium toxicity. Monitor levels.',src:'Clinical Pharmacology'},
      {a:'lithium',b:'hydrochlorothiazide',sev:'major',desc:'Thiazide diuretics decrease renal sodium excretion, causing compensatory lithium reabsorption and elevated lithium levels, toxicity risk.',src:'Clinical Pharmacology'},
      {a:'methotrexate',b:'ibuprofen',sev:'major',desc:'NSAIDs reduce methotrexate renal clearance. Risk of serious methotrexate toxicity (mucositis, myelosuppression, nephrotoxicity).',src:'Clinical Pharmacology'},
      {a:'methotrexate',b:'naproxen',sev:'major',desc:'NSAIDs reduce methotrexate clearance, risk of severe toxicity.',src:'Clinical Pharmacology'},
      {a:'simvastatin',b:'clarithromycin',sev:'major',desc:'Clarithromycin markedly inhibits CYP3A4-mediated simvastatin metabolism, raising risk of myopathy and rhabdomyolysis. Hold simvastatin during clarithromycin treatment.',src:'Clinical Pharmacology'},
      {a:'atorvastatin',b:'clarithromycin',sev:'major',desc:'CYP3A4 inhibition by clarithromycin significantly increases atorvastatin exposure. Limit dose or consider an alternative statin.',src:'Clinical Pharmacology'},
      {a:'simvastatin',b:'itraconazole',sev:'major',desc:'Potent CYP3A4 inhibition dramatically raises simvastatin levels, rhabdomyolysis risk. Effectively contraindicated per most guidelines.',src:'Clinical Pharmacology'},
      {a:'simvastatin',b:'gemfibrozil',sev:'contraindicated',desc:'Gemfibrozil inhibits CYP2C8 and OATP1B1, dramatically increasing simvastatin exposure, high risk of severe myopathy and rhabdomyolysis.',src:'Clinical Pharmacology'},
      {a:'lovastatin',b:'gemfibrozil',sev:'contraindicated',desc:'Risk of severe myopathy and rhabdomyolysis. Contraindicated.',src:'Clinical Pharmacology'},
      {a:'cyclosporine',b:'simvastatin',sev:'major',desc:'Cyclosporine inhibits OATP1B1 and CYP3A4, dramatically increasing simvastatin exposure. Limit simvastatin to 10 mg/day.',src:'Clinical Pharmacology'},
      {a:'rosuvastatin',b:'cyclosporine',sev:'major',desc:'Cyclosporine inhibits OATP1B1, markedly increasing rosuvastatin AUC. Limit rosuvastatin to 5 mg/day.',src:'Clinical Pharmacology'},
      {a:'fluoxetine',b:'tamoxifen',sev:'major',desc:'Fluoxetine inhibits CYP2D6, reducing tamoxifen conversion to its active metabolite endoxifen by ~60%, potentially reducing anticancer efficacy.',src:'Clinical Pharmacology'},
      {a:'paroxetine',b:'tamoxifen',sev:'major',desc:'Paroxetine is the most potent CYP2D6 inhibitor among SSRIs, it markedly reduces tamoxifen activation. Avoid in breast cancer patients on tamoxifen.',src:'Clinical Pharmacology'},
      {a:'st. john\'s wort',b:'cyclosporine',sev:'major',desc:'St. John\'s Wort induces CYP3A4 and P-gp, dramatically reducing cyclosporine levels. Transplant rejection has occurred. Avoid this combination.',src:'Health Canada Advisory'},
      {a:'st. john\'s wort',b:'sertraline',sev:'major',desc:'Both are serotonergic, combined use risks serotonin syndrome. Avoid.',src:'ONC High Priority'},
      {a:'st. john\'s wort',b:'fluoxetine',sev:'major',desc:'Both increase serotonergic activity, serotonin syndrome risk.',src:'ONC High Priority'},
      {a:'st. john\'s wort',b:'venlafaxine',sev:'major',desc:'Serotonin syndrome risk when combined with serotonergic antidepressants.',src:'ONC High Priority'},
      {a:'lisinopril',b:'spironolactone',sev:'major',desc:'ACE inhibitors reduce aldosterone secretion; combined with potassium-sparing diuretics, this can cause severe hyperkalemia, especially in renal impairment. Monitor potassium.',src:'Clinical Pharmacology'},
      {a:'ibuprofen',b:'lisinopril',sev:'moderate',desc:'NSAIDs reduce the antihypertensive effect of ACE inhibitors and may impair renal function, particularly in elderly or dehydrated patients.',src:'Clinical Pharmacology'},
      {a:'naproxen',b:'lisinopril',sev:'moderate',desc:'NSAIDs antagonise ACE inhibitor antihypertensive effects. Acute renal insufficiency risk with dehydration.',src:'Clinical Pharmacology'},
      {a:'ibuprofen',b:'metoprolol',sev:'moderate',desc:'NSAIDs may blunt the antihypertensive effects of beta-blockers. Monitor blood pressure.',src:'Clinical Pharmacology'},
      {a:'ibuprofen',b:'aspirin',sev:'moderate',desc:'Ibuprofen may interfere with aspirin\'s antiplatelet action by competing for the COX-1 active site. If both are needed, take aspirin 30 min before ibuprofen.',src:'FDA Drug Safety Communication'},
      {a:'alcohol',b:'metronidazole',sev:'major',desc:'Disulfiram-like reaction: flushing, tachycardia, nausea, vomiting. Avoid alcohol during metronidazole therapy and for 48 h after the last dose.',src:'Clinical Pharmacology'},
      {a:'alcohol',b:'acetaminophen',sev:'major',desc:'Chronic alcohol use (≥3 drinks/day) increases risk of acetaminophen-induced hepatotoxicity even at normal doses. Limit acetaminophen to ≤2 g/day in regular drinkers.',src:'Health Canada Monograph'},
      {a:'alcohol',b:'metformin',sev:'moderate',desc:'Alcohol potentiates metformin\'s lactic acidosis risk, especially when fasting or with hepatic impairment.',src:'Health Canada Monograph'},
      {a:'clopidogrel',b:'omeprazole',sev:'moderate',desc:'Omeprazole inhibits CYP2C19, reducing clopidogrel\'s conversion to its active antiplatelet metabolite by ~40–50%. Pantoprazole is a safer PPI choice with this combination.',src:'FDA Drug Safety Communication'},
      {a:'clopidogrel',b:'esomeprazole',sev:'moderate',desc:'Esomeprazole reduces clopidogrel antiplatelet effect via CYP2C19 inhibition. Prefer pantoprazole when a PPI is necessary.',src:'FDA Drug Safety Communication'},
      {a:'levothyroxine',b:'calcium',sev:'moderate',desc:'Calcium supplements bind levothyroxine in the GI tract, reducing absorption by up to 40%. Separate doses by at least 4 hours.',src:'Clinical Pharmacology'},
      {a:'levothyroxine',b:'iron',sev:'moderate',desc:'Iron supplements chelate levothyroxine and impair absorption. Separate doses by at least 4 hours.',src:'Clinical Pharmacology'},
      {a:'ciprofloxacin',b:'antacid',sev:'moderate',desc:'Divalent cations (Al, Mg, Ca) chelate fluoroquinolones, reducing oral bioavailability by up to 90%. Take ciprofloxacin 2 h before or 6 h after antacids or dairy products.',src:'Clinical Pharmacology'},
      {a:'carbamazepine',b:'clarithromycin',sev:'major',desc:'Clarithromycin inhibits CYP3A4-mediated carbamazepine metabolism, elevating carbamazepine levels. Risk of toxicity: diplopia, ataxia, confusion.',src:'Clinical Pharmacology'},
      {a:'quetiapine',b:'clarithromycin',sev:'major',desc:'CYP3A4 inhibition substantially increases quetiapine levels, raising risk of QTc prolongation and CNS adverse effects.',src:'Clinical Pharmacology'},
      {a:'fluoxetine',b:'aspirin',sev:'moderate',desc:'SSRIs reduce platelet serotonin, impairing aggregation. Combined with aspirin, this increases GI bleeding risk. Consider gastroprotection (PPI).',src:'ONC High Priority'},
      {a:'sertraline',b:'aspirin',sev:'moderate',desc:'SSRIs combined with aspirin increase GI bleeding risk. Consider a PPI for gastroprotection.',src:'ONC High Priority'},
      {a:'fluoxetine',b:'ibuprofen',sev:'moderate',desc:'SSRIs combined with NSAIDs significantly increase upper GI bleeding risk (~3-fold vs NSAID alone). Consider adding a proton pump inhibitor.',src:'ONC High Priority'},
      {a:'sertraline',b:'ibuprofen',sev:'moderate',desc:'SSRIs combined with NSAIDs increase GI bleeding risk significantly. PPI co-prescribing should be considered.',src:'ONC High Priority'},
      {a:'prednisone',b:'ibuprofen',sev:'moderate',desc:'Corticosteroids combined with NSAIDs significantly increase GI ulceration and bleeding risk.',src:'Clinical Pharmacology'},
      {a:'allopurinol',b:'azathioprine',sev:'major',desc:'Allopurinol inhibits xanthine oxidase, the enzyme that metabolises azathioprine, causing a ~4-fold increase in azathioprine levels and severe bone marrow toxicity. Reduce azathioprine dose by 75% or avoid.',src:'Clinical Pharmacology'},
      {a:'amiodarone',b:'metoprolol',sev:'moderate',desc:'Additive risk of bradycardia and AV block when combining amiodarone with beta-blockers. Monitor heart rate and ECG.',src:'Clinical Pharmacology'},
      {a:'furosemide',b:'digoxin',sev:'moderate',desc:'Furosemide-induced hypokalemia and hypomagnesemia sensitise the myocardium to digoxin toxicity. Monitor electrolytes.',src:'Clinical Pharmacology'},
      {a:'valproate',b:'aspirin',sev:'moderate',desc:'Aspirin displaces valproate from plasma protein binding and inhibits its metabolism, potentially increasing valproate levels and toxicity risk.',src:'Clinical Pharmacology'},
      {a:'sildenafil',b:'nitroglycerin',sev:'contraindicated',desc:'Both lower blood pressure; the combination can cause life-threatening hypotension. Nitrates (nitroglycerin, isosorbide) must not be used within 24–48 h of PDE5 inhibitors.',src:'Clinical Pharmacology'},
      {a:'diphenhydramine',b:'lorazepam',sev:'moderate',desc:'Additive CNS depression: enhanced sedation, cognitive impairment, and respiratory depression risk. Use with caution, especially in elderly patients.',src:'Clinical Pharmacology'},
      {a:'diphenhydramine',b:'diazepam',sev:'moderate',desc:'Additive CNS depression with benzodiazepines. Increased sedation and impairment.',src:'Clinical Pharmacology'},
      // ── Digoxin: P-glycoprotein inhibitors ───────────────────────────────────
      {a:'digoxin',b:'verapamil',sev:'major',desc:'Verapamil inhibits P-glycoprotein and reduces renal digoxin clearance, raising digoxin levels by 50–75%. Risk of digoxin toxicity: bradycardia, nausea, visual disturbances, and arrhythmia. Reduce digoxin dose when adding verapamil and monitor drug levels.',src:'Lexicomp'},
      {a:'digoxin',b:'diltiazem',sev:'moderate',desc:'Diltiazem inhibits P-glycoprotein, raising digoxin plasma levels by 20–30%. Monitor for signs of digoxin toxicity and consider dose adjustment.',src:'Clinical Pharmacology'},
      {a:'digoxin',b:'clarithromycin',sev:'major',desc:'Clarithromycin inhibits P-glycoprotein-mediated renal tubular secretion of digoxin, substantially increasing digoxin exposure. Risk of digoxin toxicity including bradycardia, nausea, and cardiac arrhythmias, monitor levels.',src:'Lexicomp'},
      // ── Warfarin: TMP-SMX ────────────────────────────────────────────────────
      {a:'warfarin',b:'trimethoprim-sulfamethoxazole',sev:'major',desc:'Trimethoprim inhibits CYP2C9 (warfarin\'s primary metabolising enzyme) and also reduces renal warfarin clearance; sulfamethoxazole displaces warfarin from protein binding. INR can double within 3–5 days of starting Septra/Bactrim. Monitor INR closely.',src:'Lexicomp'},
      // ── Methotrexate: high-risk combinations ─────────────────────────────────
      {a:'methotrexate',b:'trimethoprim-sulfamethoxazole',sev:'contraindicated',desc:'Both methotrexate and trimethoprim are antifolates. Concurrent use causes severe additive bone marrow suppression, pancytopenia and fatal outcomes have been documented. This combination is contraindicated. Seek urgent prescriber review if currently taking both.',src:'Lexicomp / Health Canada Monograph'},
      {a:'methotrexate',b:'aspirin',sev:'major',desc:'Aspirin reduces renal methotrexate clearance and displaces it from plasma protein binding, raising free methotrexate levels. Risk of serious toxicity: mucositis, myelosuppression, and nephrotoxicity, particularly at higher methotrexate doses.',src:'Clinical Pharmacology'},
      // ── Lithium: ACE inhibitors & loop diuretics ─────────────────────────────
      {a:'lithium',b:'lisinopril',sev:'major',desc:'ACE inhibitors reduce renal sodium excretion, triggering compensatory proximal tubular lithium reabsorption and raising lithium serum levels. Risk of lithium toxicity: tremor, confusion, polyuria, and cardiac arrhythmia. Monitor lithium levels within 1–2 weeks.',src:'Clinical Pharmacology'},
      {a:'lithium',b:'ramipril',sev:'major',desc:'ACE inhibitors increase lithium levels by reducing sodium excretion and causing compensatory lithium reabsorption. Risk of toxicity. Monitor lithium levels closely after starting or dose-adjusting ramipril.',src:'Clinical Pharmacology'},
      {a:'lithium',b:'furosemide',sev:'major',desc:'Furosemide causes sodium and volume depletion, triggering compensatory renal lithium reabsorption and elevating lithium levels. Lithium toxicity (tremor, confusion, cardiac effects) can develop quickly. Monitor lithium levels closely.',src:'Clinical Pharmacology'},
      // ── Clarithromycin + colchicine ───────────────────────────────────────────
      {a:'clarithromycin',b:'colchicine',sev:'major',desc:'Clarithromycin potently inhibits both P-glycoprotein and CYP3A4, the primary pathways for colchicine elimination. This combination dramatically increases colchicine exposure, multiple fatal cases have been reported even in patients with normal kidney function. A safer antibiotic should be substituted.',src:'Health Canada Drug Safety Advisory / Lexicomp'},
      // ── Dextromethorphan (OTC cough syrups): serotonin syndrome ──────────────
      {a:'dextromethorphan',b:'fluoxetine',sev:'major',desc:'Fluoxetine potently inhibits CYP2D6, the primary enzyme metabolising dextromethorphan, causing several-fold increases in DXM exposure and raising serotonin syndrome risk. Dextromethorphan (in Benylin DM, Robitussin DM, and many other OTC cough products) should be avoided while taking fluoxetine.',src:'Clinical Pharmacology'},
      {a:'dextromethorphan',b:'sertraline',sev:'major',desc:'Sertraline inhibits CYP2D6 and has its own serotonergic activity. Concurrent use with dextromethorphan (an OTC cough suppressant) increases serotonin syndrome risk. Check all OTC cold and cough products for dextromethorphan.',src:'Clinical Pharmacology'},
      {a:'dextromethorphan',b:'paroxetine',sev:'major',desc:'Paroxetine is the most potent CYP2D6 inhibitor among SSRIs, dramatically raising dextromethorphan plasma levels and serotonin syndrome risk. Avoid dextromethorphan-containing OTC products while taking paroxetine.',src:'Clinical Pharmacology'},
      {a:'dextromethorphan',b:'phenelzine',sev:'contraindicated',desc:'Dextromethorphan with MAOIs causes life-threatening serotonin syndrome, even a single dose of a DXM-containing cough syrup has precipitated serious reactions. This combination is contraindicated. Check all OTC cough and cold products carefully.',src:'Health Canada Monograph'},
      {a:'dextromethorphan',b:'tranylcypromine',sev:'contraindicated',desc:'Dextromethorphan with MAOIs causes life-threatening serotonin syndrome. Contraindicated. Avoid all OTC products containing dextromethorphan.',src:'Health Canada Monograph'},
      // ── Bupropion + tramadol ──────────────────────────────────────────────────
      {a:'bupropion',b:'tramadol',sev:'major',desc:'Bupropion lowers the seizure threshold and inhibits CYP2D6, increasing tramadol plasma levels. Tramadol also lowers seizure threshold and has serotonergic activity. The combination substantially increases risk of seizures. Seek prescriber review before using both.',src:'Clinical Pharmacology'},
      // ── Ciprofloxacin + theophylline ──────────────────────────────────────────
      {a:'ciprofloxacin',b:'theophylline',sev:'major',desc:'Ciprofloxacin strongly inhibits CYP1A2, the primary enzyme metabolising theophylline. Theophylline levels can increase by 50–100%, risking serious toxicity: seizures, cardiac arrhythmias, and severe nausea. Reduce theophylline dose by 30–50% and monitor levels closely when adding ciprofloxacin.',src:'Clinical Pharmacology'},
      // ── Fluoroquinolone + corticosteroid: tendon rupture ─────────────────────
      {a:'ciprofloxacin',b:'prednisone',sev:'moderate',desc:'Concurrent use of fluoroquinolone antibiotics and corticosteroids significantly increases the risk of tendon rupture, particularly the Achilles tendon. Risk is highest in patients over 60 or with renal impairment. Report any new tendon pain or swelling immediately.',src:'FDA Drug Safety Communication / ISMP'},
      // ── Nitrates: extended combinations with PDE5 inhibitors ─────────────────
      {a:'sildenafil',b:'isosorbide mononitrate',sev:'contraindicated',desc:'PDE5 inhibitors and nitrates both lower blood pressure via the nitric oxide / cGMP pathway. Combining them causes unpredictable, severe, and potentially fatal hypotension. All nitrate forms (nitroglycerin, isosorbide mononitrate, isosorbide dinitrate) are contraindicated with sildenafil.',src:'Clinical Pharmacology / Health Canada Monograph'},
      {a:'sildenafil',b:'isosorbide dinitrate',sev:'contraindicated',desc:'PDE5 inhibitors are contraindicated with all nitrate forms due to risk of severe hypotension. Includes sublingual, oral, patch, and spray formulations.',src:'Clinical Pharmacology'},
      {a:'tadalafil',b:'nitroglycerin',sev:'contraindicated',desc:'PDE5 inhibitors and nitrates cause severe, potentially fatal hypotension when combined. Tadalafil\'s longer half-life (17–21 h) means this risk extends well beyond the last dose. No nitrate should be used within 48 hours of tadalafil.',src:'Clinical Pharmacology / Health Canada Monograph'},
      {a:'tadalafil',b:'isosorbide mononitrate',sev:'contraindicated',desc:'Tadalafil and all nitrates are contraindicated. Tadalafil\'s prolonged half-life means 48 h must elapse after the last dose before any nitrate can be safely administered.',src:'Clinical Pharmacology'},
      {a:'tadalafil',b:'isosorbide dinitrate',sev:'contraindicated',desc:'Tadalafil and nitrates are contraindicated in all forms. Requires 48 h washout after last tadalafil dose.',src:'Clinical Pharmacology'},
      {a:'vardenafil',b:'nitroglycerin',sev:'contraindicated',desc:'PDE5 inhibitors combined with any nitrate can cause life-threatening hypotension. Contraindicated.',src:'Clinical Pharmacology'},
    ];

    // Drug class map, for duplicate-class detection
    const DRUG_CLASSES = {
      'NSAID':           ['ibuprofen','naproxen','diclofenac','celecoxib','indomethacin','ketorolac','meloxicam','piroxicam','aspirin'],
      'SSRI':            ['fluoxetine','sertraline','paroxetine','citalopram','escitalopram','fluvoxamine'],
      'SNRI':            ['venlafaxine','duloxetine','desvenlafaxine','levomilnacipran'],
      'TCA':             ['amitriptyline','nortriptyline','clomipramine','imipramine','doxepin','desipramine'],
      'Statin':          ['atorvastatin','rosuvastatin','simvastatin','pravastatin','lovastatin','fluvastatin','pitavastatin'],
      'Beta-blocker':    ['metoprolol','atenolol','bisoprolol','carvedilol','propranolol','labetalol','nadolol','sotalol'],
      'ACE inhibitor':   ['lisinopril','enalapril','ramipril','perindopril','quinapril','captopril','fosinopril','trandolapril'],
      'ARB':             ['losartan','valsartan','irbesartan','candesartan','telmisartan','olmesartan'],
      'Benzodiazepine':  ['lorazepam','alprazolam','diazepam','clonazepam','temazepam','oxazepam','triazolam','midazolam'],
      'Opioid':          ['oxycodone','hydrocodone','morphine','codeine','tramadol','fentanyl','hydromorphone','buprenorphine','methadone','tapentadol'],
      'PPI':             ['omeprazole','esomeprazole','pantoprazole','lansoprazole','rabeprazole'],
      'Anticoagulant':   ['warfarin','rivaroxaban','apixaban','dabigatran','edoxaban'],
      'Antiplatelet':    ['aspirin','clopidogrel','ticagrelor','prasugrel'],
      'Corticosteroid':  ['prednisone','prednisolone','dexamethasone','hydrocortisone','methylprednisolone','budesonide'],
      'Antipsychotic':   ['quetiapine','olanzapine','risperidone','haloperidol','aripiprazole','clozapine','ziprasidone'],
    };

    const CLASS_WARN = {
      'NSAID':          { sev:'major',    desc:'Both medications belong to the NSAID (non-steroidal anti-inflammatory) drug class. Combining two NSAIDs significantly increases the risk of gastrointestinal ulcers, GI bleeding, and kidney damage without providing greater pain relief. This combination is not recommended, a Medication Review can identify safer alternatives.' },
      'SSRI':           { sev:'major',    desc:'Both medications are SSRI antidepressants. Combining two SSRIs increases the risk of serotonin syndrome (agitation, tremor, rapid heart rate, high body temperature) and serotonin-related side effects. This combination requires specialist justification, a Medication Review is strongly recommended.' },
      'SNRI':           { sev:'major',    desc:'Both medications are SNRI antidepressants. Duplicate SNRI therapy raises the risk of serotonin syndrome and cardiovascular side effects and is rarely clinically appropriate. A Medication Review is strongly recommended.' },
      'TCA':            { sev:'major',    desc:'Both medications are tricyclic antidepressants (TCAs). Combining two TCAs significantly increases the risk of cardiac arrhythmia, anticholinergic toxicity, and CNS depression. This combination requires urgent review by a prescriber.' },
      'Statin':         { sev:'moderate', desc:'Both medications are statins. Combining two statins is uncommon and may increase the risk of myopathy (muscle pain and weakness). A pharmacist can review whether both are clinically necessary.' },
      'Beta-blocker':   { sev:'major',    desc:'Both medications are beta-blockers. Combining two beta-blockers can cause excessive bradycardia (slow heart rate), hypotension, and heart block. This combination is rarely appropriate without specialist oversight.' },
      'ACE inhibitor':  { sev:'major',    desc:'Both medications are ACE inhibitors. Combining two drugs from the same class offers no added benefit and substantially increases the risk of hypotension, hyperkalemia, and kidney impairment.' },
      'ARB':            { sev:'major',    desc:'Both medications are ARBs (angiotensin receptor blockers). Duplicate ARB therapy provides no benefit and increases the risk of hypotension, hyperkalemia, and acute kidney injury.' },
      'Benzodiazepine': { sev:'major',    desc:'Both medications are benzodiazepines. Combining two benzodiazepines significantly increases the risk of severe CNS and respiratory depression, dangerous sedation, falls, and overdose, especially in older adults.' },
      'Opioid':         { sev:'major',    desc:'Both medications are opioids. Combining opioids greatly increases the risk of respiratory depression, sedation, and potentially fatal overdose. This combination should only be used under close specialist supervision.' },
      'PPI':            { sev:'moderate', desc:'Both medications are proton pump inhibitors (PPIs). Taking two PPIs simultaneously offers no additional benefit and increases unnecessary side-effect exposure. A pharmacist can confirm which one is appropriate.' },
      'Anticoagulant':  { sev:'major',    desc:'Both medications are anticoagulants. Combining anticoagulants dramatically increases the risk of serious or life-threatening bleeding. This combination requires urgent specialist review and monitoring.' },
      'Antiplatelet':   { sev:'major',    desc:'Both medications are antiplatelets. Dual antiplatelet therapy markedly increases bleeding risk. While sometimes clinically intentional (e.g., post-stent), it should be confirmed as appropriate by your prescriber.' },
      'Corticosteroid': { sev:'moderate', desc:'Both medications are corticosteroids (steroids). Combining systemic corticosteroids increases cumulative steroid exposure and associated risks including adrenal suppression, immunosuppression, and metabolic effects.' },
      'Antipsychotic':  { sev:'major',    desc:'Both medications are antipsychotics. Combining antipsychotics increases the risk of QTc prolongation (potentially fatal arrhythmia), metabolic syndrome, and CNS adverse effects. This combination requires specialist justification.' },
    };

    const SEV_ORDER = { contraindicated:0, major:1, moderate:2, minor:3 };
    const SEV_LABEL = (window.I18N && window.I18N.sev) || {
      contraindicated: { label:'⛔ Contraindicated', cls:'sev-contra',  result:'dc-result--contra' },
      major:           { label:'🔴 Major',           cls:'sev-major',   result:'dc-result--major'  },
      moderate:        { label:'🟡 Moderate',         cls:'sev-moderate',result:''                 },
      minor:           { label:'🟢 Minor',            cls:'sev-minor',   result:''                 },
    };

    function norm(s) {
      s = (s||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/\s*\d.*$/,'').trim();
      return ALIAS[s] || s;
    }
    function cap(s)  { return s.charAt(0).toUpperCase()+s.slice(1); }
    function esc(s)  { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    // ── Chips ──
    function renderChips() {
      chipsWrap.innerHTML = '';
      meds.forEach((m,i) => {
        const chip = document.createElement('span');
        chip.className = 'dc-chip';
        const lbl = document.createElement('span');
        lbl.textContent = m.name;
        const x = document.createElement('button');
        x.setAttribute('aria-label','Remove '+m.name);
        x.innerHTML = '&times;';
        x.addEventListener('click', () => { meds.splice(i,1); renderChips(); });
        chip.appendChild(lbl); chip.appendChild(x);
        chipsWrap.appendChild(chip);
      });
      checkBtn.disabled = meds.length < 2;
    }

    // ── Add drug ──
    function addMed(name) {
      name = (name||'').trim();
      if (!name) return;
      if (meds.some(m => m.name.toLowerCase() === name.toLowerCase())) { input.value=''; return; }
      meds.push({ name, cui: null });
      input.value = '';
      sugg.classList.remove('open'); sugg.innerHTML = ''; activeIdx = -1;
      renderChips(); input.focus();
    }

    addBtn.addEventListener('click', () => addMed(input.value));
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      if (q.length < 2) { sugg.classList.remove('open'); sugg.innerHTML=''; return; }
      debounce = setTimeout(() => fetchSugg(q), 200);
    });
    input.addEventListener('keydown', e => {
      const items = sugg.querySelectorAll('li');
      if      (e.key==='ArrowDown') { e.preventDefault(); activeIdx=Math.min(activeIdx+1,items.length-1); hilite(items); }
      else if (e.key==='ArrowUp')   { e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); hilite(items); }
      else if (e.key==='Enter')     { e.preventDefault(); if(activeIdx>=0&&items[activeIdx]) addMed(items[activeIdx].textContent); else addMed(input.value); }
      else if (e.key==='Escape')    { sugg.classList.remove('open'); }
    });
    function hilite(items) { items.forEach((it,i)=>it.classList.toggle('active',i===activeIdx)); }
    document.addEventListener('click', e => { if(!e.target.closest('.dc-autocomplete')) sugg.classList.remove('open'); });

    function fetchSugg(q) {
      fetch('https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms='+encodeURIComponent(q)+'&maxList=8')
        .then(r=>r.json()).then(data => {
          const names = (data[3]||[]).map(r=>Array.isArray(r)?r[0]:r);
          sugg.innerHTML = '';
          if (!names.length) { sugg.classList.remove('open'); return; }
          names.forEach(n => {
            const li = document.createElement('li');
            li.setAttribute('role','option'); li.textContent = n;
            li.addEventListener('click', ()=>addMed(n));
            sugg.appendChild(li);
          });
          activeIdx = -1; sugg.classList.add('open');
        }).catch(()=>sugg.classList.remove('open'));
    }

    clearBtn.addEventListener('click', () => {
      meds=[]; renderChips();
      results.classList.remove('open'); results.innerHTML='';
      const sb=document.getElementById('dc-summary-body'), sc=document.getElementById('dc-summary-cta'), sh=document.querySelector('.dc-summary__hint');
      if(sb) sb.innerHTML=''; if(sc) sc.style.display='none'; if(sh) sh.style.display='';
    });

    checkBtn.addEventListener('click', runCheck);

    // ── Main check ──
    async function runCheck() {
      results.className = 'dc-results open';
      results.innerHTML = '<p class="dc-loading">' + ((window.I18N && window.I18N.ui || {}).dcChecking || 'Checking NLM RxNav database…') + '</p>';

      // 1. Resolve RxCUIs
      await Promise.all(meds.map(async m => {
        if (m.cui) return;
        try {
          const r = await fetch('https://rxnav.nlm.nih.gov/REST/rxcui.json?name='+encodeURIComponent(norm(m.name))+'&search=2');
          const d = await r.json();
          m.cui = d.idGroup?.rxnormId?.[0] || null;
        } catch(e) { m.cui = null; }
      }));

      const cuis = meds.map(m=>m.cui).filter(Boolean);
      let rxPairs = [];

      // 2. RxNav interaction API
      if (cuis.length >= 2) {
        try {
          const r = await fetch('https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis='+cuis.join('+'));
          const d = await r.json();
          rxPairs = parseRxNav(d);
        } catch(e) {}
      }

      // 3. Local DB check
      const localPairs = runLocalCheck();

      // 4. Drug class duplicate check
      const classPairs = runClassCheck();

      // 5. Merge and deduplicate
      const all = mergePairs(rxPairs, [...localPairs, ...classPairs]);

      // 5. Render
      renderResults(all);
    }

    function parseRxNav(d) {
      const out = [];
      const normSev = s => { s=(s||'').toLowerCase(); if(s==='high') return 'major'; if(s==='n/a'||s==='') return null; return s; };
      (d.fullInteractionTypeGroup||[]).forEach(grp => {
        const src = grp.sourceName||'NLM RxNav';
        (grp.fullInteractionType||[]).forEach(fit => {
          const concepts = fit.minConcept||[];
          (fit.interactionPair||[]).forEach(pair => {
            const sev = normSev(pair.severity);
            if (!sev || SEV_ORDER[sev]===undefined) return;
            const ic = pair.interactionConcept||[];
            const names = ic.length>=2
              ? [ic[0].minConceptItem?.name, ic[1].minConceptItem?.name].filter(Boolean)
              : concepts.map(c=>c.name).filter(Boolean);
            if (names.length < 2) return;
            const key = names.map(n=>n.toLowerCase()).sort().join('+');
            out.push({ key, names, sev, desc: pair.description||'', src });
          });
        });
      });
      return out;
    }

    function runLocalCheck() {
      const out = [];
      for (let i=0; i<meds.length; i++) {
        for (let j=i+1; j<meds.length; j++) {
          const a=norm(meds[i].name), b=norm(meds[j].name);
          LOCAL_IX.forEach(ix => {
            const ia=ix.a, ib=ix.b;
            const hit = (fuzzy(a,ia)&&fuzzy(b,ib)) || (fuzzy(a,ib)&&fuzzy(b,ia));
            if (hit) {
              const names=[cap(meds[i].name), cap(meds[j].name)];
              const key=names.map(n=>n.toLowerCase()).sort().join('+');
              out.push({ key, names, sev:ix.sev, desc:ix.desc, src:ix.src });
            }
          });
        }
      }
      return out;
    }

    function runClassCheck() {
      const out = [];
      // Build reverse map: generic name -> set of classes
      const classOf = {};
      for (const [cls, members] of Object.entries(DRUG_CLASSES)) {
        members.forEach(m => { if (!classOf[m]) classOf[m]=[]; classOf[m].push(cls); });
      }
      for (let i=0; i<meds.length; i++) {
        for (let j=i+1; j<meds.length; j++) {
          const a=norm(meds[i].name), b=norm(meds[j].name);
          const ca=classOf[a]||[], cb=classOf[b]||[];
          // Same-class duplicates
          ca.forEach(cls => {
            if (!cb.includes(cls)) return;
            const info=CLASS_WARN[cls]; if (!info) return;
            const names=[cap(meds[i].name), cap(meds[j].name)];
            out.push({ key:'cls:'+cls+':'+names.map(n=>n.toLowerCase()).sort().join('+'),
              names, sev:info.sev, desc:info.desc, src:'Duplicate Drug Class ('+cls+')', isDupClass:true, className:cls });
          });
          // Opioid + Benzodiazepine, FDA Black Box Warning
          if ((ca.includes('Opioid')&&cb.includes('Benzodiazepine'))||(ca.includes('Benzodiazepine')&&cb.includes('Opioid'))) {
            const names=[cap(meds[i].name), cap(meds[j].name)];
            out.push({ key:'opioid-benzo:'+names.map(n=>n.toLowerCase()).sort().join('+'),
              names, sev:'major',
              desc:'Concurrent use of opioids and benzodiazepines carries an FDA and Health Canada Black Box Warning for potentially fatal respiratory depression, coma, and death. Both drug classes suppress CNS and respiratory drive, the combination multiplies this risk, particularly at night and in older adults. This combination requires specialist oversight, lowest effective doses, and a Medication Review.',
              src:'FDA Black Box Warning / Health Canada Drug Safety Communication' });
          }
          // ACE inhibitor + ARB (dual RAAS blockade)
          if ((ca.includes('ACE inhibitor')&&cb.includes('ARB'))||(ca.includes('ARB')&&cb.includes('ACE inhibitor'))) {
            const names=[cap(meds[i].name), cap(meds[j].name)];
            out.push({ key:'raas:'+names.map(n=>n.toLowerCase()).sort().join('+'),
              names, sev:'major', desc:'Combining an ACE inhibitor with an ARB (dual RAAS blockade) is not recommended. This combination significantly increases the risk of hypotension, hyperkalemia, and acute kidney injury without meaningful additional cardiovascular benefit. Major clinical guidelines advise against this combination.', src:'Clinical Pharmacology' });
          }
          // SSRI + SNRI or SSRI + TCA or SNRI + TCA (serotonergic cross-class)
          const seroClasses = ['SSRI','SNRI','TCA'];
          const aInSero = seroClasses.filter(c=>ca.includes(c)), bInSero = seroClasses.filter(c=>cb.includes(c));
          if (aInSero.length && bInSero.length && aInSero[0]!==bInSero[0]) {
            const names=[cap(meds[i].name), cap(meds[j].name)];
            const key='sero:'+names.map(n=>n.toLowerCase()).sort().join('+');
            if (!out.some(x=>x.key===key)) {
              out.push({ key, names, sev:'major',
                desc:'These medications come from different serotonergic antidepressant classes ('+aInSero[0]+' and '+bInSero[0]+'). Combining them significantly increases the risk of serotonin syndrome, a potentially life-threatening condition causing agitation, muscle rigidity, fever, and cardiac instability. This combination requires careful specialist review.',
                src:'Serotonergic Drug Interaction' });
            }
          }
        }
      }
      return out;
    }

    function fuzzy(drug, pattern) {
      if (drug===pattern) return true;
      if (drug.length>3 && pattern.length>3 && (drug.includes(pattern)||pattern.includes(drug))) return true;
      return false;
    }

    function mergePairs(rxnav, local) {
      const seen=new Set(), out=[];
      // local descriptions are more curated; put them first for dedup priority
      [...local,...rxnav].sort((a,b)=>(SEV_ORDER[a.sev]||99)-(SEV_ORDER[b.sev]||99)).forEach(p => {
        const nk = p.names.map(n=>norm(n)).sort().join('+');
        if (!seen.has(nk)) { seen.add(nk); out.push(p); }
      });
      return out;
    }

    function renderResults(pairs) {
      const drugs = meds.map(m=>m.name);
      const dcUrl = 'https://www.drugs.com/drug_interactions.html';
      let html = '';

      if (!pairs.length) {
        const DCUI = (window.I18N && window.I18N.ui || {});
        html += `<div class="dc-result">
          <div class="dc-result__title">${DCUI.dcNoInterTitle || '✅ No known interactions found'}</div>
          <div class="dc-result__text">${(DCUI.dcNoInterBody || 'No interactions were identified between <strong>{DRUGS}</strong> in the NLM RxNav database or our curated reference.<br><br>This does not guarantee these medications are safe to combine in your specific situation. Always confirm with our pharmacists, especially if you are on multiple medications, have kidney or liver conditions, or are pregnant.').replace('{DRUGS}', drugs.map(esc).join(' and '))}</div>
        </div>`;
      } else {
        pairs.forEach(p => {
          const s = SEV_LABEL[p.sev] || { label:p.sev, cls:'sev-minor', result:'' };
          const showCta = p.sev==='contraindicated'||p.sev==='major'||p.sev==='moderate';
          const ctaHtml = showCta
            ? `<div class="dc-result__cta"><a href="#booking" class="dc-result__medscheck-link js-pa-select" data-url="https://app.pharmassess.ca/patient/meds/306667">📋 Book a Medication Review →</a></div>`
            : '';
          html += `<div class="dc-result dc-result--ix ${s.result}">
            <div class="dc-result__header">
              <span class="dc-sev-badge ${s.cls}">${s.label}</span>
              <span class="dc-result__pair">${p.names.map(esc).join(' + ')}</span>
            </div>
            <div class="dc-result__desc">${esc(p.desc)}</div>
            <div class="dc-result__src">Source: ${esc(p.src)}</div>
            ${ctaHtml}
          </div>`;
        });
      }

      html += `<div class="dc-external-link">For a full report, check <a href="${dcUrl}" target="_blank" rel="noopener">Drugs.com Interaction Checker →</a></div>`;
      results.innerHTML = html;
      // Wire per-card medication review links
      results.querySelectorAll('.dc-result__medscheck-link.js-pa-select').forEach(el => {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          const t=document.querySelector('.pa-card[data-url="'+this.dataset.url+'"]');
          if(t){ t.click(); document.getElementById('siteSearch')&&document.getElementById('siteSearch').classList.remove('open'); }
          else { document.getElementById('booking')&&document.getElementById('booking').scrollIntoView({behavior:'smooth'}); }
        });
      });
      renderSummary(pairs, drugs);
    }

    function renderSummary(pairs, drugs) {
      const sb=document.getElementById('dc-summary-body'), sc=document.getElementById('dc-summary-cta'), sh=document.querySelector('.dc-summary__hint');
      if (!sb) return;
      sh.style.display = 'none';
      const contra=pairs.filter(p=>p.sev==='contraindicated').length;
      const major =pairs.filter(p=>p.sev==='major').length;
      const mod   =pairs.filter(p=>p.sev==='moderate').length;
      let html='', showCta=false;
      if (!pairs.length) {
        const DCUI2 = (window.I18N && window.I18N.ui || {});
        html = `<div class="dc-summary__status dc-summary__status--ok">${DCUI2.dcSumOk || '✅ No interactions found'}</div>
          <div class="dc-summary__detail">${(DCUI2.dcSumOkBody || 'NLM RxNav and our curated reference found no known interactions between <strong>{DRUGS}</strong>.<br><br>Always confirm with our pharmacists before making changes to your medications.').replace('{DRUGS}', drugs.map(esc).join(' and '))}</div>`;
      } else {
        const topSev = contra>0 ? 'contraindicated' : major>0 ? 'major' : 'moderate';
        const statusCls = {contraindicated:'dc-summary__status--contra', major:'dc-summary__status--warn', moderate:'dc-summary__status--moderate'}[topSev];
        const DCUI3 = (window.I18N && window.I18N.ui || {});
        const statusLabel = contra>0 ? (DCUI3.dcContra || '⛔ Contraindicated combination') : major>0 ? (DCUI3.dcMajor || '🔴 Major interaction(s) found') : (DCUI3.dcModerate || '🟡 Moderate interaction(s) found');
        html = `<div class="dc-summary__status ${statusCls}">${statusLabel}</div><div class="dc-summary__detail">`;
        if (contra) html += `<strong>${contra} contraindicated</strong> pair${contra>1?'s':''} detected. `;
        if (major)  html += `<strong>${major} major</strong> interaction${major>1?'s':''} detected. `;
        if (mod)    html += `<strong>${mod} moderate</strong> interaction${mod>1?'s':''} detected. `;
        html += `<br><br>A Medication Review with our pharmacist is strongly recommended.</div>`;
        if (contra > 0) {
          sc.innerHTML = `<div class="dc-emergency-alert"><strong>⚠️ If you are currently taking both of these medications, contact your pharmacist or physician immediately.</strong> If you are experiencing symptoms, call 911 or go to the nearest emergency department.</div>
            <a href="tel:+14166548181" class="btn" style="width:100%;text-align:center;margin-top:.75rem;">Call Our Pharmacist: (416) 654-8181</a>
            <div class="dc-pharmacist" style="margin-top:.85rem;">Or <a href="#booking" class="js-pa-select" data-url="https://app.pharmassess.ca/patient/meds/306667">book an urgent medication review</a></div>`;
        } else {
          sc.innerHTML = `<p>We recommend booking a <strong>Medication Review</strong> with our pharmacists, it's covered for eligible Ontario residents through the provincial drug benefit program.</p>
            <a href="#booking" class="btn js-pa-select" data-url="https://app.pharmassess.ca/patient/meds/306667">Book a Medication Review →</a>
            <div class="dc-pharmacist" style="margin-top:.85rem;">Or call us: <a href="tel:+14166548181">(416) 654-8181</a></div>`;
        }
        showCta = true;
      }
      sb.innerHTML = html;
      sc.style.display = showCta ? 'block' : 'none';
      sb.closest('.dc-summary').querySelectorAll('.js-pa-select').forEach(el => {
        el.addEventListener('click', function() {
          const t=document.querySelector('.pa-card[data-url="'+this.dataset.url+'"]');
          if(t) t.click();
        });
      });
    }
  })();

  var ppOverlay = document.getElementById('pp-overlay');
  if (ppOverlay) {
    ppOverlay.addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('open');
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') ppOverlay.classList.remove('open');
    });
  }

  // ── Live Status Board ───────────────────────────────────
  // Recomputes on an interval (not just once at page load) so "Closing in
  // X min" actually counts down live for anyone who leaves the tab open.
  (function(){
    var d, day, mins;
    var LSB = (window.I18N && window.I18N.status) || {};

    function fmt(m) {
      var h = Math.floor(m / 60), mn = m % 60;
      if (LSB.fmt24) return h + ':' + String(mn).padStart(2, '0');
      var ap = h >= 12 ? 'pm' : 'am';
      if (h > 12) h -= 12; if (h === 0) h = 12;
      return h + (mn ? ':' + String(mn).padStart(2,'0') : '') + ' ' + ap;
    }

    function nextOpen(fromDay, openMin) {
      var labels = LSB.days || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      for (var i = 1; i <= 7; i++) {
        var nd = (fromDay + i) % 7;
        if (nd >= 1 && nd <= 6) {
          return (LSB.opens || 'Opens {DAY} at {TIME}').replace('{DAY}', i === 1 ? (LSB.tomorrow || 'tomorrow') : labels[nd]).replace('{TIME}', fmt(openMin));
        }
      }
      return (LSB.opens || 'Opens {DAY} at {TIME}').replace('{DAY}', (LSB.days || ['','Monday'])[1]).replace('{TIME}', fmt(openMin));
    }

    function render(key, openMin, closeMin, verb, typicalOpenMin) {
      var dots = document.querySelectorAll('[data-sb-dot="' + key + '"]');
      var vals = document.querySelectorAll('[data-sb-val="' + key + '"]');
      if (!dots.length && !vals.length) return;
      var isOpen = openMin >= 0 && mins >= openMin && mins < closeMin;
      var left = isOpen ? closeMin - mins : 0;
      var dotClass, valClass, text;

      if (openMin < 0 || !isOpen) {
        dotClass = 'status-dot status-dot--closed';
        valClass = 'status-row__val status-row__val--closed';
        if (openMin >= 0 && mins < openMin) {
          text = (LSB.closedToday || 'Closed · Opens today at {TIME}').replace('{TIME}', fmt(openMin));
        } else {
          text = (LSB.closedPrefix || 'Closed · ') + nextOpen(day, openMin >= 0 ? openMin : typicalOpenMin);
        }
      } else if (left <= 30) {
        dotClass = 'status-dot status-dot--soon';
        valClass = 'status-row__val status-row__val--soon';
        text = (LSB.closingSoon || 'Closing Soon · {N} min left').replace('{N}', left);
      } else {
        dotClass = 'status-dot status-dot--open';
        valClass = 'status-row__val status-row__val--open';
        text = (LSB.until || '{VERB} until {TIME}').replace('{VERB}', verb).replace('{TIME}', fmt(closeMin));
      }

      dots.forEach(function(dot){ dot.className = dotClass; dot.setAttribute('data-sb-dot', key); });
      vals.forEach(function(val){ val.className = valClass; val.setAttribute('data-sb-val', key); val.textContent = text; });
    }

    function update() {
      // Our hours are Toronto hours, so read the Toronto wall clock, not the visitor's. Reading
      // new Date() directly told anyone outside Eastern the wrong thing: a customer in Vancouver at
      // 9:30am Toronto saw "Closed" while this page's schema said Open. Round-tripping through
      // toLocaleString yields a Date whose local fields ARE Toronto's, and it handles DST for free.
      d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
      day = d.getDay(); // 0=Sun, 1-5=Mon-Fri, 6=Sat
      mins = d.getHours() * 60 + d.getMinutes();

      // Store: Mon-Fri 9:00–18:00, Sat 9:00–14:00, Sun closed
      var stO = -1, stC = -1;
      if (day >= 1 && day <= 5) { stO = 9*60; stC = 18*60; }
      else if (day === 6) { stO = 9*60; stC = 14*60; }

      // Order with Uber Eats: Mon-Fri 8:45am-6:30pm, Sat 8:45am-4pm
      var ubO = -1, ubC = -1;
      if (day >= 1 && day <= 5) { ubO = 8*60+45; ubC = 18*60+30; }
      else if (day === 6) { ubO = 8*60+45; ubC = 16*60; }

      render('store', stO, stC, LSB.verbStore || 'Open', 9*60);
      render('uber',  ubO, ubC, LSB.verbUber || 'Accepting Orders', 8*60+45);

      // Highlight today's hours row, colour based on whether store is open right now
      var rowId = (day >= 1 && day <= 5) ? 'hours-row-1' : (day === 6 ? 'hours-row-6' : 'hours-row-0');
      var todayRow = document.getElementById(rowId);
      if (todayRow) {
        document.querySelectorAll('.hours__row.today').forEach(function(r){ r.classList.remove('today', 'open-today', 'closed-today'); });
        todayRow.classList.add('today');
        var storeOpenNow = stO >= 0 && mins >= stO && mins < stC;
        todayRow.classList.add(storeOpenNow ? 'open-today' : 'closed-today');
      }
    }

    update();
    // Recompute every 30s so "Closing Soon · X min left" actually counts down
    // live for anyone who leaves the tab open through closing time.
    setInterval(update, 30000);
  })();

  // ── Service Tabs ──────────────────────────────────────────
  (function(){
    var nav = document.querySelector('.svc-tabs__nav');
    if (!nav) return;
    nav.addEventListener('click', function(e){
      var btn = e.target.closest('.svc-tab__btn');
      if (!btn) return;
      var target = btn.dataset.tab;
      document.querySelectorAll('.svc-tab__btn').forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.svc-tab__panel').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      var panel = document.querySelector('[data-panel="'+target+'"]');
      if (panel) panel.classList.add('active');
      if (target === 'drug-check') { var inp = document.getElementById('dc-input'); if (inp) setTimeout(function(){ inp.focus(); }, 50); }
    });
  })();

  // ── Our Services accordion ────────────────────────────────
  (function(){
    document.querySelectorAll('.svc-acc__head').forEach(function(head){
      head.addEventListener('click', function(){
        var item = head.closest('.svc-acc-item');
        var isOpen = item.classList.toggle('open');
        head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
    window.openAcc = function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.add('open');
      var btn = el.querySelector('.svc-acc__head');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    };
  })();

  // Vaccine availability badges. EDIT HERE to change stock status:
  // key = lowercase text that appears in the vaccine's name; value = status.
  // Any vaccine not listed shows "✓ In Stock". 'seasonal' shows
  // "Seasonal (call to check)".
  var VACCINE_STOCK = {
    'influenza': 'seasonal',
    'covid': 'seasonal'
  };

  // Make vaccine cards clickable, scroll to booking
  document.querySelectorAll('.vaccine-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('a,button')) return;
      var booking = document.getElementById('booking');
      if (booking) booking.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var rx = document.createElement('p');
    rx.className = 'vaccine-card__rx';
    rx.textContent = (window.I18N && window.I18N.ui || {}).vacNoRx || '✓ No prescription required';
    card.appendChild(rx);

    // availability badge
    var nameEl = card.querySelector('.vaccine-card__name');
    var badges = card.querySelector('.vaccine-card__badges');
    if (nameEl && !badges) {
      // travel/private cards have no badge row, create one
      var header = card.querySelector('.vaccine-card__header') || card;
      badges = document.createElement('div');
      badges.className = 'vaccine-card__badges';
      header.appendChild(badges);
    }
    if (nameEl && badges) {
      var name = nameEl.textContent.toLowerCase();
      var status = 'in';
      for (var key in VACCINE_STOCK) {
        if (name.indexOf(key) !== -1) { status = VACCINE_STOCK[key]; break; }
      }
      var b = document.createElement('span');
      if (status === 'seasonal') {
        b.className = 'vaccine-card__badge badge--seasonal';
        b.textContent = (window.I18N && window.I18N.ui || {}).vacSeasonal || 'Seasonal (call to check)';
      } else {
        b.className = 'vaccine-card__badge badge--stock';
        b.textContent = (window.I18N && window.I18N.ui || {}).vacStock || '✓ In Stock';
      }
      badges.appendChild(b);
    }
  });



  // ── Reviews: star fill + count-up animations ──────────────
  (function(){
    var section = document.getElementById('reviews');
    if (!section) return;
    var done = false;

    // Gentle ease-in-out so numbers ramp up slowly and settle gradually.
    function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function fmtNum(n, decimals) {
      if (decimals) return n.toFixed(decimals);
      return Math.floor(n).toLocaleString('en-CA');
    }

    function countUp(el, target, decimals, suffix, duration) {
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var val = target * easeInOut(p);
        el.textContent = fmtNum(val, decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmtNum(target, decimals) + suffix;
      }
      requestAnimationFrame(step);
    }

    function run() {
      if (done) return;
      done = true;
      // Stars fill, animate all (Google + Uber)
      section.querySelectorAll('.reviews-stars-fill').forEach(function(fill) {
        fill.classList.add('anim');
      });
      // Count-up numbers
      section.querySelectorAll('.js-countup').forEach(function(el) {
        var target   = parseFloat(el.dataset.target);
        var decimals = parseInt(el.dataset.decimals || '0');
        var suffix   = el.dataset.suffix || '';
        countUp(el, target, decimals, suffix, 3200);
      });
      // Staggered slide-in for metric cards
      section.querySelectorAll('.reviews-metric').forEach(function(card, i) {
        card.style.animationDelay = (i * 0.1) + 's';
        card.classList.add('rv-in');
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) run();
      }, { threshold: 0.15 }).observe(section);
    } else {
      run();
    }
  })();

  // ── Team: experience stat count-up + reveal ───────────────
  (function(){
    var stat = document.querySelector('.team-stat');
    var numEl = document.querySelector('.js-team-countup');
    if (!stat || !numEl) return;
    var done = false;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function run() {
      if (done) return;
      done = true;
      stat.classList.add('team-stat--in');
      var target = parseInt(numEl.dataset.target, 10);
      var start = null, duration = 1800;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        numEl.textContent = Math.floor(target * easeOut(p));
        if (p < 1) requestAnimationFrame(step);
        else numEl.textContent = target;
      }
      requestAnimationFrame(step);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) run();
      }, { threshold: 0.35 }).observe(stat);
    } else {
      run();
    }
  })();

  // ── Smart Symptom Search ──────────────────────────────────
  function escapeSearchRx(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlightSearchTerms(text, terms){
    var out = text;
    terms.forEach(function(t){
      if (!t) return;
      out = out.replace(new RegExp('(' + escapeSearchRx(t) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }
  var AILMENT_DB = window.AILMENT_DB || [];
  var PHARMA_BASE = window.PHARMA_BASE || 'https://app.pharmassess.ca/self-assessment/306667?diagnosisName=true&diagnosisId=';

  function scoreAilment(ailment, query) {
    return window.SmartMatch.score({ title: ailment.name, kw: ailment.kw.join(' ') }, query);
  }

  // Score a Service/Tool/FAQ item from the shared SITE_INDEX so queries like
  // "quit smoking" or "medication review" surface the relevant service or
  // FAQ answer here too, not just conditions in AILMENT_DB.
  function scoreSmartSiteItem(item, query) {
    return window.SmartMatch.score({ title: item.title, kw: item.kw || '', desc: item.desc || '' }, query);
  }

  function renderSmartResults(scope, query) {
    var resultsEl = document.getElementById('smartsearch-results-' + scope);
    var triageEl = document.getElementById('ailments-triage-' + scope);
    var sectionsEls = document.querySelectorAll('.ailments-cat-section[data-triage-scope="' + scope + '"]');
    var clearBtn = document.querySelector('#smartsearch-' + scope + ' .ailments-smartsearch__clear');
    if (!query || query.length < 2) {
      resultsEl.classList.remove('has-results');
      resultsEl.innerHTML = '';
      triageEl.style.display = '';
      sectionsEls.forEach(function(s) { s.style.display = s.classList.contains('ailments-cat--topic-only') ? 'none' : ''; });
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }
    if (clearBtn) clearBtn.style.display = '';
    var scored = AILMENT_DB.map(function(a) { return { a:a, score:scoreAilment(a, query) }; })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a,b) { return b.score - a.score; })
      .slice(0, 8);
    var siteIdx = (typeof SITE_INDEX !== 'undefined') ? SITE_INDEX : [];
    var svcScored = siteIdx.filter(function(it) { return it.tag === 'Service' || it.tag === 'Tool'; })
      .map(function(it) { return { it:it, score:scoreSmartSiteItem(it, query) }; })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a,b) { return b.score - a.score; })
      .slice(0, 4);
    var faqScored = siteIdx.filter(function(it) { return it.tag === 'FAQ'; })
      .map(function(it) { return { it:it, score:scoreSmartSiteItem(it, query) }; })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a,b) { return b.score - a.score; })
      .slice(0, 4);
    triageEl.style.display = 'none';
    sectionsEls.forEach(function(s) { s.style.display = 'none'; });
    if (!scored.length && !svcScored.length && !faqScored.length) {
      var UI3 = (window.I18N && window.I18N.ui) || {};
      resultsEl.innerHTML = '<div class="ailments-smartsearch__none">' + (UI3.noResults || 'No results matched "<strong>{Q}</strong>".<br>Try broader terms or browse by category below.').replace('{Q}', query) + '</div>';
      resultsEl.classList.add('has-results');
      triageEl.style.display = '';
      sectionsEls.forEach(function(s) { s.style.display = s.classList.contains('ailments-cat--topic-only') ? 'none' : ''; });
      return;
    }
    var queryWords = query.toLowerCase().split(/\s+/).filter(function(w) { return w.length >= 2; });
    var html = '';
    if (scored.length) {
      html += '<div class="ailments-smartsearch__divider">Conditions matching "' + query + '"</div>';
      scored.forEach(function(x) {
        var a = x.a;
        var href = a.call ? 'tel:+14166548181' : '#booking';
        var dataUrl = a.call ? '' : ' data-url="' + PHARMA_BASE + a.id + '"';
        html += '<button class="ailments-smartsearch__hit js-smart-hit" data-href="' + href + '"' + dataUrl + ' data-name="' + a.name + '" data-call="' + (a.call?'1':'') + '">'
          + '<span class="ailments-smartsearch__hit-icon">' + a.icon + '</span>'
          + '<span class="ailments-smartsearch__hit-body">'
          + '<span class="ailments-smartsearch__hit-name">' + highlightSearchTerms(a.name, queryWords) + '</span>'
          + '<span class="ailments-smartsearch__hit-kw">' + (a.call ? 'Call us for treatment options' : 'Start pharmacist assessment online') + '</span>'
          + '</span>'
          + '<span class="ailments-smartsearch__hit-arrow">›</span>'
          + '</button>';
      });
    }
    if (svcScored.length) {
      html += '<div class="ailments-smartsearch__divider">Services &amp; vaccines matching "' + query + '"</div>';
      svcScored.forEach(function(x) {
        var it = x.it;
        html += '<button class="ailments-smartsearch__hit js-smart-svc-hit" data-anchor="' + (it.anchor || '') + '" data-open="' + (it.open || '') + '" data-url="' + (it.url || '') + '">'
          + '<span class="ailments-smartsearch__hit-icon">' + it.icon + '</span>'
          + '<span class="ailments-smartsearch__hit-body">'
          + '<span class="ailments-smartsearch__hit-name">' + highlightSearchTerms(it.title, queryWords) + '</span>'
          + '<span class="ailments-smartsearch__hit-kw">' + it.desc + '</span>'
          + '</span>'
          + '<span class="ailments-smartsearch__hit-arrow">›</span>'
          + '</button>';
      });
    }
    if (faqScored.length) {
      html += '<div class="ailments-smartsearch__divider">Frequently Asked Questions (FAQ) matching "' + query + '"</div>';
      faqScored.forEach(function(x) {
        var it = x.it;
        html += '<button class="ailments-smartsearch__hit js-smart-faq-hit" data-title="' + it.title + '">'
          + '<span class="ailments-smartsearch__hit-icon">' + it.icon + '</span>'
          + '<span class="ailments-smartsearch__hit-body">'
          + '<span class="ailments-smartsearch__hit-name">' + highlightSearchTerms(it.title, queryWords) + '</span>'
          + '<span class="ailments-smartsearch__hit-kw">' + it.desc + '</span>'
          + '</span>'
          + '<span class="ailments-smartsearch__hit-arrow">›</span>'
          + '</button>';
      });
    }
    resultsEl.innerHTML = html;
    resultsEl.classList.add('has-results');
    // Wire up condition hit buttons
    resultsEl.querySelectorAll('.js-smart-hit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var call = this.dataset.call === '1';
        var url = this.dataset.url;
        if (call) { window.location.href = 'tel:+14166548181'; return; }
        // Open assessment in pa-iframe
        var paWrap = document.getElementById('pa-wrap');
        var paIframe = document.getElementById('pa-iframe');
        var paLabel = document.getElementById('pa-iframe-label-text');
        if (paWrap && paIframe && url) {
          paIframe.src = url;
          paIframe.style.height = '900px';
          if (paLabel) paLabel.textContent = '🩺 ' + this.dataset.name + ((window.I18N && window.I18N.ui || {}).assessSuffix || ', Assessment');
          if (window.setPaHint) window.setPaHint('');
          if (paWrap) { paWrap.style.display = ''; paWrap.classList.remove('collapsed'); }
          document.querySelectorAll('.pa-card').forEach(function(c) { c.classList.remove('active'); });
        }
        var bookingEl = document.getElementById('booking');
        if (bookingEl) bookingEl.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
    // Wire up service/vaccine hit buttons
    resultsEl.querySelectorAll('.js-smart-svc-hit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var anchor = this.dataset.anchor;
        var openId = this.dataset.open;
        var url = this.dataset.url;
        if (url) { window.location.href = url; return; }
        var off = window.paOffPageHref(anchor, openId);
        if (off) { window.location.href = off; return; }
        if (openId && window.openAcc) {
          window.openAcc(openId);
          setTimeout(function() { var el = document.getElementById(openId); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }, 120);
        } else if (anchor) {
          var el = document.querySelector(anchor); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      });
    });
    // Wire up FAQ hit buttons, scroll to FAQ section and run its search for this question
    resultsEl.querySelectorAll('.js-smart-faq-hit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var title = this.dataset.title;
        var faqSection = document.getElementById('faq');
        if (faqSection) faqSection.scrollIntoView({ behavior:'smooth', block:'start' });
        setTimeout(function() {
          var faqInput = document.getElementById('faqSearchInput');
          if (!faqInput) return;
          faqInput.value = title;
          faqInput.dispatchEvent(new Event('input'));
          setTimeout(function() {
            var best = document.querySelector('.faq-best-match');
            if (best) best.scrollIntoView({ behavior:'smooth', block:'start' });
          }, 350);
        }, 450);
      });
    });
  }

  document.querySelectorAll('.ailments-smartsearch__input').forEach(function(inp) {
    var debounce;
    inp.addEventListener('input', function() {
      clearTimeout(debounce);
      var scope = this.dataset.scope;
      var val = this.value.trim();
      debounce = setTimeout(function() { renderSmartResults(scope, val); }, 180);
    });
    inp.addEventListener('keydown', function(e) {
      var scope = this.dataset.scope;
      if (e.key === 'Escape') {
        if (this.value) { this.value = ''; renderSmartResults(scope, ''); }
        else { this.blur(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(debounce);
        renderSmartResults(scope, this.value.trim());
        var resultsEl = document.getElementById('smartsearch-results-' + scope);
        var firstHit = resultsEl && resultsEl.querySelector('.ailments-smartsearch__hit');
        if (firstHit) firstHit.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
  document.querySelectorAll('.ailments-smartsearch__clear').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var wrap = this.closest('.ailments-smartsearch');
      var inp = wrap.querySelector('.ailments-smartsearch__input');
      inp.value = '';
      inp.dispatchEvent(new Event('input'));
      inp.focus();
    });
  });

  // ── Site-Wide Search ──────────────────────────────────────
  var SITE_INDEX = (window.SITE_INDEX_CORE || []).concat(AILMENT_DB.map(function(a) {
    var UI = (window.I18N && window.I18N.ui) || {};
    return { icon:a.icon, title:a.name, desc: a.call ? (UI.condCall || 'Minor ailment, call us for treatment options') : (UI.condRx || 'Minor ailment, pharmacist can prescribe'), tag:'Condition', anchor:'#booking', ailmentUrl: a.call ? null : (PHARMA_BASE + a.id), kw: a.kw.join(' ') };
  })).concat((window.FAQS || []).map(function(f) {
    var plain = document.createElement('div');
    plain.innerHTML = f.a;
    var body = (plain.textContent || '').trim().replace(/&/g, '&amp;');
    return { icon: f.icon || '❓', title: f.q, desc: body.length > 110 ? body.slice(0, 110) + '…' : body, tag:'FAQ', anchor:'#faq', isFaq:true, kw: body };
  }));

  // Expose the condition/service data so the FAQ search bar (a separate
  // script block) can surface matching conditions and services too.
  window.AILMENT_DB = AILMENT_DB;
  window.SITE_INDEX = SITE_INDEX;
  window.PHARMA_BASE = PHARMA_BASE;

  var siteOverlay = document.getElementById('siteSearch');
  var siteInput = document.getElementById('siteSearchInput');
  var siteResults = document.getElementById('siteSearchResults');
  var siteDebounce;
  var siteActiveIdx = -1;
  function siteHilite(){
    var items = siteResults.querySelectorAll('.site-search__result');
    items.forEach(function(it, i){ it.classList.toggle('active', i === siteActiveIdx); });
    if (siteActiveIdx >= 0 && items[siteActiveIdx]) items[siteActiveIdx].scrollIntoView({ block: 'nearest' });
  }

  function openSiteSearch() {
    siteOverlay.classList.add('open');
    siteInput.value = '';
    siteActiveIdx = -1;
    siteResults.innerHTML = '<div class="site-search__tip">' + ((window.I18N && window.I18N.ui && window.I18N.ui.searchTip) || 'Type to search conditions, services, vaccines, FAQ and more.') + '</div>';
    setTimeout(function() { siteInput.focus(); }, 60);
    document.body.style.overflow = 'hidden';
  }
  function closeSiteSearch() {
    siteOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'), '<mark>$1</mark>');
  }

  function scoreSiteItem(item, query) {
    return window.SmartMatch.score({ title: item.title, kw: item.kw || '', desc: item.desc || '' }, query);
  }

  function renderSiteSearch(query) {
    siteActiveIdx = -1;
    if (!query || query.length < 2) {
      siteResults.innerHTML = '<div class="site-search__tip">' + ((window.I18N && window.I18N.ui && window.I18N.ui.searchTip) || 'Type to search conditions, services, vaccines, FAQ and more.') + '</div>';
      return;
    }
    var scored = SITE_INDEX.map(function(item) { return { item:item, score:scoreSiteItem(item, query) }; })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a,b) { return b.score - a.score; })
      .slice(0, 12);
    if (!scored.length) {
      siteResults.innerHTML = '<div class="site-search__empty">' + ((window.I18N && window.I18N.ui || {}).searchEmpty || 'No results for "<strong>{Q}</strong>". Try different keywords.').replace('{Q}', query) + '</div>';
      return;
    }
    // Group by tag
    var byTag = {};
    scored.forEach(function(x) {
      var tag = x.item.tag;
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(x.item);
    });
    // Always show conditions first, then the actionable services/tools, then
    // FAQ, then everything else, so the ordering is coherent, not whatever
    // order the top-scored items happened to fall in.
    var TAG_ORDER = ['Condition', 'Service', 'Tool', 'Shop', 'FAQ', 'Help', 'About', 'Contact', 'Blog'];
    var tagsOrdered = TAG_ORDER.filter(function(t){ return byTag[t]; })
      .concat(Object.keys(byTag).filter(function(t){ return TAG_ORDER.indexOf(t) === -1; }));
    var html = '';
    tagsOrdered.forEach(function(tag) {
      var TAGH = (window.I18N && window.I18N.tagHeads) || {};
      var TAGC = (window.I18N && window.I18N.tagChips) || {};
      var catLabel = TAGH[tag] || (tag === 'FAQ' ? 'Frequently Asked Questions (FAQ)' : (tag === 'Condition' ? 'Conditions' : (tag === 'Service' ? 'Services' : tag)));
      html += '<div class="site-search__category">' + catLabel + '</div>';
      byTag[tag].forEach(function(item) {
        html += '<button class="site-search__result js-site-result" data-anchor="' + (item.anchor||'') + '" data-url="' + (item.url||'') + '" data-open="' + (item.open||'') + '" data-ailment-url="' + (item.ailmentUrl||'') + '" data-faq="' + (item.isFaq ? '1' : '') + '" data-title="' + item.title + '">'
          + '<span class="site-search__result-icon">' + item.icon + '</span>'
          + '<span class="site-search__result-body">'
          + '<span class="site-search__result-title">' + highlightMatch(item.title, query) + '</span>'
          + '<span class="site-search__result-desc">' + item.desc + '</span>'
          + '</span>'
          + '<span class="site-search__result-tag">' + (TAGC[tag] || tag) + '</span>'
          + '</button>';
      });
    });
    siteResults.innerHTML = html;
    siteResults.querySelectorAll('.js-site-result').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var anchor = this.dataset.anchor;
        var url = this.dataset.url;
        var openId = this.dataset.open;
        var ailmentUrl = this.dataset.ailmentUrl;
        var isFaq = this.dataset.faq === '1';
        var title = this.dataset.title;
        closeSiteSearch();
        if (url) { window.location.href = url; return; }
        if (isFaq && !document.getElementById('faq')) { window.location.href = (document.documentElement.getAttribute('data-base') || '') + '/faq'; return; }
        if (!isFaq && !ailmentUrl) {
          var off = window.paOffPageHref(anchor, openId);
          if (off) { window.location.href = off; return; }
        }
        if (isFaq) {
          var faqSection = document.getElementById('faq');
          if (faqSection) faqSection.scrollIntoView({ behavior:'smooth', block:'start' });
          setTimeout(function() {
            var faqInput = document.getElementById('faqSearchInput');
            if (!faqInput) return;
            faqInput.value = title;
            faqInput.dispatchEvent(new Event('input'));
            setTimeout(function() {
              var best = document.querySelector('.faq-best-match');
              if (best) best.scrollIntoView({ behavior:'smooth', block:'start' });
            }, 350);
          }, 450);
          return;
        }
        if (ailmentUrl) {
          var paWrap = document.getElementById('pa-wrap');
          var paIframe = document.getElementById('pa-iframe');
          var paLabel = document.getElementById('pa-iframe-label-text');
          if (paWrap && paIframe) {
            paIframe.src = ailmentUrl;
            paIframe.style.height = '900px';
            if (paLabel) paLabel.textContent = '🩺 ' + this.dataset.title + ((window.I18N && window.I18N.ui || {}).assessSuffix || ', Assessment');
            if (window.setPaHint) window.setPaHint('');
            if (paWrap) { paWrap.style.display = ''; paWrap.classList.remove('collapsed'); }
            document.querySelectorAll('.pa-card').forEach(function(c) { c.classList.remove('active'); });
          }
        }
        if (openId && window.openAcc) { setTimeout(function() { window.openAcc(openId); }, 300); }
        if (anchor) { var el = document.querySelector(anchor); if (el) setTimeout(function() { el.scrollIntoView({ behavior:'smooth', block:'start' }); }, openId ? 400 : 100); }
      });
    });
  }

  (function() {
    var WELCOME_KEY = 'welcomeModalDismissedUntil_v2';
    var SNOOZE_MS = 24 * 60 * 60 * 1000; // re-show after 1 day
    var overlay = document.getElementById('welcomeModal');
    var closeBtn = document.getElementById('welcomeModalClose');
    var laterBtn = document.getElementById('welcomeModalLater');
    var cta = document.getElementById('welcomeModalCta');
    if (!overlay) return;
    function closeWelcome() {
      overlay.classList.remove('open');
      try { localStorage.setItem(WELCOME_KEY, String(Date.now() + SNOOZE_MS)); } catch (e) {}
      // Release the gated scroll reveals now that the popup no longer covers
      // the page (tw script). hero-go is normally set before the popup opens;
      // adding it here is a safety net for any other open path.
      document.documentElement.classList.add('hero-go');
      try { document.dispatchEvent(new CustomEvent('welcome:dismissed')); } catch (e) {}
    }
    var snoozedUntil = 0;
    try { snoozedUntil = parseInt(localStorage.getItem(WELCOME_KEY), 10) || 0; } catch (e) {}
    if (Date.now() > snoozedUntil) {
      // Play the full hero entrance first (logo, name, tagline, address,
      // socials, status float in over ~1.2s), then bring the popup up after
      // a beat so the entrance is never hidden behind the overlay.
      document.documentElement.classList.add('hero-go');
      setTimeout(function() { overlay.classList.add('open'); }, 2300);
    }
    closeBtn.addEventListener('click', closeWelcome);
    if (laterBtn) laterBtn.addEventListener('click', closeWelcome);
    overlay.querySelectorAll('.welcome-modal__tag').forEach(function(tag) {
      tag.addEventListener('click', closeWelcome);
    });
    cta.addEventListener('click', function() {
      closeWelcome();
      setTimeout(function() {
        if (window.openAcc) window.openAcc('acc-ailments');
        var el = document.getElementById('acc-ailments');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeWelcome(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeWelcome();
    });
  })();

  document.getElementById('navSearchBtn').addEventListener('click', openSiteSearch);

  // Language globe: toggle the flag popover (works on desktop click + mobile tap)
  (function(){
    var wrap = document.getElementById('navLang'),
        btn = document.getElementById('navLangBtn');
    if (!wrap || !btn) return;
    function close(){ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){ if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  })();

  document.getElementById('siteSearchClose').addEventListener('click', closeSiteSearch);
  siteOverlay.addEventListener('click', function(e) { if (e.target === siteOverlay) closeSiteSearch(); });
  siteInput.addEventListener('input', function() {
    clearTimeout(siteDebounce);
    var q = this.value.trim();
    siteDebounce = setTimeout(function() { renderSiteSearch(q); }, 180);
  });
  siteInput.addEventListener('keydown', function(e) {
    var items = siteResults.querySelectorAll('.site-search__result');
    if (e.key === 'ArrowDown') {
      if (!items.length) return;
      e.preventDefault();
      siteActiveIdx = Math.min(siteActiveIdx + 1, items.length - 1);
      siteHilite();
    } else if (e.key === 'ArrowUp') {
      if (!items.length) return;
      e.preventDefault();
      siteActiveIdx = Math.max(siteActiveIdx - 1, 0);
      siteHilite();
    } else if (e.key === 'Enter') {
      if (!items.length) return;
      e.preventDefault();
      var target = items[siteActiveIdx >= 0 ? siteActiveIdx : 0];
      if (target) target.click();
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && siteOverlay.classList.contains('open')) closeSiteSearch();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSiteSearch(); }
  });

  // ── Keep URL hash-free so browser scroll restoration works on refresh ──
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    e.preventDefault();
    if (hash === '#home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var target = document.getElementById(hash.slice(1));
    if (!target) return;
    if (!a.hasAttribute('onclick')) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // ── Cloud drift, driven by JS (not CSS @keyframes) so it can't be silently
  //    disabled by a browser's animation engine, reduced-motion override, or
  //    power-saving mode, these clouds are purely decorative (aria-hidden).
  //    Self-throttling: caps to ~24fps (plenty for a 77-175s drift) and, if it
  //    detects even a handful of real frame drops (a genuinely slow/older
  //    machine, not just a one-off hiccup), quickly drops to showing only a
  //    third of the clouds at ~12fps so this decorative layer never competes
  //    with real interaction (scroll/clicks) for the CPU on weaker hardware.
  //    Fully paused while the tab isn't visible so it costs nothing in the
  //    background.
  (function() {
    var els = document.querySelectorAll('.nav__cloud, .hero__cloud, .sky-bg-cloud');
    var items = [];
    els.forEach(function(el) {
      var dur = parseFloat(el.dataset.dur);
      var delay = parseFloat(el.dataset.delay) || 0;
      if (!dur) return;
      el.style.animation = 'none';
      // Cloud images render far wider than the (esp. mobile) viewport, some
      // are 2-3x the screen width, so a fixed "-60vw" start is nowhere near
      // off-screen for them; the whole image still covers the viewport there.
      // Measure each cloud's real rendered width so its entrance start point
      // is genuinely beyond its own left edge, however big it is.
      var widthVw = el.getBoundingClientRect().width / window.innerWidth * 100;
      items.push({ el: el, dur: dur, delay: delay, flip: el.className.indexOf('--flip') !== -1, widthVw: widthVw });
    });
    if (!items.length) return;
    var minInterval = 1000 / 24;
    // On load, clouds glide in from off-screen-left over ENTER_DUR instead of
    // materializing already mid-flight, without this they'd just sit still
    // and fade into view in place, which reads as "popping in" rather than
    // drifting in (most noticeable on mobile, where fewer clouds are shown).
    // Matches the 3s container opacity fade (cloud-layer-in) with an
    // ease-in-out curve so the slide-in is synced with becoming visible, 
    // an ease-out curve here front-loads the travel into the almost-
    // invisible opening moment, so by the time it's visible enough to see,
    // it's already nearly arrived and barely moving.
    var ENTER_DUR = 3;
    function easeInOutQuad(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    var lastFrame = 0, lastDelta = 0, slowStreak = 0, powerSaveOn = false, origin = null, running = false;
    function enterPowerSave() {
      if (powerSaveOn) return;
      powerSaveOn = true;
      minInterval = 1000 / 12;
      items.forEach(function(it, i) { if (i % 3 !== 0) it.el.style.display = 'none'; });
    }
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) return;
      // Coming back from a hidden tab: re-anchor the origin so clouds don't
      // jump-snap to wherever they "would have" drifted while paused.
      origin = null;
      lastFrame = 0;
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
    function tick(now) {
      if (document.hidden) { running = false; return; }
      if (origin === null) origin = now;
      if (now - lastFrame < minInterval) { requestAnimationFrame(tick); return; }
      if (lastDelta) {
        var gap = now - lastDelta;
        slowStreak = gap > 70 ? slowStreak + 1 : Math.max(0, slowStreak - 1);
        if (slowStreak > 5) enterPowerSave();
      }
      lastDelta = now;
      lastFrame = now;
      var t = (now - origin) / 1000;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.el.style.display === 'none') continue;
        var prog = (((t - it.delay) % it.dur) + it.dur) % it.dur / it.dur;
        var vw = -60 + prog * 180;
        if (t < ENTER_DUR) {
          var p = easeInOutQuad(t / ENTER_DUR);
          var startVw = -(it.widthVw + 15);
          vw = startVw + (vw - startVw) * p;
        }
        it.el.style.transform = 'translateX(' + vw.toFixed(2) + 'vw)' + (it.flip ? ' scaleX(-1)' : '');
      }
      requestAnimationFrame(tick);
    }
    running = true;
    requestAnimationFrame(tick);
  })();

  // ── Nav: clouds always drift; background fades in progressively as hero scrolls away,
  //    then stays as frosted glass (semi-transparent + blur) throughout the whole site ──
  //    Scroll events can fire far more often than the screen repaints, and the
  //    backdrop blur is one of the more GPU-costly styles on weak hardware, so
  //    this is rAF-throttled to at most once per frame, and skipped entirely
  //    once the fade has settled (the common case for the rest of the page).
  (function() {
    var nav = document.getElementById('nav');
    var hero = document.getElementById('home');
    var tcMeta = document.querySelector('meta[name="theme-color"]');
    var navClouds = nav.querySelector('.nav__clouds');
    var lastA = -1;
    function updateNav() {
      var scrollY = window.scrollY || window.pageYOffset;
      var heroH = hero ? hero.offsetHeight : 0;
      // a goes 0→1 as user scrolls; complete before hero logo reaches the nav (~20% of hero height)
      var a = heroH < 1 ? 1 : Math.max(0, Math.min(1, scrollY / (heroH * 0.20)));
      if (Math.abs(a - lastA) < 0.001) return;
      lastA = a;
      // Fades to fully opaque so it matches the browser chrome colour exactly, no seam
      nav.style.background = 'rgba(182,236,239,' + a.toFixed(3) + ')';
      var blur = a > 0.01 ? 'blur(' + (14 * a).toFixed(1) + 'px)' : '';
      nav.style.backdropFilter = blur;
      nav.style.webkitBackdropFilter = blur;
      nav.style.borderBottomColor = 'rgba(33,161,168,' + (0.22 * a).toFixed(3) + ')';
      nav.style.boxShadow = a > 0.05 ? '0 1px 14px rgba(0,80,90,' + (0.06 * a).toFixed(3) + ')' : 'none';
      // Fade nav clouds in with the glass
      if (navClouds) navClouds.style.opacity = a.toFixed(3);
      // Sync browser chrome (iOS/Android theme-color) to match nav frosting
      if (tcMeta) {
        var r = Math.round(235 + (182 - 235) * a);
        var g = Math.round(251 + (236 - 251) * a);
        var b = Math.round(252 + (239 - 252) * a);
        tcMeta.setAttribute('content', 'rgb(' + r + ',' + g + ',' + b + ')');
      }
    }
    var navTicking = false;
    function onScrollOrResize() {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(function() { updateNav(); navTicking = false; });
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    updateNav();
  })();

  // ── Clean section URLs: hash → clean path conversion + scrollspy ─────
  // ── Section URLs, deep links & sub-section accordion tracking ───────
  (function(){
    // Standalone pages (data-page attr, e.g. /portal/) own their URL: the
    // homepage scrollspy would rewrite it to /booking and break the page.
    if (document.documentElement.hasAttribute('data-page')) return;
    var SEC_PATH={
      'home':'/','welcome':'/welcome','booking':'/booking','services':'/services',
      'drug-checker':'/drug-checker','team':'/team','reviews':'/reviews',
      'contact':'/contact','about':'/about','faq':'/faq'
    };
    var SEC_IDS=['home','welcome','booking','services','drug-checker','team','reviews','contact','about','faq'];
    var ACC_PATH={
      'acc-med-reviews':'/medication-reviews','acc-ailments':'/conditions',
      'acc-vaccines':'/vaccines','acc-cessation':'/smoking-cessation',
      'acc-naloxone':'/naloxone','acc-transfer':'/transfer',
      'acc-poct':'/testing','acc-insurance':'/insurance','acc-referrals':'/referrals'
    };
    var COND_PATH={
      '22':'/pink-eye','41':'/dry-eye','25':'/allergic-rhinitis','38':'/nasal-congestion',
      '18':'/oral-thrush','3':'/cold-sores','6':'/canker-sores','12':'/mild-headache',
      '13':'/acne','26':'/eczema','44':'/dandruff','2':'/impetigo',
      '9':'/ringworm','46':'/warts','65':'/head-lice','10':'/athletes-foot',
      '45':'/calluses','8':'/jock-itch','24':'/heartburn','4':'/hemorrhoids',
      '43':'/pinworms','21':'/sprains','20':'/period-pain','42':'/yeast-infection',
      '30':'/nausea-pregnancy','23':'/uti','19':'/insect-bites','49':'/tick-bites'
    };
    var DL_ACC={
      'med-reviews':'acc-med-reviews','conditions':'acc-ailments',
      'vaccines':'acc-vaccines','cessation':'acc-cessation',
      'naloxone':'acc-naloxone','transfer':'acc-transfer',
      'poct':'acc-poct','insurance':'acc-insurance','referrals':'acc-referrals'
    };

    // Language pages set data-base="/es" etc. on <html> so clean URLs
    // stay inside the language directory (refresh must not land on /).
    var BASE=document.documentElement.getAttribute('data-base')||'';
    var lastPath=location.pathname,ticking=false;
    function setPath(p){p=BASE+(p==='/'&&BASE?'/':p);if(p!==lastPath){history.replaceState(null,'',p);lastPath=p;}}

    function applyHash(h){if(h&&SEC_PATH[h])setPath(SEC_PATH[h]);}
    var initHash=location.hash.replace('#','');
    applyHash(initHash);
    window.addEventListener('hashchange',function(){applyHash(location.hash.replace('#',''));});
    window.addEventListener('beforeunload',function(){
      try{sessionStorage.setItem('__scrollY',String(window.scrollY));}catch(e){}
    });
    window.addEventListener('load',function(){
      if(dlA)return;
      var savedY;
      try{savedY=sessionStorage.getItem('__scrollY');sessionStorage.removeItem('__scrollY');}catch(e){}
      if(savedY!==null&&savedY!==undefined&&savedY!==''){
        window.scrollTo(0,parseInt(savedY,10));
      }else if(initHash){
        var el=document.getElementById(initHash);
        if(el)el.scrollIntoView({behavior:'auto',block:'start'});
      }
    });

    function tick(){
      ticking=false;
      var threshold=window.innerHeight*0.4,cur=SEC_IDS[0];
      for(var i=0;i<SEC_IDS.length;i++){
        var el=document.getElementById(SEC_IDS[i]);
        if(el&&el.getBoundingClientRect().top<=threshold)cur=SEC_IDS[i];
      }
      var p=SEC_PATH[cur]||'/';
      if(cur==='booking'||cur==='services'){
        var sec=document.getElementById(cur);
        if(sec){var oa=sec.querySelector('[id].open');if(oa&&ACC_PATH[oa.id])p=ACC_PATH[oa.id];}
      }
      setPath(p);
    }
    window.addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(tick);},{passive:true});

    var _orig=window.openAcc;
    if(_orig){
      window.openAcc=function(id){
        _orig(id);
        if(ACC_PATH[id])setPath(ACC_PATH[id]);
      };
    }

    document.addEventListener('click',function(e){
      var el=e.target.closest&&e.target.closest('.js-condition');
      if(!el)return;
      var u=el.getAttribute('data-url')||'',m=u.match(/diagnosisId=(\d+)/);
      if(m&&COND_PATH[m[1]])setPath(COND_PATH[m[1]]);
    });

    var dlA,dlP;
    try{dlA=sessionStorage.getItem('__dlA');dlP=sessionStorage.getItem('__dlP');
      if(dlA){sessionStorage.removeItem('__dlA');sessionStorage.removeItem('__dlP');}
    }catch(e){}
    if(dlA){
      function handleDL(){
        var bk=document.getElementById('booking');
        if(bk)bk.scrollIntoView({behavior:'smooth',block:'start'});
        if(dlA.indexOf('cond-')===0){
          var dId=dlA.slice(5);
          if(typeof window.openAcc==='function')window.openAcc('acc-ailments');
          setTimeout(function(){
            var c=document.querySelector('[data-url*="diagnosisId='+dId+'"]');
            if(c)c.scrollIntoView({behavior:'smooth',block:'center'});
          },400);
          if(dlP)setPath(dlP);
        }else if(DL_ACC[dlA]){
          if(typeof window.openAcc==='function')window.openAcc(DL_ACC[dlA]);
          if(dlP)setPath(dlP);
        }
      }
      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',function(){setTimeout(handleDL,200);});
      }else{setTimeout(handleDL,200);}
    }
  })();

  // ── Transit/Parking logo scroll + highlight ───────────────
  function goToCard(id, subId) {
    var el = document.getElementById(id);
    if (!el) return;
    var target = (subId && document.getElementById(subId)) || el;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.classList.remove('info-strip__card--highlight');
    void el.offsetWidth;
    el.classList.add('info-strip__card--highlight');
    el.addEventListener('animationend', function() { el.classList.remove('info-strip__card--highlight'); }, { once: true });
    var title = el.querySelector('.info-strip__title');
    if (title) {
      title.classList.remove('info-strip__title--highlight');
      void title.offsetWidth;
      title.classList.add('info-strip__title--highlight');
      title.addEventListener('animationend', function() { title.classList.remove('info-strip__title--highlight'); }, { once: true });
    }
    if (subId) {
      var sub = document.getElementById(subId);
      if (sub) {
        sub.classList.remove('info-strip__subgroup--highlight');
        void sub.offsetWidth;
        sub.classList.add('info-strip__subgroup--highlight');
        sub.addEventListener('animationend', function() { sub.classList.remove('info-strip__subgroup--highlight'); }, { once: true });
      }
    }
  }

  // ── Ailment Triage Filter ─────────────────────────────────
  document.querySelectorAll('.ailments-triage__btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var scope = this.dataset.triage;
      var cat = this.dataset.cat;
      document.querySelectorAll('.ailments-triage__btn[data-triage="' + scope + '"]').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var sections = document.querySelectorAll('.ailments-cat-section[data-triage-scope="' + scope + '"]');
      sections.forEach(function(s) {
        if (cat === 'all') {
          s.style.display = s.classList.contains('ailments-cat--topic-only') ? 'none' : '';
        } else {
          var cats = s.dataset.cats ? s.dataset.cats.split(' ') : [s.dataset.cat];
          s.style.display = cats.indexOf(cat) !== -1 ? '' : 'none';
        }
      });
      // In the patient portal, scroll the chosen category's conditions into
      // view so the patient sees them (the panel itself no longer auto-scrolls
      // on open). Skip "All Conditions", that's just the default full list.
      if (scope === 'portal' && cat !== 'all') {
        var firstVisible = null;
        sections.forEach(function(s) {
          if (!firstVisible && s.style.display !== 'none') firstVisible = s;
        });
        if (firstVisible) {
          setTimeout(function() { firstVisible.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
        }
      }
    });
  });

  // ── Clickable ailment cards ───────────────────────────────
  document.querySelectorAll('.ailment-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('a')) return;
      var link = card.querySelector('.ailment-card__link');
      if (link) link.click();
    });
  });

  // ── Clickable medscheck cards ─────────────────────────────
  document.querySelectorAll('.medscheck-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('a')) return;
      var link = card.querySelector('a');
      if (link) link.click();
    });
  });

(function(){
  if (!window.FAQS || !window.FAQS.length) return;
  var entities = window.FAQS.map(function(faq){
    var tmp = document.createElement('div');
    tmp.innerHTML = faq.a;
    return {
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': tmp.textContent.trim() }
    };
  });
  var payload = JSON.stringify({'@context':'https://schema.org','@type':'FAQPage','mainEntity':entities});
  var s = document.getElementById('faq-schema-static');
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'faq-schema-static';
    document.head.appendChild(s);
  }
  s.textContent = payload;
})();

// ── Hero weather widget ───────────────────────────────────
(function(){
  var tempEl = document.getElementById('weather-temp');
  var iconEl = document.getElementById('weather-icon');
  if (!tempEl) return;
  var A='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">',Z='</svg>';
  var ICON = {
    sun:   A+'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M2.5 12h2M19.5 12h2M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5"/>'+Z,
    part:  A+'<circle cx="8" cy="7" r="2.8"/><path d="M8 1.6v1.3M3.4 3.4l.9.9M1.8 8h1.3M12.6 3.4l-.9.9"/><path d="M17 20a3.6 3.6 0 0 0 .2-7.2 4.8 4.8 0 0 0-9.1-.3A3.4 3.4 0 0 0 8 20z" fill="currentColor" stroke="none"/>'+Z,
    cloud: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.5 19a4.5 4.5 0 0 0 .3-9 6 6 0 0 0-11.6.4A4 4 0 0 0 6.5 19z"/></svg>',
    rain:  A+'<path d="M17 14.5a3.8 3.8 0 0 0 .3-7.6 5.2 5.2 0 0 0-10-.4A3.5 3.5 0 0 0 7 14.5z" fill="currentColor" stroke="none"/><path d="M8.5 17.5l-1 2.5M12 17.5l-1 2.5M15.5 17.5l-1 2.5"/>'+Z,
    snow:  A+'<path d="M17 14.5a3.8 3.8 0 0 0 .3-7.6 5.2 5.2 0 0 0-10-.4A3.5 3.5 0 0 0 7 14.5z" fill="currentColor" stroke="none"/><circle cx="8" cy="19" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="20" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="19" r=".9" fill="currentColor" stroke="none"/>'+Z,
    storm: A+'<path d="M17 13.5a3.8 3.8 0 0 0 .3-7.6 5.2 5.2 0 0 0-10-.4A3.5 3.5 0 0 0 7 13.5z" fill="currentColor" stroke="none"/><path d="M12.5 14l-2.5 3.8h3l-2.5 3.7"/>'+Z
  };
  function pick(code){
    if (code === 0 || code === 1) return ICON.sun;
    if (code === 2) return ICON.part;
    if (code === 3 || (code >= 45 && code <= 48)) return ICON.cloud;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ICON.snow;
    if (code >= 95) return ICON.storm;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ICON.rain;
    return ICON.cloud;
  }
  fetch('https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=temperature_2m,weather_code&timezone=America/Toronto')
    .then(function(r){ return r.json(); })
    .then(function(d){
      tempEl.textContent = Math.round(d.current.temperature_2m) + '°C';
      if (iconEl) iconEl.innerHTML = pick(d.current.weather_code);
    })
    .catch(function(){});
})();

/* Scroll-reveal for section headings + leads.
   Splits each .section__title into per-character spans and reveals them
   left-to-right (a "writing" sweep) the first time the heading scrolls into
   view. Section leads settle up at the same time. Everything is one-shot,
   GPU-cheap (opacity/transform only), and guarded for reduced motion and for
   browsers without IntersectionObserver. Kept out of the critical path, if
   this script never runs, headings stay fully visible (see html.tw-enabled). */
(function(){
  var docEl = document.documentElement;
  var titles = Array.prototype.slice.call(document.querySelectorAll('.section__title'));
  var leads  = Array.prototype.slice.call(document.querySelectorAll('.section__lead'));
  if (!titles.length && !leads.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Enable the effect's hidden start-states. Without this class the CSS above
  // never hides anything, so a JS failure can't leave text invisible.
  docEl.classList.add('tw-enabled');

  // Wrap the text of a heading into per-character spans, preserving any child
  // markup (e.g. the FAQ heading's nested styled span) and natural word wrap.
  function splitHeading(el){
    var idx = 0;
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(kid){
        if (kid.nodeType === 3){ // text node
          var text = kid.nodeValue;
          if (!text) return;
          var frag = document.createDocumentFragment();
          // Group each word's letters inside a nowrap wrapper so lines only
          // break between words — the per-letter inline-block spans would
          // otherwise let a word split across two lines (e.g. "PHARM/ACY").
          var word = null;
          for (var i = 0; i < text.length; i++){
            var ch = text[i];
            if (ch === ' ' || ch === '\n' || ch === '\t'){
              word = null;
              frag.appendChild(document.createTextNode(' ')); // real space keeps natural word wrapping
              continue;
            }
            if (!word){
              word = document.createElement('span');
              word.className = 'tw-word';
              frag.appendChild(word);
            }
            var span = document.createElement('span');
            span.className = 'tw-char';
            span.textContent = ch;
            span.style.setProperty('--tw-i', idx++);
            word.appendChild(span);
          }
          node.replaceChild(frag, kid);
        } else if (kid.nodeType === 1){
          walk(kid);
        }
      });
    })(el);
    el.style.setProperty('--tw-n', idx); // last index → underline delay
    el.classList.add('tw-ready');
  }

  titles.forEach(splitHeading);
  leads.forEach(function(el){ el.classList.add('reveal-up'); });

  // ── Staggered card/photo groups ─────────────────────────
  // Each container's element children settle in one after another. The
  // team-stat and reviews metrics are deliberately absent, they already
  // have their own IntersectionObserver reveals.
  var GROUPS = [
    '#welcome .welcome__boxes',
    '#welcome .welcome__photo-col',
    '#new-patients .steps',
    '#booking .pa-cards--top',
    '#drug-checker .dc-layout',
    '#team .staff-grid',
    '#shop .shop__cards',
    '#blog .blog-grid',
    '#contact .contact__info-strip'
  ];
  var groups = [];
  GROUPS.forEach(function(sel){
    var el = document.querySelector(sel);
    if (el) groups.push(el);
  });
  // About gallery rows get the photo variant (adds a slight scale settle).
  Array.prototype.slice.call(document.querySelectorAll('#about .gallery__row')).forEach(function(el){
    el.classList.add('reveal-group--photo');
    groups.push(el);
  });
  // Welcome question pills pop in like chat bubbles (springy scale-up).
  var pills = document.querySelector('#welcome .welcome__pills');
  if (pills){
    pills.classList.add('reveal-group--chat');
    groups.push(pills);
  }
  // Welcome intro paragraphs ride the per-element reveal like section leads.
  Array.prototype.slice.call(document.querySelectorAll('#welcome .welcome__text > p')).forEach(function(el){
    el.classList.add('reveal-up');
    leads.push(el);
  });

  function stampGroup(el){
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) kids[i].style.setProperty('--tw-i', i);
    el.classList.add('reveal-group');
  }
  groups.forEach(stampGroup);

  // Panel-open cascade: stamp stagger indices on the card grids that live
  // inside the service accordions / booking conditions panel. The card-fall
  // CSS replays whenever their panel opens; index capped so long grids
  // don't drag the tail out.
  Array.prototype.slice.call(document.querySelectorAll(
    '.ailments-grid, .medscheck-grid, .vaccine-grid, .insurance-grid, .poct-cards'
  )).forEach(function(grid){
    var kids = grid.children;
    for (var i = 0; i < kids.length; i++) kids[i].style.setProperty('--tw-i', Math.min(i, 12));
  });

  // After a group's stagger has played out, mark it done: the reveal CSS
  // stops matching and each card's own hover transitions take over again.
  function finishGroup(el){
    var ms = el.children.length * 90 + 700; // covers the slowest (chat) stagger
    setTimeout(function(){ el.classList.add('tw-done'); }, ms);
  }
  function revealNow(el){
    el.classList.add('tw-in');
    if (el.classList.contains('reveal-group')) finishGroup(el);
  }

  // Blog cards are re-rendered from a fetch of posts.json, re-stamp the
  // stagger indices whenever its children change, until it has revealed.
  var blogGrid = document.querySelector('#blog .blog-grid');
  if (blogGrid && 'MutationObserver' in window){
    var mo = new MutationObserver(function(){
      if (blogGrid.classList.contains('tw-in')){ mo.disconnect(); return; }
      stampGroup(blogGrid);
    });
    mo.observe(blogGrid, { childList: true });
  }

  var watched = titles.concat(leads).concat(groups);

  // Reduced motion or no IntersectionObserver → reveal everything at once.
  if (reduce || !('IntersectionObserver' in window)){
    watched.forEach(function(el){
      el.classList.add('tw-in');
      if (el.classList.contains('reveal-group')) el.classList.add('tw-done');
    });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        revealNow(entry.target);
        io.unobserve(entry.target); // one-shot
      }
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

  // Card grids can be very tall (esp. single-column on phones), so they use
  // a near-zero threshold, reveal as soon as the grid's top edge is in.
  var ioGroup = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        revealNow(entry.target);
        ioGroup.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

  function startObserving(){
    titles.concat(leads).forEach(function(el){ io.observe(el); });
    groups.forEach(function(el){ ioGroup.observe(el); });

    // Safety net for the rare case where the observer never fires for an
    // element that is already on screen (e.g. it loaded scrolled part-way
    // down). Only rescues elements currently in the viewport so content
    // further down the page still animates when the user reaches it.
    setTimeout(function(){
      var vh = window.innerHeight || docEl.clientHeight;
      watched.forEach(function(el){
        if (el.classList.contains('tw-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0){
          revealNow(el);
          io.unobserve(el); ioGroup.unobserve(el);
        }
      });
    }, 1200);
  }

  // If the welcome popup is due to show, hold the reveals until it's
  // dismissed (closeWelcome dispatches 'welcome:dismissed') so the first
  // screen's animation isn't wasted behind the overlay. Scrolling also
  // releases the gate, in case the user scrolls with the popup open.
  var modalDue = false;
  try {
    modalDue = !!document.getElementById('welcomeModal') &&
      Date.now() > (parseInt(localStorage.getItem('welcomeModalDismissedUntil_v2'), 10) || 0);
  } catch(e){}
  if (modalDue){
    var started = false;
    var go = function(){ if (started) return; started = true; startObserving(); };
    document.addEventListener('welcome:dismissed', go, { once: true });
    window.addEventListener('scroll', go, { once: true, passive: true });
  } else {
    startObserving();
  }
})();

/* 3D tilt steering, feeds --rx/--ry to the hover transform above so cards
   tilt toward the cursor. Event delegation (one mouseover listener) means
   dynamically re-rendered cards (e.g. blog grid) work automatically. Without
   this script cards still pop straight out via the CSS fallback (vars = 0).
   Desktop pointers only; skipped under reduced motion. */
(function(){
  // No-op touchstart listener: makes iOS Safari honour :active on
  // non-button elements (the tap press-in effect).
  document.addEventListener('touchstart', function(){}, { passive: true });
  if (!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.welcome-box, .pa-card, .step--clickable, .info-strip__card, .blog-card,' +
            ' .rx-ext, .shop__card, .ailment-card, .medscheck-card,' +
            ' .vaccine-card, .insurance-card, .poct-card, .welcome__pill';
  var MAX = 5; // degrees
  document.addEventListener('mouseover', function(e){
    var card = e.target.closest && e.target.closest(SEL);
    if (!card || card.__tilting) return;
    card.__tilting = true;
    var raf = 0;
    function onMove(ev){
      if (raf) return;
      raf = requestAnimationFrame(function(){
        raf = 0;
        var r = card.getBoundingClientRect();
        var dx = (ev.clientX - r.left) / r.width  - .5; // -0.5 … 0.5
        var dy = (ev.clientY - r.top)  / r.height - .5;
        card.style.setProperty('--ry', (dx *  2 * MAX).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (dy * -2 * MAX).toFixed(2) + 'deg');
      });
    }
    function onLeave(){
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.__tilting = false;
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    onMove(e);
  });
})();

/* Instant-answers chat, a client-side Q&A assistant over the site's own
   content. Reuses the global search machinery (window.SmartMatch scoring,
   window.FAQS answers, window.AILMENT_DB conditions, window.SITE_INDEX
   pages/services). No backend and no external requests: everything is
   matched and answered in the browser. */
(function(){
  var panel = document.getElementById('sdmChat'),
      openBtn = document.getElementById('sdmChatOpen'),
      closeBtn = document.getElementById('sdmChatClose'),
      log = document.getElementById('sdmChatLog'),
      chipsEl = document.getElementById('sdmChatChips'),
      form = document.getElementById('sdmChatForm'),
      input = document.getElementById('sdmChatInput');
  if (!panel || !openBtn || !log) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEL = '<a href="tel:+14166548181">(416) 654-8181</a>';

  var LC = (window.I18N && window.I18N.chat) || {};
  var CHIPS = LC.chips || [
    ['🕐 Hours today', 'are you open right now'],
    ['🚚 Free delivery', 'do you deliver'],
    ['🔁 Transfer my Rx', 'how do I transfer my prescriptions'],
    ['💉 Vaccines', 'what vaccines do you offer'],
    ['💳 Insurance', 'do you accept insurance'],
    ['🩺 I feel unwell', 'what conditions can the pharmacist assess']
  ];

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function stripHtml(s){ var d = document.createElement('div'); d.innerHTML = s; return d.textContent || ''; }

  function addMsg(html, who){
    var m = document.createElement('div');
    m.className = 'sdm-msg sdm-msg--' + who;
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function renderChips(){
    chipsEl.innerHTML = '';
    CHIPS.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sdm-chip'; b.textContent = c[0];
      b.addEventListener('click', function(){ ask(c[1]); });
      chipsEl.appendChild(b);
    });
  }

  function hoursAnswer(){
    // The live status board publishes the pharmacy's open/closed text under
    // the "store" key (see the status-board render() calls); read it so the
    // bot can prefix the current status.
    var val = document.querySelector('[data-sb-val="store"]');
    var txt = val && val.textContent && val.textContent.indexOf('Loading') === -1 ? val.textContent.trim() : null;
    return (txt ? (LC.rightNow || 'Right now: ') + '<strong>' + esc(txt) + '</strong>.<br><br>' : '') +
      (LC.hoursBody || 'Live hours are on the <a href="#contact">Find Us &amp; Contact section</a>, or call us at {TEL}.').replace('{TEL}', TEL);
  }

  function answer(q){
    var ql = q.toLowerCase();
    // Direct intents first, cheap and unambiguous.
    if ((LC.reHours || /\b(open|closed?|closing|hours?|holiday)\b/).test(ql)) return hoursAnswer();
    if ((LC.rePhone || /\b(phone|call you|your number|telephone)\b/).test(ql)) return (LC.phoneAnswer || 'You can reach us at {TEL}, we\'re happy to help.').replace('{TEL}', TEL);
    if ((LC.reWhere || /\b(where|address|located|location|directions|map)\b/).test(ql)) return LC.whereAnswer || 'We\'re at <strong>1203 St. Clair Ave W, Toronto</strong>, St. Clair &amp; Dufferin, in Corso Italia. <a href="https://www.google.com/maps/dir/?api=1&destination=St.+Clair+Drug+Mart+Pharmacy+1203+St+Clair+Ave+W+Toronto+ON" target="_blank" rel="noopener">Get directions →</a>';
    if (!(window.SmartMatch && window.FAQS)) return null;
    var S = window.SmartMatch;

    var bestFaq = null, faqScore = 0, faqSecond = 0;
    window.FAQS.forEach(function(f){
      var s = S.score({ title: f.q, desc: stripHtml(f.a) }, q);
      if (s > faqScore){ faqSecond = faqScore; faqScore = s; bestFaq = f; }
      else if (s > faqSecond){ faqSecond = s; }
    });
    // Accept a modest score when it clearly beats the runner-up, catches
    // queries whose key word only appears in the answer body (low weight).
    var faqOk = faqScore >= 4 || (faqScore >= 2.5 && faqScore >= faqSecond * 1.8);
    var bestAil = null, ailScore = 0;
    (window.AILMENT_DB || []).forEach(function(a){
      var s = S.score({ title: a.name, kw: (a.kw || []).join(' ') }, q);
      if (s > ailScore){ ailScore = s; bestAil = a; }
    });
    var hits = (window.SITE_INDEX || []).map(function(it){
      return { it: it, s: S.score({ title: it.title, kw: it.kw || '', desc: it.desc || '' }, q) };
    }).filter(function(h){ return h.s > 0 && !h.it.isFaq; })
      .sort(function(a, b){ return b.s - a.s; }).slice(0, 2);

    var parts = [];
    if (bestAil && ailScore >= 5 && ailScore >= faqScore){
      if (bestAil.call){
        parts.push((LC.assessCall || '{ICON} <strong>{NAME}</strong> is best handled directly with our pharmacist, call {TEL} or walk in.').replace('{ICON}', bestAil.icon).replace('{NAME}', esc(bestAil.name)).replace('{TEL}', TEL));
      } else {
        parts.push((LC.assessRx || '{ICON} Our pharmacist can assess and prescribe for <strong>{NAME}</strong>, with no doctor\'s appointment needed. <a href="{URL}" target="_blank" rel="noopener">Start your online assessment →</a>').replace('{ICON}', bestAil.icon).replace('{NAME}', esc(bestAil.name)).replace('{URL}', (window.PHARMA_BASE || '') + bestAil.id));
      }
    } else if (bestFaq && faqOk){
      parts.push((bestFaq.icon ? bestFaq.icon + ' ' : '') + bestFaq.a);
    }
    var links = hits.map(function(h){
      var it = h.it;
      var href = it.url ? it.url : (it.anchor || '#services');
      var ext = it.url ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + href + '"' + ext + '>' + (it.icon ? it.icon + ' ' : '') + esc(it.title) + '</a>';
    });
    if (parts.length){
      if (links.length) parts.push('<span style="font-size:.78em;opacity:.85">' + (LC.related || 'Related:') + ' ' + links.join(' · ') + '</span>');
      return parts.join('<br><br>');
    }
    if (links.length) return (LC.pagesHelp || 'These pages might help:') + ' ' + links.join(' · ');
    return null;
  }

  var FALLBACK = (LC.fallback || 'I\'m not sure about that one, but a real person is! 😊 Call us at {TEL} or come by <strong>1203 St. Clair Ave W</strong> and ask our pharmacist directly. You can also try a topic below. 👇').replace('{TEL}', TEL);

  var busy = false;
  function ask(q){
    q = (q || '').trim();
    if (!q || busy) return;
    addMsg(esc(q), 'user');
    input.value = '';
    busy = true;
    var t = addMsg('<span class="sdm-typing"><span></span><span></span><span></span></span>', 'bot');
    setTimeout(function(){
      var html = null;
      try { html = answer(q); } catch(e){}
      t.innerHTML = html || FALLBACK;
      log.scrollTop = log.scrollHeight;
      busy = false;
    }, reduce ? 0 : 450);
  }

  function openChat(){
    panel.hidden = false;
    var float_ = document.getElementById('contactFloat');
    if (float_) float_.classList.remove('open');
    if (!log.children.length){
      addMsg(LC.greeting || 'Hi! 👋 I can answer questions about our pharmacy, hours, free delivery, services, and the 28 conditions our pharmacist can assess. Ask away, or tap a topic below.', 'bot');
      renderChips();
    }
    if (matchMedia('(hover: hover)').matches) input.focus();
  }
  function closeChat(){ panel.hidden = true; }

  openBtn.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !panel.hidden) closeChat(); });
  form.addEventListener('submit', function(e){ e.preventDefault(); ask(input.value); });
  // In-page links inside answers should reveal their destination, close the
  // panel so it isn't covering the section the user just navigated to.
  // (Portal deep-links in FAQ answers fall back to their plain #booking href
  // here; re-binding the js-pa-select behaviour is a possible refinement.)
  log.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (a && (a.getAttribute('href') || '').charAt(0) === '#') closeChat();
  });
})();
