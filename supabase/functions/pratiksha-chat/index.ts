// Campus Care — "Pratiksha" chatbot Edge Function.
// Deployed with the Supabase CLI: `supabase functions deploy pratiksha-chat`
// Set the secret once: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
// (Without that secret, this function gracefully falls back to rule-based replies,
// so the demo keeps working with no network / no API key on stage.)
//
// The frontend calls this via `supabase.functions.invoke('pratiksha-chat', {...})`
// so the Anthropic key never reaches the browser.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-5';

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
  hi: `🚨 यह गंभीर लग रहा है। कृपया अभी कैंपस हेल्थ सेंटर या आपातकालीन सेवाओं से संपर्क करें: ${EMERGENCY_NUMBER}। अगर आपके साथ कोई और है, तो उनसे तुरंत मदद माँगें। मैं चैट में आपातकालीन स्थिति में मदद नहीं कर सकती।`,
  pa: `🚨 ਇਹ ਗੰਭੀਰ ਲੱਗਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੁਣੇ ਕੈਂਪਸ ਹੈਲਥ ਸੈਂਟਰ ਜਾਂ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰੋ: ${EMERGENCY_NUMBER}। ਮੈਂ ਚੈਟ ਵਿੱਚ ਐਮਰਜੈਂਸੀ ਵਿੱਚ ਮਦਦ ਨਹੀਂ ਕਰ ਸਕਦੀ।`,
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
  hi: 'यह बताने के लिए धन्यवाद। मैं सामान्य स्वास्थ्य मार्गदर्शन दे सकती हूँ, लेकिन निदान नहीं कर सकती। कृपया एक वास्तविक डॉक्टर या काउंसलर अपॉइंटमेंट बुक करें।',
  pa: 'ਇਹ ਸਾਂਝਾ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਮੈਂ ਆਮ ਸਿਹਤ ਮਾਰਗਦਰਸ਼ਨ ਦੇ ਸਕਦੀ ਹਾਂ, ਪਰ ਨਿਦਾਨ ਨਹੀਂ ਕਰ ਸਕਦੀ। ਕਿਰਪਾ ਕਰਕੇ ਡਾਕਟਰ ਜਾਂ ਕਾਉਂਸਲਰ ਨਾਲ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ।',
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

function systemPrompt(lang: string, doctorsOnline: boolean): string {
  return `You are Pratiksha, the warm and reassuring AI health assistant for Campus Care, a student health platform at Lovely Professional University (LPU).

Rules you must always follow:
- Respond in ${LANG_NAMES[lang] || 'English'}, matching the student's language.
- Give general wellness / first-aid-style guidance for common, minor, non-urgent symptoms.
- NEVER claim to diagnose a condition. Always frame guidance as general suggestions, not medical diagnosis.
- For anything beyond minor self-care, clearly recommend booking a real doctor or counselor appointment on Campus Care.
- Keep replies concise (3-5 sentences), warm, and encouraging.
- ${doctorsOnline ? '' : 'No doctors are currently online — mention gently that you are stepping in with general guidance until a doctor becomes available.'}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { message, lang = 'en', doctorsOnline = true } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (detectEmergency(message)) {
      return new Response(
        JSON.stringify({
          reply: EMERGENCY_MESSAGE_BY_LANG[lang] || EMERGENCY_MESSAGE_BY_LANG.en,
          emergency: true,
          source: 'emergency-detector',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (ANTHROPIC_API_KEY) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 400,
            system: systemPrompt(lang, doctorsOnline),
            messages: [{ role: 'user', content: message }],
          }),
        });
        const data = await res.json();
        const text = data?.content?.[0]?.text?.trim();
        if (res.ok && text) {
          return new Response(JSON.stringify({ reply: text, emergency: false, source: 'anthropic' }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        console.warn('Anthropic call did not return usable text, falling back', data);
      } catch (err) {
        console.warn('Anthropic call failed, falling back to rules:', err);
      }
    }

    return new Response(
      JSON.stringify({ reply: ruleBasedReply(message, lang), emergency: false, source: 'rule-based' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
