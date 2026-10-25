// Per-role interface config. Students and staff get the patient experience;
// doctors and pharmacy admins get a "workspace" shell with only the tools
// their job needs. Guests (logged out) see the patient links as a preview.

const PATIENT_LINKS = [
  { to: '/', label: 'nav.home' },
  { to: '/health', label: 'nav.health' },
  { to: '/appointments', label: 'nav.appointments' },
  { to: '/teleconsult', label: 'nav.teleconsult' },
  { to: '/pharmacy', label: 'nav.pharmacy' },
  { to: '/map', label: 'nav.map' },
];

export const PATIENT_ROLES = ['student', 'staff'];

export const ROLE_CONFIG = {
  student: {
    home: '/',
    badge: 'nav.role_student',
    workspace: false,
    links: [...PATIENT_LINKS, { to: '/deliveries', label: 'nav.part_time', highlight: true }],
  },
  staff: {
    home: '/',
    badge: 'nav.role_staff',
    workspace: false,
    links: [...PATIENT_LINKS, { to: '/deliveries', label: 'nav.part_time', highlight: true }],
  },
  doctor: {
    home: '/doctor',
    badge: 'nav.role_doctor',
    workspace: true,
    links: [
      { to: '/doctor', label: 'nav.dashboard' },
      { to: '/teleconsult', label: 'nav.teleconsult' },
      { to: '/map', label: 'nav.map' },
    ],
  },
  pharmacy_admin: {
    home: '/pharmacy-admin',
    badge: 'nav.role_pharmacy_admin',
    workspace: true,
    links: [
      { to: '/pharmacy-admin', label: 'nav.dashboard' },
      { to: '/map', label: 'nav.map' },
    ],
  },
};

const GUEST_CONFIG = { home: '/', badge: null, workspace: false, links: PATIENT_LINKS };

export function roleConfig(role) {
  return ROLE_CONFIG[role] || GUEST_CONFIG;
}

export function isPatient(role) {
  return !role || PATIENT_ROLES.includes(role);
}
