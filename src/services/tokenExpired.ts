export class Token {
  static isTokenExpired(token: string) {
    if (!token) return true;

    try {
      // Usar atob para decodificar el payload del token
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decodedPayload = atob(base64);  // Usamos atob en lugar de Buffer

      const payload = JSON.parse(decodedPayload);
      const expiry = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() > expiry;
    } catch (e) {
      console.error(e);
      return true; // Asumimos que el token está expirado si ocurre algún error
    }
  }

  static setCurrentUser() {
    return localStorage.setItem("jwt", JSON.stringify({}));
  }

  static getCurrentUser() {
    const user = JSON.parse(localStorage.getItem("jwt") || "{}");
    let jwt = JSON.parse(window.sessionStorage.getItem("jwt") || "{}");

    if (!jwt && user) {
      jwt = user;
      window.sessionStorage.setItem("jwt", JSON.stringify(user));
    }
    if (jwt && !this.isTokenExpired(jwt?.token)) {
      return user;
    } else {
      window.sessionStorage.removeItem("jwt");
      localStorage.removeItem("jwt");
      return null;
    }
  }
}
