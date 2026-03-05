const API_BASE = 'http://localhost:8000';      // primary: auth, keys, credits, usage, admin
export const LLM_API_BASE = 'http://localhost:8001';  // api gateway: chat completions

export async function apiRequest<T = unknown>(
  endpoint: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error((error as { detail?: string }).detail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// Auth
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export const auth = {
  register: (email: string, password: string, full_name: string) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) =>
    apiRequest<User>('/auth/me', {}, token),
};

// API Keys
export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface APIKeyCreated extends APIKey {
  key: string;
}

export const keys = {
  list: (token: string) =>
    apiRequest<APIKey[]>('/keys', {}, token),
  create: (token: string, name: string) =>
    apiRequest<APIKeyCreated>('/keys', { method: 'POST', body: JSON.stringify({ name }) }, token),
  delete: (token: string, id: string) =>
    apiRequest<void>(`/keys/${id}`, { method: 'DELETE' }, token),
  toggle: (token: string, id: string) =>
    apiRequest<APIKey>(`/keys/${id}/toggle`, { method: 'PATCH' }, token),
};

// Credits
export interface Credits {
  balance: number;
  total_purchased: number;
  total_used: number;
}

export const credits = {
  get: (token: string) =>
    apiRequest<Credits>('/credits', {}, token),
  add: (token: string, amount: number, user_id?: string) =>
    apiRequest<Credits>('/credits/add', {
      method: 'POST',
      body: JSON.stringify({ amount, ...(user_id ? { user_id } : {}) }),
    }, token),
};

// Usage
export interface UsageLog {
  id: string;
  model_name: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
  request_id?: string;
}

export interface UsageStats {
  total_tokens: number;
  total_cost: number;
  total_requests: number;
  by_model: Record<string, { tokens: number; cost: number; requests: number }>;
}

export const usage = {
  list: (token: string, skip = 0, limit = 50) =>
    apiRequest<UsageLog[]>(`/usage?skip=${skip}&limit=${limit}`, {}, token),
  stats: (token: string) =>
    apiRequest<UsageStats>('/usage/stats', {}, token),
};

// Admin
export interface Model {
  id: string;
  name: string;
  provider: string;
  display_name: string;
  context_window: number;
  input_price_per_1k_tokens: number;
  output_price_per_1k_tokens: number;
  is_active: boolean;
  description?: string;
}

export interface AdminStats {
  total_users: number;
  total_requests: number;
  total_tokens: number;
  total_revenue: number;
  active_keys: number;
}

export const admin = {
  models: (token: string) =>
    apiRequest<Model[]>('/admin/models', {}, token),
  users: (token: string) =>
    apiRequest<User[]>('/admin/users', {}, token),
  stats: (token: string) =>
    apiRequest<AdminStats>('/admin/stats', {}, token),
};

export const models = {
  list: (token: string) =>
    apiRequest<Model[]>('/models', {}, token),
};
