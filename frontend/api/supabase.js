import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://eaibxteaaouvdooyljac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhaWJ4dGVhYW91dmRvb3lsamFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTU5MjcsImV4cCI6MjA5MzQ3MTkyN30.uRwuuBlUE8so0ppk7JTWS0eFD07OQwYYHtHzJFyZRWA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
