import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, Alert, Platform, StyleSheet, View } from 'react-native';
import { FONTS, RADIUS, SPACING } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { logout } from '../api/auth';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AccountsScreen from '../screens/AccountsScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import FamilyScreen from '../screens/FamilyScreen';
import FamilySetupScreen from '../screens/FamilySetupScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import LoadingSpinner from '../components/LoadingSpinner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Dashboard: '🏠', Transactions: '🧾', Accounts: '🏦', Categories: '🏷️', Family: '👨‍👩‍👧', Reports: '📊' };

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split('@')[0] ||
  'User';

function AppHeaderTitle({ user, section }) {
  const { colors: C } = useTheme();
  return (
    <View>
      <Text style={[styles.brand, { color: C.primaryLight }]}>NestWorth</Text>
      <Text style={[styles.userLine, { color: C.textSecondary }]} numberOfLines={1}>
        {getDisplayName(user)} · {section}
      </Text>
    </View>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme, colors: C } = useTheme();
  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.headerBtn, { borderColor: C.border, backgroundColor: C.surfaceHigh }]}
    >
      <Text style={styles.headerBtnIcon}>{isDark ? '☀️' : '🌙'}</Text>
    </TouchableOpacity>
  );
}

function LogoutButton() {
  const { colors: C } = useTheme();

  const handleLogout = () => {
    const signOut = async () => {
      try {
        await logout();
      } catch (e) {
        Alert.alert('Sign Out Failed', e.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) signOut();
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={[styles.headerBtn, { borderColor: C.border, backgroundColor: C.surfaceHigh }]}
    >
      <Text style={[styles.logoutText, { color: C.expense }]}>Logout</Text>
    </TouchableOpacity>
  );
}

function HeaderRight() {
  return (
    <View style={styles.headerRight}>
      <ThemeToggle />
      <LogoutButton />
    </View>
  );
}

function TabNavigator() {
  const { user } = useAuth();
  const { colors: C } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: C.surface, height: 78 },
        headerTintColor: C.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: FONTS.sizes.lg },
        contentStyle: { backgroundColor: C.bg },
        headerTitle: () => <AppHeaderTitle user={user} section={route.name} />,
        headerRight: () => <HeaderRight />,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarLabel: ({ focused, children }) => (
          <Text style={{
            color: focused ? C.primaryLight : C.textMuted,
            fontSize: FONTS.sizes.xs,
            fontWeight: focused ? '600' : '400',
            marginBottom: 2,
          }}>
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 62,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  const { user } = useAuth();
  const { colors: C } = useTheme();

  const stackHeaderOptions = {
    headerStyle: { backgroundColor: C.surface, height: 78 },
    headerTintColor: C.textPrimary,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '700', fontSize: FONTS.sizes.lg },
    contentStyle: { backgroundColor: C.bg },
  };

  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        ...stackHeaderOptions,
        headerTitle: () => <AppHeaderTitle user={user} section={route.name} />,
        headerRight: () => <HeaderRight />,
      })}
    >
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction', presentation: 'modal' }} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: 'Account Details' }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ title: 'Category Details' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Transaction Details' }} />
      <Stack.Screen name="FamilySetup" component={FamilySetupScreen} options={{ title: 'Family Setup', presentation: 'modal' }} />
      <Stack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ title: 'Asset Details' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) return <LoadingSpinner />;

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: FONTS.sizes.brand,
    fontWeight: '800',
    letterSpacing: 2,
  },
  userLine: {
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
    maxWidth: 210,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginRight: SPACING.sm,
  },
  headerBtn: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
  },
  headerBtnIcon: { fontSize: 14 },
  logoutText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
});
