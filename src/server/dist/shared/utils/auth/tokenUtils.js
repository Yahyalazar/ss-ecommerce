"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.isTokenBlacklisted = exports.blacklistToken = void 0;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importStar(require("@/infra/cache/redis"));
function generateAccessToken(id) {
    return jsonwebtoken_1.default.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15m",
    });
}
function generateRefreshToken(id, absExp) {
    const absoluteExpiration = absExp || Math.floor(Date.now() / 1000) + 86400;
    const ttl = absoluteExpiration - Math.floor(Date.now() / 1000);
    return jsonwebtoken_1.default.sign({ id, absExp: absoluteExpiration }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: ttl,
    });
}
const blacklistToken = (token, ttl) => __awaiter(void 0, void 0, void 0, function* () {
    if (!redis_1.default || !(yield (0, redis_1.ensureRedisConnection)()))
        return;
    try {
        yield redis_1.default.set(`blacklist:${token}`, "blacklisted", "EX", ttl);
    }
    catch (error) {
        console.error("Redis error:", error);
    }
});
exports.blacklistToken = blacklistToken;
const isTokenBlacklisted = (token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!redis_1.default || !(yield (0, redis_1.ensureRedisConnection)())) {
            return false;
        }
        const result = yield redis_1.default.get(`blacklist:${token}`);
        return result !== null;
    }
    catch (error) {
        console.error("Redis error:", error);
        return false;
    }
});
exports.isTokenBlacklisted = isTokenBlacklisted;
