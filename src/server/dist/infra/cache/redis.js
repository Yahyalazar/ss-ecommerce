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
exports.ensureRedisConnection = exports.isRedisReady = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL;
let hasLoggedUnavailableState = false;
const redis = redisUrl
    ? new ioredis_1.default(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times < 3 ? Math.min(times * 200, 1000) : null),
    })
    : null;
const logUnavailable = (error) => {
    if (hasLoggedUnavailableState)
        return;
    const message = error instanceof Error ? error.message : "Redis connection failed";
    console.warn(`[REDIS] Unavailable (${message}). Continuing in degraded mode.`);
    hasLoggedUnavailableState = true;
};
if (!redis) {
    console.warn("[REDIS] REDIS_URL is not set. Continuing without Redis-backed features.");
}
else {
    redis
        .on("ready", () => {
        hasLoggedUnavailableState = false;
        console.log("[REDIS] Connected");
    })
        .on("end", () => {
        logUnavailable(new Error("Redis connection closed"));
    })
        .on("error", (err) => {
        logUnavailable(err);
    });
}
const isRedisReady = () => (redis === null || redis === void 0 ? void 0 : redis.status) === "ready" || (redis === null || redis === void 0 ? void 0 : redis.status) === "connect";
exports.isRedisReady = isRedisReady;
const ensureRedisConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!redis)
        return false;
    if ((0, exports.isRedisReady)())
        return true;
    try {
        if (redis.status === "wait") {
            yield redis.connect();
        }
        else {
            yield redis.ping();
        }
        return (0, exports.isRedisReady)();
    }
    catch (error) {
        logUnavailable(error);
        return false;
    }
});
exports.ensureRedisConnection = ensureRedisConnection;
exports.default = redis;
