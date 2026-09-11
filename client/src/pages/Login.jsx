import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_PASSWORD } from '../lib/supabaseClient';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student1@campuscare.demo' },
  { role: 'Staff', email: 'staff1@campuscare.demo' },
  { role: 'Doctor', email: 'doctor1@campuscare.demo' },
  { role: 'Therapist', email: 'doctor2@campuscare.demo' },
  { role: 'Pharmacy Admin', email: 'pharmacy1@campuscare.demo' },
];

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-teal-600 text-white">
        <HeartPulse size={24} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">{t('auth.login_title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('auth.login_subtitle')}</p>

      <form onSubmit={submit} className="mt-8 w-full space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.email')}</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.password')}</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? '...' : t('auth.login_button')}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        {t('auth.signup_prompt')}{' '}
        <Link to="/signup" className="font-semibold text-teal-600 hover:underline">
          {t('auth.signup_link')}
        </Link>
      </p>

      <div className="mt-8 w-full rounded-xl2 border border-dashed border-teal-200 bg-teal-50/50 p-4">
        <p className="mb-2 text-xs font-semibold text-teal-700">{t('auth.demo_accounts')}</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => quickFill(d.email)}
              className="rounded-full border border-teal-300 bg-white px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
            >
              {d.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
