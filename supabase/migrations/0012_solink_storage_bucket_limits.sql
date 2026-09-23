-- ============================================================================
-- Solink — storage bucket size and type limits (security review fix, 2026-09-23)
--
-- Finding: every upload path already checks file size and type in the
-- server action (profile/actions.ts, incidents/actions.ts, provider/actions.ts:
-- image/*, 8 MB; manufacturer/actions.ts: PDF/PNG/JPEG/WebP, 15 MB) — but the
-- storage buckets themselves had no matching limit, so a signed-in person
-- calling Supabase storage directly (skipping the Next.js server action
-- entirely) could upload a file of any size or type. This closes that gap at
-- the only place a direct call cannot get around: the bucket itself.
--
-- Matches the app's own limits exactly, so nothing a legitimate upload does
-- today changes. No RLS policy, table, or row touched.
-- ============================================================================

update storage.buckets set file_size_limit = 8 * 1024 * 1024, allowed_mime_types = array['image/*']
where id in ('roof-photos', 'panel-images', 'incident-images', 'maintenance-images');

update storage.buckets set file_size_limit = 15 * 1024 * 1024, allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
where id = 'product-documents';

-- No code path in this repo writes to "reports" yet (reserved for a future
-- feature); a type allow-list would be a guess, so only a size cap is set.
update storage.buckets set file_size_limit = 20 * 1024 * 1024
where id = 'reports';
