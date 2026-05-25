'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { api } from '@/lib/api';

const getDashboardForRole = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'MOH_ADMIN':
      return '/moh-dashboard';
    case 'SYSTEM_ADMIN':
      return '/system-dashboard';
    case 'HOSPITAL_ADMIN':
      return '/hospital-dashboard';
    case 'HEALTH_CENTER_ADMIN':
      return '/health-center-dashboard';
    case 'DOCTOR':
    case 'NURSE':
    case 'MIDWIFE':
      return '/healthcare-dashboard';
    case 'LIAISON_OFFICER':
      return '/liaison-dashboard';
    case 'DISPATCHER':
      return '/dispatch-dashboard';
    case 'WOREDA_ADMIN':
      return '/woreda-dashboard';
    default:
      return '/';
  }
};

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: (callback?: () => void) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return { ...state, user: action.payload, isLoading: false, error: null };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return { ...state, user: null, isLoading: false, error: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, isLoading: false, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isLoading: true,   // true until the localStorage hydration useEffect completes
  error: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      // Check BOTH old and new token keys for backward compatibility
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      console.log('[AuthContext] Loading user on mount');
      console.log('[AuthContext] Token exists:', !!token);
      console.log('[AuthContext] Saved user exists:', !!savedUser);
      
      if (savedUser && token) {
        try {
          // Re-sync token to all storage keys so getHeaders() always finds it
          localStorage.setItem('token', token);
          localStorage.setItem('auth_token', token);
          sessionStorage.setItem('token', token);

          const user = JSON.parse(savedUser);
          const normalizedUser: User = {
            ...user,
            id: String(user.id || user._id),
            hospitalId: user.hospitalId ? String(user.hospitalId) : undefined,
            woredaId: user.woredaId ? String(user.woredaId) : undefined,
            regionId: user.regionId ? String(user.regionId) : undefined,
            assignedRegion: user.assignedRegion ?? undefined,
            phoneNumber: user.phoneNumber ?? undefined,
          };
          dispatch({ type: 'LOGIN_SUCCESS', payload: normalizedUser });
        } catch (error) {
          console.error('[AuthContext] Failed to parse user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          // No valid session — mark loading done so ProtectedRoute can redirect to /auth
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        // No token or saved user — mark loading done so ProtectedRoute can redirect to /auth
        dispatch({ type: 'LOGOUT' });
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    console.log('[AuthContext] Login started for:', credentials.email);
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Use our API service
      const data = await api.login(credentials);
      
      console.log('[AuthContext] Login response received:', data);
      
      if (!data.user) {
        throw new Error('No user data received');
      }

      const user: User = {
        id: String(data.user.id || data.user._id),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        hospitalId: data.user.hospitalId ? String(data.user.hospitalId) : undefined,
        woredaId: data.user.woredaId ? String(data.user.woredaId) : undefined,
        assignedRegion: data.user.assignedRegion ?? undefined,
        phoneNumber: data.user.phoneNumber ?? undefined,
        regionId: data.user.regionId ? String(data.user.regionId) : undefined,
      };

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      // Token is already stored by api.login() using 'auth_token' key
      // Also store with old key for backward compatibility
      const token = localStorage.getItem('auth_token');
      if (token) {
        localStorage.setItem('token', token); // Backward compatibility
      }
      
      console.log('[AuthContext] Token stored:', !!token);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      console.log('[AuthContext] Login successful for:', user.email);
      
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      dispatch({ 
        type: 'LOGIN_FAILURE', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      });
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    dispatch({ type: 'REGISTER_START' });
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.message || 'Registration failed. Email might already exist.';
        throw new Error(message);
      }

      const data = await response.json();
      const user: User = {
        id: String(data._id || data.id),
        email: data.email,
        name: data.name,
        role: data.role as User['role'],
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      dispatch({ type: 'REGISTER_SUCCESS', payload: user });
      console.log('[AuthContext] Registration successful for:', user.email);
      
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      dispatch({ 
        type: 'REGISTER_FAILURE', 
        payload: error instanceof Error ? error.message : 'Registration failed' 
      });
    }
  };

  const logout = (callback?: () => void) => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof callback === 'function') {
      callback();
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};