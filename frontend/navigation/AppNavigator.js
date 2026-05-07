import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { COLORS, FONTS } from '../utils/theme';
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
import LoadingSpinner from '../components/LoadingSpinner';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Dashboard: '🏠', Transactions: '🧾', Accounts: '🏦', Categories: '🏷️' };

const headerOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700', fontSize: FONTS.sizes.lg },
  contentStyle: { backgroundColor: COLORS.bg },
};

const LogoutButton = () => {
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };
  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 8 }}>
      <Text style={{ fontSize: 22 }}>🚪</Text>
    </TouchableOpacity>
  );
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...headerOptions,
        headerRight: () => <LogoutButton />,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
        tabBarLabel: ({ focused, children }) => (
          <Text style={{
            color: focused ? COLORS.primaryLight : COLORS.textMuted,
            fontSize: FONTS.sizes.xs,
            fontWeight: focused ? '600' : '400',
            marginBottom: 2,
          }}>
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
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
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction', presentation: 'modal' }} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: 'Account Details' }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ title: 'Category Details' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Transaction Details' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
