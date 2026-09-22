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

### I-001 — Product images for the three LONGi Hi-MO 7 records (2026-09-21)

| | |
|---|---|
| **Field** | `images` on LR7-72HGD-585M, -615M, -620M |
| **Stored** | Two official LONGi renders, front and back, linked from the manufacturer's Hi-MO 7 product page: `https://static.longi.com/Images_412x612_11869e6bbf.png`, `https://static.longi.com/Hi_MO_7_back_01421a4e84.png` |
| **Source URL** | `https://www.longi.com/en/products/modules/hi-mo-7/` (recorded in `source.field_sources.images`) |
| **Rejected** | The Kuwait retailer's listing photo (`alwansolar.com/cdn/shop/files/HVFCSSDAQ1053*.png`), which shows a 6 × 22 = 132-cell module with a LONGi logo pasted on. The datasheet gives 144 cells (6 × 24); the front render shows 144. Same disagreement as C-003. |
| **Caveat** | The renders are the manufacturer's for the LR7-72HGD series as a whole, not photographs of a specific power bin. Recorded in `source.image_note` on each row. The images are linked from LONGi's CDN, not copied; if LONGi moves them the card falls back to "No image provided". |

---

## Import 2026-09-22 — one current residential module series per manufacturer (Session 8)

Eight rows, two power bins each, for the four manufacturers added on
2026-09-22. Every technical value was read from the manufacturer's own
datasheet. **No Kuwait price or retailer listing was found for any of these
models on 2026-09-22, so `price` is unavailable and no `kuwait_*` field is
set.** No image URL was recorded; the cards read "No image provided".

**Sources used**

| Manufacturer | Series and bins | Datasheet (version) | Page linked from |
|---|---|---|---|
| JinkoSolar | Tiger Neo 54HL4M-BDV, 505 W and 520 W | `JKM495-520N-54HL4M-BDV-F1-EN`, © 2025 — `https://jinkosolarcdn.shwebspace.com/uploads/JKM495-520N-54HL4M-BDV-F2-EN.pdf` | `https://www.jinkosolar.com/en/site/tigerneo` |
| Trina Solar | Vertex S+ TSM-NEG9R.28, 445 W and 460 W | `TSM_EN_2024_C` — `https://static.trinasolar.com/sites/default/files/Datasheet_Vertex%20S+_NEG9R.28_EN_2024_C_web.pdf` | `https://www.trinasolar.com/en-glb/` |
| JA Solar | DeepBlue 4.0 Pro JAM54D40 LB, 450 W and 460 W | `Global-EN-20241105A` — `https://www.jasolar.eu/fileadmin/data/products/4.0/JAM54D40_LB_25y.pdf` | `https://www.jasolar.eu/en/products/jam54d40-lb-25y` |
| Canadian Solar | TOPHiKu6 All-Black CS6.1-54TM-H, 450 W and 465 W | `V1.4C25_F23_D2_TX`, April 2025 — `https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/01/CS-Datasheet-TOPHiKu6_All-Black_CS6.1-54TM-H_v1.4C25_F23_D2_TX.pdf` | `https://www.canadiansolar.com/na/tophiku6/` |

### C-006 — JinkoSolar: a 2021 sheet found first, replaced by the 2025 one

| | |
|---|---|
| **Original** | Web search returned `JKM460-480N-60HL4-(V)-F1-EN` (Tiger Neo 60HL4, © 2021, 12-year product warranty, -40 to +85 °C) |
| **Stored** | `JKM495-520N-54HL4M-BDV-F1-EN` (© 2025), the sheet the official Tiger Neo page links today |
| **Decision** | Import the series the manufacturer currently presents, not the first PDF a search engine returns |
| **Note** | The 2025 sheet states a **15-year** product warranty and an operating range of **-40 to +70 °C**; both stored as printed. The URL says F2, the document F1-EN; recorded in the source note |

### C-007 — Trina Solar: column order in the extracted text

| | |
|---|---|
| **Field** | `isc_a`, `vmp_v`, `imp_a`, `voc_v` |
| **Issue** | The text layer lists each bin's electrical values in the order Isc, Vmp, Imp, Voc, not the label order printed on the page |
| **Check** | Vmp × Imp must approximate Pmax: 45.4 V × 10.14 A = 460.4 W for the 460 W bin, 44.3 × 10.05 = 445.2 W for the 445 W bin. The alternative pairing (45.4 × 10.81 = 490.8 W) fails, and Isc must exceed Imp |
| **Stored** | 460 W: Voc 53.8, Isc 10.81, Vmp 45.4, Imp 10.14, 23.0 %. 445 W: Voc 52.6, Isc 10.71, Vmp 44.3, Imp 10.05, 22.3 % |
| **Note** | Product warranty printed as "up to 25 years" / "25 year Product Workmanship Warranty"; stored as 25 with the wording in the verification note |

### C-008 — JA Solar: official site refuses automated requests; PDF has no text layer

| | |
|---|---|
| **Issue** | `jasolar.com` answered HTTP 403/406 to every automated request. The datasheet was taken from `jasolar.eu`, JA Solar's own European site. The PDF has no text layer |
| **How read** | Both pages rendered with PyMuPDF at 220 dpi and the tables read from the images |
| **Stored** | 450 W: Voc 39.30, Vmp 32.82, Isc 14.48, Imp 13.71, 22.5 %. 460 W: Voc 39.70, Vmp 33.17, Isc 14.64, Imp 13.87, 23.0 %. Vmp × Imp = 450.0 and 460.1 W |

### C-009 — Canadian Solar: regional sheet, and no printed end-of-warranty percentage

| | |
|---|---|
| **Issue 1** | The sheet the official TOPHiKu6 page links is the US (TX) regional edition, "Assembled in the US from imported components". Module electrical and mechanical figures are the module's; certificates and the 25-year product warranty are region-dependent by the sheet's own footnote ("available only for products installed and operating on rooftops in certain regions") |
| **Stored** | Figures as printed; the footnote verbatim in `specs.additional.product_warranty_note` |
| **Issue 2** | The sheet states "1st year power degradation no more than 1 %" and "subsequent annual power degradation no more than 0.4 %" over 30 years, but prints no end-of-warranty percentage |
| **Decision** | `performance_warranty_end_pct` left **unavailable**; the two limits stored in `specs.additional`. Computing 87.4 % would have been a Solink calculation stored as manufacturer data |
| **Max system voltage** | 1000 V (IEC/UL) as printed, lower than the 1500 V of the other three series |

### Not imported

Nothing was rejected in this batch. Bins other than the two per series were
left out only to keep the first import small; the datasheets cover every bin
and the same file can be extended.

### C-010 — Product renders for the eight modules (added later on 2026-09-22)

| | |
|---|---|
| **Field** | `images` on the eight rows imported earlier that day |
| **Rule** | Only an image the manufacturer's own product page serves for this series; the page is recorded in `source.field_sources.images`. Nothing from resellers or image searches |
| **JinkoSolar** | `…/uploads/6a69c67d/54-BDV.jpg` from the official download centre, where it sits beside "495-520W N-Type 54 Bifacial Module With Dual Glass", i.e. this series. A `78-182x182 BDV.jpg` image on the Tiger Neo page was rejected: 78-cell, a different module |
| **Trina Solar** | `TSM-NEG9R.28-1.png` from `vertexsplus.trinasolar.com`, named for the exact model; render shows 6 × 24 = 144 cells, matching the datasheet |
| **JA Solar** | `JAM_54_D40_LB_winkel_vorne.jpg` from the JAM54D40 LB product page (its og:image); render shows 6 × 18 = 108 cells, matching |
| **Canadian Solar** | `TOPHiKu6-detailed-48.png`, the render the official TOPHiKu6 page serves. The file name says 48 but the render shows 6 × 18 = 108 half-cells, i.e. the 54-cell CS6.1-54TM; kept as the page's own image for the series, with this note |
| **LONGi** | Unchanged: the two official renders from the 2026-09-20 import load (HTTP 200, also with a Solink referer) |

## Import 2026-09-22 (part 2) — one flagship series per manufacturer, every bin (Session 9)

Twenty-eight rows across the five manufacturers, every power bin the datasheet
lists, from `supabase/imports/2026-09-22_manufacturer_series_2.sql` (generated
from the datasheet readings by a script that checked Vmp × Imp ≈ Pmax,
Vmp < Voc, Imp < Isc and power ÷ area ≈ efficiency for every bin before
writing). All Unverified, zero validation flags. **No Kuwait price or retailer
listing was found for any of these models on 2026-09-22; `price` is
unavailable.** `series` is set on every row and two `solar_product_sources`
rows (datasheet, product page) record provenance per product.

**Sources used**

| Manufacturer | Series and bins | Datasheet (version) | Page linked from |
|---|---|---|---|
| LONGi | Hi-MO X6 Scientist LR7-72HTH, 620 / 625 / 630 W | `20240511 V2` — `https://static.longi.com/LR_7_72_HTH_620_630_M_30_30_and_15_Frame_Scientist_20240511_V2_ea4bd3ee93.pdf` | `https://www.longi.com/en/products/modules/hi-mo-x6/` |
| JinkoSolar | Tiger Neo 66HL4M-(V) mono-facial, 610–635 W (six bins) | `JKM610-635N-66HL4M-(V)-F2-EN`, © 2024 — `https://www.jinkosolar.com/uploads/JKM610-635N-66HL4M-(V)-F2-EN.pdf` | `https://www.jinkosolar.com/en/site/tigerneo` |
| JA Solar | DeepBlue 4.0 Pro JAM72D42 LB bifacial, 625–650 W (six bins) | `Global-EN-20241122A` — `https://www.jasolar.eu/fileadmin/data/products/4.0/JAM72D42_LB.pdf` | `https://www.jasolar.eu/en/products/jam72d42-lb` |
| Trina Solar | Vertex N TSM-NEG21C.20 bifacial, 700–725 W (six bins) | `TSM_APAC_EN_2024_B` — `https://static.trinasolar.com/sites/default/files/DT-M-0042%20APAC%20EN%20G%20210Vertex_NEG21C.20_700-725%202024_B_web.pdf` | `https://www.trinasolar.com/en-glb/` (home page; see C-014) |
| Canadian Solar | TOPBiHiKu6 CS6.2-66TB-H bifacial, 590–620 W (seven bins) | `V1.1_F68_L2B_TX`, April 2026 — `https://www.canadiansolar.com/wp-content/uploads/sites/3/2026/04/CS-Datasheet-TOPBiHiKu6_CS6.2-66TB-H_v1.1_F68_L2B_TX.pdf` | `https://www.canadiansolar.com/na/topbihiku6/` |

### C-011 — LONGi: the datasheet does not name the cell type

| | |
|---|---|
| **Field** | `cell_technology` on the three LR7-72HTH rows |
| **Issue** | The LR7-72HTH sheet states the cell layout (144, 6 × 24), single 3.2 mm glass and the electrical data, but never names the cell technology |
| **Stored** | A wording that says exactly that, and that the official Hi-MO X6 page describes the series' HPBC back-contact cells. `source.field_sources.cell_technology` points at the product page, not the datasheet |
| **Also** | First-year degradation is printed as "<1 %"; stored as 1 with the wording in the unit. Warranty 15 y product / 25 y power, 89.4 % at year 25, as printed; the degradation key is `annual_degradation_year_2_25_pct` |

### C-012 — JinkoSolar: mono-facial variant, two printed limits

| | |
|---|---|
| **Field** | `operating_temperature_range_c`, `max_system_voltage_v` |
| **Issue** | The 66HL4M-(V) sheet prints the operating range as -40 to +70 °C and the system voltage as "1000/1500 VDC (IEC)" |
| **Stored** | Both as printed; 1500 stored as the numeric maximum with the pair in `specs.additional.max_system_voltage_note` |
| **Model** | The datasheet's own model string, `JKM6xxN-66HL4M-(V)`, parentheses included |
| **Image** | None. The download centre serves `66-630-BDV.jpg`, which is the bifacial dual-glass 66-cell variant, not this mono-facial one; rejected |

### C-013 — JA Solar: text layer present this time

| | |
|---|---|
| **Issue** | Unlike the JAM54D40 sheet (C-008), this PDF has a text layer. The STC table lists bins out of order (645, 650, 625, 630, 635, 640) |
| **Check** | Each bin paired by Vmp × Imp ≈ Pmax (43.71 × 14.30 = 625.1 … 44.67 × 14.55 = 650.0) |
| **Image** | `JAM_72_D42_LB_winkel_vorne.jpg`, the og:image of the official JAM72D42 LB page; render shows 6 × 24 = 144 cells, matching |

### C-014 — Trina Solar: interleaved columns, no reachable product page, 2025 sheet missing

| | |
|---|---|
| **Field** | `voc_v`, `isc_a`, `vmp_v`, `imp_a` |
| **Issue 1** | The extracted text interleaves STC, NOCT and BNPI columns and swaps the 715 and 720 W blocks |
| **Check** | Paired by Vmp × Imp ≈ Pmax: 40.5 × 17.29 = 700.2, 40.7 × 17.33 = 705.3, 40.9 × 17.36 = 710.0, 41.1 × 17.40 = 715.1, 41.3 × 17.44 = 720.3, 41.5 × 17.47 = 725.0. Isc always above Imp; efficiency 22.5–23.3 % matches power ÷ 3.106 m² |
| **Issue 2** | The 2025 edition (715–740 W) returned HTTP 404; the 2024 B APAC edition the static server serves was used and is named in every note |
| **Issue 3** | No Vertex N product page could be opened without JavaScript; the manufacturer URL is the official site's home page and no image was recorded |
| **Model** | `TSM-7xxNEG21C.20`, following the `TSM-445NEG9R.28` pattern of the earlier import |

### C-015 — Canadian Solar: regional sheet, no printed end-of-warranty percentage (again)

| | |
|---|---|
| **Issue** | As C-009: US (TX) regional edition, "Assembled in the US from imported components"; certificates and warranty terms are region-dependent per its footnotes. Prints 1 % first-year and 0.4 %/year limits over 30 years but no end percentage |
| **Stored** | `performance_warranty_end_pct` unavailable, limits in `specs.additional`; product warranty 12 years as printed, with the footnote wording in `product_warranty_note`. System voltage 1500 V (IEC/UL), snow 6000 Pa, wind 5400 Pa |
| **Image** | `TOPBiHiKu6-Detailed.png`, the render the official TOPBiHiKu6 page serves; shows 6 × 22 = 132 cells, matching |

### C-016 — Images: what was rejected

| | |
|---|---|
| **Rule** | Only an image the manufacturer's own product page serves for this series (as C-010) |
| **LONGi** | The Hi-MO X6 page serves `X6_Scientist_*.jpg`: a cropped atmospheric shot and a marketing banner, not product renders. No image stored |
| **JinkoSolar** | See C-012. No image stored |
| **Trina Solar** | See C-014. No image stored |

### Not imported

Nothing was rejected in this batch. The 2025 Trina sheet (715–740 W) is the
only document that was wanted and not obtained.
