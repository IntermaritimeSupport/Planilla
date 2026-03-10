/**
 * src/services/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FETCHER CENTRALIZADO AUTENTICADO — FASE 1
 *
 * Todos los módulos deben usar authFetcher (SWR) o apiPost/apiPut/apiDelete
 * para garantizar que el token JWT se envíe en cada petición.
 *
 * Clave del token: localStorage.getItem('jwt')  ← único estándar en todo el sistema
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_URL = import.meta.env.VITE_API_URL as string

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Lee el token limpio del localStorage (clave canónica: 'jwt') */
export const getToken = (): string | null => {
  try {
    const stored = localStorage.getItem('jwt')
    if (!stored) return null
    // Limpiar si está envuelto en comillas o es un JSON
    if (stored.startsWith('{')) {
      const parsed = JSON.parse(stored)
      return parsed.token || parsed.jwt || null
    }
    if (stored.startsWith('"') && stored.endsWith('"')) {
      return stored.slice(1, -1)
    }
    return stored
  } catch {
    return null
  }
}

/** Construye los headers estándar con Authorization */
export const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** Maneja respuestas 401 redirigiendo al login */
const handleUnauthorized = () => {
  localStorage.removeItem('jwt')
  sessionStorage.removeItem('jwt')
  localStorage.removeItem('selectedCompany')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCHER PARA SWR (GET)
// Uso: const { data } = useSWR(url, authFetcher)
// ─────────────────────────────────────────────────────────────────────────────
export const authFetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.')
  }

  if (res.status === 403) {
    throw new Error('No tienes permisos para acceder a este recurso.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `Error del servidor: ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─────────────────────────────────────────────────────────────────────────────
// MÉTODOS HTTP AUTENTICADOS
// ─────────────────────────────────────────────────────────────────────────────

export const apiPost = async <T = unknown>(
  path: string,
  body: unknown
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Sesión expirada.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || `Error ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const apiPut = async <T = unknown>(
  path: string,
  body: unknown
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Sesión expirada.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || `Error ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const apiDelete = async (path: string): Promise<void> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  })

  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Sesión expirada.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || `Error ${res.status}`)
  }
}
