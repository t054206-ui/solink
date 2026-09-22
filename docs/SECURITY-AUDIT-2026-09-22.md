# Solink — security audit, 2026-09-22 (Session 8, defensive review of the owner's own application)

Method: read every server action, route handler, the proxy, the Supabase
clients and env handling; dumped every RLS and storage policy from the live
project; demonstrated each write-path finding in a rolled-back transaction
with a real non-admin user id; fixed what was safe; re-ran the Supabase
security advisor, type check, lint, `npm audit` and the production build.
No secrets are reproduced here.

## Verdict: SECURITY CHECK NEEDS ATTENTION (two items remain, both yours)

Fixed in this pass: 1 high, 3 medium, 3 low. Remaining: no CSP (medium,
its own task), leaked-password protection off (low, dashboard toggle), no
rate limiting (medium, needs a decision on a store), Supabase error text
surfaced to users in some action results (low).

## Findings

| # | Severity | Category | Where | What | Fixed |
|---|---|---|---|---|---|
| 1 | High | Privilege escalation | `user_profiles` policy "profiles self update" | A signed-in person could set their own `manufacturer_id` / `provider_company_id` and immediately act for that company (products, documents, requests). Demonstrated and rolled back. | Yes, trigger `guard_profile_admin_fields` (0010) |
| 2 | High (cost) | Missing auth on paid routes | `/api/ai/*` (7), `/api/weather`, `/api/geocode` | The proxy excludes `/api`; anyone could call Claude, WeatherAPI and Google through your keys. No user data leaked (RLS returned nothing for anon), but unlimited spend. | Yes, `requireUser()` gate, 401 in Supabase mode |
| 3 | Medium | Broken access control | `maintenance_cases`, `appointments` provider policies FOR ALL | A provider could insert a case or appointment on any homeowner's system and thereby read that system, or move a case to another system. | Yes, provider policies split to read + update; scope trigger (0010) |
| 4 | Medium | History integrity | `solar_passports` "passports installer" FOR ALL | An installer could delete a passport or issue one for a system it did not install. | Yes, installer read/insert/update only; delete admin only; insert checks the system's installer |
| 5 | Low | Data integrity | `cleaning_records`, `repair_records` | `system_id` was free next to the case reference. | Yes, follows the case by trigger |
| 6 | Low | Data integrity | `incidents` owner policy | Could reference another person's system id. | Yes, `owns_system` in with-check |
| 7 | Low | Spoofing | `product_events` insert | `user_id` could be someone else's. | Yes |
| 8 | Medium | Headers | all routes | No Content-Security-Policy. Four other headers were added earlier today. | No, needs allow-list + test pass |
| 9 | Medium | Abuse | login, AI, uploads, analysis | No rate limiting anywhere. | No, needs a store (Upstash/Vercel KV) decision |
| 10 | Low | Error exposure | several server actions | `error.message` from Supabase (constraint names) returned to the UI. | No, cosmetic; log server-side instead |
| 11 | Low | Auth setting | Supabase Auth | Leaked-password protection disabled. | Owner's dashboard |
| 12 | Info | Public reads | `product-documents` bucket, `manufacturer_sources`, `data_sources`, `platform_settings` | Readable without sign-in by design (public catalogue data). | Accepted |

## Checked and found sound

- Authentication: Supabase Auth via cookies (`@supabase/ssr`); proxy refreshes and redirects; `next` parameters validated against open redirects in login, consent and the OAuth callback; consent gate versioned.
- Authorization: every admin action re-checks `user_profiles.role = 'admin'` server-side; manufacturer actions re-derive the company from the session and RLS repeats the check; the manufacturer standing guard (0008) and passport snapshot immutability (0008) hold.
- Secrets: no keys in tracked files or history for the patterns checked; `.env*` ignored; only URL, anon key, browser Maps key and app URL are `NEXT_PUBLIC`; `serverEnv()` throws in the browser; no client file imports it; service-role client exists but is unused by any action.
- Injection: PostgREST query builder throughout; the one `.or(ilike)` search sanitises its input.
- XSS: no `dangerouslySetInnerHTML`; the intro's `innerHTML` writes static markup only; AI answers rendered as text.
- Uploads: type and 8 MB / 15 MB limits enforced server-side; paths under the caller's id or product; buckets private; storage policies by folder.
- CORS: none set (same-origin route handlers). CSRF: Next server actions with origin checks and SameSite cookies.
- Logging: no `console.*` in `src`. Dependencies: `npm audit --omit=dev` 0 vulnerabilities.
- n8n: no webhook code in this repository; cannot be verified from here.
- Payment: not connected; checkout is a labelled placeholder.
