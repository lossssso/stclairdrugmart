#!/usr/bin/env python3
"""Fail if the site is about to ship a state Google will punish.

Born from the Aug 2026 Search Console audit, where three classes of rot kept
recurring:
  1. .html internal links. The host 308-redirects every .html URL to its
     extensionless form, so any internal .html href is a redirect and the
     linked page gets excluded ("Page with redirect").
  2. Orphaned posts. blog/index.html's static <ul class="posts-static"> is
     what crawlers see before posts.json loads; a post missing from it has
     zero internal links (the 2026-08-03 seniors post shipped that way).
  3. Sitemap rot: .html entries, the deleted pharmacy-<neighbourhood> pages
     coming back, /portal/ losing its trailing slash, or entries pointing at
     files that don't exist.

Run: python scripts/check_site.py   (exit 1 on any violation)
Runs in CI on every push and inside the weekly blog workflow before the bot
commits, so a bad generation fails the run instead of deploying.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors = []


def fail(msg: str):
    errors.append(msg)


# ── 1. No internal .html hrefs on any indexable page ───────────
# noindex pages (404.html, legacy stubs) are exempt: Google ignores their
# links, and the stubs are scheduled for deletion anyway.
NOINDEX = re.compile(r'name="robots"\s+content="[^"]*noindex')
HREF = re.compile(r'href="([^"]+)"')

for page in ROOT.rglob("*.html"):
    if any(p in (".git", "node_modules") for p in page.parts):
        continue
    html = page.read_text(encoding="utf-8")
    if NOINDEX.search(html):
        continue
    for href in HREF.findall(html):
        bare = href.split("#")[0].split("?")[0]
        if not bare.endswith(".html"):
            continue
        # external .html links are someone else's problem
        if bare.startswith(("http://", "https://")) and "stclairdrugmart.ca" not in bare:
            continue
        fail(f"{page.relative_to(ROOT)}: internal .html link -> {href}")

# ── 2. Every post is linked from the static blog list ──────────
posts = json.loads((ROOT / "blog" / "posts.json").read_text(encoding="utf-8"))
blog_index = (ROOT / "blog" / "index.html").read_text(encoding="utf-8")
static_block = re.search(r'<ul class="posts-static">.*?</ul>', blog_index, re.S)
if not static_block:
    fail('blog/index.html: <ul class="posts-static"> block is missing entirely')
else:
    for post in posts:
        if f'href="posts/{post["slug"]}"' not in static_block.group(0):
            fail(f'blog/index.html: static posts list is missing "{post["slug"]}" (orphaned post)')

# ── 3. Sitemap sanity ──────────────────────────────────────────
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
locs = re.findall(r"<loc>([^<]+)</loc>", sitemap)
SITE = "https://www.stclairdrugmart.ca"

# URL path -> the file that must exist to serve it
def loc_file(path: str) -> Path:
    if path.endswith("/"):
        return ROOT / path.strip("/") / "index.html" if path != "/" else ROOT / "index.html"
    return ROOT / (path.lstrip("/") + ".html")

for loc in locs:
    if not loc.startswith(SITE):
        fail(f"sitemap.xml: {loc} is not on {SITE}")
        continue
    path = loc[len(SITE):] or "/"
    if path.endswith(".html"):
        fail(f"sitemap.xml: {loc} is a .html URL (the host 308s these)")
    if "pharmacy-" in path:
        fail(f"sitemap.xml: {loc} looks like a deleted neighbourhood page")
    if path == "/portal":
        fail("sitemap.xml: /portal must keep its trailing slash (/portal serves the noindex stub)")
    if not loc_file(path).exists():
        fail(f"sitemap.xml: {loc} points at a file that does not exist ({loc_file(path).relative_to(ROOT)})")

for post in posts:
    if f"{SITE}/blog/posts/{post['slug']}" not in locs:
        fail(f"sitemap.xml: missing post {post['slug']}")

if errors:
    print(f"check_site: {len(errors)} problem(s):")
    for e in errors:
        print(f"  FAIL {e}")
    sys.exit(1)
print(f"check_site: OK ({len(locs)} sitemap URLs, {len(posts)} posts, no internal .html links)")
