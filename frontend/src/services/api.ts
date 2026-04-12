import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken  = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken  = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function loadStoredRefreshToken() {
  accessToken  = localStorage.getItem('accessToken');
  refreshToken = localStorage.getItem('refreshToken');
}

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
}

api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        if (onTokenRefreshed) onTokenRefreshed(data.accessToken);
        return api(original);
      } catch (err) {
        processQueue(err, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export { api };

// ─── Auth ─────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: (rt: string) =>
    api.post('/auth/logout', { refreshToken: rt }),
};

// ─── Reports ──────────────────────────────────────
export const reportsApi = {
  list:             ()                                     => api.get('/reports'),
  get:              (id: string)                           => api.get(`/reports/${id}`),
  create:           (data: unknown)                        => api.post('/reports', data),
  update:           (id: string, data: unknown)            => api.put(`/reports/${id}`, data),
  delete:           (id: string)                           => api.delete(`/reports/${id}`),
  toggle:           (id: string)                           => api.patch(`/reports/${id}/toggle`),
  setParameters:    (id: string, parameters: unknown[])    => api.post(`/reports/${id}/parameters`, { parameters }),
  grantAccess:      (id: string, userId: string)           => api.post(`/reports/${id}/access`, { userId }),
  revokeAccess:     (id: string, userId: string)           => api.delete(`/reports/${id}/access`, { data: { userId } }),
  execute:          (id: string, parameters: unknown, format: string) =>
    api.post(`/jasper/execute/${id}`, { parameters, format }, { responseType: 'blob' }),
};

// ─── Users ────────────────────────────────────────
export const usersApi = {
  list:        ()                               => api.get('/users'),
  updateRole:  (id: string, role: string)       => api.put(`/users/${id}/role`, { role }),
  toggle:      (id: string)                     => api.patch(`/users/${id}/toggle`),
  getAccess:   (id: string)                     => api.get(`/users/${id}/access`),
};

// ─── Audit ────────────────────────────────────────
export const auditApi = {
  list:   (params: Record<string, string | number>) => api.get('/audit', { params }),
  meta:   ()                                         => api.get('/audit/meta'),
  export: (params: Record<string, string | number>) =>
    api.get('/audit/export', { params, responseType: 'blob' }),
};
