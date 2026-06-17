#!/usr/bin/env python3
"""
Automated blog post generator for St. Clair Drug Mart Pharmacy.

Picks a healthcare topic, calls the Claude API to write a post,
saves the post HTML, regenerates blog/index.html, and updates the
'latest posts' section on the main site page.

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
    "phone":    "(416) 654-8181",
    "email":    "stclairdrugmart@gmail.com",
    "tel":      "tel:+14166548181",
    "booking":  "https://app.pharmassess.ca/appointment/306667",
}

# Topics rotate so the blog stays fresh; recent ones are skipped
TOPICS = [
    "flu season prevention and vaccine options in Toronto",
    "common drug interactions every patient should know",
    "travel health: vaccines and medications before your trip",
    "blister packs for managing complex medication schedules",
    "Ontario's minor ailment prescribing: what pharmacists can now treat",
    "how to get the most from your annual MedsCheck review",
    "heart health and medication adherence tips",
    "managing type 2 diabetes with pharmacist support",
    "antibiotic stewardship: when antibiotics help and when they don't",
    "mental health medications and the importance of consistency",
    "shingles vaccine: who needs it and when",
    "staying current with COVID-19 booster vaccines",
    "managing high blood pressure with medication and lifestyle",
    "allergy season in Toronto: what actually works",
    "safe medication storage and disposal at home",
    "how to transfer your prescription to a new pharmacy",
    "evidence behind popular vitamins and supplements",
    "medication safety tips for older adults",
    "correct inhaler technique for asthma and COPD",
    "understanding cholesterol medications",
    "what to do when you miss a dose",
    "over-the-counter pain relievers: which one is right for you",
    "sleep health and medications that affect your sleep",
    "weight management medications: what to know",
    "eye drops and nasal sprays: using them correctly",
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

def pick_topic(posts: list) -> str:
    recent = {p.get("topic", "") for p in posts[-10:]}
    fresh  = [t for t in TOPICS if t not in recent]
    return random.choice(fresh or TOPICS)

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_]+", "-", s)
    return s[:55].strip("-")

def fmt_date(date_str: str) -> str:
    dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%B %-d, %Y")

# ── Claude API call ────────────────────────────────────────────

def generate_post(topic: str) -> dict:
    client = anthropic.Anthropic()

    system = (
        f"You are a knowledgeable, approachable pharmacist writing helpful blog posts "
        f"for {PHARMACY['name']} in Toronto. Your tone is warm, evidence-based, and practical. "
        "Always encourage readers to consult a healthcare professional for personal advice."
    )

    prompt = f"""Write a blog post for our pharmacy website about: {topic}

Pharmacy: {PHARMACY['name']}, {PHARMACY['address']}. Phone: {PHARMACY['phone']}.

Return a single JSON object (no markdown code fences) with these exact fields:
- "title": compelling title in title case, max 70 characters
- "meta_description": SEO description, max 155 characters
- "excerpt": 1–2 sentence teaser for listing pages, max 190 characters
- "content_html": full article as HTML — use only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. No wrapper divs, no inline styles. 420–560 words.
- "reading_minutes": integer estimated reading time
- "tags": array of 3–4 short tags (e.g. "Vaccines", "Heart Health", "Seniors")

Mention our pharmacy naturally once or twice. End with a warm call-to-action inviting readers to visit or call."""

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
                raise RuntimeError(f"Could not generate valid post JSON after 2 attempts: {exc}") from exc
            print(f"Attempt {attempt + 1} failed ({exc}), retrying…")

# ── Shared CSS & nav/footer snippets ──────────────────────────

SHARED_CSS = """
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --teal-bright: #2EC5BC; --teal-mid: #1AA8A0; --teal-dark: #0D7A72;
      --teal-deeper: #08524C; --teal-ice:  #E8F8F7; --white: #fff;
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

def build_post_page(post: dict, date_str: str) -> str:
    tags_html = " ".join(f'<span class="ptag">{t}</span>' for t in post.get("tags", []))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{post['title']} | St. Clair Drug Mart Pharmacy</title>
  <meta name="description" content="{post['meta_description']}" />
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
      <span>✍️ {PHARMACY['short']}</span>
    </div>
  </div>
</div>
<div class="post-body">
  <a href="../../blog/index.html" class="back-link">← Back to Blog</a>
  {post['content_html']}
  <div class="post-cta">
    <h3>Questions? We're here to help.</h3>
    <p>Our pharmacists are always happy to chat — walk in, call, or book an appointment online.</p>
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
        cards.append(f"""    <article class="post-card">
      <div class="post-card__meta">
        <span>📅 {fmt_date(p['date'])}</span>
        <span>⏱ {p.get('reading_minutes', 3)} min read</span>
      </div>
      <h2 class="post-card__title"><a href="posts/{p['slug']}">{p['title']}</a></h2>
      <p class="post-card__excerpt">{p['excerpt']}</p>
      <div class="post-card__footer">
        <div class="post-card__tags">{tags_html}</div>
        <a href="posts/{p['slug']}" class="read-more">Read more →</a>
      </div>
    </article>""")

    grid = "\n".join(cards) if cards else '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem 0">No posts yet — check back soon!</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Health &amp; Pharmacy Blog | St. Clair Drug Mart Pharmacy</title>
  <meta name="description" content="Health tips, pharmacy news, and wellness advice from St. Clair Drug Mart Pharmacy in Toronto." />
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
    .post-card__footer {{ display: flex; align-items: center; justify-content: space-between; margin-top: .25rem; flex-wrap: wrap; gap: .5rem; }}
    .post-card__tags {{ display: flex; gap: .35rem; flex-wrap: wrap; }}
    .ptag {{ background: var(--teal-ice); border: 1px solid var(--border); border-radius: 20px; padding: .15rem .6rem; font-size: .72rem; color: var(--teal-dark); }}
    .read-more {{ font-size: .82rem; font-weight: 600; color: var(--teal-dark); white-space: nowrap; transition: color .15s; }}
    .read-more:hover {{ color: var(--teal-bright); }}
    @media (max-width: 900px) {{ .posts-grid {{ grid-template-columns: repeat(2, 1fr); }} }}
    @media (max-width: 600px) {{ .posts-grid {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
{nav_html(depth=1)}
<div class="blog-hero">
  <h1>Health &amp; Pharmacy Blog</h1>
  <p>Tips, news, and wellness advice from your neighbourhood pharmacists at St. Clair Drug Mart.</p>
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
    cards = []
    for p in ordered:
        cards.append(
            f'      <article class="blog-card">\n'
            f'        <span class="blog-card__date">📅 {fmt_date(p["date"])}</span>\n'
            f'        <h3 class="blog-card__title"><a href="blog/posts/{p["slug"]}">{p["title"]}</a></h3>\n'
            f'        <p class="blog-card__excerpt">{p["excerpt"]}</p>\n'
            f'        <a href="blog/posts/{p["slug"]}" class="blog-card__link">Read more →</a>\n'
            f'      </article>'
        )
    return "\n".join(cards)


def update_main_site(posts: list):
    html = MAIN_HTML.read_text()
    marker_re = re.compile(
        r"(<!-- BLOG_LATEST_START -->).*?(<!-- BLOG_LATEST_END -->)",
        re.DOTALL,
    )
    if not marker_re.search(html):
        print("Warning: BLOG_LATEST markers not found in index.html — skipping.")
        return
    updated = marker_re.sub(
        r"\1\n" + latest_cards_html(posts) + r"\n      \2",
        html,
    )
    MAIN_HTML.write_text(updated)
    print("Updated main site blog section.")


# ── Entry point ────────────────────────────────────────────────

def main():
    posts = load_posts()
    topic = pick_topic(posts)
    print(f"Generating post on: {topic}")

    post_data = generate_post(topic)
    print(f"Title: {post_data['title']}")

    date_str = datetime.date.today().isoformat()
    filename = f"{date_str}-{slugify(post_data['title'])}.html"

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_file = POSTS_DIR / filename
    post_file.write_text(build_post_page(post_data, date_str))
    print(f"Written: {post_file.relative_to(ROOT)}")

    posts.append({
        "title":            post_data["title"],
        "excerpt":          post_data["excerpt"],
        "date":             date_str,
        "slug":             filename,
        "tags":             post_data.get("tags", []),
        "reading_minutes":  post_data.get("reading_minutes", 3),
        "topic":            topic,
    })
    save_posts(posts)

    (BLOG_DIR / "index.html").write_text(build_blog_index(posts))
    print("Regenerated blog/index.html")

    update_main_site(posts)
    print("Done!")


if __name__ == "__main__":
    main()
