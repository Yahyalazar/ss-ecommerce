"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_factory_1 = require("./auth.factory");
const passport_1 = __importDefault(require("passport"));
const constants_1 = require("@/shared/constants");
const cart_service_1 = require("../cart/cart.service");
const cart_repository_1 = require("../cart/cart.repository");
const handleSocialLogin_1 = __importDefault(require("@/shared/utils/auth/handleSocialLogin"));
const validateDto_1 = require("@/shared/middlewares/validateDto");
const auth_dto_1 = require("./auth.dto");
const router = express_1.default.Router();
const authController = (0, auth_factory_1.makeAuthController)();
const cartService = new cart_service_1.CartService(new cart_repository_1.CartRepository());
const CLIENT_URL_DEV = process.env.CLIENT_URL_DEV;
const CLIENT_URL_PROD = process.env.CLIENT_URL_PROD;
const env = process.env.NODE_ENV;
const clientBaseUrl = (env === "production" ? CLIENT_URL_PROD : CLIENT_URL_DEV) ||
    "http://localhost:3000";
const buildClientRedirectUrl = (path = "") => `${clientBaseUrl.replace(/\/+$/, "")}${path}`;
const buildFailureRedirectUrl = (provider) => `${buildClientRedirectUrl("/sign-in")}?error=social_auth_failed&provider=${provider}`;
/**
 * @swagger
 * /google:
 *   get:
 *     summary: Redirect to Google for authentication
 *     description: Initiates the OAuth flow for Google login.
 *     responses:
 *       302:
 *         description: Redirect to Google login page.
 */
router.get("/google", (0, handleSocialLogin_1.default)("google"));
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: buildFailureRedirectUrl("google"),
}), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const { accessToken, refreshToken } = user;
    res.cookie("refreshToken", refreshToken, constants_1.cookieOptions);
    res.cookie("accessToken", accessToken, constants_1.cookieOptions);
    const userId = user.id;
    const sessionId = req.session.id;
    yield (cartService === null || cartService === void 0 ? void 0 : cartService.mergeCartsOnLogin(sessionId, userId));
    res.redirect(buildClientRedirectUrl());
}));
/**
 * @swagger
 * /google/callback:
 *   get:
 *     summary: Handle callback from Google OAuth
 *     description: Handles the response from Google after OAuth authentication is complete.
 *     responses:
 *       200:
 *         description: Successfully authenticated with Google.
 */
/**
 * @swagger
 * /facebook:
 *   get:
 *     summary: Redirect to Facebook for authentication
 *     description: Initiates the OAuth flow for Facebook login.
 *     responses:
 *       302:
 *         description: Redirect to Facebook login page.
 */
router.get("/facebook", (0, handleSocialLogin_1.default)("facebook"));
router.get("/facebook/callback", passport_1.default.authenticate("facebook", {
    session: false,
    failureRedirect: buildFailureRedirectUrl("facebook"),
}), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const { accessToken, refreshToken } = user;
    res.cookie("refreshToken", refreshToken, constants_1.cookieOptions);
    res.cookie("accessToken", accessToken, constants_1.cookieOptions);
    const userId = user.id;
    const sessionId = req.session.id;
    yield (cartService === null || cartService === void 0 ? void 0 : cartService.mergeCartsOnLogin(sessionId, userId));
    res.redirect(buildClientRedirectUrl());
}));
/**
 * @swagger
 * /facebook/callback:
 *   get:
 *     summary: Handle callback from Facebook OAuth
 *     description: Handles the response from Facebook after OAuth authentication is complete.
 *     responses:
 *       200:
 *         description: Successfully authenticated with Facebook.
 */
/**
 * @swagger
 * /twitter:
 *   get:
 *     summary: Redirect to Twitter for authentication
 *     description: Initiates the OAuth flow for Twitter login.
 *     responses:
 *       302:
 *         description: Redirect to Twitter login page.
 */
router.get("/twitter", passport_1.default.authenticate("twitter", {
    session: false,
    scope: ["email"],
}));
router.get("/twitter/callback", passport_1.default.authenticate("twitter", {
    session: false,
    failureRedirect: buildFailureRedirectUrl("twitter"),
}), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const { accessToken, refreshToken } = user;
    res.cookie("refreshToken", refreshToken, constants_1.cookieOptions);
    res.cookie("accessToken", accessToken, constants_1.cookieOptions);
    const userId = user.id;
    const sessionId = req.session.id;
    yield (cartService === null || cartService === void 0 ? void 0 : cartService.mergeCartsOnLogin(sessionId, userId));
    res.redirect(buildClientRedirectUrl());
}));
/**
 * @swagger
 * /twitter/callback:
 *   get:
 *     summary: Handle callback from Twitter OAuth
 *     description: Handles the response from Twitter after OAuth authentication is complete.
 *     responses:
 *       200:
 *         description: Successfully authenticated with Twitter.
 */
/**
 * @swagger
 * /sign-up:
 *   post:
 *     summary: User sign-up
 *     description: Allows a new user to register by providing necessary details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address.
 *               password:
 *                 type: string
 *                 description: User's password.
 *               fullName:
 *                 type: string
 *                 description: User's full name.
 *     responses:
 *       201:
 *         description: User successfully created.
 */
router.post("/sign-up", (0, validateDto_1.validateDto)(auth_dto_1.RegisterDto), authController.signup);
/**
 * @swagger
 * /verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Verifies the email address using the code sent to the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user to verify.
 *               emailVerificationToken:
 *                 type: string
 *                 description: The 6-digit verification code sent by email.
 *     responses:
 *       200:
 *         description: Email verified successfully.
 */
router.post("/verify-email", (0, validateDto_1.validateDto)(auth_dto_1.VerifyEmailDto), authController.verifyEmail);
/**
 * @swagger
 * /verification-email:
 *   post:
 *     summary: Resend verification email
 *     description: Resends the verification email to a given address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user who needs a verification email.
 *     responses:
 *       200:
 *         description: Verification email resent.
 */
router.post("/verification-email", (0, validateDto_1.validateDto)(auth_dto_1.ResendVerificationEmailDto), authController.resendVerificationEmail);
/**
 * @swagger
 * /sign-in:
 *   post:
 *     summary: User sign-in
 *     description: Allows an existing user to sign in using their credentials.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address.
 *               password:
 *                 type: string
 *                 description: User's password.
 *     responses:
 *       200:
 *         description: User successfully signed in.
 */
router.post("/sign-in", (0, validateDto_1.validateDto)(auth_dto_1.SigninDto), authController.signin);
/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     description: Allows a user to refresh their authentication token when it expires.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to obtain a new access token.
 *     responses:
 *       200:
 *         description: Successfully refreshed the token.
 */
router.post("/refresh-token", authController.refreshToken);
/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Forgot password
 *     description: Sends a password reset email to the user who has forgotten their password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email address to receive the password reset link.
 *     responses:
 *       200:
 *         description: Password reset email sent.
 */
router.post("/forgot-password", (0, validateDto_1.validateDto)(auth_dto_1.ForgotPasswordDto), authController.forgotPassword);
/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset password
 *     description: Allows a user to reset their password using a reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: The token used for resetting the password.
 *               newPassword:
 *                 type: string
 *                 description: The new password to be set for the user.
 *     responses:
 *       200:
 *         description: Password successfully reset.
 */
router.post("/reset-password", (0, validateDto_1.validateDto)(auth_dto_1.ResetPasswordDto), authController.resetPassword);
/**
 * @swagger
 * /sign-out:
 *   get:
 *     summary: User sign-out
 *     description: Logs the user out of the application by invalidating their session.
 *     responses:
 *       200:
 *         description: User successfully signed out.
 */
router.get("/sign-out", authController.signout);
exports.default = router;
