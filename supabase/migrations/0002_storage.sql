-- Storage for original uploaded documents, used by the export route to produce
-- in-place tracked-change .docx files. The uploads bucket is private; access is
-- granted to the anon/publishable role scoped to this bucket only, consistent with
-- the MVP anonymous-access posture (see docs/PRD.md §8 and the deferred-RLS decision).
-- Production hardening (WorkOS auth + per-user storage scoping) is post-MVP.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

drop policy if exists "uploads_anon_insert" on storage.objects;
drop policy if exists "uploads_anon_select" on storage.objects;
drop policy if exists "uploads_anon_update" on storage.objects;

create policy "uploads_anon_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'uploads');

create policy "uploads_anon_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'uploads');

create policy "uploads_anon_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'uploads');
