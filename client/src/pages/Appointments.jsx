import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Brain, Video, MessageSquare, Phone, CalendarPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import PhotoConsult from '../components/PhotoConsult';

const STATUS_COLORS = {
  Requested: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-teal-100 text-teal-700',
  Completed: 'bg-slate-100 text-slate-500',
  Cancelled: 'bg-red-100 text-red-600',
};

const MODE_ICON = { video: Video, audio: Phone, chat: MessageSquare, 'in-person': Stethoscope };

function BookingForm({ doctor, onClose, onBooked }) {
  const { user } = useAuth();
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('video');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!slot) return;
    setSaving(true);
    const roomName = `CampusCare-${doctor.id}-${Date.now()}`;
    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      doctor_id: doctor.id,
      slot_time: new Date(slot).toISOString(),
      mode,
      reason,
      room_name: roomName,
      status: 'Requested',
    });
    setSaving(false);
    if (!error) {
      onBooked();
      onClose();
    } else {
      alert(error.message);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2.5 rounded-lg bg-slate-50 p-3">
      <input
        type="datetime-local"
        required
        value={slot}
        onChange={(e) => setSlot(e.target.value)}
        className="input !py-1.5 text-sm"
      />
      <select value={mode} onChange={(e) => setMode(e.target.value)} className="input !py-1.5 text-sm">
        <option value="video">Video call</option>
        <option value="audio">Audio call</option>
        <option value="chat">Chat only</option>
        <option value="in-person">In-person</option>
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for visit (optional)"
        className="input !py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 !py-1.5 text-xs">
          {saving ? 'Booking...' : 'Confirm booking'}
        </button>
        <button type="button" onClick={onClose} className="btn-outline !py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

function DoctorList({ type, onBooked }) {
  const [doctors, setDoctors] = useState([]);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    supabase
      .from('doctors')
      .select('*')
      .eq('type', type)
      .order('name')
      .then(({ data }) => setDoctors(data || []));
  }, [type]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {doctors.map((doc) => (
        <div key={doc.id} className="card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-xl">{doc.photo_emoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{doc.name}</p>
              <p className="text-xs text-slate-500">{doc.specialty}</p>
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${doc.available ? 'bg-teal-500' : 'bg-slate-300'}`} title={doc.available ? 'Available' : 'Offline'} />
          </div>
          {bookingId === doc.id ? (
            <BookingForm doctor={doc} onClose={() => setBookingId(null)} onBooked={onBooked} />
          ) : (
            <button onClick={() => setBookingId(doc.id)} className="btn-outline mt-3 w-full !py-1.5 text-xs">
              <CalendarPlus size={13} /> Book
            </button>
          )}
        </div>
      ))}
      {doctors.length === 0 && <p className="text-sm text-slate-400">No {type}s found yet.</p>}
    </div>
  );
}

export default function Appointments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [directoryTab, setDirectoryTab] = useState('doctor');
  const [listTab, setListTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);

  const loadAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(*)')
      .eq('user_id', user.id)
      .order('slot_time', { ascending: false });
    setAppointments(data || []);
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const now = new Date();
  const filtered = appointments.filter((a) =>
    listTab === 'upcoming' ? new Date(a.slot_time) >= now && a.status !== 'Cancelled' : new Date(a.slot_time) < now || a.status === 'Cancelled'
  );

  const cancelAppointment = async (id) => {
    await supabase.from('appointments').update({ status: 'Cancelled' }).eq('id', id);
    loadAppointments();
  };

  const canJoin = (a) => {
    const diffMins = (new Date(a.slot_time) - now) / 60000;
    return a.status === 'Confirmed' && diffMins <= 10 && diffMins >= -60 && a.mode !== 'in-person';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">{t('appointments.title')}</h1>

      <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-white p-1">
        <button
          onClick={() => setDirectoryTab('doctor')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            directoryTab === 'doctor' ? 'bg-teal-600 text-white' : 'text-slate-500'
          }`}
        >
          <Stethoscope size={14} /> Doctors
        </button>
        <button
          onClick={() => setDirectoryTab('therapist')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            directoryTab === 'therapist' ? 'bg-teal-600 text-white' : 'text-slate-500'
          }`}
        >
          <Brain size={14} /> Counselors
        </button>
      </div>

      <div className="mt-4">
        <DoctorList type={directoryTab} onBooked={loadAppointments} />
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">My Appointments</h2>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs">
          <button onClick={() => setListTab('upcoming')} className={`rounded-full px-3 py-1 font-semibold ${listTab === 'upcoming' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}>
            {t('appointments.upcoming')}
          </button>
          <button onClick={() => setListTab('past')} className={`rounded-full px-3 py-1 font-semibold ${listTab === 'past' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}>
            {t('appointments.past')}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((a) => {
          const ModeIcon = MODE_ICON[a.mode] || Stethoscope;
          return (
            <div key={a.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-50 text-lg">{a.doctors?.photo_emoji}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{a.doctors?.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.slot_time).toLocaleString()} · <ModeIcon size={11} className="mb-0.5 inline" /> {a.mode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                  {canJoin(a) && (
                    <button onClick={() => navigate(`/teleconsult?appointment=${a.id}`)} className="btn-accent !px-3 !py-1.5 text-xs">
                      {t('appointments.join_call')}
                    </button>
                  )}
                  {a.status !== 'Cancelled' && a.status !== 'Completed' && new Date(a.slot_time) >= now && (
                    <button onClick={() => cancelAppointment(a.id)} className="btn-outline !px-3 !py-1.5 text-xs">
                      {t('appointments.cancel')}
                    </button>
                  )}
                </div>
              </div>
              {a.status !== 'Cancelled' && <PhotoConsult appointmentId={a.id} onSubmitted={loadAppointments} />}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-400">Nothing here yet.</p>}
      </div>
    </div>
  );
}
