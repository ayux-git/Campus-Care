import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Bike } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: '', hostelBlock: '', roomNo: '', languagePref: 'en' });
  const [isDeliveryPartner, setIsDeliveryPartner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [partnerSaving, setPartnerSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        hostelBlock: profile.hostel_block || '',
        roomNo: profile.room_no || '',
        languagePref: profile.language_pref || 'en',
      });
      setIsDeliveryPartner(!!profile.is_delivery_partner);
    }
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name: form.name,
        hostel_block: form.hostelBlock,
        room_no: form.roomNo,
        language_pref: form.languagePref,
      })
      .eq('id', user.id);
    setSaving(false);
    if (!error) {
      i18n.changeLanguage(form.languagePref);
      refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const toggleDeliveryPartner = async () => {
    const next = !isDeliveryPartner;
    setPartnerSaving(true);
    const { error } = await supabase.from('profiles').update({ is_delivery_partner: next }).eq('id', user.id);
    setPartnerSaving(false);
    if (!error) {
      setIsDeliveryPartner(next);
      refreshProfile();
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-teal-700">
          <User size={26} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{form.name}</h1>
          <p className="text-sm capitalize text-slate-500">{profile?.role}</p>
        </div>
      </div>

      <form onSubmit={save} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.name')}</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.hostel_block')}</label>
            <input value={form.hostelBlock} onChange={(e) => setForm((f) => ({ ...f, hostelBlock: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">{t('auth.room_no')}</label>
            <input value={form.roomNo} onChange={(e) => setForm((f) => ({ ...f, roomNo: e.target.value }))} className="input" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Preferred language</label>
          <select value={form.languagePref} onChange={(e) => setForm((f) => ({ ...f, languagePref: e.target.value }))} className="input">
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="pa">ਪੰਜਾਬੀ</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? '...' : 'Save changes'}
        </button>
        {saved && <p className="text-center text-sm font-medium text-teal-600">Saved ✓</p>}
      </form>

      {(profile?.role === 'student' || profile?.role === 'staff') && (
        <div className="mt-8 card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-600">
                <Bike size={20} />
              </span>
              <div>
                <p className="font-semibold text-slate-800">Part Time Jobs: Delivery Partner Program</p>
                <p className="mt-1 text-sm text-slate-500">
                  Opt in to claim campus pharmacy deliveries between classes and earn a flat fee per delivery, paid
                  into a mock in-app wallet.
                </p>
                {isDeliveryPartner && (
                  <Link to="/deliveries" className="mt-2 inline-block text-sm font-semibold text-teal-600 hover:underline">
                    Go to Part Time Jobs →
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={toggleDeliveryPartner}
              disabled={partnerSaving}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                isDeliveryPartner ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isDeliveryPartner ? 'Opted in ✓' : 'Opt in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
