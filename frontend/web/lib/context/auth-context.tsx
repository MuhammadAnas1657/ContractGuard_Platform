'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, OTPPurpose } from '../types/auth';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  signup: (data: { name: string; email: string; password?: string }) => Promise<{ status: 'otp_sent' }>;
  login: (data: { email: string; password?: string }) => Promise<{ status: 'otp_required'; email: string }>;
  verifyOtp: (params: { email: string; code: string; purpose?: OTPPurpose }) => Promise<User>;
  resendOtp: (params: { email: string; purpose?: OTPPurpose }) => Promise<{ status: 'otp_sent'; resend_cooldown_until?: number }>;
  logout: () => Promise<void>;
  switchDemoAccount: (role: 'user' | 'super_admin') => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.getMe();
      setUser(me);
    } catch (err) {
      console.warn('Failed to fetch current user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialUser() {
      try {
        const me = await apiClient.getMe();
        if (!ignore) {
          setUser(me);
        }
      } catch (err) {
        console.warn('Failed to load initial user:', err);
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialUser();
    return () => {
      ignore = true;
    };
  }, []);

  const signup = async (data: { name: string; email: string; password?: string }) => {
    return apiClient.signup(data);
  };

  const login = async (data: { email: string; password?: string }) => {
    return apiClient.login(data);
  };

  const verifyOtp = async (params: { email: string; code: string; purpose?: OTPPurpose }) => {
    const result = await apiClient.verifyOtp(params);
    setUser(result.user);
    return result.user;
  };

  const resendOtp = async (params: { email: string; purpose?: OTPPurpose }) => {
    return apiClient.resendOtp(params);
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
    router.push('/login');
  };

  const switchDemoAccount = async (role: 'user' | 'super_admin') => {
    const loggedUser = await apiClient.switchDemoUser(role);
    setUser(loggedUser);
    if (role === 'super_admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
    return loggedUser;
  };

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isSuperAdmin,
        signup,
        login,
        verifyOtp,
        resendOtp,
        logout,
        switchDemoAccount,
        refreshUser,
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
