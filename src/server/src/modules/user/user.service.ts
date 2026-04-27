import crypto from "crypto";
import AppError from "@/shared/errors/AppError";
import { UserRepository } from "./user.repository";
import sendEmail from "@/shared/utils/sendEmail";
import newsletterTemplate from "@/shared/templates/newsletter";
import emailVerificationTemplate from "@/shared/templates/emailVerification";

export class UserService {
  constructor(private userRepository: UserRepository) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private createEmailVerificationToken() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = crypto.createHash("sha256").update(code).digest("hex");

    return {
      code,
      hashedToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
  }

  private async sendVerificationEmail(email: string, code: string) {
    await sendEmail({
      to: email,
      subject: "Verify your email address",
      html: emailVerificationTemplate(code),
      text: `Your verification code is ${code}`,
    });
  }

  async getAllUsers() {
    return await this.userRepository.findAllUsers();
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.userRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async getMe(id: string | undefined) {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async updateMe(
    id: string,
    data: Partial<{
      name?: string;
      email?: string;
      avatar?: string;
      newsletterSubscribed?: boolean;
    }>
  ) {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const updatePayload: Partial<{
      name?: string;
      email?: string;
      avatar?: string;
      newsletterSubscribed?: boolean;
      emailVerified?: boolean;
      emailVerificationToken?: string | null;
      emailVerificationTokenExpiresAt?: Date | null;
    }> = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();

      if (trimmedName.length < 2) {
        throw new AppError(400, "Name must be at least 2 characters long");
      }

      updatePayload.name = trimmedName;
    }

    let verificationCode: string | undefined;

    if (data.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(data.email);
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

      if (!isValidEmail) {
        throw new AppError(400, "Invalid email format");
      }

      if (normalizedEmail !== user.email) {
        const existingUser = await this.userRepository.findUserByEmail(
          normalizedEmail
        );

        if (existingUser && existingUser.id !== user.id) {
          throw new AppError(400, "User with this email already exists");
        }

        const verificationToken = this.createEmailVerificationToken();
        verificationCode = verificationToken.code;

        updatePayload.email = normalizedEmail;
        updatePayload.emailVerified = false;
        updatePayload.emailVerificationToken = verificationToken.hashedToken;
        updatePayload.emailVerificationTokenExpiresAt =
          verificationToken.expiresAt;
      } else {
        updatePayload.email = normalizedEmail;
      }
    }

    if (data.avatar !== undefined) {
      updatePayload.avatar = data.avatar;
    }

    if (data.newsletterSubscribed !== undefined) {
      updatePayload.newsletterSubscribed = data.newsletterSubscribed;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new AppError(400, "No profile changes were provided");
    }

    const updatedUser = await this.userRepository.updateUser(id, updatePayload);

    if (verificationCode && updatePayload.email) {
      try {
        await this.sendVerificationEmail(updatePayload.email, verificationCode);
      } catch (error) {
        console.error(
          "Failed to send verification email after profile update:",
          error
        );
      }
    }

    return updatedUser;
  }

  async updateNewsletterPreference(id: string, newsletterSubscribed: boolean) {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    return this.userRepository.updateNewsletterPreference(
      id,
      newsletterSubscribed
    );
  }

  async sendNewsletter({
    subject,
    message,
  }: {
    subject: string;
    message: string;
  }) {
    const subscribers = await this.userRepository.findSubscribedUsers();

    if (subscribers.length === 0) {
      throw new AppError(400, "There are no subscribed clients to email.");
    }

    const deliveries = await Promise.allSettled(
      subscribers.map((subscriber) =>
        sendEmail({
          to: subscriber.email,
          subject,
          text: message,
          html: newsletterTemplate({
            name: subscriber.name,
            subject,
            message,
          }),
        })
      )
    );

    const sentCount = deliveries.filter(
      (result) => result.status === "fulfilled"
    ).length;
    const failedCount = deliveries.length - sentCount;

    if (sentCount === 0) {
      throw new AppError(
        500,
        "Newsletter delivery failed for all subscribed clients."
      );
    }

    return {
      audienceCount: subscribers.length,
      sentCount,
      failedCount,
    };
  }

  async deleteUser(id: string, currentUserId: string) {
    // Prevent self-deletion
    if (id === currentUserId) {
      throw new AppError(400, "You cannot delete your own account");
    }

    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // Prevent deletion of last SUPERADMIN
    if (user.role === "SUPERADMIN") {
      const superAdminCount = await this.userRepository.countUsersByRole(
        "SUPERADMIN"
      );
      if (superAdminCount <= 1) {
        throw new AppError(400, "Cannot delete the last SuperAdmin");
      }
    }

    await this.userRepository.deleteUser(id);
  }

  async createAdmin(
    adminData: {
      name: string;
      email: string;
      password: string;
    },
    createdByUserId: string
  ) {
    const creator = await this.userRepository.findUserById(createdByUserId);

    if (!creator) {
      throw new AppError(404, "Creator user not found");
    }

    if (creator.role !== "SUPERADMIN") {
      throw new AppError(403, "Only SuperAdmins can create new admins");
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findUserByEmail(
      adminData.email
    );
    if (existingUser) {
      throw new AppError(400, "User with this email already exists");
    }

    // Create new admin with ADMIN role (not SUPERADMIN)
    const newAdmin = await this.userRepository.createUser({
      ...adminData,
      role: "ADMIN",
      emailVerified: true,
    });

    return newAdmin;
  }
}
