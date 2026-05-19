import { api } from "./api";
import { ENDPOINTS } from "@/constants/endpoints";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export const userApi = {
  async getProfile() {
    return api.get<UserProfile>(ENDPOINTS.USER.PROFILE);
  },
};
