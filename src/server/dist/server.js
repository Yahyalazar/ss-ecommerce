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
const module_alias_1 = require("module-alias");
const path_1 = __importDefault(require("path"));
// Dynamically set module alias based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const projectRoot = path_1.default.resolve(__dirname, ".."); // Move up from src to project root
const aliasPath = path_1.default.join(projectRoot, isProduction ? "dist" : "src");
(0, module_alias_1.addAlias)("@", aliasPath);
const app_1 = require("./app");
const PORT = process.env.PORT || 5000;
console.log("🚀 [SERVER] Starting initialization...");
console.log("🚀 [SERVER] NODE_ENV:", process.env.NODE_ENV);
console.log("🚀 [SERVER] PORT:", PORT);
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("🚀 [SERVER] Calling createApp()...");
        const { httpServer } = yield (0, app_1.createApp)();
        console.log("✅ [SERVER] createApp() succeeded");
        console.log("🚀 [SERVER] Starting HTTP server...");
        httpServer.listen(PORT, () => {
            console.log(`✅ [SERVER] Server is running on port ${PORT}`);
        });
        httpServer.on("error", (err) => {
            console.error("❌ [SERVER] HTTP Server error:", err);
            process.exit(1);
        });
        // Handle uncaught exceptions
        process.on("uncaughtException", (err) => {
            console.error("❌ [SERVER] Uncaught Exception:", err);
            process.exit(1);
        });
        process.on("unhandledRejection", (reason, promise) => {
            console.error("❌ [SERVER] Unhandled Rejection at:", promise, "reason:", reason);
            process.exit(1);
        });
    }
    catch (error) {
        console.error("❌ [FATAL ERROR] Server startup failed:");
        console.error(error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        process.exit(1);
    }
}))();
