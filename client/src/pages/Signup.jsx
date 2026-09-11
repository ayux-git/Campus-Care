import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', hostelBlock: '', roomNo: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-teal-700">Check your inbox 📩</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account was created. If email confirmation is enabled on this Supabase project, confirm your email, then log in.
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-flex">
          {t('auth.login_link')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-800">{t('auth.signup_title')}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.name')}</label>
          <input required value={form.name} onChange={update('name')} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.email')}</label>
          <input type="email" required value={form.email} onChange={update('email')} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.password')}</label>
          <input type="password" required minLength={6} value={form.password} onChange={update('password')} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.role')}</label>
          <select value={form.role} onChange={update('role')} className="input">
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.hostel_block')}</label>
            <input value={form.hostelBlock} onChange={update('hostelBlock')} className="input" placeholder="BH-4" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.room_no')}</label>
            <input value={form.roomNo} onChange={update('roomNo')} className="input" placeholder="212" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? '...' : t('auth.signup_button')}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        {t('auth.have_account')}{' '}
        <Link to="/login" className="font-semibold text-teal-600 hover:underline">
          {t('auth.login_link')}
        </Link>
      </p>
    </div>
  );
}
