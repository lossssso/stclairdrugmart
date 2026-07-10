# St. Clair — Claude Code Plugins & Skills

What's installed for working on this repo, where it lives, and when to reach for it.
Companion to `CLAUDE.md` (which holds the design/dev rules themselves).

## Scope model (read first)

Two ways a tool persists, and they mean different things:

- **Project scope** — recorded in `.claude/settings.json` (plugins) or as files under
  `.agents/skills` / `.claude/skills` (skills), **committed to this repo**. Loads on
  **every device** that clones/pulls the repo — but **only when working on St. Clair**.
  This is the durable, synced setup. Everything below is project scope unless noted.
- **User scope** — installed into a machine's `~/.claude`. Covers **all projects on that
  one machine**, but does **not** travel to other devices and is **not** in the repo.

There is no built-in "every project + every device" auto-sync. For a tool you want
everywhere, install it user scope on each machine (commands at the bottom).

## Design skills (vendored files, in the repo)

Pure-markdown skills — no build step, load only when relevant to the task.

| Skill | Source | Use it for |
|-------|--------|-----------|
| `impeccable` *(plugin)* | `pbakaus/impeccable` | The heavyweight: design / redesign / audit / critique / polish. 23 `/impeccable` commands + live-browser iteration + an auto UI-check hook. Start here for any substantial design work. |
| `frontend-design` *(plugin)* | Anthropic (`claude-plugins-official`) | Anthropic's own anti-generic aesthetic direction. Lightweight companion to impeccable. |
| `design-taste-frontend` | `Leonxlnx/taste-skill` | "Taste" — anti-slop landing-page/redesign direction with a variance/motion/density dial. |
| `emil-design-eng` | `emilkowalski/skills` | Emil Kowalski's UI-polish & animation-decision philosophy (the invisible details). |
| `apple-design` | `emilkowalski/skills` | Apple-style fluid/physical motion, materials, typography, gesture UI — translated for web. |
| `animation-vocabulary` | `emilkowalski/skills` | Reverse glossary: "the bouncy thing when a popover opens" → the exact term. For naming motion. |
| `review-animations` | `emilkowalski/skills` | Strict audit pass on existing animations. |
| `excalidraw-diagram` | `coleam00/excalidraw-diagram-skill` | Generate Excalidraw diagram JSON (workflows, architecture). |
| `accesslint-audit` / `-scan` / `-diff` | `accesslint/claude-marketplace` | WCAG 2.2 accessibility: sweep + fix, live-DOM scan, or diff vs a baseline. Matters — this is a healthcare site. Optional `@accesslint/mcp` server enables live-DOM auditing; static HTML audit works without it. |

## Plugins (settings.json pointer, in the repo)

| Plugin | Source | Role |
|--------|--------|------|
| `ponytail` | `DietrichGebert/ponytail` | Lean-code discipline (YAGNI, stdlib-first, shortest working diff). Active every session. Its win is leaner output → less rework, fewer tokens. `/ponytail-audit`, `/ponytail-review`. |
| `code-review` | Anthropic | Multi-agent PR review, CLAUDE.md-compliance + bug audit, only posts ≥80-confidence issues. **PRs only — run `/code-review medium`.** For day-to-day diff checks use native `/review`. Needs `gh` CLI to post (present locally, not in cloud containers). |
| `impeccable`, `frontend-design` | see design table | (design plugins, listed above) |
| `claude-md-management` | Anthropic | Audit/keep `CLAUDE.md` current (`/claude-md-improver`). |
| `claude-code-setup` | Anthropic | Recommends tailored hooks/skills for this repo (`/claude-automation-recommender`). |

## Memory — intentionally NOT installed here

`claude-mem` was evaluated and **left out of this repo on purpose**:
- Its memory DB is local per machine (`~/.claude-mem`) and does **not** sync across devices —
  so "memory everywhere" isn't actually achievable with it.
- It *adds* ~1,500 tokens/session (the one tool that costs rather than saves).
- **The project's real cross-device, shared, permanent memory is git history + PR threads on
  GitHub.** They record what changed and why, are visible from any device, and cost nothing
  until pulled in. For a coding project that covers most of what "memory" is for.

## Installing on your other machines (user scope)

Run per device where you want them across *all* your projects (not just St. Clair):

```bash
# Ponytail everywhere you code
claude plugin marketplace add DietrichGebert/ponytail
claude plugin install ponytail@ponytail -s user

# Code review in any repo
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install code-review@claude-plugins-official -s user
```

St. Clair itself needs none of this — it carries its own set via the repo.

## Token note

Installing tools does not save tokens; each user-scope tool loads its description into every
session. Keep project-specific skills project-scoped (St. Clair carries design/coding skills;
your Second Brain carries its own) so each session only pays for what's relevant. Ponytail is
the one with a real savings story — through the leaner code it produces, not the install.
