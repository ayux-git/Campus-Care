// Client-side mirror of supabase/functions/pratiksha-chat's rule-based logic.
// Used when the Edge Function isn't deployed yet, or the network/call fails,
// so Pratiksha still responds sensibly (including emergency detection) with
// zero backend dependency.

const EMERGENCY_PATTERNS = [
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

const EMERGENCY_MESSAGE_BY_LANG = {
  en: `🚨 This sounds urgent. Please contact the campus health center or emergency services right now: ${EMERGENCY_NUMBER}. If you are with someone else, ask them to help you get there immediately. I'm not able to help with emergencies in chat — please reach out to a real person now.`,
  hi: `🚨 यह गंभीर लग रहा है। कृपया अभी कैंपस हेल्थ सेंटर या आपातकालीन सेवाओं से संपर्क करें: ${EMERGENCY_NUMBER}। मैं चैट में आपातकालीन स्थिति में मदद नहीं कर सकती।`,
  pa: `🚨 ਇਹ ਗੰਭੀਰ ਲੱਗਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੁਣੇ ਕੈਂਪਸ ਹੈਲਥ ਸੈਂਟਰ ਜਾਂ ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰੋ: ${EMERGENCY_NUMBER}।`,
};

const FALLBACK_RULES = [
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
      hi: 'लगता है आप तनाव में हैं। एक छोटा साँस लेने का व्यायाम मदद कर सकता है। मेंटल वेलबीइंग टैब में और संसाधन हैं।',
      pa: 'ਲੱਗਦਾ ਹੈ ਤੁਸੀਂ ਤਣਾਅ ਵਿੱਚ ਹੋ। ਇੱਕ ਛੋਟੀ ਸਾਹ ਲੈਣ ਦੀ ਕਸਰਤ ਮਦਦ ਕਰ ਸਕਦੀ ਹੈ।',
    },
  },
  {
    keywords: ['cold', 'cough', 'खांसी', 'ਖੰਘ'],
    reply: {
      en: 'For a common cold: warm fluids, steam inhalation, and rest usually help within a few days. If you develop high fever, breathlessness, or it lasts beyond a week, please see a doctor.',
      hi: 'सामान्य सर्दी के लिए: गर्म तरल पदार्थ और आराम मदद करते हैं। अगर तेज़ बुखार हो, तो डॉक्टर से मिलें।',
      pa: 'ਆਮ ਜ਼ੁਕਾਮ ਲਈ: ਗਰਮ ਤਰਲ ਪਦਾਰਥ ਅਤੇ ਆਰਾਮ ਮਦਦ ਕਰਦੇ ਹਨ।',
    },
  },
];

const DEFAULT_REPLY = {
  en: "Thanks for sharing that. I can offer general wellness guidance, but I'm not able to diagnose anything. For anything more than minor self-care, it's best to book a real doctor or counselor appointment. Is there anything specific I can help you understand better?",
  hi: 'यह बताने के लिए धन्यवाद। मैं सामान्य स्वास्थ्य मार्गदर्शन दे सकती हूँ, लेकिन निदान नहीं कर सकती। कृपया एक वास्तविक डॉक्टर या काउंसलर अपॉइंटमेंट बुक करें।',
  pa: 'ਇਹ ਸਾਂਝਾ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਮੈਂ ਆਮ ਸਿਹਤ ਮਾਰਗਦਰਸ਼ਨ ਦੇ ਸਕਦੀ ਹਾਂ, ਪਰ ਨਿਦਾਨ ਨਹੀਂ ਕਰ ਸਕਦੀ।',
};

export function detectEmergencyLocal(text) {
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

export function localChatbotReply(message, lang = 'en') {
  if (detectEmergencyLocal(message)) {
    return { reply: EMERGENCY_MESSAGE_BY_LANG[lang] || EMERGENCY_MESSAGE_BY_LANG.en, emergency: true };
  }
  const text = message.toLowerCase();
  for (const rule of FALLBACK_RULES) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return { reply: rule.reply[lang] || rule.reply.en, emergency: false };
    }
  }
  return { reply: DEFAULT_REPLY[lang] || DEFAULT_REPLY.en, emergency: false };
}
