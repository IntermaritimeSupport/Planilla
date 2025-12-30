import { decodeToken, Token } from "../utils/decode";
const { VITE_API_URL } = import.meta.env

export class authServices {
  static async login(email: string, password: string) {
    const response = await fetch(`${VITE_API_URL}/api/user/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData?.message || 'Error en el inicio de sesión');
      } catch (error) {
        throw new Error('Error en el inicio de sesión');
      }
    }

    const data = await response.json();

    if (data?.token) {
      window.sessionStorage.setItem('jwt', data.token);
      localStorage.setItem('jwt', data.token);
      return data.token; // ✅ Retornar solo el token
    }

    throw new Error('No se recibió token del servidor');
  }

  static async logout(jwt: string) {
    if (typeof jwt !== 'string' || jwt.trim() === '') {
      const errorMessage = "La función de logout fue llamada incorrectamente sin un token JWT válido.";
      console.error(errorMessage, "Argumento recibido:", jwt);
      window.sessionStorage.removeItem('jwt');
      localStorage.removeItem('jwt');
      
      window.sessionStorage.removeItem('selectedCompany');
      localStorage.removeItem('selectedCompany');
      window.location.href = '/login';
      throw new TypeError(errorMessage);
    }

    window.sessionStorage.removeItem('jwt');
    localStorage.removeItem('jwt');
    window.sessionStorage.removeItem('selectedCompany');
    localStorage.removeItem('selectedCompany');

    try {
      const response = await fetch(`${VITE_API_URL}/api/user/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.message || 'Error del servidor al cerrar la sesión.');
      }
      console.log("Logout en el servidor exitoso.");

    } catch (error) {
      console.error('Error durante la llamada de logout al servidor:', error);
    } finally {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  static async register(formData: FormData) {
    const email_address = formData.get('email');
    const password = formData.get('password');

    const response = await fetch(VITE_API_URL + "/api/user/auth/register", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en el registro');
    }

    return await response.json();
  }

  static async verification(token: string) {
    const url = new URL(VITE_API_URL + "/api/auth/activate-account");
    url.searchParams.append('token', token);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la verificación');
    }

    return await response.json();
  }

  static async sendResetEmail(formData: FormData) {
    const email = formData.get('email');
    const password = formData.get('newPassword');

    const response = await fetch(VITE_API_URL + "/api/user/auth/sendResetEmail", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al enviar el email de reseteo');
    }

    return await response.json();
  }

  static async sendReset(formData: FormData) {
    const email = formData.get('email');
    const newPassword = formData.get('newPassword');
    const code = formData.get('code');

    const response = await fetch(VITE_API_URL + "/api/user/auth/sendResetPassword", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al resetear la contraseña');
    }

    return await response.json();
  }

  static isTokenExpired(exp: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return exp < currentTime;
  }

  /**
   * Obtiene el token actual del storage si es válido
   */
  static getCurrentUser(): string | null {
    try {
      const token = Token();
      
      if (!token || token.split('.').length !== 3) {
        return null;
      }

      const decoded = decodeToken();
      if (!decoded) {
        return null;
      }

      const isExpired = this.isTokenExpired(decoded?.exp);
      
      if (isExpired) {
        localStorage.removeItem('jwt');
        sessionStorage.removeItem('jwt');
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Valida si el token actual es válido y no está expirado
   */
  static isTokenValid(): boolean {
    return this.getCurrentUser() !== null;
  }
}