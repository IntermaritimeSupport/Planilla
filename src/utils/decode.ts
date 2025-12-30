import { jwtDecode } from "jwt-decode"

export interface DecodedToken {
  id: string
  username?: string
  roles?: string
  email?: string
  exp: number
  iat: number
}

export interface DecodedTokenPublic {
  metaData: DecodedToken
}

/**
 * Obtiene el token limpio del localStorage
 */
const getCleanToken = (): string | null => {
  try {
    const stored = localStorage.getItem('jwt');
    if (!stored) return null;

    // Si es un objeto stringificado, extraer la propiedad token
    if (stored.startsWith('{')) {
      const parsed = JSON.parse(stored);
      return parsed.token || parsed.jwt || null;
    }

    // Si es un string con comillas, limpiarlas
    if (stored.startsWith('"') && stored.endsWith('"')) {
      return stored.slice(1, -1);
    }

    return stored;
  } catch (error) {
    console.error('Error obteniendo token limpio:', error);
    return null;
  }
}

/**
 * Decodifica el JWT del localStorage
 */
export const decodeToken = (): DecodedToken | null => {
  const token = getCleanToken();
  
  if (!token) {
    console.warn('No token found in localStorage');
    return null;
  }

  try {
    // Validar que tenga 3 partes
    if (token.split('.').length !== 3) {
      throw new Error('Invalid token format: expected 3 parts separated by dots');
    }

    const decoded = jwtDecode<DecodedToken>(token);
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    // Limpiar token inválido
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    return null;
  }
}

/**
 * Decodifica el token y devuelve la estructura con metaData
 */
export const decodeTokenPublic = (jwt: string | null): DecodedTokenPublic | null => {
  if (!jwt) {
    return null;
  }

  try {
    // Limpiar el token si es necesario
    let cleanToken = jwt;
    
    if (jwt.startsWith('{')) {
      const parsed = JSON.parse(jwt);
      cleanToken = parsed.token || parsed.jwt || jwt;
    }
    
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }

    // Validar formato
    if (cleanToken.split('.').length !== 3) {
      throw new Error('Invalid token format');
    }

    const decoded = jwtDecode<DecodedToken>(cleanToken);
    return {
      metaData: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        roles: decoded.roles,
        exp: decoded.exp,
        iat: decoded.iat,
      }
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Obtiene solo el token string
 */
export const Token = (): string | null => {
  return getCleanToken();
}