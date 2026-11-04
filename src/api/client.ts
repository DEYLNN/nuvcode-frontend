const API_BASE = import.meta.env.VITE_API_BASE || '/admin/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

/** Check if stored JWT is valid (exists + not expired) */
function isTokenValid(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() < payload.exp * 1000
  } catch {
    return false
  }
}

/** Remove expired/invalid token from storage */
function clearToken(): void {
  localStorage.removeItem('token')
}

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
    ...(init?.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${url}`, {
    method: init?.method || 'GET',
    headers,
    body: init?.body,
    signal: init?.signal,
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export { API_BASE, fetcher, getToken, isTokenValid, clearToken }

/** Raw fetch with API_BASE prefix + auth header — use instead of bare fetch() for API calls */
export const apiFetch = (url: string, init?: RequestInit) => {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${API_BASE}${url}`, { ...init, headers }).then(res => {
    if (res.status === 401) {
      clearToken()
      window.location.href = '/login'
    }
    return res
  })
}

/** Resolve provider icon URL from icon_name */
export function iconUrl(name: string): string {
  if (!name) return ''
  if (name.startsWith('http')) return name
  return '/providers/' + name
}
