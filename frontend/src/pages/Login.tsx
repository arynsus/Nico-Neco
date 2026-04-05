import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
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

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-surface-container-highest hover:bg-surface-container-high
                       text-on-surface rounded-full py-4 px-6 font-semibold
                       transition-all duration-300 flex items-center justify-center gap-3
                       hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-on-surface-variant/60 text-xs mt-8">
          Admin access only. Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
