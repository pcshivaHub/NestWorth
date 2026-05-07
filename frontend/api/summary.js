import apiClient from './config';

export const getSummary = () => apiClient.get('/summary');
// returns: { total_income: number, total_expense: number, net: number }
