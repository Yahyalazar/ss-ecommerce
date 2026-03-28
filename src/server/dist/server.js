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
const module_alias_1 = require("module-alias");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST
dotenv_1.default.config();
// Dynamically set module alias based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const projectRoot = path_1.default.resolve(__dirname, ".."); // Move up from src to project root
const aliasPath = path_1.default.join(projectRoot, isProduction ? "dist" : "src");
(0, module_alias_1.addAlias)("@", aliasPath);
const PORT = process.env.PORT || 5000;
console.log("🚀 [SERVER] Starting initialization...");
console.log("🚀 [SERVER] NODE_ENV:", process.env.NODE_ENV);
console.log("🚀 [SERVER] PORT:", PORT);
(() => __awaiter(void 0, void 0, void 0, function* () {
    // Handle uncaught exceptions FIRST
    process.on("uncaughtException", (err) => {
        console.error("❌ [SERVER] Uncaught Exception:", err);
        if (err instanceof Error) {
            console.error("Stack:", err.stack);
        }
        process.exit(1);
    });
    process.on("unhandledRejection", (reason, promise) => {
        console.error("❌ [SERVER] Unhandled Rejection at:", promise);
        console.error("Reason:", reason);
        if (reason instanceof Error) {
            console.error("Stack:", reason.stack);
        }
        process.exit(1);
    });
    try {
        // Import app AFTER setting up error handlers
        console.log("🚀 [SERVER] Importing createApp...");
        const { createApp } = yield Promise.resolve().then(() => __importStar(require("./app")));
        console.log("✅ [SERVER] createApp imported successfully");
        console.log("🚀 [SERVER] Calling createApp()...");
        const { httpServer } = yield createApp();
        console.log("✅ [SERVER] createApp() succeeded");
        console.log("🚀 [SERVER] Starting HTTP server...");
        httpServer.listen(PORT, () => {
            console.log(`✅ [SERVER] Server is running on port ${PORT}`);
        });
        httpServer.on("error", (err) => {
            console.error("❌ [SERVER] HTTP Server error:", err);
            process.exit(1);
        });
    }
    catch (error) {
        console.error("❌ [FATAL ERROR] Server startup failed:");
        console.error("Error object:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        else {
            console.error("Error type:", typeof error);
        }
        process.exit(1);
    }
}))();
