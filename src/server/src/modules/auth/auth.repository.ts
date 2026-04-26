import prisma from "@/infra/database/database.config";
import { ROLE } from "@prisma/client";
import { passwordUtils } from "@/shared/utils/authUtils";

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserByEmailWithPassword(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        role: true,
        name: true,
        email: true,
        avatar: true,
        emailVerified: true,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        emailVerified: true,
      },
    });
  }

  async createUser(data: {
    email: string;
    name: string;
    password: string;
    role: ROLE;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationTokenExpiresAt?: Date | null;
  }) {
    const hashedPassword = await passwordUtils.hashPassword(data.password);

    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        emailVerified: true,
      },
    });
  }

  async updateUserEmailVerification(
    userId: string,
    data: {
      emailVerificationToken: string | null;
      emailVerificationTokenExpiresAt: Date | null;
      emailVerified?: boolean;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateUserPasswordReset(
    email: string,
    data: {
      resetPasswordToken?: string | null;
      resetPasswordTokenExpiresAt?: Date | null;
      password?: string;
    }
  ) {
    return prisma.user.update({
      where: { email },
      data,
    });
  }

  async findUserByResetToken(hashedToken: string) {
    return prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiresAt: { gt: new Date() },
      },
    });
  }

  async updateUserPassword(userId: string, password: string) {
    const hashedPassword = await passwordUtils.hashPassword(password);

    return prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });
  }
}
