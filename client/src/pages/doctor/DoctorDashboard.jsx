import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Camera, CheckCircle, XCircle, Power } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  Requested: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-teal-100 text-teal-700',
  Completed: 'bg-slate-100 text-slate-500',
  Cancelled: 'bg-red-100 text-red-600',
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [responseDrafts, setResponseDrafts] = useState({});

  const load = async () => {
    const { data: doc } = await supabase.from('doctors').select('*').eq('user_id', user.id).single();
    setDoctor(doc);
    if (!doc) return;
    const { data: appts } = await supabase
      .from('appointments')
      .select('*, profiles(name, hostel_block, room_no)')
      .eq('doctor_id', doc.id)
      .order('slot_time', { ascending: true });
    setAppointments(appts || []);

    const ids = (appts || []).map((a) => a.id);
    if (ids.length) {
      const { data: subs } = await supabase.from('photo_submissions').select('*').in('appointment_id', ids);
      const grouped = {};
      (subs || []).forEach((s) => {
        grouped[s.appointment_id] = grouped[s.appointment_id] || [];
        grouped[s.appointment_id].push(s);
      });
      // resolve signed URLs
      for (const key of Object.keys(grouped)) {
        for (const s of grouped[key]) {
          const { data } = await supabase.storage.from('photo-submissions').createSignedUrl(s.image_path, 3600);
          s.url = data?.signedUrl;
        }
      }
      setSubmissions(grouped);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleAvailability = async () => {
    const { data } = await supabase.from('doctors').update({ available: !doctor.available }).eq('id', doctor.id).select().single();
    setDoctor(data);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    load();
  };

  const submitResponse = async (submissionId) => {
    const text = responseDrafts[submissionId];
    if (!text) return;
    await supabase.from('photo_submissions').update({ doctor_response: text }).eq('id', submissionId);
    load();
  };

  if (!doctor) return <div className="p-10 text-center text-slate-400">Loading dashboard...</div>;

  const requested = appointments.filter((a) => a.status === 'Requested');
  const confirmed = appointments.filter((a) => a.status === 'Confirmed');
  const mentalWellbeing = appointments.filter((a) => doctor.type === 'therapist');

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {doctor.photo_emoji} {doctor.name}
          </h1>
          <p className="text-sm text-slate-500">{doctor.specialty}</p>
        </div>
        <button
          onClick={toggleAvailability}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            doctor.available ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <Power size={15} /> {doctor.available ? 'Available' : 'Offline'}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-600">Incoming Requests ({requested.length})</h2>
          <div className="space-y-3">
            {requested.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{a.profiles?.name}</p>
                    <p className="text-xs text-slate-500">{new Date(a.slot_time).toLocaleString()} · {a.mode}</p>
                    {a.reason && <p className="mt-1 text-xs text-slate-400">"{a.reason}"</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => updateStatus(a.id, 'Confirmed')} className="rounded-full bg-teal-100 p-1.5 text-teal-700">
                      <CheckCircle size={16} />
                    </button>
                    <button onClick={() => updateStatus(a.id, 'Cancelled')} className="rounded-full bg-red-100 p-1.5 text-red-600">
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {requested.length === 0 && <p className="text-sm text-slate-400">No pending requests.</p>}
          </div>

          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-teal-700">Teleconsult Queue ({confirmed.length})</h2>
          <div className="space-y-3">
            {confirmed.map((a) => (
              <div key={a.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-slate-800">{a.profiles?.name}</p>
                  <p className="text-xs text-slate-500">{new Date(a.slot_time).toLocaleString()} · {a.mode}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {a.mode !== 'in-person' && (
                    <button onClick={() => navigate(`/teleconsult?appointment=${a.id}`)} className="btn-outline !px-3 !py-1.5 text-xs">
                      <Video size={13} /> Join
                    </button>
                  )}
                  <button onClick={() => updateStatus(a.id, 'Completed')} className="btn-primary !px-3 !py-1.5 text-xs">
                    Mark done
                  </button>
                </div>
              </div>
            ))}
            {confirmed.length === 0 && <p className="text-sm text-slate-400">Queue is empty.</p>}
          </div>
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent-600">
            <Camera size={14} /> Photo Consults
          </h2>
          <div className="space-y-3">
            {Object.entries(submissions).map(([apptId, subs]) =>
              subs.map((s) => (
                <div key={s.id} className="card p-4">
                  {s.url && <img src={s.url} alt="submission" className="mb-2 max-h-48 w-full rounded-lg object-cover" />}
                  <p className="text-sm text-slate-600">"{s.note}"</p>
                  {s.doctor_response ? (
                    <p className="mt-2 rounded-lg bg-teal-50 p-2 text-xs text-teal-800">
                      <span className="font-semibold">Your response: </span>
                      {s.doctor_response}
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="input !py-1.5 text-xs"
                        placeholder="Write guidance for the patient..."
                        value={responseDrafts[s.id] || ''}
                        onChange={(e) => setResponseDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                      />
                      <button onClick={() => submitResponse(s.id)} className="btn-primary !px-3 !py-1.5 text-xs">
                        Send
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {Object.keys(submissions).length === 0 && <p className="text-sm text-slate-400">No photo consults submitted yet.</p>}
          </div>

          {doctor.type === 'therapist' && (
            <>
              <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-teal-700">Mental Wellbeing Sessions</h2>
              <div className="space-y-2">
                {mentalWellbeing.map((a) => (
                  <div key={a.id} className="card p-3 text-sm text-slate-600">
                    {a.profiles?.name} — {new Date(a.slot_time).toLocaleString()} — <span className="font-semibold">{a.status}</span>
                  </div>
                ))}
                {mentalWellbeing.length === 0 && <p className="text-sm text-slate-400">No sessions yet.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
