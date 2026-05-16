import apiClient from './config';

export const getOutstandings    = (settled = false)       => apiClient.get('/outstandings', { params: { settled } });
export const createOutstanding  = (data)                  => apiClient.post('/outstandings', data);
export const settleOutstanding  = (id)                    => apiClient.post(`/outstandings/${id}/settle`);
export const deleteOutstanding  = (id)                    => apiClient.delete(`/outstandings/${id}`);
