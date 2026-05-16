import React, { useState, useRef } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Text, TouchableOpacity, Alert, Platform, StyleSheet, View,
  Modal, Animated, Pressable, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import AppLogo from '../components/AppLogo';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// "Ne$tW[₹coin]rth" — white letters on a primary-color pill, gold $ and rupee coin
function NestWorthText({ fontSize, fontWeight = '800', letterSpacing = 1 }) {
  const { colors: C } = useTheme();
  const coinSize  = Math.round(fontSize * 1.05);
  const rupeeSize = Math.round(fontSize * 0.58);
  const base = { fontSize, fontWeight, letterSpacing, color: '#FFFFFF' };
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#000000',
      paddingHorizontal: Math.round(fontSize * 0.45),
      paddingVertical:   Math.round(fontSize * 0.15),
      borderRadius: fontSize,
    }}>
      <Text style={base}>Ne</Text>
      <Text style={[base, { color: '#FFD700' }]}>$</Text>
      <Text style={base}>tW</Text>
      <View style={{
        width: coinSize, height: coinSize, borderRadius: coinSize / 2,
        backgroundColor: '#FFD700', alignItems: 'center', justifyContent: 'center',
        marginHorizontal: Math.max(1, Math.round(letterSpacing * 0.5)),
      }}>
        <Text style={{ fontSize: rupeeSize, fontWeight: '900', color: '#5C3A00', lineHeight: rupeeSize * 1.3 }}>
          ₹
        </Text>
      </View>
      <Text style={base}>rth</Text>
    </View>
  );
}

const TAB_ICONS = { Dashboard: '🏠', Transactions: '🧾', Accounts: '🏦' };

const DRAWER_ITEMS = [
  { name: 'Dashboard',    icon: 'home-outline',         label: 'Dashboard' },
  { name: 'Transactions', icon: 'receipt-outline',      label: 'Transactions' },
  { name: 'Accounts',     icon: 'wallet-outline',       label: 'Accounts' },
  { name: 'Categories',   icon: 'pricetag-outline',     label: 'Categories' },
  { name: 'Family',       icon: 'people-outline',       label: 'Family' },
  { name: 'Reports',      icon: 'bar-chart-outline',    label: 'Reports' },
  { name: '__logout',     icon: 'log-out-outline',      label: 'Sign Out',  danger: true },
];

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split('@')[0] ||
  'User';

function HamburgerMenu({ navigation }) {
  const [open, setOpen] = useState(false);
  const { colors: C } = useTheme();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const openDrawer = () => {
    setOpen(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true })
      .start(() => setOpen(false));
  };

  const handleSignOut = () => {
    const signOut = async () => {
      try { await logout(); } catch (e) { Alert.alert('Sign Out Failed', e.message); }
    };
    closeDrawer();
    setTimeout(() => {
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to sign out?')) signOut();
      } else {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ]);
      }
    }, 250);
  };

  const goTo = (item) => {
    if (item.name === '__logout') { handleSignOut(); return; }
    closeDrawer();
    setTimeout(() => navigation.navigate(item.name), 50);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openDrawer}
        style={[styles.headerBtn, { borderColor: C.border, backgroundColor: C.surfaceHigh, marginLeft: SPACING.sm }]}
      >
        <Ionicons name="menu-outline" size={18} color={C.textPrimary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={closeDrawer} />
          <Animated.View style={[
            styles.drawerPanel,
            { backgroundColor: C.surface, borderRightColor: C.border },
            { transform: [{ translateX: slideAnim }] },
          ]}>
            <View style={[styles.drawerHeader, { borderBottomColor: C.border }]}>
              <Image
                source={require('../assets/nestworth-logo-banner.png')}
                style={{ height: 60, width: 220 }}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={closeDrawer}>
                <Ionicons name="close-outline" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.drawerItems}>
              {DRAWER_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.drawerItem, { borderBottomColor: C.border }]}
                  onPress={() => goTo(item)}
                >
                  <View style={[styles.drawerItemIcon, {
                    backgroundColor: item.danger ? C.expense + '22' : C.primary + '22',
                  }]}>
                    <Ionicons name={item.icon} size={20} color={item.danger ? C.expense : C.primaryLight} />
                  </View>
                  <Text style={[styles.drawerItemLabel, { color: item.danger ? C.expense : C.textPrimary }]}>
                    {item.label}
                  </Text>
                  {!item.danger && <Ionicons name="chevron-forward-outline" size={16} color={C.textMuted} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function AppHeaderTitle({ user, section }) {
  const { colors: C } = useTheme();
  return (
    <View style={{ backgroundColor: C.surface, justifyContent: 'center' }}>
      <Image
        source={require('../assets/nestworth-logo-header.png')}
        style={Platform.select({
          web:     { height: 54, width: 270 },
          default: { height: 40, width: 200 },
        })}
        resizeMode="contain"
      />
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

function LogoutIcon() {
  const { colors: C } = useTheme();
  const handleLogout = () => {
    const signOut = async () => {
      try { await logout(); } catch (e) { Alert.alert('Sign Out Failed', e.message); }
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
      <Ionicons name="log-out-outline" size={17} color={C.expense} />
    </TouchableOpacity>
  );
}

function HeaderRight() {
  return (
    <View style={styles.headerRight}>
      <ThemeToggle />
      <LogoutIcon />
    </View>
  );
}

function TabNavigator() {
  const { user } = useAuth();
  const { colors: C } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: C.surface,
          ...(Platform.OS === 'web' && { height: 78 }),
        },
        headerTintColor: C.textPrimary,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: { fontWeight: '700', fontSize: FONTS.sizes.lg },
        headerTitleContainerStyle: { backgroundColor: 'transparent' },
        contentStyle: { backgroundColor: C.bg },
        headerTitle: () => <AppHeaderTitle user={user} section={route.name} />,
        headerLeft: () => <HamburgerMenu navigation={navigation} />,
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
          ...(Platform.OS === 'web' ? { height: 62 } : { paddingBottom: 8 }),
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarButton: () => null }} />
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
    headerStyle: { backgroundColor: C.surface, height: Platform.select({ web: 78, default: 62 }) },
    headerTintColor: C.textPrimary,
    headerShadowVisible: false,
    headerTitleAlign: 'left',
    headerTitleStyle: { fontWeight: '700', fontSize: FONTS.sizes.lg },
    headerTitleContainerStyle: { backgroundColor: 'transparent' },
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
    fontSize: Platform.select({ web: FONTS.sizes.brand, default: 20 }),
    fontWeight: '800',
    letterSpacing: Platform.select({ web: 2, default: 1 }),
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

  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'web' ? SPACING.lg : 56,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  drawerBrand: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  drawerItems: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
});
