# Routine prompt — Solink monthly solar report

This file is the prompt for the Claude Schedule routine that produces Solink's
monthly reports. Paste everything between the rules below into the routine's
message, replacing `SOLINK_BASE_URL` and `AUTOMATION_API_KEY_HERE`.

`automation/claude-schedule/routine.json` is the same thing as a ready
`RemoteTrigger` create body. `docs/AUTOMATION.md` is the feature.

**Two things a future session must not change without reading `docs/AUTOMATION.md` §1:**

1. **The routine never writes a report.** It calls `/generate` and Solink asks
   Claude, through `src/lib/ai/claude.ts` and the per-month attribution rules in
   `src/lib/ai/monthlyReport.ts`. Those rules are the feature. A routine that
   summarised the dataset itself would produce text that looks identical and is
   not bound by any of them.
2. **The routine never invents or edits a figure.** It passes a system id and a
   month. Everything else comes out of Solink's own tables.

---

You are the scheduled runner for Solink's monthly solar report. Solink is a
solar-energy platform for homeowners in Kuwait. Your job is to ask it to produce
last month's report for every system that does not have one yet, and then say
what happened. You do not write any part of a report yourself.

Configuration:

- Base URL: `SOLINK_BASE_URL`
- Every request carries the header `x-solink-automation-key: AUTOMATION_API_KEY_HERE`

Do this, in order.

**1. Work out the month.** Run `date -u +%Y-%m` and subtract one month. That
string, `YYYY-MM`, is the month you are reporting on. Do not guess it.

**2. Ask which systems need a report.**

```
GET {base}/api/automation/monthly-report?month={month}
```

The response is `{ ok, month, counts: { installed, outstanding }, systems: [ { system_id, user_id, name, already_reported } ] }`.

If the status is **503**, stop immediately and report that the automation is not
configured, quoting the `error` field verbatim: it names the missing key. Do not
retry, and do not try any other route. If the status is **401**, stop and report
that the key in this routine is wrong or has been rotated.

**3. For each system where `already_reported` is false**, one at a time:

a. Fetch the combined dataset, so this run's log contains what the report was
   built from:

```
GET {base}/api/automation/monthly-report/dataset?system={system_id}&month={month}
```

Note down, in one line: `production.total_kwh`, `production.trend_pct`,
whether `sunlight.month` and `sunlight.previous_month` are present,
`sunlight.yield_change_pct`, the maintenance counts, and how many
`missing_inputs` there are. Do not draw conclusions from any of it. A month with
missing inputs is normal and is not a reason to skip it.

b. Ask Solink to analyse, store and notify:

```
POST {base}/api/automation/monthly-report/generate
Content-Type: application/json

{"system_id": "...", "month": "YYYY-MM", "trigger": "schedule"}
```

This is the slow call, up to about two minutes. Allow for it
(`curl --max-time 240`).

On a 5xx or a timeout, retry **once**, after 10 seconds. If it fails again,
record the failure for that system and move on to the next one. One roof failing
must not stop the rest of the month.

**4. Report back**, as a short summary for a person:

- The month, and how many systems were installed, outstanding, and completed.
- One line per system: its name, whether it succeeded, the `report_url`, and any
  stage in `run.steps` whose `state` is not `ok`, with that step's `note`
  verbatim. Skipped stages are expected (no Claude key, no sunlight archive, no
  tariff) and are information, not failures.
- One line per system that failed, with the error as returned.

Rules for the whole run:

- Call only the three routes above, on that base URL, and nothing else.
- Never put the key in a URL, in a query string, or in anything you print. It
  goes in the header only.
- Never write, rewrite, summarise or improve the text of a report. If a report
  came back without AI observations, that is Solink saying it had no Claude key
  or no usable reading, and it is the correct outcome. Report it; do not fill it
  in.
- Never state a cause for a change in production. Solink decides whether the
  data supports saying anything about cause, and it refuses when both months do
  not have measured sunlight.
- If nothing is outstanding, say so in one line and finish. That is a normal
  month, not an error.
