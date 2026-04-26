export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  email: string;
  emailVerified: boolean;
  newsletterSubscribed: boolean;
  loyaltyPointsBalance: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
    email: string;
    emailVerified: boolean;
    newsletterSubscribed: boolean;
    loyaltyPointsBalance: number;
    createdAt?: string;
    updatedAt?: string;
  };
}
