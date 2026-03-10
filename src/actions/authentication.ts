/**
 * src/actions/authentication.ts
 * FASE 1 — Clave JWT estandarizada: localStorage ('jwt')
 */
import { decodeToken } from '../utils/decode'

const { VITE_API_URL } = import.meta.env

const getCleanToken = (): string | null => {
  try {
    const stored = localStorage.getItem('jwt')
    if (!stored) return null
    if (stored.startsWith('{')) {
      const parsed = JSON.parse(stored)
      return parsed.token || parsed.jwt || null
    }
    if (stored.startsWith('"') && stored.endsWith('"')) return stored.slice(1, -1)
    return stored
  } catch { return null }
}

const clearAuth = () => {
  localStorage.removeItem('jwt')
  sessionStorage.removeItem('jwt')
  localStorage.removeItem('selectedCompany')
  sessionStorage.removeItem('selectedCompany')
}

export class authServices {
  static async login(email: string, password: string): Promise<string> {
    const response = await fetch(`${VITE_API_URL}/api/user/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.message || 'Error en el inicio de sesión')
    }
    const data = await response.json()
    if (data?.token) {
      localStorage.setItem('jwt', data.token)
      return data.token
    }
    throw new Error('No se recibió token del servidor')
  }

  static async logout(jwt: string): Promise<void> {
    if (!jwt || typeof jwt !== 'string' || !jwt.trim()) {
      clearAuth()
      window.location.href = '/login'
      return
    }
    clearAuth()
    try {
      await fetch(`${VITE_API_URL}/api/user/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      })
    } catch (error) {
      console.error('Error en logout del servidor:', error)
    } finally {
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
  }

  static async register(formData: FormData): Promise<unknown> {
    const response = await fetch(`${VITE_API_URL}/api/user/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: formData.get('email'), password: formData.get('password') }),
    })
    if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Error en el registro') }
    return response.json()
  }

  static async sendResetEmail(formData: FormData): Promise<unknown> {
    const response = await fetch(`${VITE_API_URL}/api/user/auth/sendResetEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), password: formData.get('newPassword') }),
    })
    if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Error al enviar email') }
    return response.json()
  }

  static async sendReset(formData: FormData): Promise<unknown> {
    const response = await fetch(`${VITE_API_URL}/api/user/auth/sendResetPassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), code: formData.get('code'), newPassword: formData.get('newPassword') }),
    })
    if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Error al resetear') }
    return response.json()
  }

  static isTokenExpired(exp: number): boolean {
    return Math.floor(Date.now() / 1000) >= exp
  }

  static getCurrentUser(): string | null {
    try {
      const token = getCleanToken()
      if (!token || token.split('.').length !== 3) return null
      const decoded = decodeToken()
      if (!decoded) return null
      if (this.isTokenExpired(decoded.exp)) { clearAuth(); return null }
      return token
    } catch { return null }
  }

  static isTokenValid(): boolean {
    return this.getCurrentUser() !== null
  }
}
