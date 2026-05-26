import axios from 'axios';
import { supabase } from './supabase';

// Local: set by start.ps1 via frontend/.env
// Railway: falls back to production backend URL
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://nestworthsvc-production.up.railway.app';



const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Wait for Supabase session before attaching token
const getValidSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed;
};

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await getValidSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.warn('Could not get session:', e.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }
    const message =
      error.response?.data?.detail || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;