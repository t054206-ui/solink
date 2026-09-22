-- ============================================================================
-- Solink — manufacturer companies, 2026-09-22 (Session 8, owner's brief)
--
-- Five real photovoltaic module manufacturers as company records. Idempotent:
-- `slug` is unique, so a second run updates in place and never duplicates.
-- Wrapped in one transaction. No product row is touched; the three LONGi
-- Hi-MO 7 panels already reference the LONGi row by manufacturer_id and keep
-- every price, specification, image, source and version.
--
-- What is and is not claimed here:
--   * Legal names and official websites: from each company's own website,
--     opened on 2026-09-22 (HTTP 200; jasolar.com answered 406 to an automated
--     request but resolves). Recorded as sources, status 'unverified': only a
--     Solink administrator marks anything verified, with a note.
--   * Headquarters country: as printed on the same websites.
--   * Headquarters city: only where the company's own About page stated it
--     on 2026-09-22 (JinkoSolar: Shanghai; Canadian Solar: Guelph). The other
--     three are left null and display as "Not provided".
--   * manufacturer_type and market_regions are Solink's own classification
--     of what the company makes and which market Solink lists it for. They
--     are PLATFORM DATA, not a claim that the company operates in Kuwait.
--   * kuwait_available and gcc_available stay NULL: "not yet verified".
--     LONGi's panels are listed by a Kuwait retailer (see the 2026-09-20
--     import), which is a retailer listing, not verified manufacturer
--     presence; that is recorded in availability_note, nothing more.
--   * No logo or cover image URL is invented; the UI shows a fallback.
--   * No products are created for JinkoSolar, Trina Solar, JA Solar or
--     Canadian Solar. They show "No products have been added yet."
-- ============================================================================

begin;

-- LONGi: the existing row (created by the 2026-09-20 import under the name
-- 'LONGi Green Energy Technology'). Renamed to the short company name the
-- brief uses; the legal name carries the full form. Matched by slug first so
-- a re-run finds it, then by the old name for the first run.
update manufacturers set
  name = 'LONGi',
  legal_name = 'LONGi Green Energy Technology Co., Ltd.',
  slug = 'longi',
  headquarters_country = 'China',
  website = 'https://www.longi.com/',
  manufacturer_type = 'Solar Panel Manufacturer',
  market_regions = '{Kuwait,GCC}',
  availability_note = 'Hi-MO 7 modules are listed by a Kuwait retailer (Alwan Solar, read 2026-09-20). A retailer listing is not verified manufacturer presence; Kuwait availability stays unverified until an administrator records a source.'
where slug = 'longi' or name = 'LONGi Green Energy Technology';

insert into manufacturers (name, legal_name, slug, headquarters_country, headquarters_city, website, manufacturer_type, market_regions, verification_status, is_demo)
values
  ('JinkoSolar',     'JinkoSolar Holding Co., Ltd.', 'jinkosolar',     'China',  'Shanghai', 'https://www.jinkosolar.com/',    'Solar Panel Manufacturer', '{Kuwait,GCC}', 'unverified', false),
  ('Trina Solar',    'Trina Solar Co., Ltd.',        'trina-solar',    'China',  null,       'https://www.trinasolar.com/',    'Solar Panel Manufacturer', '{Kuwait,GCC}', 'unverified', false),
  ('JA Solar',       'JA Solar Technology Co., Ltd.','ja-solar',       'China',  null,       'https://www.jasolar.com/',       'Solar Panel Manufacturer', '{Kuwait,GCC}', 'unverified', false),
  ('Canadian Solar', 'Canadian Solar Inc.',          'canadian-solar', 'Canada', 'Guelph',   'https://www.canadiansolar.com/', 'Solar Panel Manufacturer', '{Kuwait,GCC}', 'unverified', false)
on conflict (slug) do update set
  legal_name = excluded.legal_name,
  headquarters_country = excluded.headquarters_country,
  headquarters_city = coalesce(manufacturers.headquarters_city, excluded.headquarters_city),
  website = excluded.website,
  manufacturer_type = coalesce(manufacturers.manufacturer_type, excluded.manufacturer_type),
  market_regions = case when manufacturers.market_regions = '{}' then excluded.market_regions else manufacturers.market_regions end;

-- Sources: one official-website row per company for the website, legal name
-- and headquarters claims above. Re-runnable: rows are keyed on
-- (manufacturer, field, source_url) by the delete below.
delete from manufacturer_sources s using manufacturers m
  where s.manufacturer_id = m.id and m.slug in ('longi','jinkosolar','trina-solar','ja-solar','canadian-solar')
    and s.source_type = 'official_manufacturer_website' and s.date_checked = date '2026-09-22';

insert into manufacturer_sources (manufacturer_id, field, source_name, source_url, source_type, date_checked, verification_status, notes)
select m.id, v.field, v.source_name, v.source_url, 'official_manufacturer_website', date '2026-09-22', 'unverified', v.notes
from (values
  ('longi',          'website',      'LONGi official website',          'https://www.longi.com/en/',            'Opened 2026-09-22, HTTP 200. Supports the website and legal name.'),
  ('jinkosolar',     'website',      'JinkoSolar official website',     'https://www.jinkosolar.com/en/',       'Opened 2026-09-22, HTTP 200. Supports the website and legal name.'),
  ('jinkosolar',     'headquarters', 'JinkoSolar — About us',           'https://www.jinkosolar.com/en/site/aboutus', 'Opened 2026-09-22. Page names Shanghai as headquarters.'),
  ('trina-solar',    'website',      'Trina Solar official website',    'https://www.trinasolar.com/en-glb/',   'Opened 2026-09-22, HTTP 200. Supports the website and legal name. Headquarters city not read from the page; left unprovided.'),
  ('ja-solar',       'website',      'JA Solar official website',       'https://www.jasolar.com/',             'Opened 2026-09-22; the site answered HTTP 406 to an automated request but the domain resolves. Supports the website and legal name. Headquarters city left unprovided.'),
  ('canadian-solar', 'website',      'Canadian Solar official website', 'https://www.canadiansolar.com/',       'Opened 2026-09-22, HTTP 200. Supports the website and legal name.'),
  ('canadian-solar', 'headquarters', 'Canadian Solar — About us',       'https://www.canadiansolar.com/about-us/', 'Opened 2026-09-22. Page names Guelph, Ontario as headquarters.')
) as v(slug, field, source_name, source_url, notes)
join manufacturers m on m.slug = v.slug;

commit;

-- Rollback (manual): the four new rows have no products and can be deleted;
-- the LONGi row must never be deleted while the three Hi-MO 7 products
-- reference it. `delete from manufacturers where slug in ('jinkosolar','trina-solar','ja-solar','canadian-solar');`
