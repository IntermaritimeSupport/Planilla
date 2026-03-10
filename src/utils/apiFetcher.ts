// ─────────────────────────────────────────────────────────────────────────────
// apiFetcher.ts
// Fetcher global autenticado — usa el JWT guardado en localStorage
// ─────────────────────────────────────────────────────────────────────────────

import { Token } from "./decode";

const getToken = (): string | null => Token();

/**
 * Headers de autenticación para fetch manual
 */
export const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Fetcher autenticado para SWR (GET)
 * Redirige a /login si el servidor responde 401
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 401) {
    localStorage.removeItem("jwt");
    sessionStorage.removeItem("jwt");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }

  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
};

/**
 * POST autenticado
 */
export const apiPost = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    localStorage.removeItem("jwt");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }
  return res;
};

/**
 * PUT autenticado
 */
export const apiPut = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    localStorage.removeItem("jwt");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }
  return res;
};

/**
 * DELETE autenticado
 */
export const apiDelete = async (url: string) => {
  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (res.status === 401) {
    localStorage.removeItem("jwt");
    window.location.href = "/login";
    throw new Error("No autorizado");
  }
  return res;
};
