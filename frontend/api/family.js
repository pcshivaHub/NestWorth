import apiClient from './config';

export const getFamily = () => apiClient.get('/family');
export const createFamily = (name) => apiClient.post('/family', { name });
export const joinFamily = (inviteCode) => apiClient.post('/family/join', { invite_code: inviteCode });
export const leaveFamily = () => apiClient.delete('/family/leave');
export const regenerateInviteCode = () => apiClient.post('/family/regenerate-code');
