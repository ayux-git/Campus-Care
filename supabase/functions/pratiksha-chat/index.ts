// Campus Care — "Dr Sahab" chatbot Edge Function.
// (The function slug stays `pratiksha-chat` so existing deployments keep working.)
// Deployed with the Supabase CLI: `supabase functions deploy pratiksha-chat`
// Set the secret once: `supabase secrets set GEMINI_API_KEY=...` (key from aistudio.google.com)
// Answers use Gemini searching passages of the Merck Manual stored in the
// merck_passages table (RAG), plus the
// conversation history the widget sends.
// (Without that secret, this function gracefully falls back to rule-based replies,
// so the demo keeps working with no network / no API key on stage.)
//
// The frontend calls this via `supabase.functions.invoke('pratiksha-chat', {...})`
// so the Gemini key never reaches the browser.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const EMERGENCY_PATTERNS: RegExp[] = [
  /chest pain/i,
  /can'?t breathe/i,
  /difficulty breathing/i,
  /shortness of breath/i,
  /severe bleeding/i,
  /heavy bleeding/i,
  /unconscious/i,
  /not breathing/i,
  /suicid/i,
  /kill myself/i,
  /end my life/i,
  /want to die/i,
  /self.?harm/i,
  /overdose/i,
  /seizure/i,
  /stroke/i,
  /heart attack/i,
  /anaphyla/i,
  /severe allerg/i,
];

const EMERGENCY_NUMBER = '+91-1800-XXX-CARE (Campus Health Center, 24x7)';

const LANG_NAMES: Record<string, string> = { en: 'English', hi: 'Hindi', pa: 'Punjabi' };

const EMERGENCY_MESSAGE_BY_LANG: Record<string, string> = {
  en: `🚨 This sounds urgent. Please contact the campus health center or emergency services right now: ${EMERGENCY_NUMBER}. If you are with someone else, ask them to help you get there immediately. I'm not able to help with emergencies in chat — please reach out to a real person now.`,
  hi: `🚨 यह गंभीर लग रहा है। कृपया अभी कैंपस हेल्थ सेंटर या आपातकालीन सेवाओं से संपर्क करें: ${EMERGENCY_NUMBER}। अगर आपके साथ कोई और है, तो उनसे तुरंत मदद माँगें। मैं चैट में आपातकालीन स्थिति में मदद नहीं कर सकता।`,
  pa: `🚨 ਇਹ ਗੰਭੀਰ ਲੱਗਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੁਣੇ ਕੈਂਪਸ ਹੈਲਥ ਸੈਂਟਰ ਜਾਂ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰੋ: ${EMERGENCY_NUMBER}। ਮੈਂ ਚੈਟ ਵਿੱਚ ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਮਦਦ ਨਹੀਂ ਕਰ ਸਕਦਾ।`,
};

const FALLBACK_RULES: { keywords: string[]; reply: Record<string, string> }[] = [
  {
    keywords: ['headache', 'head ache', 'सिरदर्द', 'ਸਿਰਦਰਦ'],
    reply: {
      en: "Sorry you're dealing with a headache. Try resting in a dim room, drinking water, and a short break from screens. If it's severe, sudden, or doesn't improve in a day, please book a doctor appointment — I can take you there.",
      hi: 'सिरदर्द में परेशानी के लिए क्षमा करें। कम रोशनी वाले कमरे में आराम करें, पानी पिएं। अगर यह गंभीर हो या ठीक न हो, तो डॉक्टर अपॉइंटमेंट बुक करें।',
      pa: 'ਸਿਰਦਰਦ ਲਈ ਅਫ਼ਸੋਸ ਹੈ। ਘੱਟ ਰੌਸ਼ਨੀ ਵਾਲੇ ਕਮਰੇ ਵਿੱਚ ਆਰਾਮ ਕਰੋ, ਪਾਣੀ ਪੀਓ। ਜੇ ਇਹ ਠੀਕ ਨਹੀਂ ਹੁੰਦਾ, ਤਾਂ ਡਾਕਟਰ ਅਪੌਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ।',
    },
  },
  {
    keywords: ['fever', 'temperature', 'बुखार', 'ਬੁਖ਼ਾਰ'],
    reply: {
      en: 'For a mild fever: rest, fluids, and a paracetamol if you normally tolerate it. If it crosses 102°F, lasts more than 2 days, or you feel very unwell, please book a doctor visit right away.',
      hi: 'हल्के बुखार के लिए: आराम करें, तरल पदार्थ लें। अगर तापमान 102°F से ज़्यादा हो या 2 दिन से ज़्यादा रहे, तो तुरंत डॉक्टर से मिलें।',
      pa: 'ਹਲਕੇ ਬੁਖ਼ਾਰ ਲਈ: ਆਰਾਮ ਕਰੋ, ਤਰਲ ਪਦਾਰਥ ਲਓ। ਜੇ ਤਾਪਮਾਨ ਵੱਧ ਜਾਵੇ, ਤਾਂ ਤੁਰੰਤ ਡਾਕਟਰ ਕੋਲ ਜਾਓ।',
    },
  },
  {
    keywords: ['stress', 'anxious', 'anxiety', 'तनाव', 'ਤਣਾਅ'],
    reply: {
      en: "It sounds like you're carrying some stress. Try a short breathing exercise: in for 4 counts, hold for 4, out for 6, repeat 5 times. The Mental Wellbeing tab has more resources, and you can book a confidential counselor session anytime.",
      hi: 'लगता है आप तनाव में हैं। एक छोटा साँस लेने का व्यायाम मदद कर सकता है: 4 गिनती के लिए साँस लें, 4 के लिए रोकें, 6 के लिए छोड़ें। मेंटल वेलबीइंग टैब में और संसाधन हैं।',
      pa: 'ਲੱਗਦਾ ਹੈ ਤੁਸੀਂ ਤਣਾਅ ਵਿੱਚ ਹੋ। ਇੱਕ ਛੋਟੀ ਸਾਹ ਲੈਣ ਦੀ ਕਸਰਤ ਮਦਦ ਕਰ ਸਕਦੀ ਹੈ। ਮੈਂਟਲ ਵੈਲਬੀਇੰਗ ਟੈਬ ਵਿੱਚ ਹੋਰ ਸਰੋਤ ਹਨ।',
    },
  },
  {
    keywords: ['cold', 'cough', 'खांसी', 'ਖੰਘ'],
    reply: {
      en: 'For a common cold: warm fluids, steam inhalation, and rest usually help within a few days. If you develop high fever, breathlessness, or it lasts beyond a week, please see a doctor.',
      hi: 'सामान्य सर्दी के लिए: गर्म तरल पदार्थ, भाप लेना और आराम मदद करते हैं। अगर तेज़ बुखार हो, तो डॉक्टर से मिलें।',
      pa: 'ਆਮ ਜ਼ੁਕਾਮ ਲਈ: ਗਰਮ ਤਰਲ ਪਦਾਰਥ ਅਤੇ ਆਰਾਮ ਮਦਦ ਕਰਦੇ ਹਨ। ਜੇ ਤੇਜ਼ ਬੁਖ਼ਾਰ ਹੋਵੇ, ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ।',
    },
  },
];

const DEFAULT_REPLY: Record<string, string> = {
  en: "Thanks for sharing that. I can offer general wellness guidance, but I'm not able to diagnose anything. For anything more than minor self-care, it's best to book a real doctor or counselor appointment. Is there anything specific I can help you understand better?",
  hi: 'यह बताने के लिए धन्यवाद। मैं सामान्य स्वास्थ्य मार्गदर्शन दे सकता हूँ, लेकिन निदान नहीं कर सकता। कृपया एक वास्तविक डॉक्टर या काउंसलर अपॉइंटमेंट बुक करें।',
  pa: 'ਇਹ ਸਾਂਝਾ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਮੈਂ ਆਮ ਸਿਹਤ ਮਾਰਗਦਰਸ਼ਨ ਦੇ ਸਕਦਾ ਹਾਂ, ਪਰ ਨਿਦਾਨ ਨਹੀਂ ਕਰ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਡਾਕਟਰ ਜਾਂ ਕਾਉਂਸਲਰ ਨਾਲ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ।',
};

function detectEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

function ruleBasedReply(message: string, lang: string): string {
  const text = message.toLowerCase();
  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return rule.reply[lang] || rule.reply.en;
    }
  }
  return DEFAULT_REPLY[lang] || DEFAULT_REPLY.en;
}

// Knowledge base: passages of The Merck Manual (19th ed., 2011) stored in the
// merck_passages table (see supabase/merck_rag.sql). The table is readable only
// with the service role key, which Supabase injects into edge functions.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const embedder = new Supabase.ai.Session('gte-small');

const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 4;
const PASSAGES_PER_SEARCH = 6;

// Gemini writes the answers (free tier). Docs: ai.google.dev/gemini-api/docs
// Free-tier models, best first. Overloaded (503), rate-limited (429) or slow
// models are skipped for the next one.
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const GEMINI_TIMEOUT_MS = 25_000;

class GeminiUnavailable extends Error {}

const SEARCH_TOOL = {
  name: 'search_merck_manual',
  description:
    'Search The Merck Manual of Diagnosis & Therapy (19th edition) and return the most relevant numbered passages with their chapter and page. Write the query in English, using medical terms where they fit (e.g. "tension-type headache treatment"), even if the student wrote in Hindi or Punjabi. Search again with a different query if the first results do not cover the question.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: 'English search query' } },
    required: ['query'],
  },
};

function systemPrompt(lang: string, doctorsOnline: boolean): string {
  return `You are Dr Sahab, the AI health assistant in Campus Care, the student health app at Lovely Professional University (LPU) in Punjab, India. You talk with students and staff about their health questions.

Answer health questions only from The Merck Manual of Diagnosis & Therapy (19th edition, 2011). Call search_merck_manual before answering, and base the answer on the passages it returns, not on general knowledge. If the passages don't cover the question, say plainly that the Merck Manual doesn't cover it and suggest booking a campus doctor, instead of answering from elsewhere. Answer the specific question that was asked, using details from the conversation so far: likely common causes, safe self-care that helps, and the warning signs that mean someone should see a doctor soon.

This edition is from 2011, so some guidance may have changed since. When an answer depends on something that changes over time, such as a medicine, a dose or a vaccine, add one short note that a doctor can confirm the current advice.

The passages are written for doctors. Explain them in plain words; don't copy long passages word for word.

You are an AI assistant, not a licensed doctor. If asked, say so plainly despite your name. Don't diagnose a condition or give prescription-medicine doses; when something needs a diagnosis or a prescription, say that a doctor needs to assess it.

Reply in ${LANG_NAMES[lang] || 'English'}. Keep replies short and easy to read in a small chat window: a few sentences, or a short list with each item on its own line starting with "• ". Write plain text without Markdown (no asterisks, headings, links or URLs). Don't end with a disclaimer or a generic "book a doctor" line, because the app shows both under every reply; recommend seeing a doctor only when the situation calls for it.

After the answer, add one last line listing the numbers of the passages you used, exactly like "SOURCES: 2, 5". Write "SOURCES: none" if you used none. The app removes this line and shows the sources itself.${
    doctorsOnline ? '' : '\n\nNo campus doctors are online right now. Mention once, gently, that you are giving general guidance until a doctor is available.'
  }`;
}

type ChatTurn = { sender: 'user' | 'bot'; text: string };
type Source = { url: string; title: string };
type Passage = { id: number; page: number; chapter: string; section: string | null; content: string; similarity: number };
type GeminiPart = {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
  [key: string]: unknown; // e.g. thoughtSignature, which must be echoed back unchanged
};
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

// Client-supplied history: keep the recent turns, cap their size, and make
// sure the conversation starts with a user turn.
function toContents(history: unknown, message: string): GeminiContent[] {
  const turns = (Array.isArray(history) ? history : [])
    .filter((t): t is ChatTurn => !!t && typeof t.text === 'string' && (t.sender === 'user' || t.sender === 'bot'))
    .slice(-MAX_HISTORY)
    .map((t): GeminiContent => ({ role: t.sender === 'user' ? 'user' : 'model', parts: [{ text: t.text.slice(0, 2000) }] }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return [...turns, { role: 'user', parts: [{ text: message.slice(0, 2000) }] }];
}

async function searchMerck(query: string): Promise<Passage[]> {
  const embedding = (await embedder.run(query, { mean_pool: true, normalize: true })) as number[];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_merck_passages`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_embedding: JSON.stringify(embedding), match_count: PASSAGES_PER_SEARCH }),
  });
  if (!res.ok) throw new Error(`match_merck_passages failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const passageTitle = (p: Passage) => `Merck Manual, ${p.chapter}${p.section ? ` (${p.section})` : ''}, p. ${p.page}`;

async function callGemini(model: string, contents: GeminiContent[], lang: string, doctorsOnline: boolean) {
  let res: Response;
  try {
    res = await fetch(geminiUrl(model), {
      method: 'POST',
      headers: { 'x-goog-api-key': GEMINI_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(lang, doctorsOnline) }] },
        contents,
        tools: [{ functionDeclarations: [SEARCH_TOOL] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (err) {
    throw new GeminiUnavailable(`${model}: ${err instanceof Error ? err.message : err}`);
  }
  if (res.status === 503 || res.status === 429 || res.status === 500) {
    throw new GeminiUnavailable(`${model}: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const data = await res.json();
  const candidate = data.candidates?.[0];
  return { parts: (candidate?.content?.parts ?? []) as GeminiPart[], finishReason: candidate?.finishReason as string | undefined };
}

async function askGemini(contents: GeminiContent[], lang: string, doctorsOnline: boolean): Promise<{ reply: string; sources: Source[] } | null> {
  if (!GEMINI_API_KEY) return null;
  for (const model of GEMINI_MODELS) {
    try {
      return await askGeminiModel(model, contents, lang, doctorsOnline);
    } catch (err) {
      if (!(err instanceof GeminiUnavailable)) throw err;
      console.warn(`Gemini unavailable, trying next model: ${err.message}`);
    }
  }
  return null;
}

// One model for the whole answer: its turns (and thought signatures) can't be
// replayed to a different model.
async function askGeminiModel(
  model: string,
  contents: GeminiContent[],
  lang: string,
  doctorsOnline: boolean
): Promise<{ reply: string; sources: Source[] } | null> {
  // Every passage shown to the model gets a number, so its SOURCES line can name them.
  const numbered: Passage[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const { parts, finishReason } = await callGemini(model, contents, lang, doctorsOnline);
    const calls = parts.filter((p) => p.functionCall);

    if (!calls.length) {
      if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') return null; // SAFETY, etc.
      const raw = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
      const match = raw.match(/\n?\s*SOURCES:\s*([^\n]*)\s*$/i);
      const reply = (match ? raw.slice(0, match.index) : raw).trim();
      const used = [...new Set((match?.[1].match(/\d+/g) ?? []).map(Number))];
      // Titles only, never links; passages from the same page and section share one label.
      const byTitle = new Map<string, Source>();
      for (const p of used.map((n) => numbered[n - 1]).filter(Boolean)) {
        const title = passageTitle(p);
        if (!byTitle.has(title)) byTitle.set(title, { url: `merck:p${p.page}:${p.id}`, title });
      }
      const sources = [...byTitle.values()].slice(0, 4);
      return reply ? { reply, sources } : null;
    }

    // Echo the model turn unchanged (it may carry thought signatures), then answer each call.
    contents = [...contents, { role: 'model', parts }];
    const responses: GeminiPart[] = [];
    for (const { functionCall } of calls) {
      const call = functionCall!;
      let response: Record<string, unknown>;
      try {
        const query = String(call.args?.query ?? '').slice(0, 300);
        const passages = query ? await searchMerck(query) : [];
        response = {
          passages: passages.map((p) => {
            numbered.push(p);
            return { number: numbered.length, title: passageTitle(p), text: p.content };
          }),
        };
        if (!passages.length) response = { passages: [], note: 'No matching passages found in the Merck Manual.' };
      } catch (err) {
        console.warn('Merck search failed:', err);
        response = { error: 'The Merck Manual search is unavailable right now.' };
      }
      responses.push({ functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response } });
    }
    contents = [...contents, { role: 'user', parts: responses }];
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  let body: { message?: unknown; history?: unknown; lang?: string; doctorsOnline?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const { message, history, lang = 'en', doctorsOnline = true } = body;
  if (!message || typeof message !== 'string') {
    return json({ error: 'message is required' }, 400);
  }

  if (detectEmergency(message)) {
    return json({
      reply: EMERGENCY_MESSAGE_BY_LANG[lang] || EMERGENCY_MESSAGE_BY_LANG.en,
      emergency: true,
      sources: [],
      source: 'emergency-detector',
    });
  }

  try {
    const answer = await askGemini(toContents(history, message), lang, doctorsOnline);
    if (answer) return json({ ...answer, emergency: false, source: 'gemini' });
  } catch (err) {
    console.warn('Gemini call failed, falling back to rules:', err);
  }

  return json({ reply: ruleBasedReply(message, lang), emergency: false, sources: [], source: 'rule-based' });
});
