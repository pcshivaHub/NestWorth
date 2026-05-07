import axios from 'axios';

// 🔧 Change this to your machine's local IP when running on a physical device
//export const BASE_URL = 'http://192.168.1.100:8000';
 export const BASE_URL = 'http://localhost:8000';



const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — useful later for adding auth tokens
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — centralized error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail || error.message || 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
