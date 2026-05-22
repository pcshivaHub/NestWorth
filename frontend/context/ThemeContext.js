import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../utils/theme';

const ThemeContext = createContext(null);
const THEME_KEY = 'NESTWORTH_THEME_PREF';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true); // default: dark
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((val) => { if (val !== null) setIsDark(val === 'dark'); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleTheme = () => {
    setIsDark((v) => {
      const next = !v;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
