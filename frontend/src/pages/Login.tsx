import { useNavigate } from 'react-router-dom';
import { login } from '../auth';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-6 shadow-ambient">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              coffee
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tight">
            Nico<span className="text-primary italic">Neco</span>
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Coffee-powered connectivity management
          </p>
        </div>

        {/* Login card */}
        <div className="bg-surface-container-low rounded-xl p-8 shadow-ambient">
          <h2 className="text-xl font-bold text-on-surface mb-2">Welcome back</h2>
          <p className="text-on-surface-variant text-sm mb-8">
            Sign in to manage your proxy network
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-error-container text-on-error-container text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-on-surface-variant mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="w-full bg-surface-container-highest rounded-xl px-4 py-3.5 text-on-surface
                           placeholder:text-on-surface-variant/40 outline-none
                           focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface-variant mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-surface-container-highest rounded-xl px-4 py-3.5 text-on-surface
                           placeholder:text-on-surface-variant/40 outline-none
                           focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary rounded-full py-4 px-6
                         font-semibold transition-all duration-300 flex items-center justify-center gap-3
                         hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant/60 text-xs mt-8">
          Admin access only. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
