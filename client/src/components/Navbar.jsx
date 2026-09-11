import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartPulse, Menu, X, Globe, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/health', label: t('nav.health') },
    { to: '/appointments', label: t('nav.appointments') },
    { to: '/teleconsult', label: t('nav.teleconsult') },
    { to: '/pharmacy', label: t('nav.pharmacy') },
    { to: '/map', label: t('nav.map') },
  ];

  const dashboardLink =
    profile?.role === 'doctor' ? '/doctor' : profile?.role === 'pharmacy_admin' ? '/pharmacy-admin' : null;
  // Visible to every student/staff account, whether or not they've opted in yet —
  // that's how they discover the gig in the first place. The page itself prompts
  // opt-in if they haven't already.
  const showPartTimeJobs = profile?.role === 'student' || profile?.role === 'staff';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-teal-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-teal-700">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-600 text-white">
            <HeartPulse size={20} />
          </span>
          <span className="text-lg">{t('app_name')}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {dashboardLink && (
            <NavLink
              to={dashboardLink}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-accent-50 text-accent-700' : 'text-accent-600 hover:bg-accent-50'
                }`
              }
            >
              {t('nav.dashboard')}
            </NavLink>
          )}
          {showPartTimeJobs && (
            <NavLink
              to="/deliveries"
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-accent-50 text-accent-700' : 'text-accent-600 hover:bg-accent-50'
                }`
              }
            >
              Part Time Jobs
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="relative">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-200"
              aria-label="Language switcher"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Globe size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
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

        <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-teal-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {dashboardLink && (
              <NavLink to={dashboardLink} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-accent-600">
                {t('nav.dashboard')}
              </NavLink>
            )}
            {showPartTimeJobs && (
              <NavLink to="/deliveries" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-accent-600">
                Part Time Jobs
              </NavLink>
            )}
            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3">
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="input !w-auto"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
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
