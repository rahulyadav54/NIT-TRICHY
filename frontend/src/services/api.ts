const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('trima_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('trima_token', token);
  } else {
    localStorage.removeItem('trima_token');
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

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Server returned non-JSON response (${response.status}): ${text.slice(0, 120)}`
    );
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

