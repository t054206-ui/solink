# Solink — legal notes on the privacy policy and terms

_Written 2026-09-21 by Claude at the owner's request, from public sources read
that day. This is a research memo for the owner and for the lawyer who reviews
the documents, not legal advice. Where a source could not be read in full, it
says so._

## Which Kuwaiti rules apply to Solink

Kuwait has no single, cross-economy data-protection law. Three instruments matter:

| Instrument | Applies to | Relevance to Solink |
| --- | --- | --- |
| **Law No. 20 of 2014 on Electronic Transactions** and its Executive Regulation (Ministerial Resolution 48 of 2014, in force 4 January 2015) | Public and private entities handling electronic records that contain personal data, in civil, commercial and administrative transactions | **The baseline that applies to Solink.** Articles 32–36 (as summarised by Chambers): secure the person's consent before collecting personal data and state the purpose; keep it accurate and secure; the person may access, obtain a record of, correct and delete their data; requests come from the person or a legal representative (Exec. Reg. arts 25–26). Consent may be inferred from affirmative conduct (art. 4), so an unticked-by-default checkbox is more than the minimum. Penalties under the law reach three years' imprisonment and fines from KWD 5,000. |
| **CITRA Data Privacy Protection Regulation**: Resolution No. 42 of 2021, replaced by **Administrative Decision No. 26 of 2024** | Since the 2024 revision, **only CITRA-licensed telecom and internet service providers** ("Licensees"). The 2021 text had read as if it covered any website or app; 2024 narrowed it. | **Does not bind Solink directly** (Solink holds no CITRA licence). Its standards are still the best local yardstick and are cheap to meet: written privacy policy; explicit consent before collection; notify users when data is transferred outside Kuwait, naming the countries; breach notification to CITRA and to affected users within 24 hours (art. 6); users may withdraw consent and have their data deleted (art. 4(10)–(11)). No DPO, no registration. |
| **Law No. 63 of 2015 on Combating Information Technology Crimes** | Everyone | Unauthorised access to and tampering with data are offences (six months to ten years, fines KWD 500–20,000 by tier). Relevant to security duties, not to the wording of the policy. |

There is **no national data-protection authority** and no registration or
notification duty for a non-licensed operator. CITRA takes complaints only
about Licensees (CITRA Law art. 49). For Solink, a complaint route is the
operator itself, then the ordinary courts; the policy says so.

## What was done in the documents and the product on 2026-09-21

- **Operator, contact, governing law** filled on the owner's word: the Solink
  team (four named people, unincorporated), `t054206@coded.edu.kw`, the laws
  and courts of Kuwait. A lawyer may want a registered entity named once one
  exists; the value lives in `src/lib/content/legal.ts` (`LEGAL_VALUES`).
- **International transfer** stated with countries: storage in India
  (Supabase ap-south-1); processing in the United States when the AI agent
  and Google Maps are used (Anthropic, Google, Vercel); WeatherAPI.com outside
  Kuwait. Wording modelled on DPPR art. 4(11) although Solink is not a
  Licensee.
- **Consent** moved from a passive sentence to an explicit, unticked checkbox
  at sign-up that names the terms, the privacy policy and the transfer outside
  Kuwait. Both sign-up buttons stay disabled until ticked. The tick is
  recorded on the Supabase user (`user_metadata.consent`: version = date of
  the documents, timestamp, the three items). A Google sign-in that skipped
  the form, and any account that predates the documents, is sent once to
  `/consent` by `/auth/callback` and by `proxy.ts`. Changing `LEGAL_UPDATED`
  asks everyone again. This satisfies "consent before collection, purpose
  stated" under Law 20/2014 art. 32 and is at least as strong as the DPPR's
  explicit-consent standard.
- **Withdrawal** = asking for deletion (policy §Your choices), matching DPPR
  art. 4(10) and Law 20/2014 art. 36 in substance. There is still no
  self-service delete; see Session 7 to-do.
- **Rights** now cite Law No. 20 of 2014 by name in the policy.
- **Breach** wording: "without undue delay". The 24-hour DPPR clock does not
  bind Solink, but the operator should treat 24 hours as the target; the
  handoff says so.

## Open points for the lawyer

1. Whether the operator should be a registered entity before accounts scale,
   and the wording of liability limits for an unincorporated team.
2. Whether Law 20/2014's consent for cross-border processing is satisfied by
   the checkbox text, or whether the countries should appear in the checkbox
   sentence itself (they appear one click away, in the policy).
3. Whether any sectoral rule applies to a platform that intermediates
   electricity-related installations (Ministry of Electricity, Water and
   Renewable Energy approvals are already stated as the homeowner's duty).
4. Arabic legal terminology: the Arabic is a faithful translation by Claude,
   not a lawyer's Arabic.

## Sources read 2026-09-21

- DLA Piper, Data Protection Laws of the World, Kuwait: https://www.dlapiperdataprotection.com/?t=law&c=KW
- Chambers, Data Protection & Privacy 2026, Kuwait: https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/kuwait
- CITRA, Resolution No. 42 of 2021 (PDF, text extraction failed; the scope article reads "shall apply to the public and private…"): https://www.citra.gov.kw/sites/en/LegalReferences/Resolution-No-42-On-Data-Privacy-Protection-Regulation.pdf
- Al Tamimi & Company on the 2024 regulation: https://www.tamimi.com/news/communications-and-information-technology-regulatory-authority-has-issued-new-data-privacy-regulations/
- Access Partnership alert on Decision 26/2024: https://accesspartnership.com/opinion/access-alert-kuwaiti-regulator-introduces-new-data-protection-regulation/
- Law No. 20 of 2014 (English translation, KDIPA): https://kdipa.gov.kw/wp-content/uploads/2022/08/قانون-المعاملات-الالكترونية-20-لسنة-2014-مترجم-باللغة-الانجليزية.pdf
