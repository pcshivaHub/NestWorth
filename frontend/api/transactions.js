import apiClient from './config';

export const getTransactions = (params = {}) =>
  apiClient.get('/transactions', { params });
// params: { type?: 'income' | 'expense', account_id?: number, category_id?: number }

export const createTransaction = (data) => apiClient.post('/transactions', data);
// data: {
//   account_id: number,
//   category_id: number,
//   amount: number,
//   type: 'income' | 'expense',
//   date: string (ISO),
//   note?: string
// }
