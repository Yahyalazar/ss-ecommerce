import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { cookieOptions } from "@/shared/constants";
import asyncHandler from "@/shared/utils/asyncHandler";
import sendResponse from "@/shared/utils/sendResponse";
import { AuthService } from "./auth.service";
import { tokenUtils } from "@/shared/utils/authUtils";
import AppError from "@/shared/errors/AppError";
import { CartService } from "../cart/cart.service";
import { makeLogsService } from "../logs/logs.factory";

const { ...clearCookieOptions } = cookieOptions;

export class AuthController {
  private logsService = makeLogsService();
  constructor(
    private authService: AuthService,
    private cartService?: CartService
  ) {}

  signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const { name, email, password, role } = req.body;
    const response = await this.authService.registerUser({
      name,
      email,
      password,
      role,
    });

    sendResponse(res, 201, {
      message: response.message,
      data: {
        email: response.email,
        requiresEmailVerification: response.requiresEmailVerification,
      },
    });
    const end = Date.now();

    this.logsService.info("Register", {
      userId: null,
      email: response.email,
      sessionId: req.session.id,
      timePeriod: end - start,
    });
  });

  verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      const { email, emailVerificationToken } = req.body;
      const { user, accessToken, refreshToken } =
        await this.authService.verifyEmail({
          email,
          emailVerificationToken,
        });

      res.cookie("refreshToken", refreshToken, cookieOptions);
      res.cookie("accessToken", accessToken, cookieOptions);

      const sessionId = req.session.id;
      await this.cartService?.mergeCartsOnLogin(sessionId, user.id);

      sendResponse(res, 200, {
        message: "Email verified successfully",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
            emailVerified: user.emailVerified,
          },
        },
      });
      const end = Date.now();

      this.logsService.info("Verify Email", {
        userId: user.id,
        sessionId,
        timePeriod: end - start,
      });
    }
  );

  resendVerificationEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      const { email } = req.body;
      const response = await this.authService.resendVerificationEmail(email);

      sendResponse(res, 200, {
        message: response.message,
        data: {
          email: response.email,
          requiresEmailVerification: response.requiresEmailVerification,
        },
      });
      const end = Date.now();

      this.logsService.info("Resend Verification Email", {
        userId: null,
        email: response.email,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );

  signin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await this.authService.signin({
      email,
      password,
    });

    res.cookie("refreshToken", refreshToken, cookieOptions);
    res.cookie("accessToken", accessToken, cookieOptions);

    const userId = user.id;
    const sessionId = req.session.id;
    await this.cartService?.mergeCartsOnLogin(sessionId, userId);

    sendResponse(res, 200, {
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
        },
      },
      message: "User logged in successfully",
    });

    const start = Date.now();
    const end = Date.now();

    this.logsService.info("Sign in", {
      userId,
      sessionId: req.session.id,
      timePeriod: end - start,
    });
  });

  signout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const start = Date.now();
    const refreshToken = req?.cookies?.refreshToken;
    const userId = req.user?.id;

    if (refreshToken) {
      const decoded: any = jwt.decode(refreshToken);
      if (decoded && decoded.absExp) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.absExp - now;
        if (ttl > 0) {
          await tokenUtils.blacklistToken(refreshToken, ttl);
        }
      }
    }

    res.clearCookie("refreshToken", {
      ...clearCookieOptions,
    });

    res.clearCookie("accessToken", {
      ...clearCookieOptions,
    });

    sendResponse(res, 200, { message: "Logged out successfully" });
    const end = Date.now();

    this.logsService.info("Sign out", {
      userId,
      sessionId: req.session.id,
      timePeriod: end - start,
    });
  });

  forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;
      const response = await this.authService.forgotPassword(email);
      const userId = req.user?.id;

      sendResponse(res, 200, { message: response.message });
      const start = Date.now();
      const end = Date.now();

      this.logsService.info("Forgot Password", {
        userId,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { token, newPassword } = req.body;
      const response = await this.authService.resetPassword(token, newPassword);
      const userId = req.user?.id;

      sendResponse(res, 200, { message: response.message });
      const start = Date.now();
      const end = Date.now();

      this.logsService.info("Reset Password", {
        userId,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );

  refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      const oldRefreshToken = req?.cookies?.refreshToken;

      if (!oldRefreshToken) {
        throw new AppError(401, "Refresh token not found");
      }

      const { newAccessToken, newRefreshToken, user } =
        await this.authService.refreshToken(oldRefreshToken);

      res.cookie("refreshToken", newRefreshToken, cookieOptions);
      res.cookie("accessToken", newAccessToken, cookieOptions);

      sendResponse(res, 200, {
        message: "Token refreshed successfully",
        data: { accessToken: newAccessToken, user },
      });
      const end = Date.now();

      this.logsService.info("Refresh Token", {
        userId: req.user?.id,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );
}
