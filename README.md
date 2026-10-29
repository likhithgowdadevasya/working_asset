# Build Your First AI Project in 60 Minutes — registration asset

A React + Vite prototype that supports the **"60-Minute Project Squad"** growth campaign: a landing page, registration flow, source/referral tracking, two built-in A/B tests and a campaign dashboard.

> **Status: prototype.** No backend is connected. All data lives in the visitor's own browser (`localStorage`). Nothing is stored remotely. Workshop date, time, presenter and registration URL are **placeholders** until NxtWave confirms them. The NxtWave wordmark is a recreated placeholder, not the official logo. No deployed URL exists yet (see Deployment).

## Run it

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build
npm run test:unit  # funnel arithmetic, validation, attribution, registration logic
npm run build && npm run test:e2e   # browser tests (needs Playwright + Chromium)
```

The e2e script uses Playwright (`npm i -D playwright && npx playwright install chromium` if it is not already available).

## What is in it

| Area | Behaviour |
|---|---|
| Landing page | Headline, benefit copy, 3 proposed outcomes, who it's for, workshop details (placeholders), form, share section, FAQ. Responsive. |
| Registration | Name + email + optional referral code. Inline validation, duplicate-email check, confirmation state. Honest "stored only in this browser" wording. |
| Source tracking | `?src=` or `?utm_source=` (whatsapp/wa, telegram/tg, instagram/ig, club, linkedin, referral, share), `?utm_content=` (message hook), `?ref=` (referral code). Values are sanitised. |
| Events | `page_view`, `referral_opened`, `form_started`, `registration_completed`, `share_clicked` (each once per page load where relevant). |
| Experiment 2 | Landing subhead + CTA A/B, 50/50 random, sticky per browser. Force with `?v=a` or `?v=b`. |
| Experiment 3 | After registering, 50/50: personal Squad link with progress (`?src=referral&ref=CODE&arm=t`) vs generic share (`?src=share&arm=c`). |
| Experiment 1 | Tracked via `?utm_content=hookA` / `hookB` on Instagram links. |
| Dashboard `#/dashboard` | Total registrations, visits, conversion, form completion, registrations by source, daily trend, referral contribution, progress to 500, readouts for all three experiments. Default = **simulated sample data** (clearly labelled). Toggle to "My local test data" to see what you generate while testing. Shows aggregates only, never names or emails. |

Example test links (replace host):

```
/?src=wa                          WhatsApp visit
/?src=ig&utm_content=hookA        Instagram, message hook A
/?ref=K7M2QX&src=referral&arm=t   Referral link opened
/?v=b                             Force landing variant B
/#/dashboard                      Dashboard
```

## Single source of truth

`src/campaign.json` holds the message, audience, channels, funnel assumptions, budget, schedule and the three experiments. The page copy and dashboard read from it, and the submitted documents were generated from the same file, so numbers cannot drift apart.

## Limitations (read before demoing)

- Data is per browser. A visitor's registration is invisible to you; the dashboard cannot show other people's activity.
- The "Squad progress" counter only counts referrals made in the same browser (useful for demos).
- The dashboard route is public in a static deployment. It shows no personal data, but production must put it behind authentication.
- Simulated dashboard numbers are hard-coded samples, not forecasts or results.
- No emails are sent; the confirmation says so.
- Attendance is not measured (it comes from the webinar platform after the event).

## Taking it to production (not built)

1. Add an Express API with `POST /events` and `POST /registrations`; swap `track()` and `registerStudent()` in `src/lib/tracking.js` for `fetch` calls.
2. MySQL tables (proposed): `registrations(id, name, email UNIQUE, code UNIQUE, ref, source, hook, variant, share_arm, created_at)` and `events(id, visitor_id, type, source, ref, hook, variant, arm, created_at)`.
3. Compute dashboard aggregates server-side with `GROUP BY`; protect `/dashboard` with login; rate-limit and validate server-side.
4. Send the joining email through the webinar platform; add consent/privacy text approved by NxtWave.

## Deployment (free, any of these)

The build uses relative asset paths and hash routing, so it works from any path with no rewrite rules.

**Vercel:** push this folder to GitHub → vercel.com → *Add New Project* → import repo → framework *Vite* → Deploy. **Netlify:** *Add new site → Import from Git* → build `npm run build`, publish `dist`. Or drag the `dist/` folder onto app.netlify.com/drop. **GitHub Pages:** upload `dist/` contents to a `gh-pages` branch (or use a Pages workflow) and enable Pages.

After deploying, open the real URL and test `?src=wa`, a registration, and `#/dashboard`. Put that URL into the form only after you have verified it.
