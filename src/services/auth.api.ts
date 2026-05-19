import { api } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  expiration: string;
  username: string;
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

export const authApi = {
  async login(credentials: LoginCredentials) {
    const res = await api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, credentials);
    
    if (res.success && res.data?.token) {
      if (typeof window !== "undefined") {
        const token = res.data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("username", res.data.username);

        // Decode JWT to extract role and permissions
        const decoded = parseJwt(token);
        if (decoded) {
          const role = decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "";
          const permissions = decoded["Permission"] || [];
          
          localStorage.setItem("role", role);
          localStorage.setItem("permissions", JSON.stringify(permissions));
        }
      }
    }
    
    return res;
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("permissions");
    }
  },

  isAuthenticated(): boolean {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("token");
    }
    return false;
  },

  getRole(): string {
    if (typeof window !== "undefined") {
      return localStorage.getItem("role") || "";
    }
    return "";
  },

  getPermissions(): string[] {
    if (typeof window !== "undefined") {
      const perms = localStorage.getItem("permissions");
      if (perms) {
        try {
          return JSON.parse(perms);
        } catch {
          return [];
        }
      }
    }
    return [];
  },

  hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  }
};
