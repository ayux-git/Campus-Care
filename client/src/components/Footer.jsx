import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-teal-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center">
        <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
          <ShieldAlert size={14} />
          <span>{t('footer.disclaimer')}</span>
        </div>
        <p className="text-xs text-slate-400">Campus Care · Built for LPU · Hackathon Prototype</p>
      </div>
    </footer>
  );
}
