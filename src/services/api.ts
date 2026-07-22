import { ENV } from "@/config/env";

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

// Utility to safely decode JWT payload on the client side
export function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Client-side authentication credentials clearing and redirect
export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("permissions");
    // Avoid redirect loop if already on signin page
    if (!window.location.pathname.includes("/signin")) {
      window.location.href = "/signin";
    }
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((token) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  if (typeof window === "undefined") {
    isRefreshing = false;
    return null;
  }

  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!token || !refreshToken) {
    isRefreshing = false;
    return null;
  }

  try {
    const res = await fetch(`${ENV.API_BASE_URL}/api/Auth/RefreshToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        refreshToken,
      }),
    });

    if (res.ok) {
      const responseData = await res.json();
      if (responseData.success && responseData.data?.token) {
        const newToken = responseData.data.token;
        const newRefreshToken = responseData.data.refreshToken;

        localStorage.setItem("token", newToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        if (responseData.data.username) {
          localStorage.setItem("username", responseData.data.username);
        }

        // Parse claims and update roles/permissions if available
        const decoded = parseJwt(newToken);
        if (decoded) {
          const role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "";
          const permissions = decoded["Permission"] || [];
          localStorage.setItem("role", role);
          localStorage.setItem("permissions", JSON.stringify(permissions));
        }

        processQueue(newToken);
        isRefreshing = false;
        return newToken;
      }
    }

    // Refresh response is not OK or success is false
    processQueue(null);
    isRefreshing = false;
    return null;
  } catch {
    processQueue(null);
    isRefreshing = false;
    return null;
  }
}

const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return {
    ...headers,
    ...customHeaders,
  };
};

async function request<T>(path: string, options: RequestInit): Promise<ApiResponse<T>> {
  const mergedOptions = {
    ...options,
    headers: getHeaders(options.headers),
  };

  let response: Response;
  try {
    response = await fetch(`${ENV.API_BASE_URL}${path}`, mergedOptions);
  } catch {
    // Network error (server unreachable, CORS, etc.)
    return {
      success: false,
      statusCode: 0,
      message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
      data: null as unknown as T,
    };
  }

  const isAuthEndpoint = path.includes("/api/Auth/Login") || 
                         path.includes("/api/Auth/RefreshToken") || 
                         path.includes("/api/Auth/Register") || 
                         path.includes("/api/Auth/Logout");

  if (response.status === 401 && !isAuthEndpoint) {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry the request with the new token
        const retryOptions = {
          ...options,
          headers: getHeaders(options.headers),
        };
        try {
          response = await fetch(`${ENV.API_BASE_URL}${path}`, retryOptions);
        } catch {
          return {
            success: false,
            statusCode: 0,
            message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
            data: null as unknown as T,
          };
        }
      } else {
        clearAuth();
        return {
          success: false,
          statusCode: 401,
          message: "Session expired. Please sign in again.",
          data: null as unknown as T,
        };
      }
    } catch {
      clearAuth();
      return {
        success: false,
        statusCode: 401,
        message: "Session expired. Please sign in again.",
        data: null as unknown as T,
      };
    }
  }

  return handleResponse<T>(response);
}

export const api = {
  async get<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "GET",
      ...options,
    });
  },

  async post<T = unknown>(path: string, body: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },

  async put<T = unknown>(path: string, body: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  },

  async delete<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(path, {
      method: "DELETE",
      ...options,
    });
  },
};

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type");
  let data: unknown;
  
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorData = data as Record<string, unknown> | null;
    return {
      success: false,
      statusCode: response.status,
      message: String(errorData?.message || response.statusText || "Request failed"),
      data: data as T,
    };
  }

  return data as ApiResponse<T>;
}
