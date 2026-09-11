// Campus Care — demo data seeder.
// Populates fictional demo accounts (per role), a doctor/therapist directory,
// a pharmacy catalog, and a week of health-metric history so the app looks
// alive on first run. Uses the SERVICE ROLE key (bypasses RLS) — never ship
// this key to the frontend.
//
// Usage:
//   1. cd supabase
//   2. copy .env.example to .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   3. npm install
//   4. npm run seed

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in supabase/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = 'CampusCare123!';

// name, email, role, extra metadata
const DEMO_ACCOUNTS = [
  { name: 'Ananya Sharma', email: 'student1@campuscare.demo', role: 'student', hostel_block: 'BH-4', room_no: '212' },
  { name: 'Rohan Mehta', email: 'student2@campuscare.demo', role: 'student', hostel_block: 'BH-7', room_no: '108' },
  { name: 'Priya Kaur', email: 'staff1@campuscare.demo', role: 'staff', hostel_block: null, room_no: null },
  { name: 'Dr. Simran Gill', email: 'doctor1@campuscare.demo', role: 'doctor', specialty: 'General Physician', doctorType: 'doctor' },
  { name: 'Dr. Arjun Rao', email: 'doctor2@campuscare.demo', role: 'doctor', specialty: 'Counseling Psychologist', doctorType: 'therapist' },
  { name: 'Karan Malhotra', email: 'pharmacy1@campuscare.demo', role: 'pharmacy_admin', hostel_block: null, room_no: null },
];

const EXTRA_DOCTORS = [
  { name: 'Dr. Neha Verma', specialty: 'Dermatologist', type: 'doctor', available: true, photo_emoji: '🩺' },
  { name: 'Dr. Manpreet Singh', specialty: 'Orthopedic', type: 'doctor', available: false, photo_emoji: '🦴' },
  { name: 'Dr. Kavita Joshi', specialty: 'ENT Specialist', type: 'doctor', available: true, photo_emoji: '👂' },
  { name: 'Dr. Rajesh Kumar', specialty: 'General Physician', type: 'doctor', available: true, photo_emoji: '🩺' },
  { name: 'Ms. Simran Kaur', specialty: 'Stress & Anxiety Counselor', type: 'therapist', available: true, photo_emoji: '🧠' },
  { name: 'Mr. Aditya Nair', specialty: 'Sleep & Wellness Counselor', type: 'therapist', available: false, photo_emoji: '🧘' },
];

const PHARMACY_ITEMS = [
  { name: 'Paracetamol 500mg (10 tabs)', category: 'Pain Relief', price: 25, stock: 200, description: 'For fever and mild pain relief.' },
  { name: 'Ibuprofen 400mg (10 tabs)', category: 'Pain Relief', price: 35, stock: 150, description: 'Anti-inflammatory pain reliever.' },
  { name: 'ORS Rehydration Sachets (5 pack)', category: 'First Aid', price: 40, stock: 120, description: 'Oral rehydration salts for dehydration.' },
  { name: 'Antiseptic Liquid 100ml', category: 'First Aid', price: 60, stock: 80, description: 'For cleaning minor cuts and wounds.' },
  { name: 'Adhesive Bandages (20 pack)', category: 'First Aid', price: 30, stock: 300, description: 'Assorted sizes for minor injuries.' },
  { name: 'Cetirizine 10mg (10 tabs)', category: 'Allergy', price: 20, stock: 180, description: 'For allergy and cold symptoms.' },
  { name: 'Cough Syrup 100ml', category: 'Cold & Cough', price: 55, stock: 90, description: 'Relieves dry and wet cough.' },
  { name: 'Vitamin C Tablets (30 tabs)', category: 'Supplements', price: 90, stock: 100, description: 'Immunity support supplement.' },
  { name: 'Multivitamin Capsules (30 caps)', category: 'Supplements', price: 150, stock: 70, description: 'Daily multivitamin support.' },
  { name: 'Digital Thermometer', category: 'Devices', price: 199, stock: 40, description: 'Fast, accurate temperature readings.' },
  { name: 'Amoxicillin 500mg (Prescription)', category: 'Prescription', price: 80, stock: 50, description: 'Antibiotic — requires doctor prescription upload.' },
  { name: 'ORS + Zinc Tablets (10 pack)', category: 'First Aid', price: 45, stock: 60, description: 'Supports recovery from diarrhea.' },
];

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

async function upsertUser(account) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: account.name,
      role: account.role,
      hostel_block: account.hostel_block || null,
      room_no: account.room_no || null,
      language_pref: 'en',
    },
  });

  if (error && !/already registered|already exists/i.test(error.message)) {
    throw error;
  }
  if (error) {
    // already exists — fetch existing user id via listUsers filter
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.users.find((u) => u.email === account.email);
    console.log(`  ↺ ${account.email} already exists, reusing`);
    return existing;
  }
  console.log(`  + created ${account.email}`);
  return created.user;
}

async function main() {
  console.log('Seeding demo accounts...');
  const userMap = {};
  for (const account of DEMO_ACCOUNTS) {
    const user = await upsertUser(account);
    userMap[account.email] = { ...account, id: user.id };
  }

  console.log('Linking doctor accounts to the doctors table...');
  const doctorRows = DEMO_ACCOUNTS.filter((a) => a.role === 'doctor').map((a) => ({
    user_id: userMap[a.email].id,
    name: a.name,
    specialty: a.specialty,
    type: a.doctorType,
    available: true,
    photo_emoji: a.doctorType === 'therapist' ? '🧠' : '🩺',
  }));
  const { error: docErr } = await supabase.from('doctors').upsert(doctorRows, { onConflict: 'user_id' });
  if (docErr) console.error('doctor link error', docErr);

  console.log('Adding extra directory-only doctors/therapists...');
  const { error: extraErr } = await supabase.from('doctors').insert(EXTRA_DOCTORS);
  if (extraErr && !/duplicate/i.test(extraErr.message)) console.error('extra doctors error', extraErr);

  console.log('Seeding pharmacy catalog...');
  const { error: pharmErr } = await supabase.from('pharmacy_items').insert(PHARMACY_ITEMS);
  if (pharmErr && !/duplicate/i.test(pharmErr.message)) console.error('pharmacy error', pharmErr);

  console.log('Seeding a week of health metric history for student demo accounts...');
  const students = DEMO_ACCOUNTS.filter((a) => a.role === 'student' || a.role === 'staff');
  const metricRows = [];
  for (const student of students) {
    const userId = userMap[student.email].id;
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - daysAgo);
      metricRows.push(
        { user_id: userId, type: 'hr', value: rand(62, 88), recorded_at: recordedAt.toISOString() },
        { user_id: userId, type: 'steps', value: Math.round(rand(3000, 9500)), recorded_at: recordedAt.toISOString() },
        { user_id: userId, type: 'calories', value: Math.round(rand(1400, 2400)), recorded_at: recordedAt.toISOString() },
        { user_id: userId, type: 'mood', value: Math.round(rand(2, 5)), recorded_at: recordedAt.toISOString() },
        { user_id: userId, type: 'stress', value: Math.round(rand(2, 8)), recorded_at: recordedAt.toISOString() }
      );
    }
  }
  const { error: metricErr } = await supabase.from('health_metrics').insert(metricRows);
  if (metricErr) console.error('metrics error', metricErr);

  console.log('\nDone! Demo login credentials (password for all): ' + DEMO_PASSWORD);
  DEMO_ACCOUNTS.forEach((a) => console.log(`  ${a.role.padEnd(15)} ${a.email}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
