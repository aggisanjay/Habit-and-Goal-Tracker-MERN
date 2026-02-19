

import axios from 'axios';

// Use relative URL so CRA proxy (package.json "proxy") forwards to backend.
// Falls back to absolute URL if REACT_APP_API_URL is explicitly set.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('habitflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || err.message || 'Network error';
    console.error(`[API Error] ${err.config?.method?.toUpperCase()} ${err.config?.url} ->`, message);
    return Promise.reject(err.response?.data || { message });
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
};

// Habits
export const habitsAPI = {
  getAll: (params) => API.get('/habits', { params }),
  getToday: () => API.get('/habits/today'),
  getStats: () => API.get('/habits/stats'),
  getCalendar: (year, month) => API.get('/habits/calendar', { params: { year, month } }),
  create: (data) => API.post('/habits', data),
  update: (id, data) => API.put(`/habits/${id}`, data),
  complete: (id, data) => API.post(`/habits/${id}/complete`, data),
  delete: (id) => API.delete(`/habits/${id}`),
};

// Goals
export const goalsAPI = {
  getAll: (params) => API.get('/goals', { params }),
  getById: (id) => API.get(`/goals/${id}`),
  create: (data) => API.post('/goals', data),
  update: (id, data) => API.put(`/goals/${id}`, data),
  addSubTask: (id, data) => API.post(`/goals/${id}/subtasks`, data),
  updateSubTask: (id, taskId, data) => API.put(`/goals/${id}/subtasks/${taskId}`, data),
  deleteSubTask: (id, taskId) => API.delete(`/goals/${id}/subtasks/${taskId}`),
  delete: (id) => API.delete(`/goals/${id}`),
};

// Email
export const emailAPI = {
  sendProgressReport: (data) => API.post('/email/progress-report', data),
};

export default API;