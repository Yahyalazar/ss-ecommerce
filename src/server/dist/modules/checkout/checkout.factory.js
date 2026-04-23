"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCheckoutController = void 0;
const checkout_service_1 = require("./checkout.service");
const checkout_controller_1 = require("./checkout.controller");
const cart_service_1 = require("../cart/cart.service");
const cart_repository_1 = require("../cart/cart.repository");
const webhook_service_1 = require("../webhook/webhook.service");
const makeCheckoutController = () => {
    const webhookService = new webhook_service_1.WebhookService();
    const checkoutService = new checkout_service_1.CheckoutService(webhookService);
    const repo = new cart_repository_1.CartRepository();
    const cartService = new cart_service_1.CartService(repo);
    const controller = new checkout_controller_1.CheckoutController(checkoutService, cartService);
    return controller;
};
exports.makeCheckoutController = makeCheckoutController;
