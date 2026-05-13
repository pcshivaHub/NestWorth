import apiClient from './config';

export const getCategories = () => apiClient.get('/categories');

export const createCategory = (data) => apiClient.post('/categories', data);
// data: { name: string, kind: 'income' | 'expense' }

export const getCategoryTotals = () => apiClient.get('/categories/totals');

export const updateCategory = (id, data) => apiClient.put(`/categories/${id}`, data);

export const deleteCategory = (id) => apiClient.delete(`/categories/${id}`);