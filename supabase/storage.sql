-- Campus Care — Supabase Storage setup for photo consults.
-- Run after schema.sql, in the SQL editor.

insert into storage.buckets (id, name, public)
values ('photo-submissions', 'photo-submissions', false)
on conflict (id) do nothing;

-- Students upload into a folder named after their own user id: `${auth.uid()}/appointment-${id}/photo.jpg`
drop policy if exists "photo_upload_own_folder" on storage.objects;
create policy "photo_upload_own_folder" on storage.objects for insert
  with check (
    bucket_id = 'photo-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Any authenticated user (student or doctor) can read — access is already gated one
-- layer up by the photo_submissions table's RLS policy which checks appointment ownership.
drop policy if exists "photo_read_authenticated" on storage.objects;
create policy "photo_read_authenticated" on storage.objects for select
  using (bucket_id = 'photo-submissions' and auth.role() = 'authenticated');
