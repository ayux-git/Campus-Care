import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  hr: '#ee5c08',
  steps: '#2ea89a',
  calories: '#22877d',
};

export default function StatCard({ type, icon: Icon, label, unit, color }) {
  const { user } = useAuth();
  const [range, setRange] = useState('week');
  const [metrics, setMetrics] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - (range === 'today' ? 1 : 7));
    const { data } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: true });
    setMetrics(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, user]);

  const chartData = metrics.map((m) => ({
    label: new Date(m.recorded_at).toLocaleDateString(undefined, { weekday: 'short' }),
    value: m.value,
  }));
  const latest = metrics[metrics.length - 1]?.value ?? '—';

  const logValue = async (e) => {
    e.preventDefault();
    if (!value) return;
    await supabase.from('health_metrics').insert({ user_id: user.id, type, value: Number(value) });
    setValue('');
    setShowForm(false);
    load();
  };

  const barColor = color || COLORS[type] || '#2ea89a';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ backgroundColor: `${barColor}1a`, color: barColor }}>
            <Icon size={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-800">
              {latest} <span className="text-xs font-normal text-slate-400">{unit}</span>
            </p>
          </div>
        </div>
        <div className="flex overflow-hidden rounded-full border border-slate-200 text-[11px]">
          <button
            onClick={() => setRange('today')}
            className={`px-2.5 py-1 ${range === 'today' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
          >
            Today
          </button>
          <button
            onClick={() => setRange('week')}
            className={`px-2.5 py-1 ${range === 'week' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="mt-3 h-24">
        {loading ? (
          <div className="h-full animate-pulse rounded bg-slate-100" />
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke={barColor} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-400">No data yet</div>
        )}
      </div>

      {showForm ? (
        <form onSubmit={logValue} className="mt-3 flex gap-2">
          <input
            autoFocus
            type="number"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input !py-1.5 text-sm"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs">
            Save
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          <Plus size={13} /> Log a value
        </button>
      )}
    </div>
  );
}
