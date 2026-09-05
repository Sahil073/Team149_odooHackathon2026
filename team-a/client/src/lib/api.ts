const API_BASE_URL = (import.meta.env.VITE_API_URL || 'hhttps://team149-odoohackathon2026-1.onrender.com/api').replace(/\/$/, '');
const TOKEN_KEY = 'dealflow.accessToken';

type ApiErrorBody = { message?: string; error?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new Error(errorBody?.message || errorBody?.error || `Request failed (${response.status})`);
  }
  return body as T;
}

export type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'ADMIN' };
};

export type ApiProduct = {
  id: string;
  name: string;
  category: 'HARDWARE' | 'SERVICES' | 'SUBSCRIPTIONS';
  price: number | string;
  unit: string;
  taxPct: number;
  description?: string | null;
  variants: Array<{ id: string; attribute: string; value: string; extraPrice: number | string }>;
  stock?: Array<{ quantity: number; warehouse?: { name: string } }>;
};

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(name: string, email: string, password: string, role: AuthResponse['user']['role']) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}

export function getProducts() {
  return request<{ data: ApiProduct[] }>('/products');
}