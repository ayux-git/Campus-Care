// Campus Care — loads Dr Sahab's knowledge base (Merck Manual passages with
// their embeddings) into the merck_passages table. Uses the SERVICE ROLE key
// from supabase/.env, like seed.js.
//
// Usage:
//   1. run supabase/merck_rag.sql in the SQL editor (once)
//   2. cd supabase && npm install
//   3. npm run import-merck            (reads merck/merck_passages.jsonl)
//
// Re-running replaces the existing passages. merck/ is git-ignored: the book's
// text must not be committed or pushed.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FILE = process.argv[2] || path.join(__dirname, 'merck', 'merck_passages.jsonl');
const BATCH = 200;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in supabase/.env');
  process.exit(1);
}
if (!fs.existsSync(FILE)) {
  console.error(`Passages file not found: ${FILE}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function insertBatch(rows) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.from('merck_passages').insert(rows);
    if (!error) return;
    if (attempt === 3) throw error;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function main() {
  console.log('Clearing existing passages...');
  const { error: delErr } = await supabase.from('merck_passages').delete().gte('id', 0);
  if (delErr) throw delErr;

  const lines = readline.createInterface({ input: fs.createReadStream(FILE), crlfDelay: Infinity });
  let batch = [];
  let total = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    batch.push({
      page: r.page,
      chapter: r.chapter,
      section: r.section || null,
      content: r.content,
      embedding: JSON.stringify(r.embedding),
    });
    if (batch.length === BATCH) {
      await insertBatch(batch);
      total += batch.length;
      batch = [];
      if (total % 2000 === 0) console.log(`  ${total} passages loaded`);
    }
  }
  if (batch.length) {
    await insertBatch(batch);
    total += batch.length;
  }
  console.log(`Done: ${total} passages loaded.`);
}

main().catch((err) => {
  console.error('Import failed:', err.message || err);
  process.exit(1);
});
