import { Platform } from 'react-native';

const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const makeShadow = (color, { opacity = 0.3, height = 4, horizontal = 0, radius = 8, elevation = 6 } = {}) =>
  Platform.select({
    web: { boxShadow: `${horizontal}px ${height}px ${radius * 2}px ${hexToRgba(color, opacity)}` },
    default: {
      shadowColor: color,
      shadowOffset: { width: horizontal, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });

export const DARK_COLORS = {
  bg: '#0D1028',
  surface: '#161929',
  surfaceHigh: '#1E2340',
  border: '#2D3366',
  primary: '#7C6FFF',
  primaryLight: '#A89DFF',
  netBalance: '#5BB5FF',
  income: '#06EDB5',
  expense: '#FF6A85',
  warning: '#FFB74D',
  textPrimary: '#FFFFFF',
  textSecondary: '#9BA3C0',
  textMuted: '#5A6280',
  incomeSubtle: '#063D30',
  expenseSubtle: '#3D0D1C',
  expenseBg: '#2D1622',
};

export const LIGHT_COLORS = {
  bg: '#EEF2FF',
  surface: '#FFFFFF',
  surfaceHigh: '#E4EAFF',
  border: '#C8D4F8',
  primary: '#6C63FF',
  primaryLight: '#5048D4',
  netBalance: '#1A6BC4',
  income: '#00876A',
  expense: '#CC2940',
  warning: '#C07A00',
  textPrimary: '#0F1117',
  textSecondary: '#3D4570',
  textMuted: '#7080A8',
  incomeSubtle: '#D4F5EC',
  expenseSubtle: '#FAD5DC',
  expenseBg: '#FAEEF0',
};

// Legacy alias — prefer useTheme() in components
export const COLORS = DARK_COLORS;

export const FONTS = {
  regular: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
    brand: 30,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOW = {
  card: makeShadow('#000'),
};
