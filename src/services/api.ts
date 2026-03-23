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

/** Maneja empresa desactivada: limpia selectedCompany y redirige al selector */
const handleCompanyInactive = () => {
  localStorage.removeItem('selectedCompany')
  const current = window.location.pathname
  if (!current.startsWith('/select-company')) {
    window.location.href = '/select-company?reason=inactive'
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
    const body = await res.json().catch(() => ({}))
    if (body?.error === 'COMPANY_INACTIVE') {
      handleCompanyInactive()
      throw new Error('COMPANY_INACTIVE')
    }
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

/** Manejo centralizado de errores para métodos mutadores */
const handleMutationError = async (res: globalThis.Response): Promise<never> => {
  if (res.status === 401) {
    handleUnauthorized()
    throw new Error('Sesión expirada.')
  }
  const err = await res.json().catch(() => ({}))
  if (res.status === 403 && err?.error === 'COMPANY_INACTIVE') {
    handleCompanyInactive()
    throw new Error('COMPANY_INACTIVE')
  }
  throw new Error(err?.message || err?.error || `Error ${res.status}`)
}

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
  if (!res.ok) await handleMutationError(res)
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
  if (!res.ok) await handleMutationError(res)
  return res.json() as Promise<T>
}

export const apiPatch = async <T = unknown>(
  path: string,
  body?: unknown
): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) await handleMutationError(res)
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
