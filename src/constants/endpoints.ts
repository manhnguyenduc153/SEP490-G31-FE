export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/Auth/Login",
    REFRESH_TOKEN: "/api/Auth/RefreshToken",
    LOGOUT: "/api/Auth/Logout",
    GET_ALL_ROLES: "/api/Auth/GetAllRole",
    GET_ALL_PERMISSIONS: "/api/Auth/GetAllPermissions",
    GET_CURRENT_PERMISSIONS: "/api/Auth/GetCurrentPermissions",
    ASSIGN_ROLE_PERMISSIONS: "/api/Auth/AssignRolePermissions",
  },
  USER: {
    PROFILE: "/api/User/Profile",
  },
  QUESTION_CATEGORY: {
    GET_ALL: "/api/QuestionCategory",
    GET_BY_ID: (id: number) => `/api/QuestionCategory/${id}`,
    CREATE: "/api/QuestionCategory",
    UPDATE: (id: number) => `/api/QuestionCategory/${id}`,
    DELETE: (id: number) => `/api/QuestionCategory/${id}`,
    DEACTIVE: (id: number) => `/api/QuestionCategory/${id}/deactive`,
  },
  STUDENT: {
    GET_ALL: "/api/Student",
    GET_BY_ID: (id: number) => `/api/Student/${id}`,
    CREATE: "/api/Student",
    UPDATE: (id: number) => `/api/Student/${id}`,
    DELETE: (id: number) => `/api/Student/${id}`,
    DEACTIVE: (id: number) => `/api/Student/${id}/deactive`,
  TEACHER: {
    GET_ALL: "/api/Teacher",
    GET_BY_ID: (id: number) => `/api/Teacher/${id}`,
    CREATE: "/api/Teacher",
    UPDATE: (id: number) => `/api/Teacher/${id}`,
    DELETE: (id: number) => `/api/Teacher/${id}`,
    DEACTIVE: (id: number) => `/api/Teacher/${id}/deactive`,
  },
  COURSE: {
    GET_ALL: "/api/Course",
    GET_BY_ID: (id: number) => `/api/Course/${id}`,
    CREATE: "/api/Course",
    UPDATE: (id: number) => `/api/Course/${id}`,
    DELETE: (id: number) => `/api/Course/${id}`,
    DEACTIVE: (id: number) => `/api/Course/${id}/deactive`,
  },
};

