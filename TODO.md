# St. Clair Drug Mart — To-Do

> This file holds detailed **build-specs** that live with the site code (the two below). The
> prioritized, owner-facing task list for this site is tracked in the Microbiome brain's
> `TASKS.md` under the `website` tag — that is the single source of truth. See the pointer
> lower down before adding a new owner/marketing/SEO task here.

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

## Prioritized action list -> tracked in the brain

The audited, prioritized to-do list for this site (owner credential actions, SEO and
marketing, and the dated dev fix list) lives in the Microbiome brain's `TASKS.md` under the
`website` tag. That is the single source of truth for actionable items (brain Rule 5). This
file keeps only the two detailed build-specs above plus the small dev and compliance backlog
below, which are code specs a site-only session needs on hand.

Owner and marketing items now live in the brain under the `website` tag: GitHub `ANTHROPIC_API_KEY`
secret, blog hero images, privacy-policy processor disclosure, Google review drive, respond-to-reviews
within 48h, complete the GBP, GA4 turn-on, GA4 custom dimensions + key events, Search Console verify +
re-crawl (sitemap resubmit, request-indexing for `/portal/` & `/blog/`, Rich Results Test), and the
Organization-schema `sameAs` / GBP-URL item. To see them, ask the brain "what website tasks are open?"
or open the dashboard Tasks tab and look for the `website` chip. Do not add NEW owner/marketing/SEO tasks
here — put them in the brain. (Full GA4 how-to still lives in `ANALYTICS-GUIDE.md`.)

## Site-dev polish backlog (low priority, not yet promoted to the brain)

- Extend the Monday blog bot to also draft a GBP post, IG/FB caption, and email from the same
  article (one generation, four placements); optionally upgrade the blog-bot model and add
  seasonal topic weighting.
- Bump small inline touch targets to >=24px (footer phone/email, inline CTAs).
- Optimize remaining storefront JPEGs to WebP (~150K each). Low priority.
- Verify the site chatbot and mobile Book/Refill bubble are live before scheduling them: chat
  events already fire in analytics, so this looks shipped. Confirm and delete this line if so.

## Deferred performance work (from the July 2026 SEO/perf audit)

Status update (July 20): the big three are DONE — critical CSS is now inlined
with `site.css` loading async on all six homepages + portal; the two Google
Fonts are self-hosted (14 woff2 files in `/fonts/`, declared in site.css /
post.css / fonts.css); and the seven storefront/gallery photos have 480px
`srcset` variants for phones. Still open:

- **De-duplicate the FAQ payload.** Each homepage ships the ~38 KB FAQ content
  twice (visible `window.FAQS` block + static `#faq-schema-static` JSON-LD).
  Decision: NOT doing it for now. The static schema block is deliberate (serves
  no-JS crawlers and AI engines), gzip shrinks the duplication to ~8 KB on the
  wire, and deriving one copy from the other adds fragility to a 6-language
  sync process. Revisit only if page weight becomes a problem again.
- **Clean-URL slugs return HTTP 404 first.** `/vaccines`, `/uti`, etc. work via
  the 404.html JS router, but crawlers/no-JS clients see a 404 status. Fine
  today (they're not in the sitemap); if you ever print them on flyers or use
  them in ads, we need host-level 301 redirects instead.
- **Google Business Profile URL for `sameAs`** — still the important missing
  brand link (now tracked in the brain's `TASKS.md` under the `website` tag).
- Note for future CSS edits: the inline `<style id="critical-css">` block on
  the six homepages + portal is GENERATED from site.css (above-the-fold rules).
  After meaningful site.css changes, regenerate it (ask Claude: "regenerate the
  critical CSS") — a stale block only affects the brief pre-load paint, the
  final rendered page always follows site.css.

## Professionalism / compliance polish (small)

- Consider naming the Designated Manager in the footer. (OCP accreditation No. 306667 is
  already shown in the footer trust badge.)
- Do a pass on "free / no cost" wording (50+ uses) so each is clearly tied to eligibility
  (valid OHIP card / criteria), never a blanket "free."
- Keep the Google rating and review count accurate everywhere it is hardcoded (currently
  4.9 stars / 60 reviews, in ~18 places). A stale figure is technically inaccurate advertising
  (OCP); update it manually or make it pull live.
- Verify hardcoded hours/holidays stay current (Closed Sunday, Sat 9-2, etc.).
