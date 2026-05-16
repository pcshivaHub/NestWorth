import apiClient from './config';

export const getAccounts = () => apiClient.get('/accounts');

export const createAccount = (data) => apiClient.post('/accounts', data);
// data: { name: string, type: 'savings' | 'checking' | 'cash', balance: number }

export const getAccountBalance = (accountId) =>
  apiClient.get(`/accounts/${accountId}/balance`);

export const getAccountBalanceHistory = (accountId, months = 6) =>
  apiClient.get(`/accounts/${accountId}/balance-history`, { params: { months } });

export const createDepositDetail = (accountId, data) =>
  apiClient.post(`/accounts/${accountId}/deposit`, data);

export const getDepositDetail = (accountId) =>
  apiClient.get(`/accounts/${accountId}/deposit`);

export const closeDeposit = (accountId, data) =>
  apiClient.post(`/accounts/${accountId}/deposit/close`, data);

export const createTransfer = (data) => apiClient.post('/transfers', data);
export const getAccountTransfers = (accountId) =>
  apiClient.get(`/accounts/${accountId}/transfers`);
export const deleteTransfer = (transferId) => apiClient.delete(`/transfers/${transferId}`);
