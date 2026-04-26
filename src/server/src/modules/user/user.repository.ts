import prisma from "@/infra/database/database.config";
import { ROLE } from "@prisma/client";
import { passwordUtils } from "@/shared/utils/authUtils";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  emailVerified: true,
  newsletterSubscribed: true,
  loyaltyPointsBalance: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserRepository {
  async findAllUsers() {
    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: publicUserSelect,
    });
  }

  async findUserById(id: string | undefined) {
    return await prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  async findUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });
  }

  async updateUser(
    id: string,
    data: Partial<{
      name?: string;
      email?: string;
      password?: string;
      avatar?: string;
      role?: ROLE;
      emailVerified?: boolean;
      newsletterSubscribed?: boolean;
      emailVerificationToken?: string | null;
      emailVerificationTokenExpiresAt?: Date | null;
      resetPasswordToken?: string | null;
      resetPasswordTokenExpiresAt?: Date | null;
    }>
  ) {
    return await prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  }

  async updateNewsletterPreference(id: string, newsletterSubscribed: boolean) {
    return await prisma.user.update({
      where: { id },
      data: { newsletterSubscribed },
      select: publicUserSelect,
    });
  }

  async findSubscribedUsers() {
    return await prisma.user.findMany({
      where: {
        role: ROLE.USER,
        newsletterSubscribed: true,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        loyaltyPointsBalance: true,
      },
    });
  }

  async deleteUser(id: string) {
    return await prisma.user.delete({ where: { id } });
  }

  async countUsersByRole(role: string) {
    return await prisma.user.count({
      where: { role: role as any },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    emailVerified?: boolean;
    newsletterSubscribed?: boolean;
  }) {
    // Hash the password before storing
    const hashedPassword = await passwordUtils.hashPassword(data.password);

    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: data.role as any,
      },
      select: publicUserSelect,
    });
  }
}
