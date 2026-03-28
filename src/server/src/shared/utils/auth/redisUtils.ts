import redisClient, { ensureRedisConnection } from "@/infra/cache/redis";

// Blacklist token in Redis
export const blacklistToken = async (
  token: string,
  ttl: number
): Promise<void> => {
  if (!redisClient || !(await ensureRedisConnection())) return;

  try {
    await redisClient.set(`blacklist:${token}`, "blacklisted", "EX", ttl);
  } catch (error) {
    console.error("Redis error:", error);
  }
};

// Check if token is blacklisted
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    if (!redisClient || !(await ensureRedisConnection())) {
      return false;
    }

    const result = await redisClient.get(`blacklist:${token}`);
    return result !== null;
  } catch (error) {
    console.error("Redis error:", error);
    return false;
  }
};
