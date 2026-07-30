/**
 * Talks to the Express API. In dev, either:
 *   (a) set VITE_API_URL=http://localhost:5000 in .env, or
 *   (b) add a `/api` proxy to `server.proxy` in vite.config.ts and leave
 *       VITE_API_URL unset — requests then look same-origin to the browser.
 * `credentials: "include"` is needed either way so the session cookie is
 * sent/stored on cross-origin requests.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  identifier: string; // username or email
  password: string;
}

export class AuthError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = status;
  }
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(data.error ?? "request_failed", res.status, data.details);
  }
  return data;
}

export async function signup(payload: SignupPayload): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.user as PublicUser;
}

export async function login(payload: LoginPayload): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.user as PublicUser;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function fetchSession(): Promise<PublicUser | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
  const data = await parseOrThrow(res);
  return (data.user as PublicUser | null) ?? null;
}

// ADMIN API

export async function adminFetchUsers(): Promise<PublicUser[]> {
  const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
  const data = await parseOrThrow(res);
  return data.users as PublicUser[];
}

export async function adminCreateUser(payload: SignupPayload & { role: string }): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.user as PublicUser;
}

export async function adminUpdateRole(userId: string, role: string): Promise<PublicUser> {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const data = await parseOrThrow(res);
  return data.user as PublicUser;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseOrThrow(res);
}
