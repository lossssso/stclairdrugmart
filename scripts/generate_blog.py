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

# ── Shared sky-bg / cloud-nav fragments (same base as the rest of the site) ──
# `depth` is how many directories below the site root the page lives in:
#   blog/index.html -> depth 1 ("../" reaches the root)
#   blog/posts/*.html -> depth 2 ("../../" reaches the root)

def sky_bg_html(depth: int) -> str:
    p = "../" * depth
    return f"""<div class="sky-bg" aria-hidden="true">
  <img src="{p}cloud2.webp" class="sky-bg-cloud" data-dur="132" data-delay="-25" style="transform:translateX(-25.9vw)" alt="">
  <img src="{p}cloud.png"  class="sky-bg-cloud sky-bg-cloud--flip" data-dur="102" data-delay="-60" style="transform:translateX(45.9vw) scaleX(-1)" alt="">
  <img src="{p}cloud2.webp" class="sky-bg-cloud sky-bg-cloud--flip" data-dur="122" data-delay="-85" style="transform:translateX(65.4vw) scaleX(-1)" alt="">
  <img src="{p}cloud.png"  class="sky-bg-cloud" data-dur="96" data-delay="-12" style="transform:translateX(-37.5vw)" alt="">
  <img src="{p}cloud2.webp" class="sky-bg-cloud sky-bg-cloud--flip" data-dur="116" data-delay="-40" style="transform:translateX(2.1vw) scaleX(-1)" alt="">
  <img src="{p}cloud.png"  class="sky-bg-cloud" data-dur="128" data-delay="-18" style="transform:translateX(-34.7vw)" alt="">
  <img src="{p}cloud2.webp" class="sky-bg-cloud" data-dur="110" data-delay="-72" style="transform:translateX(57.8vw)" alt="">
  <img src="{p}cloud.png"  class="sky-bg-cloud sky-bg-cloud--flip" data-dur="94" data-delay="-95" style="transform:translateX(-58.1vw) scaleX(-1)" alt="">
</div>"""


def nav_html(depth: int = 1) -> str:
    p = "../" * depth
    blog_href = "index.html" if depth == 1 else "../index.html"
    return f"""<nav class="nav" id="nav">
  <div class="nav__clouds" aria-hidden="true">
    <img src="{p}cloud2.webp" class="nav__cloud" data-dur="175" data-delay="-29" style="transform:translateX(-30.6vw)" alt="">
    <img src="{p}cloud.png"  class="nav__cloud nav__cloud--flip" data-dur="140" data-delay="-81" style="transform:translateX(44.7vw) scaleX(-1)" alt="">
    <img src="{p}cloud2.webp" class="nav__cloud nav__cloud--flip" data-dur="165" data-delay="-126" style="transform:translateX(77.6vw) scaleX(-1)" alt="">
    <img src="{p}cloud.png"  class="nav__cloud" data-dur="125" data-delay="-51" style="transform:translateX(13.8vw)" alt="">
    <img src="{p}cloud.png"  class="nav__cloud nav__cloud--flip" data-dur="150" data-delay="-102" style="transform:translateX(-8vw) scaleX(-1)" alt="">
    <img src="{p}cloud2.webp" class="nav__cloud" data-dur="130" data-delay="0" style="transform:translateX(-60vw)" alt="">
  </div>
  <div class="nav__inner">
    <a href="{p}index.html#welcome" class="nav__brand">
      <img src="{p}logo.png" alt="" class="nav__brand__logo"/>
      <span>St. Clair Drug Mart Pharmacy</span>
    </a>
    <button class="nav__toggle" aria-label="Toggle menu" onclick="this.classList.toggle('open'); document.querySelector('.nav__links').classList.toggle('open')">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav__links" id="navLinks">
      <li><a href="{p}index.html#welcome">Home</a></li>
      <li class="nav__has-dropdown">
        <a href="{p}index.html#services">Services</a>
        <ul class="nav__dropdown">
          <li><a href="{p}index.html#booking">Patient Portal</a></li>
          <li><a href="{p}index.html#services">Ailment Assessment</a></li>
          <li><a href="{p}index.html#services">Medication Reviews</a></li>
          <li><a href="{p}index.html#services">Vaccinations</a></li>
          <li><a href="{p}index.html#services">Smoking Cessation</a></li>
          <li><a href="{p}index.html#services">Free Naloxone Kits</a></li>
          <li><a href="{p}index.html#drug-checker">Drug Checker</a></li>
          <li><a href="{p}index.html#services">Insurance</a></li>
        </ul>
      </li>
      <li class="nav__has-dropdown">
        <a href="https://www.ubereats.com/ca/store/st-clair-drug-mart-pharmacy/UQdOJOPyU7SiPZNSGikbhQ" target="_blank" rel="noopener">Shop</a>
        <ul class="nav__dropdown">
          <li><a href="https://www.ubereats.com/ca/store/st-clair-drug-mart-pharmacy/UQdOJOPyU7SiPZNSGikbhQ" target="_blank" rel="noopener">Order on Uber</a></li>
          <li><a href="{p}braces-supports.html">Braces &amp; Supports</a></li>
        </ul>
      </li>
      <li><a href="{blog_href}" class="active" aria-current="page">Blog</a></li>
      <li class="nav__has-dropdown">
        <a href="{p}index.html#faq">Got Questions?</a>
        <ul class="nav__dropdown">
          <li><a href="{p}index.html#about">About Us</a></li>
          <li><a href="{p}index.html#team">Meet the Team</a></li>
          <li><a href="{p}index.html#faq">FAQ</a></li>
          <li><a href="{p}index.html#reviews">Ratings (4.9 ⭐)</a></li>
          <li><a href="{p}index.html#contact">Find Us</a></li>
        </ul>
      </li>
      <li class="nav__cta"><a href="{PHARMACY['booking']}" target="_blank" rel="noopener">Book Now</a></li>
    </ul>
  </div>
</nav>"""


def footer_html() -> str:
    year = datetime.date.today().year
    return f"""<footer>
  <p>1203 St. Clair Avenue West, Toronto, ON &nbsp;·&nbsp; <a href="{PHARMACY['tel']}">{PHARMACY['phone']}</a> &nbsp;·&nbsp; <a href="mailto:{PHARMACY['email']}">{PHARMACY['email']}</a></p>
  <div class="footer__trust">
    <div class="footer__badges">
      <div class="trust-badge">
        <div class="trust-badge__disc"><img src="../../logos/ocp.png" alt="Ontario College of Pharmacists" class="trust-badge__logo"></div>
        <span class="trust-badge__caption">OCP Accreditation<br>No. 306667</span>
      </div>
      <div class="trust-badge">
        <div class="trust-badge__disc"><img src="../../logos/pharmassess.png" alt="PharmAssess — Online Pharmacy Booking" class="trust-badge__logo"></div>
        <span class="trust-badge__caption">PharmAssess<br>Online Booking</span>
      </div>
      <div class="trust-badge trust-badge--wordmark">
        <div class="trust-badge__disc"><img src="../../logos/medsask.png" alt="MedSask — Your Medication Information Service" class="trust-badge__logo"></div>
        <span class="trust-badge__caption">Medication<br>Information Partner</span>
      </div>
    </div>
  </div>
  <p style="margin-top:.75rem;opacity:.45;">&copy; {year} St. Clair Drug Mart Pharmacy. All rights reserved.</p>
</footer>"""


# ── Individual post page ───────────────────────────────────────

def build_post_page(post: dict, date_str: str, primary_kw: str, slug: str) -> str:
    post_url  = f"{SITE_URL}/blog/posts/{slug}"
    pretty_date = fmt_date(date_str)
    breadcrumb_label = post.get("tags", [primary_kw])[0] if post.get("tags") else primary_kw

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

    breadcrumb_schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE_URL}/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": f"{SITE_URL}/blog/index.html"},
            {"@type": "ListItem", "position": 3, "name": post["title"]},
        ],
    }, indent=2)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,viewport-fit=cover"/>
  <title>{post['title']} | St. Clair Drug Mart Pharmacy Toronto</title>
  <meta name="description" content="{post['meta_description']}"/>
  <link rel="canonical" href="{post_url}"/>
  <meta name="robots" content="index, follow, max-image-preview:large"/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="{post['title']}"/>
  <meta property="og:description" content="{post['meta_description']}"/>
  <meta property="og:url" content="{post_url}"/>
  <meta property="og:site_name" content="St. Clair Drug Mart Pharmacy"/>
  <meta property="article:published_time" content="{date_str}"/>
  <link rel="icon" type="image/x-icon" href="../../favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../../apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="../post.css"/>
  <script type="application/ld+json">
{schema}
  </script>
  <script type="application/ld+json">
{breadcrumb_schema}
  </script>
</head>
<body>
{sky_bg_html(depth=2)}

{nav_html(depth=2)}

<article class="post">
  <p class="post__breadcrumb"><a href="../../index.html">Home</a> › <a href="../index.html">Blog</a> › {breadcrumb_label}</p>
  <h1>{post['title']}</h1>
  <p class="post__meta">Updated {pretty_date} · {post['reading_minutes']} min read · {breadcrumb_label}</p>

  {post['content_html']}

  <div class="post__cta">
    <h3>Have questions about this?</h3>
    <p>Walk in, or start an online assessment — our pharmacist at {PHARMACY['name']} can help today.</p>
    <a class="btn" href="{PHARMACY['booking']}" target="_blank" rel="noopener">Book an Appointment →</a>
    <a class="btn btn--outline" href="{PHARMACY['tel']}">Call {PHARMACY['phone']}</a>
  </div>

  <p class="post__disclaimer">This article is general information, not medical advice. Speak with our pharmacist or your doctor about your specific situation.</p>
</article>

{footer_html()}
<script src="../post.js" defer></script>
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

    update_main_site(posts)
    update_sitemap(posts)
    print("Done!")


if __name__ == "__main__":
    main()
