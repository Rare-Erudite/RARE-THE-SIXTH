/**
 * RARE Resilient API Client
 * Configurable backend endpoint with transparent connection error reporting.
 */

// Global connection state
export interface BackendConnectionState {
  reachable: boolean;
  lastChecked: number;
  lastError?: string;
  configuredUrl: string;
}

let connectionState: BackendConnectionState = {
  reachable: true,
  lastChecked: Date.now(),
  configuredUrl: '',
};

type ConnectionListener = (state: BackendConnectionState) => void;
const listeners = new Set<ConnectionListener>();

export function subscribeConnectionState(listener: ConnectionListener): () => void {
  listeners.add(listener);
  listener(connectionState);
  return () => listeners.delete(listener);
}

function updateConnectionState(reachable: boolean, error?: string) {
  connectionState = {
    reachable,
    lastChecked: Date.now(),
    lastError: error,
    configuredUrl: getBackendUrl(),
  };
  listeners.forEach((fn) => fn(connectionState));
}

/**
 * Returns the currently active backend URL.
 * Checks localStorage first, then window injection, then Vite environment variable.
 */
export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('rare_backend_url');
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
    if ((window as any).__RARE_BACKEND_URL__) {
      return String((window as any).__RARE_BACKEND_URL__).trim().replace(/\/+$/, '');
    }
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) {
    return String(import.meta.env.VITE_BACKEND_URL).trim().replace(/\/+$/, '');
  }
  return '';
}

export function setBackendUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('rare_backend_url');
    } else {
      localStorage.setItem('rare_backend_url', url.trim().replace(/\/+$/, ''));
    }
    updateConnectionState(connectionState.reachable);
  }
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getBackendUrl();
  if (base) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
  return path;
}

export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  fallback?: T,
  retries = 1
): Promise<T | null> {
  const fullUrl = resolveApiUrl(url);

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(fullUrl, options);
      if (res.ok) {
        updateConnectionState(true);
        return (await res.json()) as T;
      } else {
        updateConnectionState(false, `HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      if (i === retries) {
        updateConnectionState(false, err?.message || 'Network unreachable');
      } else {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
  }
  return fallback !== undefined ? fallback : null;
}

export async function safePost<T>(
  url: string,
  body?: any,
  fallback?: T
): Promise<T | null> {
  return safeFetch<T>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    },
    fallback,
    1
  );
}
