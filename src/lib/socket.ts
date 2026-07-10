import { getWebSocketBaseURL } from './http';

export function buildWebSocketUrl(path: string, accessToken: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWebSocketBaseURL()}${normalizedPath}${normalizedPath.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`;
}

export function reconnectDelay(attempt: number) {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}
