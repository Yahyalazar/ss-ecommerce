import { Request, Response } from "express";
import asyncHandler from "@/shared/utils/asyncHandler";
import sendResponse from "@/shared/utils/sendResponse";
import { CheckoutService } from "./checkout.service";
import AppError from "@/shared/errors/AppError";
import { CartService } from "../cart/cart.service";
import { makeLogsService } from "../logs/logs.factory";

export class CheckoutController {
  private logsService = makeLogsService();

  constructor(
    private checkoutService: CheckoutService,
    private cartService: CartService
  ) {}

  initiateCheckout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(400, "User not found");
    }

    const cart = await this.cartService.getOrCreateCart(userId);
    if (!cart.cartItems || cart.cartItems.length === 0) {
      throw new AppError(400, "Cart is empty");
    }

    const session = await this.checkoutService.createStripeSession(cart, userId);
    sendResponse(res, 200, {
      data: { sessionId: session.id },
      message: "Checkout initiated successfully",
    });

    this.cartService.logCartEvent(cart.id, "CHECKOUT_STARTED", userId);

    this.logsService.info("Checkout initiated", {
      userId,
      sessionId: session.id,
      timePeriod: 0,
    });
  });

  confirmCheckout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      throw new AppError(400, "User not found");
    }

    if (!sessionId) {
      throw new AppError(400, "Session ID is required");
    }

    const { order } = await this.checkoutService.confirmStripeSession(
      sessionId,
      userId
    );

    sendResponse(res, 200, {
      data: { order },
      message: "Checkout confirmed successfully",
    });
  });
}
