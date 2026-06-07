export interface PermissionNode {
  id: string;
  name: string;
  children?: PermissionNode[];
}

export type SortKey = "name" | "description" | "status" | "createdAt" | "permissionsCount";
export type SortOrder = "asc" | "desc";
