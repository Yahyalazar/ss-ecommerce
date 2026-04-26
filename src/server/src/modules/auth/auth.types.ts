import { ROLE } from "@prisma/client";

export interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  role?: ROLE;
  newsletterSubscribed?: boolean;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface VerifyEmailParams {
  email: string;
  emailVerificationToken: string;
}

export interface VerificationPendingResponse {
  email: string;
  message: string;
  requiresEmailVerification: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: ROLE;
  avatar: string | null;
  emailVerified: boolean;
  newsletterSubscribed: boolean;
  loyaltyPointsBalance: number;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
