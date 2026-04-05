import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sources from './pages/Sources';
import Users from './pages/Users';
import Tiers from './pages/Tiers';
import Rules from './pages/Rules';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary animate-pulse">pets</span>
          </div>
          <span className="text-on-surface-variant font-medium">Brewing your session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/users" element={<Users />} />
          <Route path="/tiers" element={<Tiers />} />
          <Route path="/rules" element={<Rules />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
