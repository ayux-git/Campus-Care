import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Navigation, Map as MapIcon } from 'lucide-react';

// Positions are percentages over the official LPU campus directory map
// (client/public/campus-map.jpg), matched to the block numbers in its legend.
const PINS = [
  { id: 'pharmacy', x: 42.4, y: 58.0, label: 'Campus Pharmacy', emoji: '💊', desc: 'Block 4 — open 8am to 10pm, per the campus directory.' },
  { id: 'hospital', x: 46.4, y: 60.7, label: 'Campus Health Center', emoji: '🏥', desc: 'Block 3 (Physiotherapy) — 24x7 emergency & OPD.' },
  { id: 'counseling', x: 34.0, y: 45.4, label: 'Student Welfare / Counseling', emoji: '🧠', desc: 'Block 13 — Student Welfare office, confidential wellbeing support.' },
  { id: 'admin', x: 29.8, y: 36.8, label: 'Administrative Block', emoji: '🏛️', desc: 'Block 30 — Prochancellor\'s office, administration.' },
  { id: 'hostel-girls', x: 44.7, y: 46.7, label: 'Girls Hostel', emoji: '🏠', desc: 'Block 10, part of the Girls Hostel cluster (9, 10, 11, 12, 21A/B).' },
  { id: 'hostel-boys', x: 30.7, y: 21.9, label: 'Boys Hostel', emoji: '🏠', desc: 'Block 49, part of the Boys Hostel cluster (45, 48, 49, 50, 51, 52, 53).' },
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
          <div className="relative w-full overflow-hidden rounded-xl bg-amber-50">
            <img src="/campus-map.jpg" alt="LPU campus directory map" className="block w-full" />
            {PINS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:z-10 hover:scale-110"
                title={p.label}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white text-base shadow-lg ${
                    selected.id === p.id ? 'bg-accent-500' : 'bg-teal-600'
                  }`}
                >
                  {p.emoji}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-slate-400">
            Official LPU campus directory map — tap a pin to see details. Pin placement is approximate, matched to the block directory, not a live GPS map.
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

      <h2 className="mt-12 flex items-center gap-2 text-xl font-bold text-slate-800">
        <MapIcon size={20} className="text-teal-600" /> Find Us on Google Maps
      </h2>
      <p className="mt-1 text-sm text-slate-500">A live, real-world map of LPU's location — pan and zoom just like regular Google Maps.</p>
      <div className="card mt-4 overflow-hidden p-2">
        <iframe
          src="https://www.google.com/maps?q=Lovely+Professional+University,+Phagwara,+Punjab&output=embed"
          title="LPU Campus Location"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-[400px] w-full rounded-xl sm:h-[450px]"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
