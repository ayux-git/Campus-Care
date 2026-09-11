import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey || url.includes('YOUR-PROJECT-REF')) {
  console.warn(
    '[Campus Care] Supabase env vars are missing. Copy client/.env.example to client/.env.local and fill in your project URL + anon key.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');

export const DEMO_PASSWORD = 'CampusCare123!';
