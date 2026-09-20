# Solink — data cleaning and provenance log

Every decision taken about messy, conflicting or unusable source data, with the
evidence for it. Nothing in this file is a summary: each entry records the
original value, what was stored instead, and why, so that any figure in the
catalogue can be traced back to the page it came from and the judgement that
put it there.

The rule the entries follow: **a conflict is recorded, never silently
resolved.** Where two sources disagree, the manufacturer's own datasheet wins
over a reseller's transcription of it, and the rejected value stays written down
here.

---

## Import 2026-09-20 — LONGi Hi-MO 7 panels, Kuwait market

**Sources used**

| Role | Source | URL |
|---|---|---|
| Manufacturer specifications | LONGi official datasheet, `LR7-72HGD 585~620M`, marked **Preliminary V05 (20230901)** | `https://static.longi.com/2_LR_7_72_HGD_585_620_M_V2_30_30_and_15_V05_EN_c6514bcafc.pdf` |
| Manufacturer product page | LONGi Hi-MO 7 | `https://www.longi.com/en/products/modules/hi-mo-7/` |
| Kuwait price and availability | Alwan Solar / ألوان الطيف, Kuwait retailer | product URLs per entry below |

**How the datasheet was read.** The PDF carries no text layer: `/Font` count is
zero, its three embedded images are photographs, and the tables are vector
paths. Text extraction returned nothing, so page 2 was rendered with macOS
Quartz (`PDFPage.dataRepresentation` via JXA) and `qlmanage`, and the values
were read from the render. No third-party or SEO "datasheet" page was used at
any point.

---

### C-001 — 615 W electrical values: retailer contradicts the datasheet

| | |
|---|---|
| **Field** | `voc_v`, `isc_a`, `vmp_v`, `imp_a` on the 615 W panel |
| **Original (retailer)** | Voc 48.58 V · Isc 16.00 A · Vmp 40.71 V · Imp 13.84 A → listed as 15.11 A |
| **Official (LONGi LR7-72HGD-615M)** | Voc 52.55 V · Isc 14.73 A · Vmp 44.44 V · Imp 13.84 A |
| **Stored** | The datasheet values |
| **Source URLs** | retailer `https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-615w` · datasheet as above |
| **Decision** | Reject the retailer's four electrical values; keep the datasheet's |
| **Reason** | Power (615 W), efficiency (22.8 %), dimensions (2382×1134×30 mm), weight (33.5 kg) and all three temperature coefficients match the datasheet exactly. Only these four diverge, which is the signature of values transcribed from a different module. A manufacturer datasheet outranks a reseller's copy of it |
| **Verification state** | `unverified` — stored with `source_conflict_note` so the disagreement is visible to the user |

### C-002 — 585 W module efficiency

| | |
|---|---|
| **Field** | `module_efficiency_pct` on the 585 W panel |
| **Original (retailer)** | 22.6 % |
| **Official** | **21.7 %** for the `-585M` bin. 22.6 % is the `-610M` bin in the same table |
| **Stored** | 21.7 % |
| **Source URLs** | retailer `https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-longi-585w` · datasheet as above |
| **Decision** | Use the per-bin value from the datasheet |
| **Reason** | The retailer quoted a figure belonging to a different power bin of the same series. The datasheet lists efficiency per bin: 585→21.7, 590→21.8, 595→22.0, 600→22.2, 605→22.4, 610→22.6, 615→22.8, 620→23.0 |
| **Verification state** | `unverified` |

### C-003 — Cell count

| | |
|---|---|
| **Field** | `number_of_cells` |
| **Original (retailer)** | 132 half-cells, 6 × 22 |
| **Official** | **144, 6 × 24** ("Cell Orientation", Mechanical Parameters) |
| **Stored** | 144 (6 × 24) |
| **Source URLs** | retailer 615 W listing · datasheet as above |
| **Decision** | Use the datasheet |
| **Reason** | Mechanical parameters are series-wide and unambiguous in the manufacturer's own table |
| **Verification state** | `unverified` |

### C-004 — JinkoSolar 590 W listing: rejected, not imported

| | |
|---|---|
| **Field** | `rated_power_w`, and the record as a whole |
| **Original** | Listing **title** says 590 W; listing **body** describes the same product as 550 W |
| **Kuwait URL** | `https://alwansolar.com/products/%D8%A7%D9%84%D9%88%D8%A7%D8%AD-%D9%84%D9%88%D8%AD%D8%A9-jinko-590w-%D9%83%D9%81%D8%A7%D9%84%D9%87-%D8%B3%D9%86%D8%A9` (preserved for revisiting) |
| **Price seen** | 39.500 KWD, 2026-09-20 |
| **Stored** | **Nothing. No Jinko product record was created** |
| **Decision** | Exclude from this import |
| **Reason** | Two problems, not one. The power conflict cannot be resolved from any source in hand, and the listing gives no model code and no electrical specifications, so no manufacturer datasheet can be attached. With `rated_power_w` unavailable the record is also unrankable: five of the six recommendation priorities need power or specs, so it could never appear in a result with a reason attached. Its only real datum would be a price for an unidentified object |
| **Revisit when** | A Jinko datasheet or a corrected listing establishes the exact model |
| **Verification state** | Not imported |

### C-005 — "BCT" 610 W bifacial listing: rejected, not imported

| | |
|---|---|
| **Original** | "الواح ‏شفاف وجهين BCT 610W", 35.000 KWD |
| **Stored** | **Nothing** |
| **Decision** | Exclude |
| **Reason** | "BCT" is the retailer's own house brand for lighting products elsewhere in the same catalogue (4 m and 6 m lighting poles, `BCT-OLK-1.0-24 KING` floodlight). It is not identifiable as a panel manufacturer, and the listing body is 22 characters with no specifications. Importing it would require inventing a manufacturer |
| **Verification state** | Not imported |

### C-006 — Sources rejected as evidence

| Source | Why rejected |
|---|---|
| `longi-solar.net` | Not LONGi's domain despite the name |
| `rosenpv.com`, `shaobosolar.com` | Chinese exporter pages with Kuwait keyword landing pages. Not evidence that a product is available in Kuwait |
| `blinkartdesign.pl` | SEO PDF; attributes the same 2382 × 1134 dimensions to a *Jinko* 615 W, demonstrating why third-party spec pages are unusable |

**Rule applied:** a manufacturer selling internationally is not evidence of
Kuwait availability, and a page mentioning Kuwait is not a Kuwait supplier.

### C-007 — Datasheet revision status

The datasheet is marked **Preliminary V05 (20230901)** and its internal title
reads 预览版 (preview version). It is the document LONGi publishes on the Hi-MO 7
product page. Recorded in `source.manufacturer_source_note` and in each
product's `verification_note` so no reader mistakes it for a final revision.

### C-008 — What Kuwait availability does and does not mean

The retailer's product JSON reports `available: true` and the listings were
updated 2026-09-20. Stored as `kuwait_availability: "listed_by_retailer"` with
the note "Listed by retailer, not independently verified". No stock level was
confirmed, nobody was contacted, and no second source corroborates it.

### C-009 — Prices

45.000 / 47.500 / 47.500 KWD, read from the retailer's own pages on 2026-09-20
and stored exactly as published, with `kuwait_price_observed_at`. **No currency
was converted.** Installation, maintenance and cleaning costs remain
`unavailable`: no Kuwait source publishes them, and an unsourced figure would
flow straight into payback and total-cost figures.
