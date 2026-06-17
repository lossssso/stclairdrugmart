#!/usr/bin/env python3
"""
SEO-focused blog post generator for St. Clair Drug Mart Pharmacy.

Each topic targets real search queries patients type into Google.
Posts are structured to rank for local pharmacy searches in Toronto.

Usage:
    ANTHROPIC_API_KEY=sk-... python scripts/generate_blog.py
"""

import anthropic
import datetime
import json
import os
import re
import random
from pathlib import Path

# ── Pharmacy details ───────────────────────────────────────────

PHARMACY = {
    "name":     "St. Clair Drug Mart Pharmacy",
    "short":    "St. Clair Drug Mart",
    "address":  "1203 St. Clair Ave W, Toronto, ON",
    "city":     "Toronto",
    "neighbourhood": "St. Clair West",
    "phone":    "(416) 654-8181",
    "email":    "stclairdrugmart@gmail.com",
    "tel":      "tel:+14166548181",
    "booking":  "https://app.pharmassess.ca/appointment/306667",
}

SITE_URL = "https://www.stclairdrugmart.ca"

# ── SEO topic list ─────────────────────────────────────────────
# Each entry: (description for Claude, primary keyword, [secondary keywords])
# Primary keyword is what patients actually search. It must appear naturally
# in the title and opening paragraph for Google to rank the post.

TOPICS = [
    (
        "where to get a flu shot in Toronto — walk-in flu vaccines at a local pharmacy",
        "flu shot Toronto",
        ["flu vaccine pharmacy Toronto", "flu shot near me Toronto", "flu vaccination St. Clair West", "influenza vaccine Toronto pharmacy", "get flu shot without appointment Toronto"],
    ),
    (
        "COVID-19 booster vaccine available at a Toronto pharmacy — no appointment required",
        "COVID vaccine Toronto pharmacy",
        ["COVID booster Toronto", "COVID shot near me", "COVID vaccine St. Clair West", "COVID-19 booster pharmacy Toronto"],
    ),
    (
        "pharmacist can prescribe for UTI in Ontario — get treated without seeing a doctor",
        "UTI treatment pharmacy Ontario",
        ["pharmacist prescribe UTI Toronto", "urinary tract infection pharmacy Toronto", "UTI prescription without doctor Ontario", "UTI pharmacy St. Clair West"],
    ),
    (
        "pharmacist can prescribe for strep throat and sore throat infections in Ontario",
        "sore throat pharmacist Ontario",
        ["strep throat pharmacy Ontario", "sore throat treatment without doctor Toronto", "throat infection pharmacist Toronto", "pharmacist prescribe antibiotics sore throat Ontario"],
    ),
    (
        "pharmacist can treat skin infections, rashes, and impetigo in Ontario pharmacies",
        "skin infection pharmacy Ontario",
        ["rash treatment pharmacy Toronto", "impetigo pharmacy Ontario", "skin condition pharmacist Toronto", "fungal infection treatment pharmacy near me"],
    ),
    (
        "pink eye and eye infection treated at your Toronto pharmacy without a doctor visit",
        "pink eye pharmacy Toronto",
        ["conjunctivitis pharmacy Toronto", "eye infection pharmacist Ontario", "pink eye treatment near me Toronto", "red eye pharmacy St. Clair West"],
    ),
    (
        "cold sore treatment and prescription antiviral available at Toronto pharmacy",
        "cold sore treatment pharmacy Toronto",
        ["cold sore pharmacist Ontario", "cold sore prescription Toronto", "cold sore medication pharmacy near me", "antiviral cold sore pharmacy Toronto"],
    ),
    (
        "travel vaccines and travel health advice from a Toronto pharmacy before your trip",
        "travel vaccine Toronto",
        ["travel health pharmacy Toronto", "hepatitis A vaccine Toronto pharmacy", "typhoid vaccine pharmacy Toronto", "malaria prevention Toronto pharmacy", "travel clinic pharmacy Toronto"],
    ),
    (
        "shingles vaccine (Shingrix) available at St. Clair Drug Mart pharmacy in Toronto",
        "shingles vaccine Toronto pharmacy",
        ["Shingrix Toronto", "shingles shot pharmacy near me Toronto", "herpes zoster vaccine pharmacy Toronto", "shingles vaccination St. Clair West"],
    ),
    (
        "blister packs for seniors and patients with complex medication schedules in Toronto",
        "blister packs Toronto pharmacy",
        ["blister packaging medication Toronto", "pill organizer pharmacy Toronto", "medication blister pack seniors Toronto", "compliance packaging pharmacy St. Clair West"],
    ),
    (
        "MedsCheck annual medication review at your Toronto pharmacy — covered by OHIP",
        "MedsCheck Toronto",
        ["medication review pharmacy Toronto", "annual medication review OHIP", "pharmacist medication review Ontario", "MedsCheck covered OHIP Toronto"],
    ),
    (
        "free prescription delivery from a Toronto pharmacy right to your door",
        "prescription delivery Toronto",
        ["pharmacy delivery Toronto", "free prescription delivery Toronto", "medication delivery St. Clair West", "home delivery pharmacy Toronto"],
    ),
    (
        "how to transfer your prescription to a new pharmacy in Toronto",
        "transfer prescription Toronto",
        ["switch pharmacy Toronto", "prescription transfer near me Toronto", "change pharmacy Toronto", "move prescription to new pharmacy Toronto"],
    ),
    (
        "why choose an independent community pharmacy over a chain pharmacy in Toronto",
        "independent pharmacy Toronto",
        ["local pharmacy Toronto", "community pharmacy St. Clair West", "independent pharmacy vs Shoppers Drug Mart Toronto", "neighbourhood pharmacy Toronto"],
    ),
    (
        "allergy season in Toronto — antihistamines, nasal sprays, and pharmacist advice",
        "allergy medication pharmacy Toronto",
        ["seasonal allergies Toronto pharmacist", "antihistamine pharmacy near me Toronto", "allergy relief Toronto pharmacy", "pollen allergy Toronto pharmacy"],
    ),
    (
        "managing diabetes medications with help from your Toronto pharmacist",
        "diabetes pharmacy Toronto",
        ["diabetes medication Toronto pharmacist", "insulin pharmacy Toronto", "diabetes management pharmacist St. Clair West", "diabetes supplies pharmacy Toronto"],
    ),
    (
        "high blood pressure medication refills and advice from a Toronto pharmacist",
        "blood pressure medication Toronto pharmacy",
        ["hypertension pharmacy Toronto", "blood pressure refill pharmacy near me", "pharmacist blood pressure advice Toronto", "antihypertensive pharmacy St. Clair West"],
    ),
    (
        "prescription refill request online from a Toronto pharmacy — fast and easy",
        "prescription refill online Toronto",
        ["refill prescription pharmacy Toronto", "online refill pharmacy St. Clair West", "request prescription refill Toronto", "pharmacy refill near me Toronto"],
    ),
    (
        "minor ailment prescribing in Ontario — 19 conditions your pharmacist can treat",
        "pharmacist prescribe Ontario minor ailment",
        ["minor ailment pharmacy Ontario", "pharmacist prescribe without doctor Ontario", "pharmacy prescribing program Toronto", "minor ailments pharmacist Toronto"],
    ),
    (
        "medication safety for seniors in Toronto — blister packs, reviews, and fall prevention",
        "seniors pharmacy Toronto medication safety",
        ["senior medication management Toronto", "medication safety elderly Toronto pharmacy", "fall prevention medication seniors Toronto", "seniors blister pack pharmacy Toronto"],
    ),
    (
        "Uber Eats pharmacy delivery Toronto — order OTC medications and health products",
        "pharmacy delivery Uber Eats Toronto",
        ["pharmacy on Uber Eats Toronto", "same day pharmacy delivery Toronto", "OTC medication delivery Toronto", "health products delivery Toronto"],
    ),
    (
        "ear infection treated at an Ontario pharmacy without a doctor visit",
        "ear infection pharmacy Ontario",
        ["ear infection pharmacist Ontario", "ear pain treatment pharmacy Toronto", "otitis externa pharmacy Ontario", "ear infection without doctor Toronto"],
    ),
    (
        "vaccines and immunizations available at your local Toronto pharmacy",
        "vaccines pharmacy Toronto",
        ["immunization pharmacy Toronto", "vaccination pharmacy near me Toronto", "pharmacy vaccines no appointment Toronto", "vaccine clinic pharmacy St. Clair West"],
    ),
    (
        "what to expect at a pharmacy in Toronto's St. Clair West neighbourhood",
        "pharmacy St. Clair West Toronto",
        ["pharmacy near St. Clair Ave West Toronto", "drugstore St. Clair West", "pharmacy 1203 St. Clair Ave W", "pharmacy near Corso Italia Toronto", "pharmacy near Wychwood Toronto"],
    ),
    (
        "cholesterol medications explained by a Toronto pharmacist — statins, side effects, and tips",
        "cholesterol medication pharmacist Toronto",
        ["statin medication Toronto pharmacy", "cholesterol pills pharmacy advice", "pharmacist cholesterol advice Toronto", "high cholesterol pharmacy Toronto"],
    ),
]

# ── Paths ──────────────────────────────────────────────────────

ROOT      = Path(__file__).parent.parent
BLOG_DIR  = ROOT / "blog"
POSTS_DIR = BLOG_DIR / "posts"
MANIFEST  = BLOG_DIR / "posts.json"
MAIN_HTML = ROOT / "index.html"

# ── Data helpers ───────────────────────────────────────────────

def load_posts() -> list:
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else []

def save_posts(posts: list):
    BLOG_DIR.mkdir(exist_ok=True)
    MANIFEST.write_text(json.dumps(posts, indent=2))

def pick_topic(posts: list) -> tuple:
    recent_primaries = {p.get("primary_keyword", "") for p in posts[-12:]}
    fresh = [t for t in TOPICS if t[1] not in recent_primaries]
    return random.choice(fresh or TOPICS)

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_]+", "-", s)
    return s[:55].strip("-")

def fmt_date(date_str: str) -> str:
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").strftime("%B %-d, %Y")

# ── Claude API call ────────────────────────────────────────────

def generate_post(topic_desc: str, primary_kw: str, secondary_kws: list) -> dict:
    client = anthropic.Anthropic()

    secondary_list = ", ".join(f'"{kw}"' for kw in secondary_kws)

    system = (
        f"You are a knowledgeable pharmacist and SEO content writer for {PHARMACY['name']} "
        f"located at {PHARMACY['address']}. You write helpful, trustworthy healthcare content "
        "that ranks on Google by naturally incorporating the search terms patients actually use. "
        "Never keyword-stuff — weave keywords in naturally. Always recommend consulting a professional."
    )

    prompt = f"""Write an SEO-optimized blog post for our pharmacy website.

Topic: {topic_desc}

PRIMARY KEYWORD (must appear in the title and first paragraph naturally): "{primary_kw}"
SECONDARY KEYWORDS (work these into headings and body text naturally — not all required): {secondary_list}

Our pharmacy: {PHARMACY['name']}, {PHARMACY['address']}, {PHARMACY['phone']}.
Website: {SITE_URL}

SEO requirements:
- Title must contain the primary keyword naturally (not forced)
- First paragraph must mention the primary keyword and our location (Toronto / St. Clair West)
- Use secondary keywords naturally in H2/H3 headings where they fit
- Mention our pharmacy name and neighbourhood 2–3 times throughout
- Write for patients first — helpful, clear, reassuring
- 480–580 words in content_html

Return a single JSON object (no markdown fences) with these exact fields:
- "title": SEO title containing the primary keyword, title case, max 65 characters
- "meta_description": includes primary keyword + location + call to action, max 155 characters
- "excerpt": 1–2 sentences with the primary keyword, max 190 characters
- "content_html": full article using only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. No wrapper divs.
- "reading_minutes": integer
- "tags": 3–5 short tag strings"""

    for attempt in range(2):
        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
            raw = re.sub(r"^```[a-z]*\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            return json.loads(raw)
        except Exception as exc:
            if attempt == 1:
                raise RuntimeError(f"Failed after 2 attempts: {exc}") from exc
            print(f"Attempt {attempt + 1} failed ({exc}), retrying…")

# ── Shared CSS & layout fragments ─────────────────────────────

SHARED_CSS = """
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --teal-bright: #2EC5BC; --teal-mid: #1AA8A0; --teal-dark: #0D7A72;
      --teal-deeper: #08524C; --teal-ice: #E8F8F7; --white: #fff;
      --text: #132624; --text-muted: #426260; --border: #ACD9D8;
      --radius: 10px; --shadow: 0 2px 12px rgba(13,122,114,.10);
    }
    html { scroll-behavior: smooth; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--teal-ice); color: var(--text); line-height: 1.7; }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; }
    .nav { position: sticky; top: 0; z-index: 100; background: var(--teal-deeper); box-shadow: 0 2px 8px rgba(0,0,0,.20); }
    .nav__inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; height: 56px; }
    .nav__brand { font-weight: 700; font-size: .95rem; color: #fff; letter-spacing: .02em; }
    .nav__links { display: flex; list-style: none; gap: .25rem; }
    .nav__links a { color: rgba(255,255,255,.85); font-size: .875rem; font-weight: 500; padding: .45rem .75rem; border-radius: 6px; transition: background .15s; }
    .nav__links a:hover { background: rgba(255,255,255,.12); color: #fff; }
    .nav__links .nav__cta a { background: var(--teal-bright); color: #fff; }
    .nav__links .nav__cta a:hover { background: var(--teal-mid); }
    .btn { display: inline-block; background: var(--teal-dark); color: #fff; font-weight: 600; font-size: .9rem; padding: .65rem 1.6rem; border-radius: 8px; transition: background .15s, transform .1s; }
    .btn:hover { background: var(--teal-deeper); transform: translateY(-1px); }
    .btn--bright { background: var(--teal-bright); }
    .btn--bright:hover { background: var(--teal-mid); }
    .btn--ghost { background: rgba(255,255,255,.15); border: 1.5px solid rgba(255,255,255,.3); }
    .btn--ghost:hover { background: rgba(255,255,255,.25); }
    footer { background: var(--teal-deeper); color: rgba(255,255,255,.8); text-align: center; padding: 2rem 1.5rem; font-size: .85rem; }
    footer a { color: rgba(255,255,255,.65); }
    footer a:hover { color: #fff; }
    @media (max-width: 600px) { .nav__links { display: none; } }"""


def nav_html(depth: int = 1) -> str:
    prefix = "../" * depth
    return f"""<nav class="nav">
  <div class="nav__inner">
    <a href="{prefix}index.html" class="nav__brand">St. Clair Drug Mart</a>
    <ul class="nav__links">
      <li><a href="{prefix}index.html">Home</a></li>
      <li><a href="{prefix}index.html#services">Services</a></li>
      <li><a href="{prefix}blog/index.html">Blog</a></li>
      <li><a href="{prefix}index.html#contact">Contact</a></li>
      <li class="nav__cta"><a href="{PHARMACY['booking']}" target="_blank" rel="noopener">Book Appointment</a></li>
    </ul>
  </div>
</nav>"""


def footer_html() -> str:
    year = datetime.date.today().year
    return f"""<footer>
  <p>1203 St. Clair Avenue West, Toronto, ON &nbsp;·&nbsp; <a href="{PHARMACY['tel']}">{PHARMACY['phone']}</a> &nbsp;·&nbsp; <a href="mailto:{PHARMACY['email']}">{PHARMACY['email']}</a></p>
  <p style="margin-top:.5rem;opacity:.45;">&copy; {year} St. Clair Drug Mart Pharmacy. All rights reserved.</p>
</footer>"""


# ── Individual post page ───────────────────────────────────────

def build_post_page(post: dict, date_str: str, primary_kw: str, slug: str) -> str:
    tags_html = " ".join(f'<span class="ptag">{t}</span>' for t in post.get("tags", []))
    post_url  = f"{SITE_URL}/blog/posts/{slug}"

    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["meta_description"],
        "datePublished": date_str,
        "dateModified": date_str,
        "author": {
            "@type": "Organization",
            "name": PHARMACY["name"],
            "url": SITE_URL,
        },
        "publisher": {
            "@type": "Organization",
            "name": PHARMACY["name"],
            "url": SITE_URL,
            "logo": {"@type": "ImageObject", "url": f"{SITE_URL}/logo.png"},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": post_url},
        "keywords": primary_kw,
    }, indent=2)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{post['title']} | St. Clair Drug Mart Pharmacy Toronto</title>
  <meta name="description" content="{post['meta_description']}" />
  <link rel="canonical" href="{post_url}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="article" />
  <meta property="og:title"       content="{post['title']}" />
  <meta property="og:description" content="{post['meta_description']}" />
  <meta property="og:url"         content="{post_url}" />
  <meta property="og:site_name"   content="St. Clair Drug Mart Pharmacy" />
  <meta property="article:published_time" content="{date_str}" />

  <!-- Structured data -->
  <script type="application/ld+json">
{schema}
  </script>

  <style>
{SHARED_CSS}
    .post-hero {{ background: linear-gradient(150deg, var(--teal-deeper) 0%, var(--teal-dark) 55%, var(--teal-bright) 100%); padding: 3rem 1.5rem; color: #fff; }}
    .post-hero__inner {{ max-width: 760px; margin: 0 auto; }}
    .post-hero__tags {{ margin-bottom: .9rem; display: flex; gap: .4rem; flex-wrap: wrap; }}
    .ptag {{ display: inline-block; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25); border-radius: 20px; padding: .2rem .65rem; font-size: .75rem; font-weight: 500; }}
    .post-hero__title {{ font-size: clamp(1.75rem, 4vw, 2.6rem); font-weight: 800; line-height: 1.15; margin-bottom: .75rem; }}
    .post-hero__meta {{ font-size: .82rem; opacity: .75; display: flex; gap: 1.25rem; flex-wrap: wrap; }}
    .post-body {{ max-width: 760px; margin: 0 auto; padding: 2.5rem 1.5rem; }}
    .post-body h2 {{ font-size: 1.3rem; font-weight: 700; color: var(--teal-deeper); margin: 2rem 0 .5rem; }}
    .post-body h3 {{ font-size: 1.05rem; font-weight: 600; color: var(--teal-dark); margin: 1.5rem 0 .4rem; }}
    .post-body p {{ color: var(--text-muted); margin-bottom: 1rem; }}
    .post-body ul {{ margin: .25rem 0 1rem 1.5rem; color: var(--text-muted); }}
    .post-body li {{ margin-bottom: .35rem; }}
    .post-body strong {{ color: var(--text); font-weight: 600; }}
    .back-link {{ display: inline-flex; align-items: center; gap: .35rem; color: var(--teal-dark); font-size: .875rem; font-weight: 600; margin-bottom: 1.75rem; transition: color .15s; }}
    .back-link:hover {{ color: var(--teal-deeper); }}
    .post-cta {{ background: var(--teal-deeper); color: #fff; border-radius: 12px; padding: 2rem; text-align: center; margin: 2.5rem 0; }}
    .post-cta h3 {{ font-size: 1.15rem; font-weight: 700; margin-bottom: .45rem; }}
    .post-cta p {{ opacity: .8; font-size: .875rem; margin-bottom: 1.25rem; }}
    .cta-btns {{ display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }}
  </style>
</head>
<body>
{nav_html(depth=2)}
<div class="post-hero">
  <div class="post-hero__inner">
    <div class="post-hero__tags">{tags_html}</div>
    <h1 class="post-hero__title">{post['title']}</h1>
    <div class="post-hero__meta">
      <span>📅 {fmt_date(date_str)}</span>
      <span>⏱ {post['reading_minutes']} min read</span>
      <span>✍️ {PHARMACY['short']}, Toronto</span>
    </div>
  </div>
</div>
<div class="post-body">
  <a href="../../blog/index.html" class="back-link">← Back to Blog</a>
  {post['content_html']}
  <div class="post-cta">
    <h3>Visit St. Clair Drug Mart Pharmacy in Toronto</h3>
    <p>1203 St. Clair Ave W, Toronto · Mon–Fri 9 am–6 pm · Sat 9 am–2 pm</p>
    <div class="cta-btns">
      <a href="{PHARMACY['tel']}" class="btn btn--bright">📞 {PHARMACY['phone']}</a>
      <a href="{PHARMACY['booking']}" target="_blank" rel="noopener" class="btn btn--ghost">Book Appointment</a>
    </div>
  </div>
</div>
{footer_html()}
</body>
</html>"""


# ── Blog index page ────────────────────────────────────────────

def build_blog_index(posts: list) -> str:
    ordered = sorted(posts, key=lambda p: p["date"], reverse=True)

    cards = []
    for p in ordered:
        tags_html = "".join(f'<span class="ptag">{t}</span>' for t in p.get("tags", []))
        cards.append(
            f'    <article class="post-card">\n'
            f'      <div class="post-card__meta"><span>📅 {fmt_date(p["date"])}</span>'
            f'<span>⏱ {p.get("reading_minutes", 3)} min read</span></div>\n'
            f'      <h2 class="post-card__title"><a href="posts/{p["slug"]}">{p["title"]}</a></h2>\n'
            f'      <p class="post-card__excerpt">{p["excerpt"]}</p>\n'
            f'      <div class="post-card__footer"><div class="post-card__tags">{tags_html}</div>'
            f'<a href="posts/{p["slug"]}" class="read-more">Read more →</a></div>\n'
            f'    </article>'
        )

    grid = (
        "\n".join(cards)
        if cards
        else '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:3rem 0">Our first posts are coming soon — check back next week!</p>'
    )

    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "St. Clair Drug Mart Pharmacy Health Blog",
        "description": "Health tips, pharmacy news, and wellness advice from St. Clair Drug Mart Pharmacy in Toronto.",
        "url": f"{SITE_URL}/blog/",
        "publisher": {"@type": "Organization", "name": PHARMACY["name"], "url": SITE_URL},
    }, indent=2)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Health &amp; Pharmacy Blog | St. Clair Drug Mart Pharmacy Toronto</title>
  <meta name="description" content="Health tips, pharmacy advice, and local wellness news from St. Clair Drug Mart Pharmacy at 1203 St. Clair Ave W, Toronto." />
  <link rel="canonical" href="{SITE_URL}/blog/" />
  <meta property="og:title"       content="Health &amp; Pharmacy Blog | St. Clair Drug Mart Pharmacy" />
  <meta property="og:description" content="Health tips and pharmacy advice from your neighbourhood pharmacists in St. Clair West, Toronto." />
  <meta property="og:url"         content="{SITE_URL}/blog/" />
  <script type="application/ld+json">
{schema}
  </script>
  <style>
{SHARED_CSS}
    .blog-hero {{ background: linear-gradient(150deg, var(--teal-deeper) 0%, var(--teal-dark) 55%, var(--teal-bright) 100%); padding: 3rem 1.5rem 2.5rem; color: #fff; text-align: center; }}
    .blog-hero h1 {{ font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 800; margin-bottom: .5rem; }}
    .blog-hero p {{ opacity: .8; font-size: .95rem; }}
    .blog-main {{ max-width: 1100px; margin: 3rem auto; padding: 0 1.5rem 4rem; }}
    .posts-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }}
    .post-card {{ background: var(--white); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow); border-top: 3px solid var(--teal-bright); display: flex; flex-direction: column; gap: .6rem; }}
    .post-card__meta {{ display: flex; gap: 1rem; font-size: .78rem; color: var(--text-muted); }}
    .post-card__title {{ font-size: 1.05rem; font-weight: 700; line-height: 1.3; }}
    .post-card__title a {{ color: var(--teal-deeper); transition: color .15s; }}
    .post-card__title a:hover {{ color: var(--teal-bright); }}
    .post-card__excerpt {{ font-size: .875rem; color: var(--text-muted); flex: 1; line-height: 1.55; }}
    .post-card__footer {{ display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }}
    .post-card__tags {{ display: flex; gap: .35rem; flex-wrap: wrap; }}
    .ptag {{ background: var(--teal-ice); border: 1px solid var(--border); border-radius: 20px; padding: .15rem .6rem; font-size: .72rem; color: var(--teal-dark); }}
    .read-more {{ font-size: .82rem; font-weight: 600; color: var(--teal-dark); transition: color .15s; }}
    .read-more:hover {{ color: var(--teal-bright); }}
    @media (max-width: 900px) {{ .posts-grid {{ grid-template-columns: repeat(2, 1fr); }} }}
    @media (max-width: 600px) {{ .posts-grid {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
{nav_html(depth=1)}
<div class="blog-hero">
  <h1>Health &amp; Pharmacy Blog</h1>
  <p>Tips, local health news, and pharmacy advice from St. Clair Drug Mart Pharmacy in Toronto's St. Clair West neighbourhood.</p>
</div>
<main class="blog-main">
  <div class="posts-grid">
{grid}
  </div>
</main>
{footer_html()}
</body>
</html>"""


# ── Update main site "latest posts" section ────────────────────

def latest_cards_html(posts: list) -> str:
    ordered = sorted(posts, key=lambda p: p["date"], reverse=True)[:3]
    if not ordered:
        return '      <p style="color:var(--text-muted);grid-column:1/-1;text-align:center;">Check back soon for our first posts!</p>'
    return "\n".join(
        f'      <article class="blog-card">\n'
        f'        <span class="blog-card__date">📅 {fmt_date(p["date"])}</span>\n'
        f'        <h3 class="blog-card__title"><a href="blog/posts/{p["slug"]}">{p["title"]}</a></h3>\n'
        f'        <p class="blog-card__excerpt">{p["excerpt"]}</p>\n'
        f'        <a href="blog/posts/{p["slug"]}" class="blog-card__link">Read more →</a>\n'
        f'      </article>'
        for p in ordered
    )


def update_main_site(posts: list):
    html = MAIN_HTML.read_text()
    pattern = re.compile(r"(<!-- BLOG_LATEST_START -->).*?(<!-- BLOG_LATEST_END -->)", re.DOTALL)
    if not pattern.search(html):
        print("Warning: BLOG_LATEST markers not found in index.html — skipping.")
        return
    MAIN_HTML.write_text(
        pattern.sub(r"\1\n" + latest_cards_html(posts) + r"\n      \2", html)
    )
    print("Updated main site blog section.")


# ── Sitemap ────────────────────────────────────────────────────

def build_sitemap(posts: list) -> str:
    today = datetime.date.today().isoformat()

    static_pages = [
        (f"{SITE_URL}/",           today,  "1.0",  "weekly"),
        (f"{SITE_URL}/blog/",      today,  "0.9",  "weekly"),
    ]

    post_entries = [
        (f"{SITE_URL}/blog/posts/{p['slug']}", p["date"], "0.8", "monthly")
        for p in sorted(posts, key=lambda p: p["date"], reverse=True)
    ]

    all_urls = static_pages + post_entries
    url_blocks = "\n".join(
        f"  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <priority>{priority}</priority>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"  </url>"
        for loc, lastmod, priority, changefreq in all_urls
    )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{url_blocks}\n"
        "</urlset>\n"
    )


def update_sitemap(posts: list):
    sitemap_path = ROOT / "sitemap.xml"
    sitemap_path.write_text(build_sitemap(posts))
    print(f"Updated sitemap.xml ({len(posts) + 2} URLs)")


# ── Entry point ────────────────────────────────────────────────

def main():
    posts = load_posts()
    topic_desc, primary_kw, secondary_kws = pick_topic(posts)
    print(f"Primary keyword : {primary_kw}")
    print(f"Topic           : {topic_desc}")

    post_data = generate_post(topic_desc, primary_kw, secondary_kws)
    print(f"Title           : {post_data['title']}")

    date_str = datetime.date.today().isoformat()
    filename = f"{date_str}-{slugify(post_data['title'])}.html"

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_file = POSTS_DIR / filename
    post_file.write_text(build_post_page(post_data, date_str, primary_kw, filename))
    print(f"Written         : {post_file.relative_to(ROOT)}")

    posts.append({
        "title":           post_data["title"],
        "excerpt":         post_data["excerpt"],
        "date":            date_str,
        "slug":            filename,
        "tags":            post_data.get("tags", []),
        "reading_minutes": post_data.get("reading_minutes", 3),
        "primary_keyword": primary_kw,
        "topic":           topic_desc,
    })
    save_posts(posts)

    (BLOG_DIR / "index.html").write_text(build_blog_index(posts))
    print("Regenerated     : blog/index.html")

    update_main_site(posts)
    update_sitemap(posts)
    print("Done!")


if __name__ == "__main__":
    main()
