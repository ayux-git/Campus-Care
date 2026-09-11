import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HeartPulse, Footprints, Flame, AlertTriangle, BookHeart, Smile } from 'lucide-react';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Awful' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

function useHealthAlert(userId) {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const [{ data: hr }, { data: steps }] = await Promise.all([
        supabase.from('health_metrics').select('value').eq('user_id', userId).eq('type', 'hr').gte('recorded_at', since.toISOString()),
        supabase.from('health_metrics').select('value').eq('user_id', userId).eq('type', 'steps').gte('recorded_at', since.toISOString()),
      ]);
      const abnormalHr = (hr || []).filter((m) => m.value > 100 || m.value < 50);
      if ((hr || []).length >= 3 && abnormalHr.length / hr.length > 0.5) {
        setAlert('Your recent heart rate readings have been outside the healthy resting range.');
        return;
      }
      const lowSteps = (steps || []).filter((m) => m.value < 2000);
      if (lowSteps.length >= 3) {
        setAlert('Your step count has been very low for several days.');
      }
    })();
  }, [userId]);

  return alert;
}

function MentalTab() {
  const { user, profile } = useAuth();
  const [mood, setMood] = useState(null);
  const [stress, setStress] = useState(5);
  const [journal, setJournal] = useState('');
  const [saved, setSaved] = useState(false);
  const [recentMoods, setRecentMoods] = useState([]);

  const loadMoods = async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'mood')
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: true });
    setRecentMoods(data || []);
  };

  useEffect(() => {
    loadMoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitCheckIn = async () => {
    if (!mood) return;
    await supabase.from('health_metrics').insert([
      { user_id: user.id, type: 'mood', value: mood },
      { user_id: user.id, type: 'stress', value: stress },
      ...(journal.trim() ? [{ user_id: user.id, type: 'journal', value: 0, note: journal.trim() }] : []),
    ]);
    setSaved(true);
    setJournal('');
    loadMoods();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Smile size={18} className="text-teal-600" /> Daily Mood Check-in
        </h3>
        <div className="flex justify-between gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-3 text-2xl transition ${
                mood === m.value ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-slate-50'
              }`}
            >
              <span>{m.emoji}</span>
              <span className="text-[10px] font-medium text-slate-500">{m.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label className="mb-2 flex justify-between text-sm font-medium text-slate-600">
            <span>Stress Level</span>
            <span className="font-bold text-teal-600">{stress}/10</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
        </div>

        <div className="mt-6">
          <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <BookHeart size={15} /> Private Journal
          </label>
          <textarea
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            rows={3}
            className="input"
            placeholder="How are you feeling today? This is just for you."
          />
        </div>

        <button onClick={submitCheckIn} disabled={!mood} className="btn-primary mt-5">
          Save entry
        </button>
        {saved && <span className="ml-3 text-sm font-medium text-teal-600">Saved ✓</span>}
      </div>

      <div className="card p-6">
        <h3 className="mb-3 text-base font-semibold text-slate-800">Recent mood trend</h3>
        <div className="flex flex-wrap gap-2">
          {recentMoods.length === 0 && <p className="text-sm text-slate-400">No check-ins yet this week.</p>}
          {recentMoods.map((m, i) => (
            <span key={i} className="text-2xl" title={new Date(m.recorded_at).toLocaleDateString()}>
              {MOODS.find((mo) => mo.value === m.value)?.emoji || '🙂'}
            </span>
          ))}
        </div>
        <Link to="/resources" className="mt-6 inline-block text-sm font-semibold text-teal-600 hover:underline">
          Wellbeing resources →
        </Link>
        <div className="mt-4 rounded-lg bg-teal-50 p-3 text-xs text-teal-800">
          Want to talk to someone? You can book a confidential session with a campus counselor from Appointments.
        </div>
      </div>
    </div>
  );
}

export default function HealthTracker() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState('physical');
  const alert = useHealthAlert(user?.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">{t('health_tracker.title')}</h1>

      {alert && (
        <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 shrink-0 text-accent-600" size={18} />
            <p className="text-sm text-accent-800">{t('health_tracker.alert_banner')}</p>
          </div>
          <Link to="/appointments" className="btn-accent shrink-0 !px-4 !py-2 text-xs">
            {t('health_tracker.book_now')}
          </Link>
        </div>
      )}

      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1">
        <button
          onClick={() => setTab('physical')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === 'physical' ? 'bg-teal-600 text-white' : 'text-slate-500'
          }`}
        >
          {t('health_tracker.tab_physical')}
        </button>
        <button
          onClick={() => setTab('mental')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === 'mental' ? 'bg-teal-600 text-white' : 'text-slate-500'
          }`}
        >
          {t('health_tracker.tab_mental')}
        </button>
      </div>

      <div className="mt-6">
        {tab === 'physical' ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard type="hr" icon={HeartPulse} label={t('health_tracker.heart_rate')} unit="bpm" color="#ee5c08" />
            <StatCard type="steps" icon={Footprints} label={t('health_tracker.steps')} unit="steps" color="#2ea89a" />
            <StatCard type="calories" icon={Flame} label={t('health_tracker.calories')} unit="kcal" color="#22877d" />
          </div>
        ) : (
          <MentalTab />
        )}
      </div>
    </div>
  );
}
