export interface User {
  id?: string;
  role: string;
  [key: string]: any;
}

export interface Resource {
  id?: string;
  type: string;
  isPrivate?: boolean;
  [key: string]: any;
}

export function authorize(user: User, resource: Resource, action: string): boolean;
