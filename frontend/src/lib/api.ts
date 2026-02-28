import { BASE_PATH } from "./basePath";

const TOKEN_KEY = 'aura-auth-token';

function apiUrl(path: string): string {
    return `${BASE_PATH}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Drop-in replacement for fetch() that:
 * - Automatically attaches the Bearer token if present
 * - Fires a 'auth:unauthorized' event and clears the token on 401
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(apiUrl(url), { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return res;
}

/** Build the WebSocket URL, injecting the auth token as a query param */
export function getWsUrl(): string | null {
  const token = getToken();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const path = `${BASE_PATH}/ws`;
  const base = `${protocol}//${host}${path}`;
  return token ? `${base}?token=${token}` : base;
}
