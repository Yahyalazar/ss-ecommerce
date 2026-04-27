import { Request, Response } from "express";
import { UserService } from "./user.service";
import asyncHandler from "@/shared/utils/asyncHandler";
import sendResponse from "@/shared/utils/sendResponse";
import { makeLogsService } from "../logs/logs.factory";
import AppError from "@/shared/errors/AppError";
import {
  isCloudinaryTimeoutError,
  uploadToCloudinary,
} from "@/shared/utils/uploadToCloudinary";

export class UserController {
  private logsService = makeLogsService();
  constructor(private userService: UserService) {}

  getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const users = await this.userService.getAllUsers();
      sendResponse(res, 200, {
        data: { users },
        message: "Users fetched successfully",
      });
    }
  );

  getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      sendResponse(res, 200, {
        data: { user },
        message: "User fetched successfully",
      });
    }
  );

  getUserByEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.params;
      const user = await this.userService.getUserByEmail(email);
      sendResponse(res, 200, {
        data: { user },
        message: "User fetched successfully",
      });
    }
  );

  getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.user?.id;
    const user = await this.userService.getMe(id);
    sendResponse(res, 200, {
      data: { user },
      message: "User fetched successfully",
    });
  });

  updateCurrentUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        throw new AppError(401, "User not authenticated");
      }

      const file = req.file;
      let avatar: string | undefined;

      if (file) {
        try {
          const [uploadedAvatar] = await uploadToCloudinary([file], {
            folder: "user_avatars",
            throwOnAllFailed: true,
          });

          if (!uploadedAvatar?.url) {
            throw new AppError(400, "Failed to upload profile image");
          }

          avatar = uploadedAvatar.url;
        } catch (error) {
          if (isCloudinaryTimeoutError(error)) {
            throw new AppError(
              504,
              "Profile image upload timed out. Please try again or use a smaller image."
            );
          }

          throw new AppError(400, "Failed to upload profile image");
        }
      }

      const user = await this.userService.updateMe(currentUserId, {
        name: req.body.name,
        email: req.body.email,
        ...(avatar && { avatar }),
      });

      sendResponse(res, 200, {
        data: { user },
        message: "Profile updated successfully",
      });

      this.logsService.info("Profile updated", {
        userId: currentUserId,
        sessionId: req.session.id,
      });
    }
  );

  updateMe = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updatedData = req.body;
      const user = await this.userService.updateMe(id, updatedData);
      sendResponse(res, 200, {
        data: { user },
        message: "User updated successfully",
      });
      const start = Date.now();
      const end = Date.now();

      this.logsService.info("User updated", {
        userId: req.user?.id,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );

  updateNewsletterPreference = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        throw new AppError(401, "User not authenticated");
      }

      const { newsletterSubscribed } = req.body;
      const user = await this.userService.updateNewsletterPreference(
        currentUserId,
        newsletterSubscribed
      );

      sendResponse(res, 200, {
        data: { user },
        message: newsletterSubscribed
          ? "Newsletter subscription enabled"
          : "Newsletter subscription disabled",
      });
    }
  );

  sendNewsletter = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { subject, message } = req.body;
      const result = await this.userService.sendNewsletter({ subject, message });

      sendResponse(res, 200, {
        data: result,
        message: `Newsletter sent to ${result.sentCount} subscribed client${result.sentCount === 1 ? "" : "s"}.`,
      });
    }
  );

  deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        throw new AppError(401, "User not authenticated");
      }

      await this.userService.deleteUser(id, currentUserId);
      sendResponse(res, 204, { message: "User deleted successfully" });
      const start = Date.now();
      const end = Date.now();

      this.logsService.info("User deleted", {
        userId: req.user?.id,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );

  createAdmin = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { name, email, password } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        throw new AppError(401, "User not authenticated");
      }

      const newAdmin = await this.userService.createAdmin(
        { name, email, password },
        currentUserId
      );

      sendResponse(res, 201, {
        data: { user: newAdmin },
        message: "Admin created successfully",
      });

      const start = Date.now();
      const end = Date.now();

      this.logsService.info("Admin created", {
        userId: req.user?.id,
        sessionId: req.session.id,
        timePeriod: end - start,
      });
    }
  );
}
