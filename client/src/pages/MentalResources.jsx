import { Wind, PhoneCall, Sparkles } from 'lucide-react';

export default function MentalResources() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-800">Wellbeing Resources</h1>
      <p className="mt-2 text-sm text-slate-500">Simple tools you can use anytime, plus how to reach a real person.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2 text-teal-700">
            <Wind size={20} /> <h3 className="font-semibold">Breathing Exercise (4-4-6)</h3>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Breathe in slowly through your nose for 4 counts.</li>
            <li>Hold your breath gently for 4 counts.</li>
            <li>Exhale slowly through your mouth for 6 counts.</li>
            <li>Repeat 5 times, relaxing your shoulders each round.</li>
          </ol>
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2 text-teal-700">
            <Sparkles size={20} /> <h3 className="font-semibold">Self-care tips</h3>
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Keep a consistent sleep schedule, even during exams.</li>
            <li>Step outside for 10 minutes of daylight each day.</li>
            <li>Talk to a friend or write in your journal when things feel heavy.</li>
            <li>Limit late-night screen time and doomscrolling.</li>
            <li>It's okay to ask for help — that's what counselors are here for.</li>
          </ul>
        </div>

        <div className="card p-6 md:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-accent-600">
            <PhoneCall size={20} /> <h3 className="font-semibold">Helpline & Emergency Contacts</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <span className="font-semibold">Campus Health Center (24x7):</span>{' '}
              <a href="tel:+911800XXXCARE" className="text-teal-600 hover:underline">+91-1800-XXX-CARE</a>
            </li>
            <li>
              <span className="font-semibold">iCall Psychosocial Helpline (India):</span>{' '}
              <a href="tel:+919152987821" className="text-teal-600 hover:underline">+91-9152987821</a>
            </li>
            <li>
              <span className="font-semibold">Vandrevala Foundation Helpline:</span>{' '}
              <a href="tel:+919999666555" className="text-teal-600 hover:underline">+91-9999-666-555</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
