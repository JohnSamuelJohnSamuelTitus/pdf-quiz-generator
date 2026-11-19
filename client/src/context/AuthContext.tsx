import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, StudentPreferences } from '../../../shared/types';
import { authApi, preferencesApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  preferences: StudentPreferences | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestSessionId: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<StudentPreferences>) => Promise<void>;
  refreshSession: () => Promise<void>;
  migrateGuestToAccount: () => Promise<{ success: boolean; migratedCount: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getOrCreateGuestSessionId(): string {
  let guestId = localStorage.getItem('learnsphere_guest_session');
  if (!guestId || !guestId.startsWith('guest_')) {
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('learnsphere_guest_session', guestId);
  }
  return guestId;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<StudentPreferences | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string>(getOrCreateGuestSessionId);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    // Ensure guest ID is always set
    const activeGuest = getOrCreateGuestSessionId();
    setGuestSessionId(activeGuest);

    const token = localStorage.getItem('learnsphere_token');
    if (!token) {
      setUser(null);
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.success) {
        setUser(res.user);
        setPreferences(res.preferences);
      } else {
        localStorage.removeItem('learnsphere_token');
        setUser(null);
        setPreferences(null);
      }
    } catch {
      localStorage.removeItem('learnsphere_token');
      setUser(null);
      setPreferences(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const migrateGuestToAccount = async () => {
    const activeGuest = localStorage.getItem('learnsphere_guest_session');
    if (!activeGuest) return { success: false, migratedCount: 0 };
    try {
      const res = await authApi.migrateGuest(activeGuest);
      if (res.success) {
        localStorage.removeItem('learnsphere_guest_session');
        const nextGuest = getOrCreateGuestSessionId();
        setGuestSessionId(nextGuest);
        return { success: true, migratedCount: res.migratedRecords || 0 };
      }
    } catch (err) {
      console.warn('Guest migration deferred:', err);
    }
    return { success: false, migratedCount: 0 };
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.token) {
        localStorage.setItem('learnsphere_token', res.token);
        setUser(res.user);
        // Attempt seamless guest data migration
        await migrateGuestToAccount();
        try {
          const prefRes = await preferencesApi.get();
          if (prefRes.success) setPreferences(prefRes.preferences);
        } catch {
          // If no preferences yet
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.register({ email, password, fullName });
      if (res.success && res.token) {
        localStorage.setItem('learnsphere_token', res.token);
        setUser(res.user);
        setPreferences(null);
        // Migrate any pre-registration guest data
        await migrateGuestToAccount();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem('learnsphere_token');
      setUser(null);
      setPreferences(null);
      // Fresh guest session for next interactions
      const freshGuest = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('learnsphere_guest_session', freshGuest);
      setGuestSessionId(freshGuest);
    }
  };

  const updatePreferences = async (newPrefs: Partial<StudentPreferences>) => {
    const res = await preferencesApi.update(newPrefs);
    if (res.success) {
      setPreferences(res.preferences);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isAuthenticated: !!user,
        isGuest: !user,
        guestSessionId,
        isLoading,
        login,
        register,
        logout,
        updatePreferences,
        refreshSession,
        migrateGuestToAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
