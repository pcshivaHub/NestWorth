import axios from 'axios';
import { supabase } from './supabase';

//export const BASE_URL = 'http://localhost:8000';
//export const BASE_URL = 'http://172.18.1.170:8081';
//export const BASE_URL = 'http://10.127.196.32:8081';
export const BASE_URL = 'http://192.168.29.29:8000';



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
  (error) => {
    const message =
      error.response?.data?.detail || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;