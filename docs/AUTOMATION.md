# Solink — the automatic monthly report

> **Status, 2026-09-22.** The routine in `automation/claude-schedule/` is on
> `main`. **The implementation it calls is not yet** — the endpoints under
> `src/lib/automation/` and `src/app/api/automation/`, the report sections, the
> PDF and migration `0009` are written but unpushed, pending `npx tsc --noEmit`,
> `npx eslint src` and `npm run build`. Until they land, the routine has nothing
> to call and every endpoint below is a 404. Everything else in this file
> describes the finished design.

**Claude Schedule → Supabase → collect → analyse → PDF → store → notify.**

Supabase is the source of truth for every figure in the report. The collector
reads `solar_systems`, `user_profiles`, `solar_profiles`, `production_records`,
`maintenance_cases`, `incidents`, `ai_alerts`, `solar_passports`,
`weather_observations` and `platform_settings` directly, through the
service-role client, scoped by system id. Nothing in this path touches the demo
dataset: that exists only when Supabase is not configured at all.

At the start of each month a Claude Schedule routine wakes up and asks Solink for
the month that has just ended. Solink gathers the production, the sunlight it
fell in and the maintenance history into one dataset, has Claude read it, stores
the report and notifies the owner. Nobody presses anything.

This file is what a new session, or whoever sets the routine up, needs.

---

## 1. Why the work is split the way it is

The runner is a Claude Code cloud session on a cron. It would be very easy, and
wrong, to let it read the data and write the month up itself. It does not, for
two reasons, and both are worth keeping.

**The report is written inside Solink.** Every AI call in this codebase goes
through `src/lib/ai/claude.ts`, which carries `SOLINK_AI_RULES`: use only the
context given, never invent a measurement, label every statement by type, never
say panels definitely need cleaning. On top of that,
`src/lib/ai/monthlyReport.ts` decides what may be claimed *for this particular
month*: when both months have measured sunlight the model may explain a change
in production through yield per unit of sunlight, and when they do not it is
forbidden from attributing the change to anything at all.

A routine that summarised the dataset in its own words would produce text that
looks identical and is bound by none of that. The routine calls `/generate` and
reports what came back. That is the whole of its job, and the prompt says so
three times.

**The stored figures are always Solink's own.** `/generate` takes a system and a
month, not a dataset. It re-reads the tables a moment before it writes. The
routine still sees the whole dataset — that is what `/dataset` is for, and
fetching it puts the month's inputs in the run log — but nothing outside Solink
can post production figures into somebody's report.

What the routine owns is the schedule, the loop over systems, the one retry, and
the summary in the run log. What Solink owns is the data and the analysis.

---

## 2. The three endpoints

All under `/api/automation/monthly-report`. All require the header
`x-solink-automation-key`, compared in constant time against
`AUTOMATION_API_KEY`.

| | |
|---|---|
| `GET /` | Which systems are due a report. `?month=YYYY-MM`, defaulting to the month that just ended. Returns every installed system with `already_reported`, plus counts. |
| `GET /dataset` | `?system=<uuid>&month=YYYY-MM`. The combined dataset. Read-only: nothing is written, no AI is called. |
| `POST /generate` | `{ system_id, month?, trigger?, locale?, skip_analysis? }`. Collect → Claude → store → notify. Returns `report_url` and the run's stages. |

Either key missing (`AUTOMATION_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`) and
every one of them answers **503** naming which. A wrong key is **401**. They
never fall open.

A month that is not over is **400**. A partial month is not a month, and Solink
will not present one as if it were.

They are ordinary HTTP. Claude Schedule is what calls them here; any scheduler
that can make a request would do, and nothing in Solink depends on which one.

### What the dataset contains

```
schema_version, collected_at, month, previous_month
owner           user id, name and locale from user_profiles — who the report is
                for, and the language the analysis is written in
system          id, owner, name, capacity, panel count, monitoring_source, is_demo
location        lat, lng, governorate, tariff category
production      total, previous total, trend %, average daily, best and worst day,
                daily breakdown, days recorded, classification
sunlight        this month and last: kWh/m², mean cloud %, mean temperature, day-by-day,
                archive coverage; plus yield per unit of sunlight for both months
maintenance     completed cases and incidents in the month, outstanding jobs, the last
                recorded cleaning, with counts
equipment       passport number, installation date, the panel as installed, and the
                warranty position per cover
alerts          alerts raised against the system inside the month
assumptions     tariff, emission factor, performance ratio… as the platform has them
missing_inputs  plain sentences naming everything Solink does not have
```

`schema_version` is **2**. Version 1 had no equipment, alerts or outstanding
jobs.

### Where the weather comes from

`weather_observations` in Supabase, and only then the Open-Meteo archive.

A finished month's sunlight is a fact, so it is stored rather than re-fetched.
The first run for a rounded location and month writes what the archive returned;
every run after it — and every other system on the same coordinate — reads the
row. Without this, two people opening the same finished month could see two
different reports, because the report would depend on an external service still
answering and still answering the same thing.

An incomplete month (the archive lags several days) is stored but re-fetched on
the next run until it settles. Coordinates are rounded to three decimals, about
110 m: the archive's own grid is far coarser, so the row is no more precise
about where somebody lives than the model behind it.

`missing_inputs` is part of a successful response, not an error. A month with no
tariff and no sunlight archive still returns 200; the report built from it says
what it could not work out.

**Yield per unit of sunlight is the field that matters.** Production ÷ the
sunlight that fell. Hold it steady and a quiet month was the sky; watch it fall
and it was the system. Cloud cover alone cannot tell a dusty month from a cloudy
one, which is why the analysis refuses to attribute a change unless both months
have measured sunlight.

---

## 3. Setting it up

1. **Environment.** Set `AUTOMATION_API_KEY` to a long random value
   (`openssl rand -base64 48`) and make sure `SUPABASE_SERVICE_ROLE_KEY` is set.
   Both are server-only and both belong in Vercel as *Sensitive*.
2. **Database.** Apply `supabase/migrations/0009_solink_report_automation.sql`:
   it adds `reports.generated_by`, `report_runs` and `weather_observations`.
   Confirmed not applied as of 2026-09-22: `report_runs` does not exist on the
   live project.
3. **The routine.** `automation/claude-schedule/routine.json` is a ready
   `RemoteTrigger` create body; `monthly-report.prompt.md` is the same prompt in
   readable form for the web UI at https://claude.ai/code/routines. Replace
   `SOLINK_BASE_URL` and `AUTOMATION_API_KEY_HERE`, confirm the `environment_id`
   against the environments the account actually has, and create it.
4. **Check it.** Run the routine once from the routines page. `/reports` shows
   the run and its seven stages; `/admin/integrations` shows "Monthly report
   automation" as connected.

### Why the 5th and not the 1st

The default cron is `0 8 5 * *`, 08:00 UTC on the 5th (11:00 Asia/Kuwait). The
sunlight archive Solink reads lags real time by several days. A run on the 1st
gets a month whose last days have no measured sunlight, and the report then
cannot say whether a change in production was the weather or the system, which
is the one question it exists to answer. Waiting four days buys that back.

`0 8 1 * *` runs it on the 1st instead. The report is still produced and still
honest: it says the sunlight is incomplete.

### The secret

Claude Schedule has no separate credential store, so the key lives in the
routine's prompt, which is its configuration. It opens these three routes and
nothing else, but they return one homeowner's records, so treat it as a
credential: a long random value, and rotate it if the routines list is ever
shared. The prompt forbids the routine from printing it or putting it in a URL.

---

## 4. What a run does, and what it does when it cannot

Seven stages, each recorded in `report_runs.steps` with a sentence written for a
person rather than for a log:

| Stage | Missing input → |
|---|---|
| `collect_production` | No records for the month: the report says so instead of showing a total. Fewer than 25 days in the previous month: no month-over-month change is stated. |
| `collect_weather` | No coordinates on the profile, or the archive has nothing yet: the report carries no attribution for any change in production. |
| `collect_maintenance` | Nothing recorded is a normal answer, not a gap. |
| `combine` | — |
| `analyse` | No `CLAUDE_API_KEY`: every figure is still computed and stored; the report arrives without the written reading rather than with an invented one. |
| `store` | A failure here fails the run, and the run says why. |
| `notify` | In Solink only. Nothing is emailed: `[PLACEHOLDER: EMAIL / NOTIFICATION PROVIDER]`. |

**A stage that cannot run does not fail the run.** A month with no sunlight and
no Claude key produces a stored report containing everything Solink does know,
and `/reports` shows which stages were skipped and why. That is the difference
between a report that is honest about its gaps and a report that never arrives.

Demo systems get observations but never a recommendation that costs money. That
rule is in the prompt and enforced again in code afterwards, because a model is
not a permission system.

To see what a fire actually did, `list_runs` on the routine and then
`get_run_log` on the session, or the routines page in the browser. A run that
never created a session leaves nothing in `list_runs`; check the routine itself
before concluding it did not fire.

---

## 5. What the report contains

`/reports/[id]` is six sections, in the order a homeowner reads them.

1. **Monthly overview** — total energy, average daily production (total ÷ the
   days that *have a record*, not ÷ the days in the month), performance change
   against last month, and the system status.
2. **Performance analysis** — three charts: this month against last, energy day
   by day, and production against the line the month's own sunlight implies.
3. **Weather impact** — sunlight, cloud, temperature, and energy per unit of
   sunlight, with one paragraph saying whether the weather explains the month.
   What was *not* measured (rain, dust, air quality) is listed, not implied.
4. **Maintenance and system health** — completed work, outstanding work, the
   last recorded cleaning, alerts, and warranty position per cover.
5. **AI Insights** — three to five observations, each tied to a figure above.
6. **Recommendations for next month** — only where the records support one.

### The status system

Four states, not three:

| | |
|---|---|
| green | **Good condition** — records exist and nothing in them needs attention |
| amber | **Maintenance recommended** — a job outstanding, an unacknowledged alert, a shortfall past the warning threshold, or every warranty expired |
| red | **Attention / repair required** — an open incident, an outstanding repair or urgent job, an unacknowledged inspection/maintenance alert, or a shortfall past the alert threshold |
| grey | **Not enough data to assess** — no production records, no maintenance, no alerts |

The fourth state is the important one. Most systems have no monitoring hardware,
and a green light on a system nobody is measuring is an assurance Solink has not
earned. `deriveCondition` in `src/lib/reports/health.ts` is the whole rule, and
every state carries the reasons that produced it plus a line saying nobody has
inspected the system.

Rendered as a coloured dot with the words beside it rather than as an emoji:
colour is never the only signal (the Session 2 accessibility rules), and the
owner's design rules rule out emoji in headings.

### Expected production

`expectedFromIrradiation` in `src/lib/solar/calculations.ts`:
`capacity × measured GHI × performance ratio`, compared only over the days that
have both a production record and measured sunlight.

This is deliberately not `capacity × peak sun hours`. Peak sun hours is an
annual average, so measured against it every Kuwaiti December looks like a
failing system and every June looks like a miracle. Two limits travel with every
number it produces, and both are printed under the chart: sunlight is measured
on a horizontal plane, so a tilted array sits above the line; and heat losses are
not modelled, which in Kuwait matters for most of the year. It is a reference,
not a target, and nothing calls a shortfall a fault.

## 6. Where it appears in Solink

- **`/reports`** — the *Automatic monthly report* card: the seven stages, what
  the last run did at each of them, when the next run is due, and a *Run it now*
  button that goes through the same pipeline with the trigger recorded as
  `manual`. A report someone asks for is not a different kind of report from one
  that arrives by itself. Each report card carries its status.
- **`/reports/[id]`** — the six sections, a badge saying the report was produced
  automatically, and **View PDF / Download PDF**.
- **`/reports/[id]/pdf`** — the customer-facing document: *Solink Monthly Solar
  Performance Report*, three A4 sheets with a numbered footer, static SVG charts
  and the 🟢🟡🔴 status. `?print=1` opens the browser's save dialog on arrival,
  which is what "Download PDF" links to. Rendered by the browser; Solink renders
  no PDF on the server and stores none, because that needs a rendering service
  and an email provider to be worth having and both are still open.

### The document is written as a document

`ReportDocument.tsx` reads the same stored report as every other surface and
computes nothing new, but it does not talk like the app:

- **No internal markers.** `[PLACEHOLDER: ELECTRICITY TARIFF]` is how Solink
  talks to itself; the page prints "an electricity tariff is not set for this
  account" instead. `plain()` strips any marker that slips through.
- **No classification jargon and no DEMO banners.** The honesty rules are
  unchanged underneath — the app's surfaces keep their badges — but a customer
  report covered in warnings reads as a draft.
- **It still will not present a simulated series as a measurement.** A report
  built on simulated production carries one line in the footer saying so. One
  calm sentence, once, rather than a banner on every figure. That line is the
  only demo wording the document will ever contain, and it disappears the moment
  the figures are real.
- **Notifications** — one per stored report, in-app.
- **`/admin/integrations`** — connected or not, booleans only.
- **`/admin`** — `REPORT_AUTOMATION_RUNNER` in the decisions card, resolving to
  "partial" when only one of the two keys is set.

---

## 7. The code

| | |
|---|---|
| `src/lib/automation/auth.ts` | The shared-secret gate. |
| `src/lib/automation/dataset.ts` | Collect and combine. Service-role client, scoped by system id. |
| `src/lib/automation/weatherStore.ts` | The month's sunlight, from Supabase first and the archive only on a miss. |
| `src/lib/automation/run.ts` | The pipeline, and `systemsDueForMonth`. |
| `src/lib/reports/build.ts` | The arithmetic, shared by the button and the schedule so the two cannot disagree. |
| `src/lib/reports/health.ts` | The four-state condition and the warranty position. Deterministic; no model involved. |
| `src/app/(app)/reports/[id]/ReportSections.tsx` | The six sections, in the app. |
| `src/app/(app)/reports/[id]/pdf/ReportDocument.tsx` | The printable A4 document. |
| `src/app/(app)/reports/_components/PdfButtons.tsx` | View PDF / Download PDF. |
| `src/lib/ai/monthlyReport.ts` | What Claude is allowed to say about this month. |
| `src/lib/weather/openmeteo.ts` | Measured sunlight (ERA5 reanalysis, non-commercial tier). |
| `src/app/api/automation/monthly-report/**` | The three endpoints. |
| `src/app/(app)/reports/_components/ReportAutomation.tsx` | The card. |
| `automation/claude-schedule/` | The routine prompt and its create body. |
| `supabase/migrations/0009_solink_report_automation.sql` | `report_runs`, `reports.generated_by`. |

---

## 8. Known limits

- **Open-Meteo's free tier is non-commercial.** The day Solink charges anyone,
  the sunlight source has to be revisited. It is ERA5 reanalysis for the area,
  not a sensor on the roof, and the report says so.
- **No production hardware.** Until `[PLACEHOLDER: SOLAR MONITORING HARDWARE/API]`
  is decided, most systems have no records to report on and a run will say
  exactly that.
- **Delivery is in-app only.** No email provider is chosen, so the report waits
  in Solink. A run never claims to have sent anything anywhere.
- **The PDF is made by the browser, not the server.** `/reports/[id]/pdf` is a
  print-laid-out page; "Download PDF" opens the save dialog. A server-rendered
  file, archived per month and attachable to an email, needs a rendering service
  and the email provider decision first. Until then there is no PDF to store, so
  `reports.pdf_path` and the `reports` storage bucket stay unused.
- **One report per system per month.** Re-running replaces it.
- **Demo months are never stored.** `saveReport` refuses a payload that looks
  demo before it checks the mode, the generator is not rendered in demo mode,
  and `runMonthlyReport` skips the store and notify stages when the assembled
  report is demo. To review the design without hardware, run in demo mode: every
  section renders, built by this same code from the simulated series
  (`src/lib/demo/report.ts`), with every derived figure classified demo.
- **The routine runs once a month, and a missed fire is missed.** Nothing
  re-queues it. The next month's run only covers the next month, so a gap is
  filled by pressing *Run it now* for that month, or by running the routine and
  temporarily widening it. `already_reported` means a re-run is safe.
