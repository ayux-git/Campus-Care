import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Mic, MicOff, Volume2, AlertTriangle, CalendarPlus, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { localChatbotReply } from '../lib/chatbotFallback';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const LANG_SPEECH_CODE = { en: 'en-US', hi: 'hi-IN', pa: 'pa-IN' };

const OPEN_EVENT = 'drsahab:open';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

// Short sentence-sized chunks start sooner and dodge Chrome's habit of
// stalling on long utterances. Emoji are dropped so they aren't read aloud.
function speechChunks(text) {
  const clean = text.replace(/\p{Extended_Pictographic}|•/gu, '');
  const parts = (clean.match(/[^.!?।]+[.!?।]*/g) || []).map((s) => s.trim()).filter(Boolean);
  // Merge pieces forward when they're tiny or end in an abbreviation
  // ("Dr.", "डॉ.", "ਡਾ."), so those don't become a pause mid-sentence.
  const endsInAbbreviation = (s) => /(^|\s)\S{1,3}\.$/u.test(s);
  const chunks = [];
  let carry = '';
  for (const part of parts) {
    carry = carry ? `${carry} ${part}` : part;
    if (carry.length >= 20 && !endsInAbbreviation(carry)) {
      chunks.push(carry);
      carry = '';
    }
  }
  if (carry) chunks.push(carry);
  return chunks;
}

export function openDrSahab() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function DrSahabWidget() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState(null);
  const doctorsOnline = availableDoctors === null || availableDoctors.length > 0;
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ sender: 'bot', text: t('chatbot.greeting'), emergency: false }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Doctors who are available now, offered as one-tap booking under each answer.
    supabase
      .from('doctors')
      .select('id, name, specialty, type')
      .eq('available', true)
      .order('type')
      .limit(3)
      .then(({ data }) => setAvailableDoctors(data || []));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  // Closing the chat stops it talking.
  useEffect(() => {
    if (!open) synth?.cancel();
  }, [open]);

  // Lets other pages (e.g. the Home "Talk to Dr Sahab" button) open the chat.
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, openChat);
    return () => window.removeEventListener(OPEN_EVENT, openChat);
  }, []);

  // A ref, not state, so replies that arrive after a toggle (or from a voice
  // recognition callback created earlier) see the current setting.
  const voiceOutRef = useRef(false);

  // Stop talking if the widget unmounts (e.g. a doctor logs in).
  useEffect(() => () => synth?.cancel(), []);

  const speak = (text, force = false) => {
    if (!synth || (!force && !voiceOutRef.current)) return;
    // Drop anything still queued so the newest reply starts immediately.
    synth.cancel();
    const lang = LANG_SPEECH_CODE[i18n.language] || 'en-US';
    for (const chunk of speechChunks(text)) {
      const utter = new SpeechSynthesisUtterance(chunk);
      utter.lang = lang;
      synth.speak(utter);
    }
  };

  const toggleVoiceOut = () => {
    const next = !voiceOutRef.current;
    voiceOutRef.current = next;
    setVoiceOut(next);
    if (!next) {
      synth?.cancel();
      return;
    }
    // Immediate feedback (and it warms the speech engine inside the click,
    // which browsers require): read the latest bot message right away.
    const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
    if (lastBot) speak(lastBot.text, true);
  };

  const logMessage = async (message, sender) => {
    if (!user) return;
    await supabase.from('chat_logs').insert({ user_id: user.id, message, sender });
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setSending(true);
    logMessage(trimmed, 'user');

    // Earlier turns (minus the canned greeting) so replies follow the conversation.
    const history = messages.slice(1).map(({ sender, text }) => ({ sender, text }));

    try {
      const { data, error } = await supabase.functions.invoke('pratiksha-chat', {
        body: { message: trimmed, history, lang: i18n.language, doctorsOnline },
      });
      if (error) throw error;
      const replyText = data?.reply || "Sorry, I couldn't respond right now. Please try again.";
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: replyText, emergency: !!data?.emergency, sources: data?.sources || [] },
      ]);
      logMessage(replyText, 'bot');
      speak(replyText);
    } catch (err) {
      // Edge Function not deployed / offline — fall back to local rule-based
      // replies (including emergency detection) so the demo still works.
      const { reply, emergency } = localChatbotReply(trimmed, i18n.language);
      setMessages((prev) => [...prev, { sender: 'bot', text: reply, emergency }]);
      logMessage(reply, 'bot');
      speak(reply);
    } finally {
      setSending(false);
    }
  };

  const lastBotIndex = messages.reduce((last, m, i) => (m.sender === 'bot' ? i : last), -1);

  const openBooking = (path) => {
    setOpen(false);
    navigate(path);
  };

  const toggleListening = () => {
    if (!SpeechRecognitionAPI) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = LANG_SPEECH_CODE[i18n.language] || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-3 flex h-[32rem] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-teal-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg">🩺</span>
                <div>
                  <p className="text-sm font-semibold leading-tight">{t('chatbot.name')}</p>
                  <p className="text-[11px] text-teal-100">
                    {doctorsOnline ? 'Doctors online' : 'Stepping in — no doctor online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleVoiceOut}
                  aria-pressed={voiceOut}
                  className={`rounded-full p-1.5 transition ${voiceOut ? 'bg-white/30' : 'hover:bg-white/20'}`}
                  title="Toggle spoken replies"
                >
                  <Volume2 size={16} />
                </button>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/20">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-teal-50/40 px-3 py-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.emergency
                        ? 'border-2 border-red-400 bg-red-50 text-red-800'
                        : m.sender === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {m.emergency && (
                      <div className="mb-1 flex items-center gap-1 font-bold">
                        <AlertTriangle size={14} /> {t('chatbot.emergency')}
                      </div>
                    )}
                    <p className="whitespace-pre-line">{m.text}</p>

                    {/* Every answer (not the greeting or emergency alerts) carries its sources and the disclaimer. */}
                    {m.sender === 'bot' && i > 0 && !m.emergency && (
                      <>
                        {m.sources?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-500">{t('chatbot.sources')}</p>
                            {/* Plain labels, not links: students stay inside Campus Care. */}
                            {m.sources.map((s) => (
                              <p key={s.url} className="flex items-start gap-1 text-[11px] leading-snug text-slate-600">
                                <BookOpen size={11} className="mt-0.5 shrink-0 text-teal-700" />
                                <span className="line-clamp-1">{s.title}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-500">
                          {t('chatbot.disclaimer')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Booking options follow the latest answer. */}
              {lastBotIndex > 0 && !messages[lastBotIndex].emergency && !sending && (
                <div className="rounded-2xl border border-teal-100 bg-white p-3 shadow-sm">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <CalendarPlus size={14} className="text-teal-700" /> {t('chatbot.book_title')}
                  </p>
                  <div className="space-y-1.5">
                    {(availableDoctors || []).map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => openBooking(`/appointments?book=${doc.id}&type=${doc.type}`)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-xs transition hover:border-teal-300 hover:bg-teal-50"
                      >
                        <span className="font-semibold text-slate-800">{doc.name}</span>
                        <span className="truncate text-slate-500">{doc.specialty}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => openBooking('/appointments')}
                      className="w-full rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                    >
                      {t('chatbot.book_all')}
                    </button>
                  </div>
                </div>
              )}
              {sending && <div className="text-xs text-slate-500">{t('chatbot.typing')}</div>}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-1.5 border-t border-slate-100 bg-white p-2.5"
            >
              {SpeechRecognitionAPI && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                    listening ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Voice input"
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chatbot.placeholder')}
                className="input !py-2 flex-1 text-sm"
              />
              <button type="submit" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-600 text-white hover:bg-teal-700" disabled={sending}>
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-700 text-white shadow-xl hover:bg-accent-800"
        aria-label={t('chatbot.open')}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
}
