import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleConfig } from '../lib/roles';

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-400">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  // Wrong portal: send them to their own role's home rather than a dead end.
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to={roleConfig(profile.role).home} replace />;
  return children;
}
