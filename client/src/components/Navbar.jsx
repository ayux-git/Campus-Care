import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartPulse, Menu, X, Globe, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleConfig } from '../lib/roles';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

// Patients get the light header; doctors and pharmacy admins get a dark
// "workspace" header so it is obvious at a glance which portal you are in.
const THEMES = {
  patient: {
    header: 'border-b border-teal-100 bg-white/90 text-slate-700 backdrop-blur',
    logoText: 'text-teal-700',
    logoMark: 'bg-teal-600 text-white',
    badge: 'bg-teal-50 text-teal-700',
    link: (active, highlight) =>
      active
        ? highlight
          ? 'bg-accent-50 text-accent-700'
          : 'bg-teal-50 text-teal-700'
        : highlight
        ? 'text-accent-700 hover:bg-accent-50'
        : 'text-slate-600 hover:bg-slate-50',
    select: 'border-slate-200 bg-white text-slate-600 focus:ring-teal-200',
    selectIcon: 'text-slate-400',
    profile: 'bg-slate-50 text-slate-700 hover:bg-slate-100',
    mobilePanel: 'border-teal-100 bg-white',
    mobileDivider: 'border-slate-100',
    toggle: 'text-slate-700',
  },
  workspace: {
    header: 'border-b border-teal-900 bg-teal-800 text-white',
    logoText: 'text-white',
    logoMark: 'bg-white text-teal-800',
    badge: 'bg-white/15 text-teal-50',
    link: (active) => (active ? 'bg-white/15 text-white' : 'text-teal-100 hover:bg-white/10'),
    select: 'border-white/20 bg-teal-900/40 text-teal-50 focus:ring-white/30',
    selectIcon: 'text-teal-200',
    profile: 'bg-white/10 text-white hover:bg-white/20',
    mobilePanel: 'border-teal-900 bg-teal-800',
    mobileDivider: 'border-white/10',
    toggle: 'text-white',
  },
};

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const config = roleConfig(user ? profile?.role : null);
  const theme = config.workspace ? THEMES.workspace : THEMES.patient;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const languageSelect = (className) => (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={className}
      aria-label="Language switcher"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code} className="text-slate-800">
          {l.label}
        </option>
      ))}
    </select>
  );

  return (
    <header className={`sticky top-0 z-40 ${theme.header}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={config.home} className={`flex items-center gap-2 font-extrabold ${theme.logoText}`}>
            <span className={`grid h-9 w-9 place-items-center rounded-full ${theme.logoMark}`}>
              <HeartPulse size={20} />
            </span>
            <span className="text-lg">{t('app_name')}</span>
          </Link>
          {user && config.badge && (
            <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block ${theme.badge}`}>
              {t(config.badge)}
            </span>
          )}
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {config.links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${theme.link(isActive, l.highlight)}`
              }
            >
              {t(l.label)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="relative">
            {languageSelect(
              `appearance-none rounded-full border py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 ${theme.select}`
            )}
            <Globe size={14} className={`pointer-events-none absolute left-2.5 top-2.5 ${theme.selectIcon}`} />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${theme.profile}`}>
                <User size={15} /> {profile?.name?.split(' ')[0] || t('nav.profile')}
              </Link>
              <button onClick={handleLogout} className="btn-outline !px-3 !py-1.5 text-xs">
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary !px-4 !py-2">
              {t('nav.login')}
            </Link>
          )}
        </div>

        <button className={`lg:hidden ${theme.toggle}`} onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className={`border-t px-4 py-3 lg:hidden ${theme.mobilePanel}`}>
          <div className="flex flex-col gap-1">
            {user && config.badge && (
              <span className={`mb-1 self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:hidden ${theme.badge}`}>
                {t(config.badge)}
              </span>
            )}
            {config.links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${theme.link(isActive, l.highlight)}`}
              >
                {t(l.label)}
              </NavLink>
            ))}
            <div className={`mt-2 flex items-center gap-2 border-t pt-3 ${theme.mobileDivider}`}>
              {languageSelect('input !w-auto')}
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setOpen(false)} className="btn-outline !px-3 !py-1.5 text-xs">
                    {t('nav.profile')}
                  </Link>
                  <button onClick={handleLogout} className="btn-outline !px-3 !py-1.5 text-xs">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="btn-primary !px-4 !py-1.5 text-xs">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
