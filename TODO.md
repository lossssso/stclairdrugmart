# St. Clair Drug Mart — To-Do

## Prescription Extensions & Adaptations — custom intake form (deferred)

The "Out of refills? Can't reach your doctor?" callout (Welcome section, anchor
`#rx-extensions`) and the **Prescription Extensions & Adaptations** item under
**Book an Appointment** (Patient Portal) are now live, but currently point at the
general Book-an-Appointment / phone-call flow.

Still to build:

- A dedicated questionnaire / **custom appointment form in PharmAssess** for
  patients requesting a prescription extension or adaptation.
- Capture what the pharmacy needs when the patient is **not already on file**,
  e.g.:
  - Bring in / upload your most recent prescription (Rx label or bottle).
  - Proof of the original prescription / current therapy where we don't have it
    on record.
  - Finalize the exact list of required documentation together (pending the OCP
    regulatory review — see note below).
- Once the custom form exists, repoint the callout CTA and the portal list item
  from the general appointment URL to the new extension/adaptation form URL.

### Open regulatory question (to confirm before finalizing copy)
Confirm the OCP rules on renewing/extending and adapting prescriptions for
someone who is **not** an existing patient of the pharmacy — specifically
whether it can be done over the phone, and what proof of prior/chronic use is
required. The welcome callout copy currently hedges ("may be able to… in many
cases…") so it can be tightened once the rules are confirmed.

**Documentation requirement, and the "photo of a bottle from another pharmacy"
case:** OCP's published guidance requires the pharmacist to have **"reference
to, or a copy of, the original prescription"** before renewing — that's the bar,
not optional. A clear photo of a labeled pill bottle/package from another
pharmacy (showing drug, strength, prescriber, and the original pharmacy) is, in
common practice, generally treated as that "reference" — but OCP's published
materials don't explicitly bless photos as a standalone source, and OCP's
prescription-transfer/due-diligence guidance expects the pharmacist to verify
authenticity, which in practice can mean **calling the original pharmacy or
prescriber to confirm details**, especially for a new patient or a controlled
substance. The site copy now reflects this ("a clear photo... is usually
enough to get started — we may call your previous pharmacy to confirm").
**Before this becomes official store policy, confirm directly with OCP (or your
own pharmacist judgment/SOPs) whether a photo alone is ever sufficient without
a verification call, and document that policy for staff.**

## COVID-19 test certificate (to set up / confirm)

The site already surfaces a "I need a COVID-19 test and certificate!" pill and
Point-of-Care Testing under Book an Appointment. To-do:

- Decide which test we offer for travel certificates: rapid antigen vs.
  point-of-care molecular/PCR (e.g., ID NOW). Travel/airlines usually require a
  **molecular/PCR** negative-result certificate, not antigen — confirm what the
  destinations our patients ask about will accept.
- Build the actual **certificate document** (negative-result letter with
  patient name/DOB, test type, sample date/time, result, pharmacist signature &
  pharmacy/OCP accreditation details) and a delivery method (printed + secure
  emailed PDF).
- Confirm staffing requirement: lab-based test ordering/specimen collection
  requires a **Part A pharmacist**; point-of-care testing can be done in
  pharmacy. Confirm our pharmacist designation and procurement of test kits.
- Note (research): Ontario pharmacists **can** test asymptomatic patients for
  travel and issue a negative-result clearance certificate — so this is offerable
  once the test type, kit supply, and certificate template are finalized.

## From the overnight site audit (June 23, 2026) — action items left for you

These need your hands (account access, a business decision, or an in-store
process) and can't be done from the code. Pulled from the audit's prioritized
next-actions list.

### Needs you in an account / dashboard
- **GitHub → Settings → Secrets → confirm `ANTHROPIC_API_KEY` is set.** The
  weekly blog bot (`.github/workflows/blog.yml`, Mondays 9 AM ET) needs this
  secret to generate posts. If it's missing, Mondays silently produce nothing
  (likely how the earlier desynced/phantom posts crept in). *(This is the "go
  into secrets" item.)*
- **Upload blog hero images.** Posts currently have no hero image (cards show a
  teal placeholder). Either upload a relevant photo per post or have the
  workflow attach/generate one — lifts click-through on the blog and on social
  shares. *(This is the "upload the thing for the blog" item.)*
- **Confirm the privacy policy names PharmAssess** (and any analytics) as a
  third-party processor, and that a data-sharing/vendor agreement is in place —
  PHIPA expects disclosed processors. Booking/patient data flows through
  `app.pharmassess.ca`.

### Google Analytics — one-time dashboard setup (owner, ~10 min)
_Full step-by-step lives in **`ANALYTICS-GUIDE.md`** (checklist at the top). These can
only be done by you, logged into analytics.google.com — they're not code changes, and
the tracking is already live and collecting regardless._
- [ ] **Register custom dimensions** so events can be split by their detail
  (`label`, `condition`, `search_term`, `results`, `section_id`, `network`,
  `language`, `location`). → ANALYTICS-GUIDE.md §4.
- [ ] **Mark key events (conversions):** `book_click`, `phone_click`,
  `assessment_start`. → ANALYTICS-GUIDE.md §6.
- [ ] *(Optional)* **Live dashboard / second brain** — Looker Studio, or copy monthly
  numbers into your notes. → ANALYTICS-GUIDE.md §11. (Ask me for a build spec.)

### SEO — after the Patient Portal / sitelinks work (owner, in Search Console)
- [ ] In **Google Search Console**, resubmit `sitemap.xml` and "Request indexing" for
  `/portal/` and `/blog/` (renamed to The Health Hub) to speed re-crawl.
- [ ] Run `/portal/` through Google's **Rich Results Test** to confirm the new
  WebPage/Breadcrumb/FAQ schema parses.
- [ ] **Confirm the Organization-schema `sameAs` links.** Facebook, Instagram,
  LinkedIn and UberEats are already wired in; give me your **Google Business Profile
  URL** to add (it's the important missing one), and confirm the four socials are the
  right handles.

### Marketing / front-of-store (owner + staff)
- **Launch a Google review drive** — a QR counter card linking straight to your
  Google review page; ask every satisfied patient at pickup; aim for 2–3 new
  reviews/week. Highest-ROI growth lever; you already have the 4.9★.
- **Respond to every Google review within 48 h** (even the 5★ ones) — it's a
  ranking and trust signal. (An AI draft-reply assistant can make this seconds.)
- **Complete the Google Business Profile** — every field, ≥20 photos (the
  optimized ones are ready), and post weekly (blog posts can feed this).
- **Keep "4.9 ★ / 59 reviews" accurate.** It's hardcoded ~18 places; if the real
  Google figure changes, the site is technically inaccurate advertising (OCP).
  Update it manually (or we make it pull live).
- **Verify hardcoded hours/holidays** are current (Closed Sunday, Sat 9–2, etc.).

### Professionalism / compliance polish (small)
- Consider naming the **Designated Manager** in the footer. (OCP accreditation
  No. 306667 is already shown in the footer trust badge.)
- Do a pass on "free / no cost" wording (50+ uses) so each is clearly tied to
  eligibility (valid OHIP card / criteria), never a blanket "free."

### Site/dev follow-ups (I can do these — just say when)
- Add a **site chatbot** (wrap the existing FAQ + smart search) and a mobile
  **Book/Refill bubble or bottom bar** for one-tap conversion.
- Extend the Monday blog bot to also draft a **GBP post, IG/FB caption, and
  email** from the same article (one generation, four placements).
- Optionally upgrade the blog bot model and add seasonal topic weighting.
- Bump small inline **touch targets to ≥24 px** (footer phone/email, inline CTAs).
- Optimize remaining storefront JPEGs to WebP (~150 K each). Low priority.

## Deferred performance work (from the July 2026 SEO/perf audit)

Larger-effort items intentionally NOT done in the quick-win pass. Each is a real
win but carries risk or needs owner input; ask me when you want one done.

- **Inline critical CSS / async-load `site.css`.** The 158 KB stylesheet is
  render-blocking on every page — the single biggest paint-time lever left.
  Riskiest change on the list (touches all pages + the v=N rule), do it alone
  in its own PR.
- **De-duplicate the FAQ payload.** Each homepage ships the ~38 KB FAQ content
  twice (visible `window.FAQS` block + static `#faq-schema-static` JSON-LD).
  Generating one from the other at commit time would cut ~38 KB per page.
- **Responsive images (`srcset`/AVIF)** for the storefront/gallery WebPs
  (100–255 KB each) so phones download smaller variants.
- **Self-host the two Google Fonts** to remove the render-blocking third-party
  round-trip (preconnect already in place, this is the last step).
- **Clean-URL slugs return HTTP 404 first.** `/vaccines`, `/uti`, etc. work via
  the 404.html JS router, but crawlers/no-JS clients see a 404 status. Fine
  today (they're not in the sitemap); if you ever print them on flyers or use
  them in ads, we need host-level 301 redirects instead.
- **Google Business Profile URL for `sameAs`** — still the important missing
  brand link (also listed in the Search Console section above).

### Already done this session (for reference)
- ✅ Deleted ~6 MB of unused images (`delivery_uber.jpeg`, `delivery_bag.jpeg`,
  `interior_counter.png`, `interior_entrance.webp`).
- ✅ Cloud animation now JS-driven (fixes "clouds not moving" in Comet/Chrome);
  nav clouds slowed.
- ✅ FAQ smart-search now surfaces conditions/minor-ailment assessments.
- ✅ Bike Share section: second nearby station added; parking vs. bike-share now
  highlight independently from the Find-Us logos.
