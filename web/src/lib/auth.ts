import { UserRole } from "@/lib/types";

export type AccountStatus = "active" | "disabled";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export type CreateAuthUserInput = {
  name: string;
  email?: string;
  password: string;
  role: UserRole;
};

export type UpdateAuthUserInput = Partial<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: AccountStatus;
}>;
