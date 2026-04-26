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
exports.default = configurePassport;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const passport_twitter_1 = require("passport-twitter");
const database_config_1 = __importDefault(require("@/infra/database/database.config"));
const tokenUtils_1 = require("@/shared/utils/auth/tokenUtils");
const trimEnv = (value) => value === null || value === void 0 ? void 0 : value.trim();
const resolveServerOrigin = () => {
    const configuredOrigin = trimEnv(process.env.SERVER_PUBLIC_URL) ||
        trimEnv(process.env.API_PUBLIC_URL) ||
        `http://localhost:${trimEnv(process.env.PORT) || "5000"}`;
    return configuredOrigin.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
};
const getExpectedCallbackPath = (provider) => `/api/v1/auth/${provider}/callback`;
const resolveCallbackUrl = (provider, configuredUrl) => {
    const expectedPath = getExpectedCallbackPath(provider);
    const rawValue = trimEnv(configuredUrl);
    if (!rawValue) {
        return `${resolveServerOrigin()}${expectedPath}`;
    }
    try {
        const url = new URL(rawValue);
        if (url.pathname === `/auth/${provider}/callback`) {
            url.pathname = expectedPath;
        }
        return url.toString();
    }
    catch (_a) {
        const normalizedPath = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
        if (normalizedPath === expectedPath ||
            normalizedPath === `/auth/${provider}/callback`) {
            return `${resolveServerOrigin()}${expectedPath}`;
        }
        return rawValue;
    }
};
const warnIfPlaceholderCredentials = (provider, clientId, clientSecret) => {
    if (!clientId ||
        !clientSecret ||
        /dummy/i.test(clientId) ||
        /dummy/i.test(clientSecret)) {
        console.warn(`[AUTH] ${provider} OAuth credentials look like placeholders. Update the ${provider.toUpperCase()} app credentials in src/server/.env.`);
    }
};
function configurePassport() {
    warnIfPlaceholderCredentials("google", process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: resolveCallbackUrl("google", process.env.NODE_ENV === "production"
            ? process.env.GOOGLE_CALLBACK_URL_PROD
            : process.env.GOOGLE_CALLBACK_URL_DEV),
    }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const email = (_c = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.trim().toLowerCase();
            if (!email) {
                return done(new Error("Google did not return an email address for this account."));
            }
            let user = yield database_config_1.default.user.findUnique({
                where: { email },
            });
            if (user) {
                if (!user.googleId) {
                    user = yield database_config_1.default.user.update({
                        where: { email },
                        data: {
                            googleId: profile.id,
                            avatar: ((_d = profile.photos[0]) === null || _d === void 0 ? void 0 : _d.value) || "",
                            emailVerified: true,
                        },
                    });
                }
            }
            else {
                user = yield database_config_1.default.user.create({
                    data: {
                        email,
                        name: profile.displayName,
                        googleId: profile.id,
                        avatar: ((_e = profile.photos[0]) === null || _e === void 0 ? void 0 : _e.value) || "",
                        emailVerified: true,
                    },
                });
            }
            const id = user.id;
            const newAccessToken = (0, tokenUtils_1.generateAccessToken)(id);
            const newRefreshToken = (0, tokenUtils_1.generateRefreshToken)(id);
            return done(null, Object.assign(Object.assign({}, user), { accessToken: newAccessToken, refreshToken: newRefreshToken }));
        }
        catch (error) {
            console.error("Google Strategy error:", error);
            return done(error);
        }
    })));
    warnIfPlaceholderCredentials("facebook", process.env.FACEBOOK_APP_ID, process.env.FACEBOOK_APP_SECRET);
    passport_1.default.use(new passport_facebook_1.Strategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: resolveCallbackUrl("facebook", process.env.NODE_ENV === "production"
            ? process.env.FACEBOOK_CALLBACK_URL_PROD
            : process.env.FACEBOOK_CALLBACK_URL_DEV),
        profileFields: ["id", "emails", "name", "picture.type(large)"],
    }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const email = (_c = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.trim().toLowerCase();
            if (!email) {
                return done(new Error("Facebook did not return an email address for this account."));
            }
            let user = yield database_config_1.default.user.findUnique({
                where: { email },
            });
            if (user) {
                if (!user.facebookId) {
                    user = yield database_config_1.default.user.update({
                        where: { email },
                        data: {
                            facebookId: profile.id,
                            avatar: ((_e = (_d = profile.photos) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.value) || "",
                            emailVerified: true,
                        },
                    });
                }
            }
            else {
                user = yield database_config_1.default.user.create({
                    data: {
                        email,
                        name: `${(_f = profile.name) === null || _f === void 0 ? void 0 : _f.givenName} ${(_g = profile.name) === null || _g === void 0 ? void 0 : _g.familyName}`,
                        facebookId: profile.id,
                        avatar: ((_j = (_h = profile.photos) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.value) || "",
                        emailVerified: true,
                    },
                });
            }
            const id = user.id;
            const newAccessToken = (0, tokenUtils_1.generateAccessToken)(id);
            const newRefreshToken = (0, tokenUtils_1.generateRefreshToken)(id);
            return done(null, Object.assign(Object.assign({}, user), { accessToken: newAccessToken, refreshToken: newRefreshToken }));
        }
        catch (error) {
            console.error("Facebook Strategy error:", error);
            return done(error);
        }
    })));
    warnIfPlaceholderCredentials("twitter", process.env.TWITTER_CONSUMER_KEY, process.env.TWITTER_CONSUMER_SECRET);
    passport_1.default.use(new passport_twitter_1.Strategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        callbackURL: resolveCallbackUrl("twitter", process.env.NODE_ENV === "production"
            ? process.env.TWITTER_CALLBACK_URL_PROD
            : process.env.TWITTER_CALLBACK_URL_DEV),
        includeEmail: true,
    }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            if (!profile || !profile.id) {
                console.error("Twitter profile is missing or invalid:", profile);
                return done(new Error("Failed to fetch valid Twitter profile"));
            }
            const email = ((_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) ||
                `twitter-${profile.id}@placeholder.com`;
            const hasVerifiedEmail = Boolean((_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value);
            const name = profile.displayName ||
                profile.username ||
                `Twitter User ${profile.id}`;
            const avatar = ((_f = (_e = profile.photos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || "";
            let user = yield database_config_1.default.user.findUnique({
                where: { email },
            });
            if (user) {
                if (!user.twitterId) {
                    user = yield database_config_1.default.user.update({
                        where: { email },
                        data: Object.assign({ twitterId: profile.id, avatar }, (hasVerifiedEmail ? { emailVerified: true } : {})),
                    });
                }
            }
            else {
                user = yield database_config_1.default.user.create({
                    data: {
                        email,
                        name,
                        twitterId: profile.id,
                        avatar,
                        emailVerified: hasVerifiedEmail,
                    },
                });
            }
            const id = user.id;
            const newAccessToken = (0, tokenUtils_1.generateAccessToken)(id);
            const newRefreshToken = (0, tokenUtils_1.generateRefreshToken)(id);
            return done(null, Object.assign(Object.assign({}, user), { accessToken: newAccessToken, refreshToken: newRefreshToken }));
        }
        catch (error) {
            console.error("Twitter Strategy error:", error);
            return done(error);
        }
    })));
}
