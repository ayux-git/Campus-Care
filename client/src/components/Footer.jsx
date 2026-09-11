import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ShieldAlert, MessageSquareHeart, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    const { error: err } = await supabase.from('feedback').insert({
      user_id: user?.id || null,
      email: email.trim() || user?.email || null,
      message: message.trim(),
      page_url: location.pathname,
    });
    setSending(false);
    if (err) {
      setError("Couldn't send that — please try again in a moment.");
      return;
    }
    setMessage('');
    setEmail('');
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <footer className="mt-16 border-t border-teal-100 bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
            <ShieldAlert size={14} />
            <span>{t('footer.disclaimer')}</span>
          </div>
          <p className="text-xs text-slate-400">Campus Care · Built for LPU ·</p>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            onClick={() => setOpen((v) => !v)}
            className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            <MessageSquareHeart size={16} />
            Contact the developers / send feedback
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {open && (
            <form onSubmit={submit} className="mx-auto mt-4 max-w-md space-y-2.5">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                maxLength={2000}
                placeholder="Found a bug, have an idea, or just want to say hi? Tell us here..."
                className="input text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={user ? `Using ${user.email} (or add another email)` : 'Your email (optional, so we can reply)'}
                className="input text-sm"
              />
              <button type="submit" disabled={sending || !message.trim()} className="btn-primary w-full !py-2 text-sm">
                <Send size={14} /> {sending ? 'Sending...' : 'Send feedback'}
              </button>
              {sent && <p className="text-center text-xs font-semibold text-teal-600">Thanks! Your message reached the developers. ✓</p>}
              {error && <p className="text-center text-xs font-medium text-red-600">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </footer>
  );
}
