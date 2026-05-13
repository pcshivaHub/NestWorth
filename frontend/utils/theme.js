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
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};
