import { useEffect, useState } from 'react';
import { Package, Wallet, CheckCircle2, Bike } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const NEXT_STATUS = { Preparing: 'Out for delivery', 'Out for delivery': 'Delivered' };

function parseItems(order) {
  return Array.isArray(order.items_json) ? order.items_json : JSON.parse(order.items_json || '[]');
}

export default function MyDeliveries() {
  const { user, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [claimError, setClaimError] = useState('');
  const [optingIn, setOptingIn] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: avail }, { data: active }, { data: done }] = await Promise.all([
      supabase.from('orders').select('*').is('courier_id', null).eq('status', 'Preparing').order('created_at'),
      supabase
        .from('orders')
        .select('*')
        .eq('courier_id', user.id)
        .in('status', ['Preparing', 'Out for delivery'])
        .order('created_at'),
      supabase
        .from('orders')
        .select('*')
        .eq('courier_id', user.id)
        .eq('status', 'Delivered')
        .order('created_at', { ascending: false }),
    ]);
    setAvailable(avail || []);
    setMine(active || []);
    setCompleted(done || []);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const claim = async (order) => {
    setClaimError('');
    const { data, error } = await supabase
      .from('orders')
      .update({ courier_id: user.id })
      .eq('id', order.id)
      .is('courier_id', null)
      .select();
    if (error) {
      setClaimError(error.message);
    } else if (!data || data.length === 0) {
      setClaimError('Someone else just claimed this delivery.');
    }
    loadAll();
  };

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await supabase.from('orders').update({ status: next }).eq('id', order.id).eq('courier_id', user.id);
    loadAll();
  };

  const totalEarned = completed.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);

  const optIn = async () => {
    setOptingIn(true);
    await supabase.from('profiles').update({ is_delivery_partner: true }).eq('id', user.id);
    await refreshProfile();
    setOptingIn(false);
  };

  if (!profile?.is_delivery_partner) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Bike className="mx-auto text-teal-300" size={40} />
        <h1 className="mt-4 text-xl font-bold text-slate-800">Part Time Jobs: Medicine Delivery</h1>
        <p className="mt-2 text-sm text-slate-500">
          Browse pharmacy orders that need a hand delivering to hostels, claim one between classes, and earn a flat
          fee per delivery — paid into a mock in-app wallet.
        </p>
        <button onClick={optIn} disabled={optingIn} className="btn-primary mt-6 inline-flex">
          {optingIn ? 'Joining...' : 'Join as a delivery partner'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Part Time Jobs: Medicine Delivery</h1>
          <p className="mt-1 text-sm text-slate-500">Claim an ongoing pharmacy order, deliver it, and earn.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
          <Wallet size={16} /> Wallet: ₹{totalEarned}
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1">
        {[
          { id: 'available', label: `Available (${available.length})` },
          { id: 'mine', label: `Active (${mine.length})` },
          { id: 'earnings', label: 'Earnings' },
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === tb.id ? 'bg-teal-600 text-white' : 'text-slate-500'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {claimError && <p className="mt-3 text-sm font-medium text-red-600">{claimError}</p>}

      <div className="mt-6 space-y-3">
        {tab === 'available' &&
          (available.length ? (
            available.map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-800">Order #{o.id}</p>
                  <p className="text-xs text-slate-500">
                    {o.hostel_block}, Room {o.room_no} · {parseItems(o).length} item(s) · ₹{o.total}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700">
                    Earn ₹{o.delivery_fee}
                  </span>
                  <button onClick={() => claim(o)} className="btn-primary !px-4 !py-1.5 text-xs">
                    Claim
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No deliveries available to claim right now.</p>
          ))}

        {tab === 'mine' &&
          (mine.length ? (
            mine.map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-800">Order #{o.id}</p>
                  <p className="text-xs text-slate-500">
                    {o.hostel_block}, Room {o.room_no} · ₹{o.total}
                  </p>
                  <ul className="mt-1 text-xs text-slate-400">
                    {parseItems(o).map((it, i) => (
                      <li key={i}>
                        {it.qty} × {it.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">{o.status}</span>
                  {NEXT_STATUS[o.status] && (
                    <button onClick={() => advance(o)} className="btn-accent !px-4 !py-1.5 text-xs">
                      Mark {NEXT_STATUS[o.status]}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No active deliveries. Claim one from the Available tab.</p>
          ))}

        {tab === 'earnings' && (
          <>
            <div className="card flex items-center justify-between p-5">
              <div className="flex items-center gap-2 text-teal-700">
                <Wallet size={20} />
                <div>
                  <p className="text-xs text-slate-500">Total earned</p>
                  <p className="text-xl font-bold text-slate-800">₹{totalEarned}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">{completed.length} completed deliveries</p>
            </div>
            <div className="space-y-2">
              {completed.map((o) => (
                <div key={o.id} className="card flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-teal-600" />
                    <span>Order #{o.id}</span>
                    <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="font-semibold text-teal-700">+₹{o.delivery_fee}</span>
                </div>
              ))}
              {completed.length === 0 && <p className="text-sm text-slate-400">No completed deliveries yet.</p>}
            </div>
          </>
        )}
      </div>

      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <Package size={12} /> Earnings are a mock in-app wallet for this prototype — no real payment gateway is
        connected.
      </p>
    </div>
  );
}
