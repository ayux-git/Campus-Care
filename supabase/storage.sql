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

-- Storage policies don't inherit table RLS, so reads are gated here directly:
-- the uploader can read their own folder; the assigned doctor can read an
-- appointment's photos; any doctor can read wound-camera photos (that queue
-- is picked up by whichever doctor is available).
drop policy if exists "photo_read_authenticated" on storage.objects;
drop policy if exists "photo_read_owner_or_doctor" on storage.objects;
create policy "photo_read_owner_or_doctor" on storage.objects for select
  using (
    bucket_id = 'photo-submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.photo_submissions ps
        join public.appointments a on a.id = ps.appointment_id
        join public.doctors d on d.id = a.doctor_id
        where ps.image_path = storage.objects.name and d.user_id = auth.uid()
      )
      or (
        public.current_role_name() = 'doctor'
        and exists (select 1 from public.wound_reports w where w.image_path = storage.objects.name)
      )
    )
  );
