import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, CalendarCheck, Video, Pill, Map, Bot, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { roleConfig } from '../lib/roles';
import { openDrSahab } from '../components/DrSahabWidget';

const EASE = [0.16, 1, 0.3, 1];

// Six features, six tiles: a 4-column grid where Health Tracker takes a 2x2
// block and the rest fill around it. Collapses to one column below md.
const TILE_STYLES = {
  feature: 'md:col-span-2 md:row-span-2 bg-teal-700 text-white border-teal-700',
  tint: 'md:col-span-2 bg-accent-50 border-accent-100',
  plain: 'bg-white border-teal-100/70',
  wide: 'md:col-span-2 bg-white border-teal-100/70',
  pattern: 'md:col-span-2 border-teal-100 bg-teal-50 bg-[radial-gradient(theme(colors.teal.200)_1px,transparent_1px)] [background-size:18px_18px]',
};

function FeatureTile({ to, icon: Icon, title, desc, variant, index, reduce }) {
  const dark = variant === 'feature';
  return (
    <motion.div
      className={`${TILE_STYLES[variant]} group rounded-xl2 border shadow-card transition-shadow duration-200 hover:shadow-card-hover`}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE }}
    >
      <Link to={to} className="flex h-full min-h-[11rem] flex-col justify-between gap-6 p-6 active:scale-[0.99] sm:p-7">
        <div className="flex items-start justify-between">
          <span
            className={`grid place-items-center rounded-xl ${
              dark ? 'h-14 w-14 bg-white/15 text-white' : 'h-11 w-11 bg-white text-teal-700 shadow-sm'
            }`}
          >
            <Icon size={dark ? 28 : 22} strokeWidth={1.75} />
          </span>
          <ArrowUpRight
            size={20}
            className={`transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
              dark ? 'text-teal-100' : 'text-slate-400'
            }`}
          />
        </div>
        <div>
          <h3 className={`font-semibold tracking-tight ${dark ? 'text-2xl sm:text-3xl' : 'text-lg text-slate-800'}`}>{title}</h3>
          <p className={`mt-1.5 max-w-[42ch] text-sm leading-relaxed ${dark ? 'text-teal-50' : 'text-slate-600'}`}>{desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const reduce = useReducedMotion();

  // Doctors and pharmacy admins have their own workspace as home.
  const home = roleConfig(user ? profile?.role : null).home;
  if (home !== '/') return <Navigate to={home} replace />;

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  const features = [
    { to: '/health', icon: Activity, title: t('home.feature_health'), desc: t('home.feature_health_desc'), variant: 'feature' },
    { to: '/appointments', icon: CalendarCheck, title: t('home.feature_appt'), desc: t('home.feature_appt_desc'), variant: 'plain' },
    { to: '/teleconsult', icon: Video, title: t('home.feature_tele'), desc: t('home.feature_tele_desc'), variant: 'plain' },
    { to: '/pharmacy', icon: Pill, title: t('home.feature_pharmacy'), desc: t('home.feature_pharmacy_desc'), variant: 'wide' },
    { to: '/map', icon: Map, title: t('home.feature_map'), desc: t('home.feature_map_desc'), variant: 'pattern' },
  ];
  const bot = { icon: Bot, title: t('home.feature_bot'), desc: t('home.feature_bot_desc') };

  return (
    <div>
      <section className="px-4 pb-16 pt-12 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <motion.h1
              {...rise(0)}
              className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-[3.4rem]"
            >
              {t('home.title')}
            </motion.h1>
            <motion.p {...rise(0.08)} className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-slate-600 sm:text-lg">
              {t('home.subtitle')}
            </motion.p>
            <motion.div {...rise(0.16)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={user ? '/health' : '/signup'} className="btn-accent group whitespace-nowrap !px-6 !py-3">
                {t('home.cta_primary')}
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <button type="button" onClick={openDrSahab} className="btn-outline whitespace-nowrap !px-6 !py-3">
                {t('home.cta_secondary')}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:pb-28">
        <h2 className="mx-auto max-w-[30ch] text-balance text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('home.features_title')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:auto-rows-[minmax(11rem,auto)] md:grid-cols-4 lg:gap-5">
          <FeatureTile {...features[0]} index={0} reduce={reduce} />

          {/* Dr Sahab opens the chat in place, so it's a button rather than a route. */}
          <motion.div
            className={`${TILE_STYLES.tint} group rounded-xl2 border shadow-card transition-shadow duration-200 hover:shadow-card-hover`}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
          >
            <button
              type="button"
              onClick={openDrSahab}
              className="flex h-full min-h-[11rem] w-full flex-col justify-between gap-6 p-6 text-left active:scale-[0.99] sm:p-7"
            >
              <div className="flex w-full items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-accent-700 shadow-sm">
                  <bot.icon size={22} strokeWidth={1.75} />
                </span>
                <ArrowUpRight
                  size={20}
                  className="text-accent-700 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-800">{bot.title}</h3>
                <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-slate-600">{bot.desc}</p>
              </div>
            </button>
          </motion.div>

          {features.slice(1).map((f, i) => (
            <FeatureTile key={f.to} {...f} index={i + 2} reduce={reduce} />
          ))}
        </div>
      </section>
    </div>
  );
}
