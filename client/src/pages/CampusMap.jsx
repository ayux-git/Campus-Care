import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Navigation } from 'lucide-react';

const PINS = [
  { id: 'hospital', x: 250, y: 120, label: 'Campus Hospital', emoji: '🏥', desc: 'Block 32 — 24x7 emergency & OPD.' },
  { id: 'pharmacy', x: 320, y: 150, label: 'Campus Pharmacy', emoji: '💊', desc: 'Block 32, Ground Floor — open 8am to 10pm.' },
  { id: 'counseling', x: 180, y: 200, label: 'Counseling Center', emoji: '🧠', desc: 'Block 26 — confidential mental wellbeing support.' },
  { id: 'hostel-boys', x: 420, y: 260, label: 'Boys Hostel (BH 1-12)', emoji: '🏠', desc: 'South campus residential blocks.' },
  { id: 'hostel-girls', x: 90, y: 280, label: 'Girls Hostel (GH 1-9)', emoji: '🏠', desc: 'West campus residential blocks.' },
  { id: 'admin', x: 250, y: 300, label: 'Admin Block', emoji: '🏛️', desc: 'Block 1 — main administration.' },
];

const NEARBY = [
  { name: 'CMC Hospital, Phagwara', address: 'GT Road, Phagwara, Punjab', distance: '3.2 km', phone: '+91-1824-225533' },
  { name: 'Sacred Heart Hospital', address: 'Grand Trunk Road, Phagwara', distance: '4.0 km', phone: '+91-1824-266000' },
  { name: 'Apollo Pharmacy, Phagwara', address: 'Near LPU Main Gate, Phagwara', distance: '1.5 km', phone: '+91-98765-43210' },
  { name: 'Civil Hospital Phagwara', address: 'Civil Lines, Phagwara, Punjab', distance: '5.1 km', phone: '+91-1824-222222' },
  { name: 'Fortis Hospital, Jalandhar', address: 'Chandigarh Road, Jalandhar', distance: '18 km', phone: '+91-181-5063000' },
  { name: 'Jan Aushadhi Kendra, Phagwara', address: 'Model Town, Phagwara', distance: '2.8 km', phone: '+91-98140-11111' },
];

export default function CampusMap() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(PINS[0]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">{t('map.title')}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden p-3 lg:col-span-2">
          <svg viewBox="0 0 500 380" className="w-full rounded-xl bg-teal-50/60">
            <rect x="10" y="10" width="480" height="360" rx="16" fill="#eafaf7" stroke="#b6ebe4" />
            <rect x="60" y="90" width="120" height="70" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            <rect x="280" y="90" width="120" height="80" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            <rect x="140" y="170" width="100" height="60" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            <rect x="50" y="240" width="100" height="90" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            <rect x="370" y="220" width="100" height="90" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            <rect x="200" y="270" width="100" height="60" rx="8" fill="#d9f5f2" stroke="#86dbd0" />
            {PINS.map((p) => (
              <g
                key={p.id}
                transform={`translate(${p.x}, ${p.y})`}
                onClick={() => setSelected(p)}
                className="cursor-pointer"
              >
                <circle r="16" fill={selected.id === p.id ? '#fd7712' : '#22877d'} stroke="white" strokeWidth="2" />
                <text textAnchor="middle" dy="6" fontSize="16">
                  {p.emoji}
                </text>
              </g>
            ))}
          </svg>
          <p className="mt-2 px-1 text-xs text-slate-400">
            A simplified schematic layout — tap a pin to see details. Not a live GPS map.
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-teal-700">
            <MapPin size={18} /> <h3 className="font-semibold">{selected.label}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500">{selected.desc}</p>
          <div className="mt-4 space-y-1.5">
            {PINS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                  selected.id === p.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{p.emoji}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-12 text-xl font-bold text-slate-800">{t('map.nearby_title')}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NEARBY.map((n) => (
          <div key={n.name} className="card p-4">
            <p className="font-semibold text-slate-800">{n.name}</p>
            <p className="mt-1 text-xs text-slate-500">{n.address}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-teal-600">
                <Navigation size={12} /> {n.distance}
              </span>
              <a href={`tel:${n.phone}`} className="flex items-center gap-1 font-semibold text-accent-600 hover:underline">
                <Phone size={12} /> Call
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
