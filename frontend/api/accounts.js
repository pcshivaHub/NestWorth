import apiClient from './config';

export const getAccounts = () => apiClient.get('/accounts');

export const createAccount = (data) => apiClient.post('/accounts', data);
// data: { name: string, type: 'savings' | 'checking' | 'cash', balance: number }

export const getAccountBalance = (accountId) =>
  apiClient.get(`/accounts/${accountId}/balance`);
