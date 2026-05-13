import apiClient from './config';

export const getSummary = (period = 'month') => apiClient.get('/summary', { params: { period } });
// category breakups contain amounts for the selected period.
