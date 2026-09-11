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
-- Role/name are read from the signup call's `options.data` (user metadata).
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
    coalesce(new.raw_user_meta_data->>'role', 'student'),
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
-- 7. CHAT LOGS — Pratiksha conversation history
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
create policy "appointments_insert_own" on appointments for insert with check (user_id = auth.uid());
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
-- Realtime — let clients subscribe to live changes
-- ============================================================
alter publication supabase_realtime add table doctors;
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table chat_logs;
alter publication supabase_realtime add table photo_submissions;
