import crypto from "crypto";
import AppError from "@/shared/errors/AppError";
import sendEmail from "@/shared/utils/sendEmail";
import emailVerificationTemplate from "@/shared/templates/emailVerification";
import passwordResetTemplate from "@/shared/templates/passwordReset";
import { tokenUtils, passwordUtils } from "@/shared/utils/authUtils";
import {
  AuthResponse,
  RegisterUserParams,
  SignInParams,
  VerificationPendingResponse,
  VerifyEmailParams,
} from "./auth.types";
import { ROLE } from "@prisma/client";
import logger from "@/infra/winston/logger";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import BadRequestError from "@/shared/errors/BadRequestError";
import NotFoundError from "@/shared/errors/NotFoundError";

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getClientUrl() {
    const clientUrl =
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL_PROD
        : process.env.CLIENT_URL_DEV;

    if (!clientUrl) {
      throw new AppError(
        500,
        "Client URL is not configured. Set CLIENT_URL_DEV or CLIENT_URL_PROD."
      );
    }

    return clientUrl;
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
    const htmlTemplate = emailVerificationTemplate(code);

    try {
      await sendEmail({
        to: email,
        subject: "Verify your email address",
        html: htmlTemplate,
        text: `Your verification code is ${code}`,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        500,
        "We couldn't send the verification email. Please try again."
      );
    }
  }

  async registerUser({
    name,
    email,
    password,
    role,
    newsletterSubscribed,
  }: RegisterUserParams): Promise<VerificationPendingResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = await this.authRepository.findUserByEmail(
      normalizedEmail
    );

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new AppError(
          400,
          "This email is already registered, please log in instead."
        );
      }

      if (!existingUser.password) {
        throw new AppError(
          400,
          "This email is already linked to a social sign-in account."
        );
      }

      const verificationToken = this.createEmailVerificationToken();

      await this.authRepository.updateUserEmailVerification(existingUser.id, {
        emailVerificationToken: verificationToken.hashedToken,
        emailVerificationTokenExpiresAt: verificationToken.expiresAt,
        emailVerified: false,
        newsletterSubscribed,
      });

      await this.sendVerificationEmail(normalizedEmail, verificationToken.code);

      return {
        email: normalizedEmail,
        message:
          "Your account is waiting for verification. We sent a new verification code.",
        requiresEmailVerification: true,
      };
    }

    const verificationToken = this.createEmailVerificationToken();

    // Force new registrations to be USER role only for security
    const newUser = await this.authRepository.createUser({
      email: normalizedEmail,
      name,
      password,
      role: ROLE.USER, // Ignore any role passed from client for security
      emailVerified: false,
      newsletterSubscribed,
      emailVerificationToken: verificationToken.hashedToken,
      emailVerificationTokenExpiresAt: verificationToken.expiresAt,
    });

    await this.sendVerificationEmail(newUser.email, verificationToken.code);

    return {
      email: newUser.email,
      message: "Account created. Please verify your email to continue.",
      requiresEmailVerification: true,
    };
  }

  async signin({ email, password }: SignInParams): Promise<{
    user: AuthResponse["user"];
    accessToken: string;
    refreshToken: string;
  }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findUserByEmailWithPassword(
      normalizedEmail
    );

    if (!user) {
      throw new BadRequestError("Email or password is incorrect.");
    }

    if (!user.password) {
      throw new AppError(400, "Email or password is incorrect.");
    }

    if (!user.emailVerified) {
      throw new AppError(
        403,
        "Please verify your email before signing in."
      );
    }

    const isPasswordValid = await passwordUtils.comparePassword(
      password,
      user.password
    );
    if (!isPasswordValid) {
      throw new AppError(400, "Email or password is incorrect.");
    }

    const accessToken = tokenUtils.generateAccessToken(user.id);
    const refreshToken = tokenUtils.generateRefreshToken(user.id);

    return { accessToken, refreshToken, user };
  }

  async verifyEmail({
    email,
    emailVerificationToken,
  }: VerifyEmailParams): Promise<AuthResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundError("User");
    }

    if (user.emailVerified) {
      throw new AppError(400, "Email is already verified. Please sign in.");
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(emailVerificationToken.trim())
      .digest("hex");

    if (
      !user.emailVerificationToken ||
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationToken !== hashedToken ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestError("Invalid or expired verification code.");
    }

    await this.authRepository.updateUserEmailVerification(user.id, {
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      emailVerified: true,
    });

    const accessToken = tokenUtils.generateAccessToken(user.id);
    const refreshToken = tokenUtils.generateRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        emailVerified: true,
        newsletterSubscribed: user.newsletterSubscribed,
        loyaltyPointsBalance: user.loyaltyPointsBalance,
      },
      accessToken,
      refreshToken,
    };
  }

  async resendVerificationEmail(
    email: string
  ): Promise<VerificationPendingResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundError("User");
    }

    if (user.emailVerified) {
      throw new AppError(400, "Email is already verified. Please sign in.");
    }

    if (!user.password) {
      throw new AppError(
        400,
        "This email is already linked to a social sign-in account."
      );
    }

    const verificationToken = this.createEmailVerificationToken();

    await this.authRepository.updateUserEmailVerification(user.id, {
      emailVerificationToken: verificationToken.hashedToken,
      emailVerificationTokenExpiresAt: verificationToken.expiresAt,
      emailVerified: false,
    });

    await this.sendVerificationEmail(normalizedEmail, verificationToken.code);

    return {
      email: normalizedEmail,
      message: "A new verification code has been sent to your email.",
      requiresEmailVerification: true,
    };
  }

  async signout(): Promise<{ message: string }> {
    return { message: "User logged out successfully" };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundError("Email");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await this.authRepository.updateUserPasswordReset(normalizedEmail, {
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const resetUrl = `${this.getClientUrl()}/password-reset/${resetToken}`;
    const htmlTemplate = passwordResetTemplate(resetUrl);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: htmlTemplate,
        text: "Reset your password",
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        500,
        "We couldn't send the password reset email. Please try again."
      );
    }

    return { message: "Password reset email sent successfully" };
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await this.authRepository.findUserByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    await this.authRepository.updateUserPassword(user.id, newPassword);

    return { message: "Password reset successful. You can now log in." };
  }

  async refreshToken(oldRefreshToken: string): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
      newsletterSubscribed: boolean;
      loyaltyPointsBalance: number;
    };
    newAccessToken: string;
    newRefreshToken: string;
  }> {
    if (await tokenUtils.isTokenBlacklisted(oldRefreshToken)) {
      throw new NotFoundError("Refresh token");
    }

    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string; absExp: number };

    const absoluteExpiration = decoded.absExp;
    const now = Math.floor(Date.now() / 1000);
    if (now > absoluteExpiration) {
      throw new AppError(401, "Session expired. Please log in again.");
    }

    const user = await this.authRepository.findUserById(decoded.id);

    if (!user) {
      throw new NotFoundError("User");
    }

    const newAccessToken = tokenUtils.generateAccessToken(user.id);
    const newRefreshToken = tokenUtils.generateRefreshToken(
      user.id,
      absoluteExpiration
    );

    const oldTokenTTL = absoluteExpiration - now;
    if (oldTokenTTL > 0) {
      await tokenUtils.blacklistToken(oldRefreshToken, oldTokenTTL);
    } else {
      logger.warn("Refresh token is already expired. No need to blacklist.");
    }

    return { user, newAccessToken, newRefreshToken };
  }
}
