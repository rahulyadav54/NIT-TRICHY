const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('udyamflow_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('udyamflow_token', token);
  } else {
    localStorage.removeItem('udyamflow_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

