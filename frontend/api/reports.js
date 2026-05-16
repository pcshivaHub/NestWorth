import apiClient from './config';

export const getTrend                  = (months = 6)       => apiClient.get('/reports/trend', { params: { months } });
export const getCategoryBreakdown      = (period = 'month') => apiClient.get('/reports/category-breakdown', { params: { period } });
export const getBudgetVsActual         = (period = 'month') => apiClient.get('/reports/budget-vs-actual', { params: { period } });
export const getNetWorthTrend          = (months = 6)       => apiClient.get('/reports/net-worth-trend', { params: { months } });
export const getNetWorthSnapshot       = ()                  => apiClient.get('/reports/net-worth-snapshot');
export const getFamilyBreakdown        = (period = 'month') => apiClient.get('/reports/family-breakdown', { params: { period } });
export const getAssetPortfolio         = ()                  => apiClient.get('/reports/asset-portfolio');
export const getExpenseCategoryTrends  = (months = 6)       => apiClient.get('/reports/expense-category-trends', { params: { months } });
