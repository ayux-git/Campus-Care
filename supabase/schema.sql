-- Campus Care — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query) once per project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ============================================================
-- 1. PROFILES — extends auth.users with app-specific fields
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'student' check (role in ('student', 'staff', 'doctor', 'pharmacy_admin')),
  hostel_block text,
  room_no text,
  language_pref text not null default 'en',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- Name etc. come from the signup call's `options.data` (user metadata), which
-- the browser controls, so it may only pick 'student' or 'staff'. Privileged
-- roles ('doctor', 'pharmacy_admin') are read from app metadata, which only the
-- service role key can set (see seed.js), so nobody can sign up as a doctor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, hostel_block, room_no, language_pref)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case
      when new.raw_app_meta_data->>'role' in ('student', 'staff', 'doctor', 'pharmacy_admin')
        then new.raw_app_meta_data->>'role'
      when new.raw_user_meta_data->>'role' in ('student', 'staff')
        then new.raw_user_meta_data->>'role'
      else 'student'
    end,
    new.raw_user_meta_data->>'hostel_block',
    new.raw_user_meta_data->>'room_no',
    coalesce(new.raw_user_meta_data->>'language_pref', 'en')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. DOCTORS — doctor/therapist directory
-- ============================================================
create table if not exists doctors (
  id bigint generated always as identity primary key,
  user_id uuid unique references profiles(id) on delete set null,
  name text not null,
  specialty text not null,
  type text not null check (type in ('doctor', 'therapist')),
  available boolean not null default true,
  bio text,
  photo_emoji text not null default '🩺'
);

-- ============================================================
-- 3. HEALTH METRICS — physical + mental wellbeing entries
-- ============================================================
create table if not exists health_metrics (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('hr', 'steps', 'calories', 'mood', 'stress', 'journal')),
  value numeric not null,
  note text,
  recorded_at timestamptz not null default now()
);
create index if not exists idx_health_metrics_user_type on health_metrics(user_id, type, recorded_at);

-- ============================================================
-- 4. APPOINTMENTS
-- ============================================================
create table if not exists appointments (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  doctor_id bigint not null references doctors(id) on delete cascade,
  slot_time timestamptz not null,
  status text not null default 'Requested' check (status in ('Requested', 'Confirmed', 'Completed', 'Cancelled')),
  mode text not null default 'in-person' check (mode in ('in-person', 'video', 'audio', 'chat')),
  room_name text,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. PHOTO SUBMISSIONS — linked to a storage object path
-- ============================================================
create table if not exists photo_submissions (
  id bigint generated always as identity primary key,
  appointment_id bigint not null references appointments(id) on delete cascade,
  image_path text not null, -- path inside the 'photo-submissions' storage bucket
  note text not null default '',
  doctor_response text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. PHARMACY
-- ============================================================
create table if not exists pharmacy_items (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  price numeric not null,
  stock integer not null default 0,
  description text
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  items_json jsonb not null,
  hostel_block text not null,
  room_no text not null,
  status text not null default 'Placed' check (status in ('Placed', 'Preparing', 'Out for delivery', 'Delivered')),
  total numeric not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. CHAT LOGS — Dr Sahab conversation history
-- ============================================================
create table if not exists chat_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  sender text not null check (sender in ('user', 'bot')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper: current user's role (used inside RLS policies)
-- ============================================================
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table doctors enable row level security;
alter table health_metrics enable row level security;
alter table appointments enable row level security;
alter table photo_submissions enable row level security;
alter table pharmacy_items enable row level security;
alter table orders enable row level security;
alter table chat_logs enable row level security;

-- profiles: anyone signed in can read profiles (needed for names on dashboards); only own row is editable
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

-- doctors: public read; a doctor can update their own row
drop policy if exists "doctors_select_all" on doctors;
create policy "doctors_select_all" on doctors for select using (true);
drop policy if exists "doctors_update_own" on doctors;
create policy "doctors_update_own" on doctors for update using (user_id = auth.uid());

-- health_metrics: strictly own data only
drop policy if exists "health_metrics_owner_all" on health_metrics;
create policy "health_metrics_owner_all" on health_metrics for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- appointments: student sees/creates own; doctor sees/updates ones assigned to them
drop policy if exists "appointments_select" on appointments;
create policy "appointments_select" on appointments for select using (
  user_id = auth.uid()
  or doctor_id in (select id from doctors where user_id = auth.uid())
);
drop policy if exists "appointments_insert_own" on appointments;
create policy "appointments_insert_own" on appointments for insert with check (user_id = auth.uid() and status = 'Requested');
drop policy if exists "appointments_update" on appointments;
create policy "appointments_update" on appointments for update using (
  user_id = auth.uid()
  or doctor_id in (select id from doctors where user_id = auth.uid())
);

-- photo_submissions: visible/insertable by the appointment's student and assigned doctor
drop policy if exists "photo_submissions_select" on photo_submissions;
create policy "photo_submissions_select" on photo_submissions for select using (
  appointment_id in (
    select id from appointments
    where user_id = auth.uid() or doctor_id in (select id from doctors where user_id = auth.uid())
  )
);
drop policy if exists "photo_submissions_insert" on photo_submissions;
create policy "photo_submissions_insert" on photo_submissions for insert with check (
  appointment_id in (select id from appointments where user_id = auth.uid())
);
drop policy if exists "photo_submissions_update_doctor" on photo_submissions;
create policy "photo_submissions_update_doctor" on photo_submissions for update using (
  appointment_id in (
    select id from appointments where doctor_id in (select id from doctors where user_id = auth.uid())
  )
);

-- pharmacy_items: public read; only pharmacy_admin can write
drop policy if exists "pharmacy_items_select_all" on pharmacy_items;
create policy "pharmacy_items_select_all" on pharmacy_items for select using (true);
drop policy if exists "pharmacy_items_write_admin" on pharmacy_items;
create policy "pharmacy_items_write_admin" on pharmacy_items for all
  using (current_role_name() = 'pharmacy_admin') with check (current_role_name() = 'pharmacy_admin');

-- orders: own orders, or all orders if pharmacy_admin
drop policy if exists "orders_select" on orders;
create policy "orders_select" on orders for select using (
  user_id = auth.uid() or current_role_name() = 'pharmacy_admin'
);
drop policy if exists "orders_insert_own" on orders;
create policy "orders_insert_own" on orders for insert with check (user_id = auth.uid());
drop policy if exists "orders_update_admin" on orders;
create policy "orders_update_admin" on orders for update using (current_role_name() = 'pharmacy_admin');

-- chat_logs: strictly own conversation
drop policy if exists "chat_logs_owner_all" on chat_logs;
create policy "chat_logs_owner_all" on chat_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 8. STUDENT DELIVERY PARTNER PROGRAM
-- Any student/staff can opt in from their profile, then claim a
-- "Preparing" pharmacy order, walk it through delivery, and see a
-- running earnings ledger. Payouts are a mock in-app wallet — no real
-- payment gateway — which is the right scope for a hackathon demo.
-- ============================================================
alter table profiles add column if not exists is_delivery_partner boolean not null default false;
alter table orders add column if not exists courier_id uuid references profiles(id) on delete set null;
alter table orders add column if not exists delivery_fee numeric not null default 20;

-- A delivery partner can see unclaimed "Preparing" orders (to browse and
-- claim) plus any order they've already claimed, regardless of its status.
drop policy if exists "orders_select_courier" on orders;
create policy "orders_select_courier" on orders for select using (
  exists (select 1 from profiles where id = auth.uid() and is_delivery_partner = true)
  and (courier_id = auth.uid() or (courier_id is null and status = 'Preparing'))
);

-- Claiming = updating an unclaimed row to set courier_id = self. Once
-- claimed, only that courier can further update it (e.g. advance status).
-- The WITH CHECK ensures they can never assign it to someone else.
drop policy if exists "orders_update_courier" on orders;
create policy "orders_update_courier" on orders for update using (
  exists (select 1 from profiles where id = auth.uid() and is_delivery_partner = true)
  and (courier_id = auth.uid() or (courier_id is null and status = 'Preparing'))
) with check (
  courier_id = auth.uid()
);

-- ============================================================
-- 9. WOUND CAMERA — async, non-appointment photo triage queue
-- Separate from photo_submissions (which is tied to a booked
-- appointment): a lightweight "snap and send" flow for minor injuries,
-- picked up by any available doctor rather than a specific one.
-- ============================================================
create table if not exists wound_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  image_path text not null, -- path inside the 'photo-submissions' storage bucket
  body_location text,
  severity text not null default 'mild' check (severity in ('mild', 'moderate', 'unsure')),
  note text,
  status text not null default 'Pending' check (status in ('Pending', 'Reviewed')),
  doctor_response text,
  responded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table wound_reports enable row level security;

drop policy if exists "wound_reports_select" on wound_reports;
create policy "wound_reports_select" on wound_reports for select using (
  user_id = auth.uid() or current_role_name() = 'doctor'
);
drop policy if exists "wound_reports_insert_own" on wound_reports;
create policy "wound_reports_insert_own" on wound_reports for insert with check (user_id = auth.uid());
drop policy if exists "wound_reports_update_doctor" on wound_reports;
create policy "wound_reports_update_doctor" on wound_reports for update using (current_role_name() = 'doctor');

-- ============================================================
-- 10. FEEDBACK — a simple write-only mailbox to the developers,
-- reachable from the footer on every page, logged in or not.
-- No in-app inbox UI: developers read submissions via the Supabase
-- Table Editor, so there is deliberately no SELECT policy for regular
-- users (service_role, used by the dashboard, bypasses RLS anyway).
-- ============================================================
create table if not exists feedback (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete set null,
  email text,
  message text not null,
  page_url text,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "feedback_insert_anyone" on feedback;
create policy "feedback_insert_anyone" on feedback for insert with check (true);

-- ============================================================
-- Realtime — let clients subscribe to live changes
-- ============================================================
-- Guarded so re-running this file on an existing project doesn't stop here
-- with "relation is already member of publication".
do $$
declare t text;
begin
  foreach t in array array['doctors', 'appointments', 'orders', 'chat_logs', 'photo_submissions', 'wound_reports'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end;
$$;

-- ============================================================
-- 11. PRIVILEGE GUARDS
-- RLS decides which rows a user may update, not which columns, so these
-- triggers stop signed-in users from editing fields they must not touch.
-- They only apply to browser sessions (JWT role 'authenticated'/'anon');
-- the SQL editor and the service role (seed.js) are unaffected.
-- ============================================================

-- profiles: users may edit their own name/hostel/language/opt-ins, never their role.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') and new.role is distinct from old.role then
    raise exception 'role can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on profiles;
create trigger guard_profile_update
  before update on profiles
  for each row execute procedure public.guard_profile_update();

-- appointments: nobody re-assigns the student or doctor; the student may only
-- cancel; the assigned doctor may change status, mode, slot and room.
create or replace function public.guard_appointment_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
    or new.doctor_id is distinct from old.doctor_id
    or new.created_at is distinct from old.created_at then
    raise exception 'an appointment cannot be moved to another student or doctor';
  end if;
  if not exists (select 1 from doctors where id = old.doctor_id and user_id = auth.uid()) then
    if new.status <> 'Cancelled'
      or new.slot_time is distinct from old.slot_time
      or new.mode is distinct from old.mode
      or new.room_name is distinct from old.room_name
      or new.reason is distinct from old.reason then
      raise exception 'students can only cancel an appointment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_appointment_update on appointments;
create trigger guard_appointment_update
  before update on appointments
  for each row execute procedure public.guard_appointment_update();

-- ============================================================
-- 12. WEARABLES — devices paired from the Campus Care mobile app
-- Physical tracking is app-only: the app pairs a smartwatch / band /
-- ring, writes a row here, then streams readings into health_metrics.
-- The web Health Tracker shows an "app only" screen until a row exists.
-- ============================================================
create table if not exists wearable_devices (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  device_type text not null check (device_type in ('watch', 'band', 'ring')),
  device_name text not null,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz
);
create index if not exists idx_wearable_devices_user on wearable_devices(user_id, connected_at desc);

alter table wearable_devices enable row level security;

drop policy if exists "wearable_devices_owner_all" on wearable_devices;
create policy "wearable_devices_owner_all" on wearable_devices for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime for the live Health Tracker. Guarded so re-running the file is safe.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'health_metrics') then
    alter publication supabase_realtime add table health_metrics;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'wearable_devices') then
    alter publication supabase_realtime add table wearable_devices;
  end if;
end;
$$;
