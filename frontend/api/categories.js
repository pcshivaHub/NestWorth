import apiClient from './config';

export const getCategories = () => apiClient.get('/categories');

export const createCategory = (data) => apiClient.post('/categories', data);
// data: { name: string, kind: 'income' | 'expense' }
