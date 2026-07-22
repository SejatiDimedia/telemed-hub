/**
 * API Client — satu-satunya tempat yang memanggil `fetch` langsung.
 *
 * Sesuai docs/16-frontend-architecture.md & docs/07-api-design.md:
 * - Auto-attach Authorization header
 * - Parse error envelope { error: { code, message, details } }
 * - Auto-retry dengan refresh token saat 401
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: ApiErrorDetail[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? [];
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Token storage (in-memory access token, persistent refresh token in localStorage)
// ---------------------------------------------------------------------------

let accessToken: string | null = null;
let refreshToken: string | null = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("refresh_token", refresh);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("refresh_token");
  }
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined ?? "http://localhost:8080/api/v1";

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResult<T> {
  data: T;
  pagination: PaginationInfo;
}

interface RawApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  pagination?: PaginationInfo;
  error?: string;
  error_code?: string;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  try {
    const json = (await res.json()) as RawApiResponse;
    if (json.error || json.error_code) {
      return new ApiError(res.status, {
        code: json.error_code ?? "UNKNOWN_ERROR",
        message: json.error ?? `Request failed with status ${res.status.toString()}`,
        details: Array.isArray(json.data) ? json.data : undefined,
      });
    }
  } catch {
    // Response bukan JSON
  }
  return new ApiError(res.status, {
    code: "UNKNOWN_ERROR",
    message: `Request failed with status ${res.status.toString()}`,
  });
}

export async function refreshAccessToken(): Promise<boolean> {
  const currentRefresh = refreshToken ?? (typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null);
  if (!currentRefresh) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: currentRefresh }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const json = (await res.json()) as {
      success: boolean;
      data: { access_token: string; refresh_token: string };
    };
    setTokens(json.data.access_token, json.data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  const isFormData = body instanceof FormData;
  
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const config: RequestInit = {
    ...rest,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  let res = await fetch(`${BASE_URL}${endpoint}`, config);

  // Auto-retry dengan refresh token saat 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${accessToken!}`);
      const retryConfig: RequestInit = { ...config, headers };
      res = await fetch(`${BASE_URL}${endpoint}`, retryConfig);
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json()) as { success?: boolean; data?: any };
  if (json && typeof json === "object" && json.success === true && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

/**
 * Variant of request that preserves the pagination metadata from the response
 * envelope. Used for list endpoints that need pagination info.
 */
async function requestWithPagination<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<PaginatedResult<T>> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  const isFormData = body instanceof FormData;

  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const config: RequestInit = {
    ...rest,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  let res = await fetch(`${BASE_URL}${endpoint}`, config);

  // Auto-retry dengan refresh token saat 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${accessToken!}`);
      const retryConfig: RequestInit = { ...config, headers };
      res = await fetch(`${BASE_URL}${endpoint}`, retryConfig);
    }
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const json = (await res.json()) as RawApiResponse;
  return {
    data: (json.data ?? []) as T,
    pagination: json.pagination ?? { page: 1, limit: 20, total_items: 0, total_pages: 0 },
  };
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

export const apiClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * GET with pagination — returns { data, pagination } instead of just data.
   */
  getWithPagination<T>(endpoint: string, options?: RequestOptions): Promise<PaginatedResult<T>> {
    return requestWithPagination<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};
