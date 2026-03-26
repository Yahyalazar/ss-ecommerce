import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    console.log("🚀 Attempting to connect to database...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Not set");
    await prisma.$connect();
    console.log("✅ Neon Database connected successfully.");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
};

export default prisma;
