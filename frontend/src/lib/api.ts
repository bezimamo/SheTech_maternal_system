// lib/api.ts
'use client';

export const API_BASE = '/api/proxy';
export const BACKEND_URL = '/api/proxy';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

// Helper to get token - tries multiple keys
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try all possible storage keys
  const token = 
    localStorage.getItem('token') || 
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('auth_token');
    
  return token || null;
}

// ALWAYS add Authorization header to every request
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function handleResponse(response: Response) {
  const text = await response.text();

  let data: any = null;
  if (text && text.trim()) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      console.error('[API] 401 Unauthorized');
      // Don't clear token here - let the user handle it
      throw new UnauthorizedError();
    }

    let message = data?.message || data?.error || response.statusText || 'Request failed';
    if (response.status === 502) {
      message =
        typeof message === 'string' && message.includes('Backend')
          ? message
          : 'Backend service is unavailable. Ensure the API is running (cd backend && npm run start:dev).';
    }
    console.error(`[API] Error ${response.status}:`, message);
    throw new Error(typeof message === 'string' ? message : 'Request failed');
  }

  return data;
}

export const api = {
  login: async (credentials: { email: string; password: string }) => {
    console.log('[API] Login request for:', credentials.email);
    
    const response = await fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    const data = await handleResponse(response);
    
    if (data.access_token) {
      // Store token under all keys for maximum compatibility
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('auth_token', data.access_token);
      // sessionStorage as fallback for same-session use
      sessionStorage.setItem('token', data.access_token);
      
      // Store user data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    return data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('auth_token');
  },

  // USERS
  getUsers: async () => {
    const response = await fetch(`${BACKEND_URL}/users`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getMe: async () => {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  updateMe: async (data: any) => {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getUser: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/users/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createUser: async (data: any) => {
    const response = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateUser: async (id: string, data: any) => {
    const response = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteUser: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // HOSPITALS
  getHospitals: async () => {
    const response = await fetch(`${BACKEND_URL}/hospitals`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getHospital: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/hospitals/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createHospital: async (data: any) => {
    const response = await fetch(`${BACKEND_URL}/hospitals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateHospital: async (id: string, data: any) => {
    const response = await fetch(`${BACKEND_URL}/hospitals/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteHospital: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/hospitals/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // WOREDAS
  getWoredas: async () => {
    const response = await fetch(`${BACKEND_URL}/woredas`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  getWoreda: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/woredas/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createWoreda: async (data: any) => {
    const response = await fetch(`${BACKEND_URL}/woredas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateWoreda: async (id: string, data: any) => {
    const response = await fetch(`${BACKEND_URL}/woredas/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteWoreda: async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/woredas/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // REGIONS
  getRegions: async () => {
    const response = await fetch(`${API_BASE}/regions`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createRegion: async (data: any) => {
    const response = await fetch(`${API_BASE}/regions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateRegion: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE}/regions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteRegion: async (id: string) => {
    const response = await fetch(`${API_BASE}/regions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // REFERRALS
  getReferralStats: async () => {
    const response = await fetch(`${BACKEND_URL}/referrals/admin/stats`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};