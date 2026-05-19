import { ENV } from "@/config/env";

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

export const api = {
  async get<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
      method: "GET",
      headers: getHeaders(),
      ...options,
    });
    return handleResponse<T>(response);
  },

  async post<T = unknown>(path: string, body: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
      ...options,
    });
    return handleResponse<T>(response);
  },

  async put<T = unknown>(path: string, body: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
      ...options,
    });
    return handleResponse<T>(response);
  },

  async delete<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
      method: "DELETE",
      headers: getHeaders(),
      ...options,
    });
    return handleResponse<T>(response);
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
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    }
    
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
