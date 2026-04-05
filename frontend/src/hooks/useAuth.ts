import { useState, useEffect } from 'react';
import { getAdmin, verifySession, type AdminUser } from '../auth';

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(getAdmin());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifySession().then((admin) => {
      setUser(admin);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
