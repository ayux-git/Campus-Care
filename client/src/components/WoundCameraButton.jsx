import { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, X, Upload, Send, AlertTriangle, Phone, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const EMERGENCY_NUMBER = '+911800XXXCARE';

function NewReportTab({ onSubmitted }) {
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [bodyLocation, setBodyLocation] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setStreaming(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      setError('Could not access camera. You can upload a photo instead.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

  useEffect(() => () => stopCamera(), []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      setFile(blob);
      setPreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg');
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file || !user) return;
    setSaving(true);
    setError('');
    try {
      const ext = file.type?.includes('png') ? 'png' : 'jpg';
      const path = `${user.id}/wound-reports/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('photo-submissions').upload(path, file, {
        contentType: file.type || 'image/jpeg',
      });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from('wound_reports').insert({
        user_id: user.id,
        image_path: path,
        body_location: bodyLocation,
        severity,
        note,
      });
      if (insertErr) throw insertErr;
      setPreview(null);
      setFile(null);
      setBodyLocation('');
      setNote('');
      setSeverity('mild');
      onSubmitted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {streaming ? (
        <div>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
          <button onClick={capturePhoto} className="btn-primary mt-2 w-full !py-1.5 text-xs">
            Capture
          </button>
        </div>
      ) : preview ? (
        <img src={preview} alt="wound preview" className="max-h-52 w-full rounded-lg object-cover" />
      ) : (
        <div className="flex gap-2">
          <button onClick={startCamera} className="btn-outline flex-1 !py-2 text-xs">
            <CameraIcon size={14} /> Use camera
          </button>
          <label className="btn-outline flex-1 cursor-pointer !py-2 text-xs">
            <Upload size={14} /> Upload
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Body location</label>
        <input
          value={bodyLocation}
          onChange={(e) => setBodyLocation(e.target.value)}
          placeholder="e.g. left forearm"
          className="input !py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">How does it feel?</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="input !py-1.5 text-sm">
          <option value="mild">Mild — small cut or scrape</option>
          <option value="moderate">Moderate — some swelling or pain</option>
          <option value="unsure">Not sure</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Quick details</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="input text-sm"
          placeholder="How did it happen? Any bleeding, redness, or discharge?"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button onClick={submit} disabled={!file || saving} className="btn-accent w-full !py-2 text-sm">
        <Send size={14} /> {saving ? 'Sending...' : 'Send to a doctor'}
      </button>
      <p className="text-center text-[11px] text-slate-400">
        A doctor will review this asynchronously, usually within a few hours — not a live consult.
      </p>
    </div>
  );
}

function MyReportsTab({ reports }) {
  if (!reports.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No wound reports submitted yet.</p>;
  }
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-100 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{r.body_location || 'Unspecified location'}</p>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                r.status === 'Reviewed' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {r.status === 'Reviewed' ? <CheckCircle2 size={11} /> : <Clock size={11} />} {r.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">"{r.note}"</p>
          {r.doctor_response && (
            <p className="mt-2 rounded-lg bg-teal-50 p-2 text-xs text-teal-800">
              <span className="font-semibold">Doctor's guidance: </span>
              {r.doctor_response}
            </p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

export default function WoundCameraButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('new');
  const [reports, setReports] = useState([]);

  const loadReports = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wound_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  };

  useEffect(() => {
    if (open) loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700"
        aria-label="Open Wound Camera"
        title="Wound Camera — quick photo triage"
      >
        <CameraIcon size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-teal-600 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CameraIcon size={16} /> Wound Camera
              </p>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20">
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-800">
              <p className="flex items-start gap-1.5 font-semibold">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                For severe bleeding, deep wounds, or signs of infection, go directly to the campus hospital now.
              </p>
              <a href={`tel:${EMERGENCY_NUMBER}`} className="mt-1 inline-flex items-center gap-1 font-semibold underline">
                <Phone size={11} /> Call campus health center
              </a>
            </div>

            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setTab('new')}
                className={`flex-1 py-2 text-xs font-semibold ${tab === 'new' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-400'}`}
              >
                New Report
              </button>
              <button
                onClick={() => setTab('history')}
                className={`flex-1 py-2 text-xs font-semibold ${tab === 'history' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-400'}`}
              >
                My Reports ({reports.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'new' ? (
                <NewReportTab
                  onSubmitted={() => {
                    loadReports();
                    setTab('history');
                  }}
                />
              ) : (
                <MyReportsTab reports={reports} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
