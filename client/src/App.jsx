import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DrSahabWidget from './components/DrSahabWidget';
import WoundCameraButton from './components/WoundCameraButton';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { PATIENT_ROLES, isPatient } from './lib/roles';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HealthTracker from './pages/HealthTracker';
import MentalResources from './pages/MentalResources';
import Appointments from './pages/Appointments';
import Teleconsult from './pages/Teleconsult';
import Pharmacy from './pages/Pharmacy';
import CampusMap from './pages/CampusMap';
import Profile from './pages/Profile';
import MyDeliveries from './pages/MyDeliveries';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PharmacyAdminDashboard from './pages/pharmacy/PharmacyAdminDashboard';

export default function App() {
  const { user, profile } = useAuth();
  // Wound camera and Dr Sahab are patient tools; doctors and pharmacy admins don't get them.
  const showPatientTools = isPatient(user ? profile?.role : null);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/health"
            element={
              <ProtectedRoute roles={PATIENT_ROLES}>
                <HealthTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute roles={PATIENT_ROLES}>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teleconsult"
            element={
              <ProtectedRoute roles={[...PATIENT_ROLES, 'doctor']}>
                <Teleconsult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute roles={PATIENT_ROLES}>
                <Pharmacy />
              </ProtectedRoute>
            }
          />
          <Route path="/map" element={<CampusMap />} />
          <Route path="/resources" element={<MentalResources />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute roles={PATIENT_ROLES}>
                <MyDeliveries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy-admin"
            element={
              <ProtectedRoute roles={['pharmacy_admin']}>
                <PharmacyAdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
      {showPatientTools && <WoundCameraButton />}
      {showPatientTools && <DrSahabWidget />}
    </div>
  );
}
