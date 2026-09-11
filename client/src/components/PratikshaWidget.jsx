import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Mic, MicOff, Volume2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { localChatbotReply } from '../lib/chatbotFallback';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const LANG_SPEECH_CODE = { en: 'en-US', hi: 'hi-IN', pa: 'pa-IN' };

export default function PratikshaWidget() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [doctorsOnline, setDoctorsOnline] = useState(true);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ sender: 'bot', text: t('chatbot.greeting'), emergency: false }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('available', true)
      .then(({ count }) => setDoctorsOnline((count ?? 0) > 0));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const speak = (text) => {
    if (!voiceOut || typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_SPEECH_CODE[i18n.language] || 'en-US';
    window.speechSynthesis.speak(utter);
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

    try {
      const { data, error } = await supabase.functions.invoke('pratiksha-chat', {
        body: { message: trimmed, lang: i18n.language, doctorsOnline },
      });
      if (error) throw error;
      const replyText = data?.reply || "Sorry, I couldn't respond right now. Please try again.";
      setMessages((prev) => [...prev, { sender: 'bot', text: replyText, emergency: !!data?.emergency }]);
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
                  onClick={() => setVoiceOut((v) => !v)}
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
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && <div className="text-xs text-slate-400">Pratiksha is typing...</div>}
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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-xl hover:bg-accent-600"
        aria-label="Open Pratiksha chatbot"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
}
