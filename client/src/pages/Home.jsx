import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, CalendarCheck, Video, Pill, Map, Bot, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const features = [
    { to: '/health', icon: Activity, title: t('home.feature_health'), desc: t('home.feature_health_desc') },
    { to: '/appointments', icon: CalendarCheck, title: t('home.feature_appt'), desc: t('home.feature_appt_desc') },
    { to: '/teleconsult', icon: Video, title: t('home.feature_tele'), desc: t('home.feature_tele_desc') },
    { to: '/pharmacy', icon: Pill, title: t('home.feature_pharmacy'), desc: t('home.feature_pharmacy_desc') },
    { to: '/map', icon: Map, title: t('home.feature_map'), desc: t('home.feature_map_desc') },
    { to: '/health', icon: Bot, title: t('home.feature_bot'), desc: t('home.feature_bot_desc') },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 to-white px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold leading-tight text-slate-800 sm:text-5xl"
          >
            {t('home.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-base text-slate-500 sm:text-lg"
          >
            {t('home.subtitle')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to={user ? '/health' : '/signup'} className="btn-accent">
              {t('home.cta_primary')} <ArrowRight size={16} />
            </Link>
            <Link to="/health" className="btn-outline">
              {t('home.cta_secondary')}
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title + i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={f.to} className="card block h-full p-6">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
