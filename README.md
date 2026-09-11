# Campus Care — LPU Healthcare Platform

Campus Care unifies physical healthcare and mental wellbeing for Lovely Professional University (LPU) students and staff: health tracking, doctor/counselor appointments, video teleconsults, photo-based consults, pharmacy ordering with hostel delivery, an interactive campus map, and Pratiksha — an AI health assistant.

**This is a hackathon prototype.** All accounts, doctors, and health data are fictional demo data. Do not enter real medical information.

## Architecture

- **Frontend:** React 18 + Vite + Tailwind CSS, `react-router-dom`, `recharts`, `lucide-react`, `framer-motion`, `i18next` (English / Hindi / Punjabi).
- **Backend:** [Supabase](https://supabase.com) — Postgres database with Row Level Security, Supabase Auth (email/password), Supabase Storage (photo consults), and Supabase Realtime (live doctor availability, order status, chat).
- **AI chatbot:** A Supabase Edge Function (`supabase/functions/pratiksha-chat`) proxies requests to the Anthropic API so the API key never reaches the browser. Falls back to rule-based canned replies with no key/network.
- **Video calls:** Embedded Jitsi Meet, one auto-generated room per appointment.
- **Voice input/output:** Browser-native Web Speech API.

There is no custom Node/Express server — the React app talks directly to Supabase using the public **anon key**, and every table is protected by Row Level Security policies (see `supabase/schema.sql`).

## Project layout

```
client/               React + Vite frontend
supabase/
  schema.sql           Tables + Row Level Security policies (run once in the SQL editor)
  storage.sql          Storage bucket + policies for photo consults
  seed.js              Demo data seeder (accounts, doctors, pharmacy items, a week of health metrics)
  functions/
    pratiksha-chat/    Edge Function — Claude proxy + rule-based/emergency fallback
```

## One-time Supabase project setup

1. Create a free project at [supabase.com](https://supabase.com) (pick a region close to India, e.g. Mumbai or Singapore).
2. In **Project Settings → API**, copy:
   - **Project URL**
   - **anon public key** (safe for the frontend)
   - **service_role key** (secret — only used by the local seed script, never the frontend)
3. Open the **SQL Editor** and run, in order:
   - `supabase/schema.sql`
   - `supabase/storage.sql`
4. (Optional, enables real Claude replies) Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy pratiksha-chat
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   Without this, the app still works end-to-end — Pratiksha just uses rule-based replies instead of Claude.

## Seed demo data

```bash
cd supabase
cp .env.example .env      # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run seed
```

This creates demo accounts (password for all: `CampusCare123!`), a doctor/therapist directory, a pharmacy catalog, and a week of health-metric history:

| Role            | Email                         |
| --------------- | ------------------------------ |
| Student          | student1@campuscare.demo       |
| Student          | student2@campuscare.demo       |
| Staff            | staff1@campuscare.demo         |
| Doctor           | doctor1@campuscare.demo        |
| Therapist        | doctor2@campuscare.demo        |
| Pharmacy Admin   | pharmacy1@campuscare.demo      |

## Run the frontend

```bash
cd client
cp .env.example .env.local   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). Log in with any demo account above, or use the quick-fill buttons on the login page.

## Feature map

| Feature | Where |
| --- | --- |
| Health Tracker (Physical + Mental tabs) | `client/src/pages/HealthTracker.jsx`, `client/src/components/StatCard.jsx` |
| Doctor & counselor appointments | `client/src/pages/Appointments.jsx` |
| Video / audio / chat-only teleconsult (Jitsi) | `client/src/pages/Teleconsult.jsx` |
| Live photo capture & upload | `client/src/components/PhotoConsult.jsx` |
| Doctor dashboard | `client/src/pages/doctor/DoctorDashboard.jsx` |
| Pharmacy ordering + hostel delivery | `client/src/pages/Pharmacy.jsx` |
| Pharmacy admin dashboard | `client/src/pages/pharmacy/PharmacyAdminDashboard.jsx` |
| Campus map + nearby facilities | `client/src/pages/CampusMap.jsx` |
| Mental wellbeing resources | `client/src/pages/MentalResources.jsx` |
| Pratiksha AI chatbot | `client/src/components/PratikshaWidget.jsx` + `supabase/functions/pratiksha-chat` |
| Multi-language (EN/HI/PA) | `client/src/i18n/` |

## Notes on Row Level Security

Every table restricts access by the signed-in user's id and role (student/staff, doctor, pharmacy_admin) — see the policies at the bottom of `supabase/schema.sql`. A new `profiles` row is created automatically for every signup via a Postgres trigger, defaulting to the `student` role.

Our Team: Ayush, Rishi, Yachika, Abhedya <br>
contact us: araj27471@gmail.com <br>
mobile: 7564965881 <br>
