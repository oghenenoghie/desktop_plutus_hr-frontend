import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { MOCK_FIXTURES } from "@/lib/api/mock-fixtures";
import type { TokenResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "1";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const body = (await res.json()) as TokenResponse;
        setTokens(body.access_token, body.refresh_token);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  /** internal — set to skip a second refresh-and-retry attempt */
  _retried?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (MOCK_MODE) {
    const isRead = !options.method || options.method === "GET";
    const lookupPath = path.split("?")[0]!;
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (isRead && lookupPath in MOCK_FIXTURES) {
      return MOCK_FIXTURES[lookupPath as keyof typeof MOCK_FIXTURES] as T;
    }
    if (!isRead) {
      throw new ApiError(501, "Writes are disabled in mock preview mode.");
    }
  }

  const { body, auth = true, _retried, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
    clearTokens();
    if (typeof window !== "undefined") {
      // Full reload (not client-side routing) is deliberate: this module
      // sits outside the React tree and a hard navigation is the simplest
      // way to guarantee all in-memory app state is reset with the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiError(401, "session expired");
  }

  if (!res.ok) {
    const detail = await res
      .json()
      .then((data) => data?.detail ?? data)
      .catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Multipart upload (a photo, eventually other files) — apiFetch always
// JSON-encodes its body, which can't carry a File/Blob, so this is a
// separate path, same shape as downloadAuthenticatedFile below for binary
// responses. Content-Type is deliberately left unset: the browser fills in
// multipart/form-data with the right boundary only when it sets the header
// itself.
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  if (MOCK_MODE) {
    throw new ApiError(501, "Uploads are disabled in mock preview mode.");
  }

  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((data) => data?.detail ?? data)
      .catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Triggers a browser download for an authenticated binary endpoint (a PDF,
// for instance) that apiFetch can't handle since it always parses JSON.
export async function downloadAuthenticatedFile(path: string, filename: string): Promise<void> {
  if (MOCK_MODE) {
    throw new ApiError(501, "Downloads are disabled in mock preview mode.");
  }

  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((data) => data?.detail ?? data)
      .catch(() => res.statusText);
    throw new ApiError(res.status, detail);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
