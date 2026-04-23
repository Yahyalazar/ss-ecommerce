import { CheckoutService } from "./checkout.service";
import { CheckoutController } from "./checkout.controller";
import { CartService } from "../cart/cart.service";
import { CartRepository } from "../cart/cart.repository";
import { WebhookService } from "../webhook/webhook.service";

export const makeCheckoutController = () => {
  const webhookService = new WebhookService();
  const checkoutService = new CheckoutService(webhookService);
  const repo = new CartRepository();
  const cartService = new CartService(repo);
  const controller = new CheckoutController(checkoutService, cartService);
  return controller;
};
