import { useRef, useState } from 'react';
import { Camera, Upload, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function PhotoConsult({ appointmentId, onSubmitted }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
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
      alert('Could not access camera. You can upload a photo instead.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

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

  const reset = () => {
    setPreview(null);
    setFile(null);
    setNote('');
    stopCamera();
    setOpen(false);
  };

  const submit = async () => {
    if (!file || !user) return;
    setSaving(true);
    try {
      const ext = file.type?.includes('png') ? 'png' : 'jpg';
      const path = `${user.id}/appointment-${appointmentId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('photo-submissions').upload(path, file, {
        contentType: file.type || 'image/jpeg',
      });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase
        .from('photo_submissions')
        .insert({ appointment_id: appointmentId, image_path: path, note });
      if (insertErr) throw insertErr;
      onSubmitted?.();
      reset();
    } catch (err) {
      alert('Could not submit photo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700">
        <Camera size={13} /> Add photo & note for the doctor
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-teal-700">Photo consult</p>
        <button onClick={reset}>
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      {streaming ? (
        <div className="mt-2">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
          <button onClick={capturePhoto} className="btn-primary mt-2 w-full !py-1.5 text-xs">
            Capture
          </button>
        </div>
      ) : preview ? (
        <img src={preview} alt="preview" className="mt-2 max-h-48 w-full rounded-lg object-cover" />
      ) : (
        <div className="mt-2 flex gap-2">
          <button onClick={startCamera} className="btn-outline flex-1 !py-1.5 text-xs">
            <Camera size={13} /> Use camera
          </button>
          <label className="btn-outline flex-1 cursor-pointer !py-1.5 text-xs">
            <Upload size={13} /> Upload
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Describe your concern briefly..."
        rows={2}
        className="input mt-2 text-sm"
      />

      {preview && (
        <button onClick={submit} disabled={saving} className="btn-accent mt-2 w-full !py-1.5 text-xs">
          <Send size={13} /> {saving ? 'Sending...' : 'Send to doctor'}
        </button>
      )}
    </div>
  );
}
