import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { getFamily } from '../api/family';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { joinFamily } from '../api/family';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null);
  const [familyLoading, setFamilyLoading] = useState(false);

  const refreshFamily = useCallback(async () => {
    setFamilyLoading(true);
    try {
      const data = await getFamily();
      setFamily(data);
    } catch {
      setFamily(null);
    } finally {
      setFamilyLoading(false);
    }
  }, []);

  const handleSignedIn = useCallback(async (session) => {
    setLoading(true);
    setSession(session);
    setUser(session?.user ?? null);
    try {
      const pendingCode = await AsyncStorage.getItem('pendingInviteCode');
      if (pendingCode) {
        await AsyncStorage.removeItem('pendingInviteCode');
        await joinFamily(pendingCode).catch(() => null);
      }
    } catch {}
    setLoading(false);
    refreshFamily(); // fetch family in background, doesn't block app render
  }, [refreshFamily]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) refreshFamily();
      })
      .catch(() => {
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleSignedIn(session);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_OUT') setFamily(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshFamily, handleSignedIn]);

  const value = { user, session, loading, family, familyLoading, refreshFamily };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
