# St. Clair Drug Mart — Analytics Guide

A plain-English guide to how your website is tracked in **Google Analytics 4 (GA4)**,
what every number means, and how to turn it into decisions. No technical background needed.

Your GA4 Measurement ID: **G-2YQ9FDLMCV** (installed on all 21 pages).

---

## 1. The two sources of your data

Your analytics come from two places working together:

**A) What Google tracks automatically** (called *Enhanced Measurement*).
You get this for free just by having the tag installed:

| Automatic metric | What it means |
|---|---|
| **Page view** | Someone loaded a page. Counted per web address (`/`, `/es/`, `/blog/…`). |
| **Scroll** | A visitor scrolled 90% of the way down a page. |
| **Outbound click** | A visitor clicked a link that leaves your site. |
| **Session / User** | A visit (session) and the person making it (user). |

**B) What I added on top** (custom *events*).
Google's automatic tracking can't tell that a "Book Now" button was pressed or that
someone tapped your phone number. So I mapped the specific actions that matter to a
pharmacy. Those are listed in section 3.

**The key idea:** GA4 automatically stamps **which page** every event happened on.
Because the exact same tracking now runs on all 21 pages, you can always ask
"how many *phone calls* came from the *Spanish page*?" or "which page drove the most
*bookings*?" — just by breaking any event down by page.

---

## 2. Views vs. clicks — how to think about them

- A **view** = someone *saw* something (a page, or a section of the homepage).
- A **click / event** = someone *did* something (booked, called, searched).

Views tell you **reach** (how far people get). Clicks tell you **intent** (what they
actually want). The gold is in comparing the two:

> Example: 500 people reached the **booking** section (`section_view` = booking),
> but only 40 clicked **Book** (`book_click`). That's an 8% booking-intent rate — and
> a signal that the booking area could be clearer or more compelling.

---

## 3. Your event map (what each one means)

Every action below is recorded automatically now. The "Detail recorded" column is
extra info attached to the event so you can break it down further.

### 🎯 The money actions (mark these as "Key events" — see section 6)

| Event name | Fires when a visitor… | Detail recorded | Why it matters |
|---|---|---|---|
| `book_click` | Clicks any **Book / appointment / service** card or the nav **Book Now** button | `label` = which service (e.g. "Medication Review", "Vaccinations") | Direct booking intent. Your #1 goal. Break down by `label` to see *which services* people book. |
| `assessment_start` | Starts a **minor-ailment condition assessment** (e.g. pink eye, UTI) | `condition` = which ailment | Shows demand for pharmacist prescribing. Break down by `condition` to see top complaints. |
| `phone_click` | Taps a **phone number** | `location` = the button's wording | A call is a strong lead. `location` tells you *which* call-to-action drove it. |

### 📞 Contact & conversion actions

| Event name | Fires when a visitor… | Detail recorded |
|---|---|---|
| `directions_click` | Clicks a **Google Maps / directions** link | — |
| `email_click` | Clicks an **email** link | — |
| `uber_click` | Clicks **Uber Eats** (online shop) | — |
| `social_click` | Clicks **Facebook / Instagram / LinkedIn** | `network` |

### 🛠️ Tools & engagement

| Event name | Fires when a visitor… | Detail recorded |
|---|---|---|
| `drug_checker_check` | Runs the **drug-interaction checker** | — |
| `chat_open` | Opens the **chat assistant** | — |
| `chat_question` | **Asks the chat** a question | — |
| `site_search` | **Searches** the site (logged once they stop typing) | `search_term` = what they typed, `results` = how many matches |
| `language_select` | Picks a language from the **globe menu** | `language` (es/pt/it/tr) |

### 👀 Reach (which parts of the homepage people actually see)

| Event name | Fires when a visitor… | Detail recorded |
|---|---|---|
| `section_view` | Scrolls a homepage **section** past the middle of their screen (once each per visit) | `section_id` — see the map below |

**Why this exists:** the homepage is one long page. Jumping to `#booking` or `#services`
is **not** a separate page view in Google's eyes, so without this you'd have no idea
which parts people reach. `section_view` fills that gap.

**Section ID → plain English:**

| `section_id` | The part of the homepage |
|---|---|
| `welcome` | Opening "how can we help you" area |
| `new-patients` | New patient / transfer-your-prescription |
| `booking` | Appointment booking (homepage only — see section 9 for how the standalone Patient Portal page is tracked separately) |
| `services` | What We Offer (services grid) |
| `drug-checker` | Drug-interaction checker tool |
| `team` | Meet the pharmacists |
| `reviews` | Google reviews |
| `contact` | Hours, address, phone, directions |
| `shop` | Online shop / Uber Eats |
| `about` | About the pharmacy |
| `faq` | Frequently asked questions |
| `blog` | Blog highlights |
| `flags` | Thin language-flag strip (decorative — low signal, you can ignore it) |

---

## 4. How to read it inside Google Analytics

**To watch it happen live (best for a first check):**
1. Go to **analytics.google.com** → your property.
2. Left menu → **Reports** → **Realtime**.
3. Open your live site in another tab and click around (tap a phone number, press Book).
4. Within seconds you'll see your own actions appear under "Event count by Event name."
   This is how you confirm tracking is alive.

**To see the totals over time:**
1. **Reports** → **Engagement** → **Events**.
2. You'll see every event name and its count. Click any event name (e.g. `book_click`)
   to open it.

**To see the *detail* (e.g. which services get booked):**
The detail fields (`label`, `condition`, `search_term`, `section_id`…) need to be
registered once as **custom dimensions** before they show in reports:
1. **Admin** (bottom-left gear) → **Custom definitions** → **Create custom dimension**.
2. Dimension name: e.g. "Booked service" · Scope: **Event** · Event parameter: `label`.
3. Repeat for the ones you care about: `condition`, `search_term`, `results`,
   `section_id`, `network`, `language`, `location`.
4. Give it 24–48 hours, then build a report in **Explore** using those dimensions.

*(Until you register them, you still get the event counts — you just can't yet split
`book_click` by which service. The counts are collecting from day one regardless.)*

---

## 5. Questions your analytics can now answer

| Question | Where to look |
|---|---|
| How many bookings did we drive this month? | `book_click` count |
| Which services do people book most? | `book_click` → broken down by `label` |
| Which minor ailments are people assessing? | `assessment_start` → by `condition` |
| How many phone leads? | `phone_click` count |
| Are the language pages working? | `page_view` on `/es/ /pt/ /it/ /tr/`, plus `language_select` |
| Do the neighbourhood pages bring bookings/calls? | filter `book_click` / `phone_click` by page = the `/pharmacy-…/` URLs |
| What do people search for — and fail to find? | `site_search` → sort by `search_term`; **`results = 0` = a content gap to fill** |
| How far down the homepage do people get? | `section_view` counts, top to bottom (a big drop between two sections = where you lose people) |
| Is the chatbot used? | `chat_open` vs `chat_question` |

---

## 6. Mark your conversions ("Key events")

GA4 lets you flag the events that = business value so they stand out in every report.

1. **Admin** → **Events** (under Data display) → find the event → toggle **Mark as key event**.
2. Recommended to flag: **`book_click`**, **`phone_click`**, **`assessment_start`**.
   Optionally **`directions_click`** and **`chat_question`**.

Once flagged, GA4 tracks them as conversions and you can see conversion rate,
which traffic sources drive them, etc.

---

## 7. Honest limits (so you read the numbers correctly)

- **`book_click` measures intent, not completed bookings.** The actual appointment is
  finished inside the PharmAssess booking system, which is a separate site I can't see
  into. So `book_click` = "started booking," not "confirmed." To count *completed*
  bookings, check PharmAssess's own reports and compare.
- **`phone_click` counts taps, not answered calls.** On a phone, a tap usually starts a
  call; on a desktop it may just open a dialer app. Treat it as a strong lead signal,
  not a guaranteed conversation.
- **`section_view` fires once per section per visit** — it's about reach, not time spent.
- **Numbers are directional.** Ad-blockers and "reject cookies" choices mean GA
  undercounts a little. Watch *trends and ratios*, not perfect absolute totals.

---

## 9. Booking Button clicks vs. Patient Portal page use — the exact split

Since the standalone **Patient Portal page** (`/portal/`) was added, this is the
question people ask most, so here's the precise, no-jargon answer. Three different
things sound similar but mean different numbers:

| What you want to know | Where to look | Setup needed |
|---|---|---|
| **"How many people used the Patient Portal as its own page?"** (arrived via the nav menu, footer, blog, a neighbourhood page, Google, or a shared link) | **Reports → Engagement → Pages and screens** → find `/portal/` in the list. That row's **Views** = page loads, **Active users** = people, **Average engagement time** = how long they stayed. | None — automatic. |
| **"How many times did someone click a Book / appointment button?"** (anywhere on the site — homepage cards, the portal page's identical cards, or the nav "Book Now") | **Reports → Engagement → Events** → `book_click` row = total count. Click into it and look at the `label` breakdown (once registered, see section 4) to see *which* button — "Vaccinations," "Medication Review," "Book Now," etc. | `label` breakdown needs one-time custom-dimension registration (section 4). The raw count needs nothing. |
| **"Of those Book clicks, how many happened on the dedicated Portal page vs. the homepage's booking section?"** | Same `book_click` report → click the **pencil icon** (top right of the table) → **Add secondary dimension** → choose **Page path and screen class**. The table now splits every row by `/` vs `/portal/` vs any other page. | None — "Page path" is a built-in dimension, no registration or waiting period. |

**Why this works cleanly:** the Book buttons on `/portal/` and on the homepage's
booking section fire the exact same `book_click` event with the exact same `label` —
they're the same action, just reachable two ways. GA4 already tags every event with
the page it happened on, so you never lose that detail; you just ask for it with the
secondary-dimension step above instead of it cluttering the default view.

**One thing that used to be confusing and is now fixed:** loading `/portal/` briefly
also triggered a `section_view: booking` event — the *exact same* event GA4 fires
when a homepage visitor scrolls down to the booking section. That made "people who
scrolled to booking on the homepage" and "people who loaded the separate Portal page"
look like the same number. `/portal/` no longer fires `section_view` at all (it isn't
a section of a long scrolled page, it's its own destination) — so `section_view:
booking` now means only one thing: *a homepage visitor scrolled to that section*.
Portal-page reach is measured the clean way instead: its own `page_view` on `/portal/`.

---

## 10. A simple monthly routine

1. **Reports → Engagement → Events**: note `book_click`, `phone_click`,
   `assessment_start` vs. last month. Up or down?
2. **`site_search` with `results = 0`**: any repeated empty searches? That's a page or
   FAQ answer you should add.
3. **`section_view` top-to-bottom**: where's the biggest drop-off? That section may need
   a stronger hook or to move higher.
4. **Language & neighbourhood pages**: getting page views? Driving any calls/bookings?
   If one is dead, the SEO for that area may need work.

---

*This mapping lives in one shared file, `analytics-events.js`, loaded by every page —
so tracking behaves identically everywhere and any future change is a one-file edit.*
