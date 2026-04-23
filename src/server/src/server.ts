import { addAlias } from "module-alias";
import path from "path";
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Dynamically set module alias based on NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const projectRoot = path.resolve(__dirname, ".."); // Move up from src to project root
const aliasPath = path.join(projectRoot, isProduction ? "dist" : "src");
const shouldExitOnProcessError = isProduction;

addAlias("@", aliasPath);

const PORT = process.env.PORT || 5000;

console.log("[SERVER] Starting initialization...");
console.log("[SERVER] NODE_ENV:", process.env.NODE_ENV);
console.log("[SERVER] PORT:", PORT);

(async () => {
  // Handle uncaught exceptions FIRST
  process.on("uncaughtException", (err) => {
    console.error("[SERVER] Uncaught Exception:", err);
    if (err instanceof Error) {
      console.error("Stack:", err.stack);
    }
    if (shouldExitOnProcessError) {
      process.exit(1);
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[SERVER] Unhandled Rejection at:", promise);
    console.error("Reason:", reason);
    if (reason instanceof Error) {
      console.error("Stack:", reason.stack);
    }
    if (shouldExitOnProcessError) {
      process.exit(1);
    }
  });

  try {
    // Import app AFTER setting up error handlers
    console.log("[SERVER] Importing createApp...");
    const { createApp } = await import("./app");
    console.log("[SERVER] createApp imported successfully");

    console.log("[SERVER] Calling createApp()...");
    const { httpServer } = await createApp();
    console.log("[SERVER] createApp() succeeded");

    console.log("[SERVER] Starting HTTP server...");
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Server is running on port ${PORT}`);
    });

    httpServer.on("error", (err) => {
      console.error("[SERVER] HTTP Server error:", err);
      process.exit(1);
    });
  } catch (error) {
    console.error("[FATAL ERROR] Server startup failed:");
    console.error("Error object:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Error type:", typeof error);
    }
    process.exit(1);
  }
})();
