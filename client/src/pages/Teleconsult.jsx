import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Video, Phone, MessageSquare, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function ChatOnlySession({ roomName }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = supabase.channel(`consult-${roomName}`, { config: { broadcast: { self: true } } });
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
      setMessages((prev) => [...prev, payload]);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => supabase.removeChannel(channel);
  }, [roomName]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: { text, sender: profile?.name || 'You', senderId: user?.id, at: Date.now() },
    });
    setText('');
  };

  return (
    <div className="card flex h-[28rem] flex-col p-4">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.senderId === user?.id ? 'ml-auto bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.sender}</p>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-400">Chat-only session — say hello to start.</p>}
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="input flex-1 text-sm" placeholder="Type a message..." />
        <button type="submit" className="btn-primary !px-3">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

export default function Teleconsult() {
  const [params] = useSearchParams();
  const appointmentId = params.get('appointment');
  const { user, profile } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    supabase
      .from('appointments')
      .select('*, doctors(*)')
      .eq('id', appointmentId)
      .single()
      .then(({ data }) => {
        setAppointment(data);
        setLoading(false);
      });
  }, [appointmentId]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading session...</div>;

  if (!appointment) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Video className="mx-auto text-teal-300" size={40} />
        <h1 className="mt-4 text-xl font-bold text-slate-800">No active session</h1>
        <p className="mt-2 text-sm text-slate-500">Join a call from your confirmed appointments.</p>
        <Link to="/appointments" className="btn-primary mt-6 inline-flex">
          Go to Appointments
        </Link>
      </div>
    );
  }

  const roomName = appointment.room_name || `CampusCare-${appointment.id}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(
    profile?.name || 'Guest'
  )}"${appointment.mode === 'audio' ? '&config.startWithVideoMuted=true' : ''}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Session with {appointment.doctors?.name} {appointment.doctors?.photo_emoji}
          </h1>
          <p className="text-sm text-slate-500">{new Date(appointment.slot_time).toLocaleString()}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
          {appointment.mode === 'video' && <Video size={13} />}
          {appointment.mode === 'audio' && <Phone size={13} />}
          {appointment.mode === 'chat' && <MessageSquare size={13} />}
          {appointment.mode}
        </span>
      </div>

      {appointment.mode === 'chat' ? (
        <ChatOnlySession roomName={roomName} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-teal-100 shadow-card">
          <iframe
            title="Jitsi Meet"
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: '600px', border: 0 }}
          />
        </div>
      )}
      <p className="mt-3 text-center text-xs text-slate-400">
        Low bandwidth? You can switch to an audio-only or chat-only session from your appointment booking next time.
      </p>
    </div>
  );
}
