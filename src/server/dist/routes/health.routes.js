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
const express_1 = require("express");
const database_config_1 = require("../infra/database/database.config");
const redis_1 = __importStar(require("../infra/cache/redis"));
const logger_1 = __importDefault(require("../infra/winston/logger"));
const router = (0, express_1.Router)();
// Basic health check
router.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: process.env.npm_package_version || "1.0.0",
    });
});
// Detailed health check with dependencies
router.get("/health/detailed", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const health = {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: process.env.npm_package_version || "1.0.0",
        dependencies: {
            database: "unknown",
            redis: "unknown",
        },
        memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
        },
        cpu: process.cpuUsage(),
    };
    try {
        // Check database connection
        yield (0, database_config_1.connectDB)();
        health.dependencies.database = "connected";
    }
    catch (error) {
        health.dependencies.database = "disconnected";
        health.status = "DEGRADED";
        logger_1.default.error("Database health check failed:", error);
    }
    try {
        // Check Redis connection
        if (redis_1.default && (yield (0, redis_1.ensureRedisConnection)())) {
            yield redis_1.default.ping();
            health.dependencies.redis = "connected";
        }
        else {
            health.dependencies.redis = "disconnected";
            health.status = "DEGRADED";
        }
    }
    catch (error) {
        health.dependencies.redis = "disconnected";
        health.status = "DEGRADED";
        logger_1.default.error("Redis health check failed:", error);
    }
    const statusCode = health.status === "OK" ? 200 : 503;
    res.status(statusCode).json(health);
}));
// Readiness probe for Kubernetes
router.get("/ready", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if all critical services are ready
        yield (0, database_config_1.connectDB)();
        if (!redis_1.default || !(yield (0, redis_1.ensureRedisConnection)())) {
            throw new Error("Redis unavailable");
        }
        yield redis_1.default.ping();
        res.status(200).json({
            status: "ready",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger_1.default.error("Readiness check failed:", error);
        res.status(503).json({
            status: "not ready",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
// Liveness probe for Kubernetes
router.get("/live", (req, res) => {
    res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
