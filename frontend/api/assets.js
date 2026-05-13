import apiClient from './config';

export const getAssets   = ()         => apiClient.get('/assets');
export const createAsset = (data)     => apiClient.post('/assets', data);
export const updateAsset = (id, data) => apiClient.put(`/assets/${id}`, data);
export const deleteAsset = (id)       => apiClient.delete(`/assets/${id}`);
