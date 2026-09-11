import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PratikshaWidget from './components/PratikshaWidget';
import ProtectedRoute from './components/ProtectedRoute';

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
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PharmacyAdminDashboard from './pages/pharmacy/PharmacyAdminDashboard';

export default function App() {
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
              <ProtectedRoute>
                <HealthTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teleconsult"
            element={
              <ProtectedRoute>
                <Teleconsult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute>
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
      <PratikshaWidget />
    </div>
  );
}
