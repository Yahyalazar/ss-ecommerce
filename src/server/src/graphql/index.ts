import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { PrismaClient } from "@prisma/client";
import { combinedSchemas } from "./v1/schema";

const prisma = new PrismaClient();

export async function configureGraphQL(app: express.Application) {
  try {
    console.log("🚀 [GraphQL] Creating Apollo server instance...");
    const apolloServer = new ApolloServer({
      schema: combinedSchemas,
    });
    console.log("✅ [GraphQL] Apollo server created");

    console.log("🚀 [GraphQL] Starting Apollo server...");
    await apolloServer.start();
    console.log("✅ [GraphQL] Apollo server started");

    console.log("🚀 [GraphQL] Setting up GraphQL middleware...");
    app.use(
      "/api/v1/graphql",
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://ecommerce-nu-rosy.vercel.app"]
            : ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Apollo-Require-Preflight",
        ],
      }),
      bodyParser.json(),
      expressMiddleware(apolloServer, {
        context: async ({ req, res }) => ({
          req,
          res,
          prisma,
          user: (req as any).user,
        }),
      })
    );
    console.log("✅ [GraphQL] GraphQL middleware configured");
  } catch (error) {
    console.error("❌ [GraphQL] Configuration failed:");
    console.error("Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    throw error;
  }
}
