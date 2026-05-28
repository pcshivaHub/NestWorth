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
export const getAllTransfers = () => apiClient.get('/transfers');
export const updateTransfer = (transferId, data) => apiClient.put(`/transfers/${transferId}`, data);
export const getAccountTransfers = (accountId) =>
  apiClient.get(`/accounts/${accountId}/transfers`);
export const deleteTransfer = (transferId) => apiClient.delete(`/transfers/${transferId}`);

export const getMonthlyBalances = (accountId, months = 12) =>
  apiClient.get(`/accounts/${accountId}/monthly-balances`, { params: { months } });

export const upsertMonthlyBalance = (accountId, data) =>
  apiClient.post(`/accounts/${accountId}/monthly-balances`, data);

export const getReconciliationReport = (months = 6) =>
  apiClient.get('/reports/reconciliation', { params: { months } });
