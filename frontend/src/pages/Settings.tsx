import { useState } from 'react';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'New password must be at least 4 characters' });
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <span className="page-subtitle">Account</span>
        <h2 className="page-title">
          Admin <span className="text-primary italic">Settings</span>
        </h2>
        <p className="text-on-surface-variant mt-3 max-w-md">
          Manage your admin account credentials.
        </p>
      </div>

      <div className="grid gap-8 max-w-xl">
        {/* Account info */}
        <div className="card">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-xl bg-primary-container flex items-center justify-center text-primary font-bold text-2xl">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface">{user?.username || 'admin'}</h3>
              <p className="text-on-surface-variant text-sm">Administrator</p>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <Icon name="lock" />
            Change Password
          </h3>

          {message && (
            <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
              message.type === 'success'
                ? 'bg-tertiary-container text-on-tertiary-container'
                : 'bg-error-container text-on-error-container'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label-text">Current Password</label>
              <input
                className="input-field"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label-text">New Password</label>
              <input
                className="input-field"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label-text">Confirm New Password</label>
              <input
                className="input-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2"
            >
              <Icon name="lock_reset" />
              {submitting ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
