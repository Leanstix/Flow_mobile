import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { clearSession, getSessionSync, setAccessToken } from './session';

const configured = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:8000/api';
export const API_BASE_URL = String(configured).replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
export const API_REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  status: number;
  fields?: unknown;
  constructor(message: string, status = 0, fields?: unknown) { super(message); this.name = 'ApiError'; this.status = status; this.fields = fields; }
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) return error;
  const axiosError = error as AxiosError<Record<string, unknown>>;
  const status = axiosError.response?.status || 0;
  const payload = axiosError.response?.data;
  let message = axiosError.message || 'Something went wrong. Please try again.';
  if (payload && typeof payload === 'object') {
    const preferred = payload.detail || payload.error || payload.message;
    message = String(preferred || Object.values(payload).flat().filter(Boolean).join(' ') || message);
  }
  return new ApiError(message, status, payload);
}

let sessionExpiredHandler: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) { sessionExpiredHandler = handler; }

const api = axios.create({ baseURL: API_BASE_URL, timeout: API_REQUEST_TIMEOUT_MS, headers: { Accept: 'application/json' } });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const access = getSessionSync()?.access;
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refresh = getSessionSync()?.refresh;
  if (!refresh) throw new ApiError('Your session has expired.', 401);
  refreshPromise = axios.post(`${API_BASE_URL}/token/generate-access-token/`, { refresh }, { timeout: API_REQUEST_TIMEOUT_MS })
    .then(async ({ data }) => { if (!data?.access) throw new ApiError('Invalid refresh response.', 401); await setAccessToken(data.access); return data.access as string; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

api.interceptors.response.use((response) => response, async (error) => {
  const request = error?.config;
  if (error?.response?.status === 401 && request && !request.__flowRetry && !String(request.url).includes('generate-access-token') && getSessionSync()?.refresh) {
    request.__flowRetry = true;
    try { request.headers.Authorization = `Bearer ${await refreshAccessToken()}`; return api(request); }
    catch (refreshError) { await clearSession(); sessionExpiredHandler?.(); return Promise.reject(normalizeApiError(refreshError)); }
  }
  return Promise.reject(normalizeApiError(error));
});

export function getWebSocketBaseURL() {
  const value = process.env.EXPO_PUBLIC_WS_URL || Constants.expoConfig?.extra?.wsUrl || API_ORIGIN.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return String(value).replace(/\/$/, '');
}
export default api;
