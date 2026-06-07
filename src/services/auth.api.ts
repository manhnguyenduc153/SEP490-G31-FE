import { api, ApiResponse, parseJwt } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export { parseJwt };

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  permissions: string[];
}

export interface RolesResponse {
  pageIndex: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  items: RoleItem[];
}
export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  expiration: string;
  refreshToken: string;
  username: string;
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    const res = await api.post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, credentials);
    
    if (res.success && res.data?.token) {
      if (typeof window !== "undefined") {
        const token = res.data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", res.data.refreshToken);
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

  async logout() {
    if (typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          await api.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
        } catch (error) {
          console.error("Logout API failed:", error);
        }
      }
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsedPerms: any = JSON.parse(perms);
          if (typeof parsedPerms === "string") {
            parsedPerms = [parsedPerms];
          }
          if (!Array.isArray(parsedPerms)) {
            parsedPerms = [];
          }
          const extendedPerms = new Set<string>(parsedPerms);
          // Auto-inject parent permissions if missing (for backward compatibility)
          parsedPerms.forEach((perm: string) => {
            if (perm && typeof perm === "string" && perm.includes(".")) {
              const parent = perm.split(".")[0];
              extendedPerms.add(parent);
            }
          });
          const finalPerms = Array.from(extendedPerms);
          console.log("[DEBUG] getPermissions returning:", finalPerms);
          return finalPerms;
        } catch (e) {
          console.error("Error parsing permissions:", e);
          return [];
        }
      }
    }
    return [];
  },

  hasPermission(permission: string): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  },

  async getAllRoles(pageIndex: number, pageSize: number, search: string = ""): Promise<ApiResponse<RolesResponse>> {
    const query = new URLSearchParams({
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      search: search,
    }).toString();
    return api.get<RolesResponse>(`${ENDPOINTS.AUTH.GET_ALL_ROLES}?${query}`);
  },

  async getAllPermissions(): Promise<ApiResponse<string[]>> {
    return api.get<string[]>(ENDPOINTS.AUTH.GET_ALL_PERMISSIONS);
  },

  async getCurrentPermissions(): Promise<ApiResponse<string[]>> {
    return api.get<string[]>(ENDPOINTS.AUTH.GET_CURRENT_PERMISSIONS);
  },

  async assignRolePermissions(roleName: string, permissions: string[]): Promise<ApiResponse<void>> {
    return api.post<void>(ENDPOINTS.AUTH.ASSIGN_ROLE_PERMISSIONS, { roleName, permissions });
  }
};
