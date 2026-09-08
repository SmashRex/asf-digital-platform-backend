export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  department: string;
  academicLevel: string;
  accountStatus: string;
  roles: string[];
}